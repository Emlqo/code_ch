import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import type {
  BattleLeaderboardEntry,
  BattleParticipant,
  BattleRoom,
  BattleRoomCreateInput,
  BattleRoomHistory,
  BattleRoomJoinInput,
  BattleRoomService,
} from '../../types/battleRoom';
import { getFirestoreDb } from '../firebase/firebaseClient';

/*
 * Firestore structure:
 *
 * rooms/{roomId}
 *   BattleRoom document
 *
 * rooms/{roomId}/participants/{participantId}
 *   BattleParticipant document
 *
 * roomHistory/{roomId}
 *   BattleRoomHistory document saved when a room finishes
 */

type FirestoreSnapshot = DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>;

const maxRoomCodeAttempts = 50;

function getRequiredDb(): Firestore {
  const db = getFirestoreDb();

  if (!db) {
    throw new Error(
      'Firebase is not configured. Check .env.local values or use the localStorage fallback service.',
    );
  }

  return db;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

function roomsCollection(db: Firestore) {
  return collection(db, 'rooms');
}

function roomDocument(db: Firestore, roomId: string) {
  return doc(db, 'rooms', roomId);
}

function participantsCollection(db: Firestore, roomId: string) {
  return collection(db, 'rooms', roomId, 'participants');
}

function participantDocument(db: Firestore, roomId: string, participantId: string) {
  return doc(db, 'rooms', roomId, 'participants', participantId);
}

function historyCollection(db: Firestore) {
  return collection(db, 'roomHistory');
}

function historyDocument(db: Firestore, roomId: string) {
  return doc(db, 'roomHistory', roomId);
}

function snapshotData<T>(snapshot: FirestoreSnapshot): T | null {
  if (!snapshot.exists()) {
    return null;
  }

  return {
    ...(snapshot.data() as T),
    id: (snapshot.data() as { id?: string }).id ?? snapshot.id,
  };
}

function toBattleRoom(snapshot: FirestoreSnapshot): BattleRoom | null {
  return snapshotData<BattleRoom>(snapshot);
}

function toBattleParticipant(snapshot: FirestoreSnapshot): BattleParticipant | null {
  return snapshotData<BattleParticipant>(snapshot);
}

function toBattleRoomHistory(snapshot: FirestoreSnapshot): BattleRoomHistory | null {
  const data = snapshot.data() as BattleRoomHistory | undefined;

  if (!snapshot.exists() || !data) {
    return null;
  }

  return data;
}

function createCurrentSeed(roomCode: string, createdAt: string): string {
  return `code-run-battle-${roomCode}-${createdAt}`;
}

function assertRoomCanBeJoined(room: BattleRoom): void {
  const canJoinByStatus = room.status === 'waiting' || (room.status === 'playing' && room.config.allowLateJoin);

  if (!canJoinByStatus) {
    throw new Error('This battle room is not accepting participants now.');
  }

  if (room.participantCount >= room.config.maxParticipants) {
    throw new Error('This battle room is full.');
  }
}

function sortLeaderboard(entries: BattleLeaderboardEntry[]): BattleLeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    if (a.solvedProblems !== b.solvedProblems) {
      return b.solvedProblems - a.solvedProblems;
    }

    if (a.accuracy !== b.accuracy) {
      return b.accuracy - a.accuracy;
    }

    if (a.maxCombo !== b.maxCombo) {
      return b.maxCombo - a.maxCombo;
    }

    return a.nickname.localeCompare(b.nickname);
  });
}

function createLeaderboard(participants: BattleParticipant[]): BattleLeaderboardEntry[] {
  const sortedEntries = sortLeaderboard(
    participants.map((participant) => ({
      rank: 0,
      participantId: participant.id,
      nickname: participant.nickname,
      score: participant.score,
      solvedProblems: participant.solvedProblems,
      accuracy: participant.accuracy,
      maxCombo: participant.maxCombo,
      isOnline: participant.isOnline,
      finishedAt: participant.finishedAt,
    })),
  );

  return sortedEntries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

function createRoomHistoryEntry(room: BattleRoom, participants: BattleParticipant[]): BattleRoomHistory {
  const leaderboard = createLeaderboard(participants);

  return {
    roomId: room.id,
    roomCode: room.roomCode,
    config: room.config,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    participants: leaderboard,
    winner: leaderboard[0],
  };
}

function removeUndefinedDeep(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map(removeUndefinedDeep).filter((entry) => entry !== undefined);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([entryKey, entryValue]) => [entryKey, removeUndefinedDeep(entryValue)] as const)
        .filter(([, entryValue]) => entryValue !== undefined),
    );
  }

  return value;
}

function cleanForFirestore<T extends object>(value: T): Record<string, unknown> {
  return removeUndefinedDeep(value) as Record<string, unknown>;
}

function sortHistoryByLatest(history: BattleRoomHistory[]): BattleRoomHistory[] {
  return [...history].sort((a, b) => {
    const aTime = Date.parse(a.endedAt ?? a.startedAt ?? a.createdAt);
    const bTime = Date.parse(b.endedAt ?? b.startedAt ?? b.createdAt);
    return bTime - aTime;
  });
}

async function getRoomParticipants(db: Firestore, roomId: string): Promise<BattleParticipant[]> {
  const snapshot = await getDocs(participantsCollection(db, roomId));
  return snapshot.docs
    .map((participantSnapshot) => toBattleParticipant(participantSnapshot))
    .filter((participant): participant is BattleParticipant => participant !== null);
}

async function findRoomByCode(db: Firestore, roomCode: string): Promise<BattleRoom | null> {
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const directRoomSnapshot = await getDoc(roomDocument(db, normalizedRoomCode));
  const directRoom = toBattleRoom(directRoomSnapshot);

  if (directRoom) {
    return directRoom;
  }

  const roomQuery = query(roomsCollection(db), where('roomCode', '==', normalizedRoomCode), limit(1));
  const snapshot = await getDocs(roomQuery);
  const firstRoom = snapshot.docs[0];

  if (!firstRoom) {
    return null;
  }

  return toBattleRoom(firstRoom);
}

function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function saveRoomHistory(db: Firestore, room: BattleRoom): Promise<void> {
  const participants = await getRoomParticipants(db, room.id);
  const historyEntry = createRoomHistoryEntry(room, participants);
  await setDoc(historyDocument(db, room.id), cleanForFirestore(historyEntry));
}

export const firebaseBattleRoomService: BattleRoomService = {
  async createRoom(input: BattleRoomCreateInput): Promise<BattleRoom> {
    const db = getRequiredDb();
    const createdAt = nowIso();

    for (let attempt = 0; attempt < maxRoomCodeAttempts; attempt += 1) {
      const roomCode = generateRoomCode();
      const roomRef = roomDocument(db, roomCode);
      const room: BattleRoom = {
        id: roomCode,
        roomCode,
        status: 'waiting',
        config: input.config,
        createdAt,
        currentSeed: createCurrentSeed(roomCode, createdAt),
        participantCount: 0,
      };
      let createdRoom: BattleRoom | null = null;

      await runTransaction(db, async (transaction) => {
        const existingRoom = await transaction.get(roomRef);

        if (existingRoom.exists()) {
          return;
        }

        transaction.set(roomRef, cleanForFirestore(room));
        createdRoom = room;
      });

      if (createdRoom) {
        return createdRoom;
      }
    }

    throw new Error('Could not create a unique room code. Please try again.');
  },

  async getRoomByCode(roomCode: string): Promise<BattleRoom | null> {
    const db = getRequiredDb();
    return findRoomByCode(db, roomCode);
  },

  async joinRoom(input: BattleRoomJoinInput): Promise<{ room: BattleRoom; participant: BattleParticipant }> {
    const db = getRequiredDb();
    const room = await findRoomByCode(db, input.roomCode);

    if (!room) {
      throw new Error('Room code was not found.');
    }

    const joinedAt = nowIso();
    const participantRef = doc(participantsCollection(db, room.id));
    const participant: BattleParticipant = {
      id: participantRef.id,
      roomId: room.id,
      nickname: input.nickname.trim(),
      joinedAt,
      isOnline: true,
      score: 0,
      correctInputs: 0,
      wrongInputs: 0,
      solvedProblems: 0,
      maxCombo: 0,
      currentCombo: 0,
      accuracy: 0,
    };
    let joinedRoom: BattleRoom = room;

    await runTransaction(db, async (transaction) => {
      const roomRef = roomDocument(db, room.id);
      const roomSnapshot = await transaction.get(roomRef);
      const currentRoom = toBattleRoom(roomSnapshot);

      if (!currentRoom) {
        throw new Error('Room code was not found.');
      }

      assertRoomCanBeJoined(currentRoom);

      joinedRoom = {
        ...currentRoom,
        participantCount: currentRoom.participantCount + 1,
      };

      transaction.set(participantRef, cleanForFirestore(participant));
      transaction.update(roomRef, {
        participantCount: joinedRoom.participantCount,
      });
    });

    return { room: joinedRoom, participant };
  },

  async leaveRoom(roomId: string, participantId: string): Promise<void> {
    const db = getRequiredDb();
    await updateDoc(participantDocument(db, roomId, participantId), {
      isOnline: false,
    });
  },

  async startRoom(roomId: string): Promise<void> {
    const db = getRequiredDb();

    await runTransaction(db, async (transaction) => {
      const roomRef = roomDocument(db, roomId);
      const roomSnapshot = await transaction.get(roomRef);
      const room = toBattleRoom(roomSnapshot);

      if (!room) {
        return;
      }

      transaction.update(roomRef, {
        status: 'playing',
        startedAt: room.startedAt ?? nowIso(),
      });
    });
  },

  async finishRoom(roomId: string): Promise<void> {
    const db = getRequiredDb();
    const roomRef = roomDocument(db, roomId);
    const roomSnapshot = await getDoc(roomRef);
    const room = toBattleRoom(roomSnapshot);

    if (!room) {
      return;
    }

    const finishedRoom: BattleRoom = {
      ...room,
      status: 'finished',
      endedAt: room.endedAt ?? nowIso(),
    };

    if (room.status !== 'finished') {
      await updateDoc(roomRef, {
        status: finishedRoom.status,
        endedAt: finishedRoom.endedAt,
      });
    }

    await saveRoomHistory(db, finishedRoom);
  },

  async updateParticipantScore(
    roomId: string,
    participantId: string,
    update: Partial<BattleParticipant>,
  ): Promise<void> {
    const db = getRequiredDb();
    const sanitizedUpdate = cleanForFirestore(update);

    if (Object.keys(sanitizedUpdate).length === 0) {
      return;
    }

    await updateDoc(participantDocument(db, roomId, participantId), sanitizedUpdate);

    const roomSnapshot = await getDoc(roomDocument(db, roomId));
    const room = toBattleRoom(roomSnapshot);

    if (room?.status === 'finished') {
      await saveRoomHistory(db, room);
    }
  },

  subscribeRoom(roomId: string, callback: (room: BattleRoom | null) => void): () => void {
    const db = getRequiredDb();

    return onSnapshot(
      roomDocument(db, roomId),
      (snapshot) => {
        callback(toBattleRoom(snapshot));
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.warn('[BattleRoomService] Failed to subscribe room.', error);
        }

        callback(null);
      },
    );
  },

  subscribeParticipants(roomId: string, callback: (participants: BattleParticipant[]) => void): () => void {
    const db = getRequiredDb();

    return onSnapshot(
      participantsCollection(db, roomId),
      (snapshot) => {
        const participants = snapshot.docs
          .map((participantSnapshot) => toBattleParticipant(participantSnapshot))
          .filter((participant): participant is BattleParticipant => participant !== null);

        callback(participants);
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.warn('[BattleRoomService] Failed to subscribe participants.', error);
        }

        callback([]);
      },
    );
  },

  async getRoomHistory(): Promise<BattleRoomHistory[]> {
    const db = getRequiredDb();
    const snapshot = await getDocs(historyCollection(db));
    const history = snapshot.docs
      .map((historySnapshot) => toBattleRoomHistory(historySnapshot))
      .filter((entry): entry is BattleRoomHistory => entry !== null);

    return sortHistoryByLatest(history);
  },
};
