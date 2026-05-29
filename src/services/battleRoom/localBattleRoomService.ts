import type {
  BattleLeaderboardEntry,
  BattleParticipant,
  BattleRoom,
  BattleRoomCreateInput,
  BattleRoomHistory,
  BattleRoomJoinInput,
  BattleRoomService,
} from '../../types/battleRoom';

const ROOMS_STORAGE_KEY = 'codeRunBattleRooms';
const PARTICIPANTS_STORAGE_KEY = 'codeRunBattleParticipants';
const HISTORY_STORAGE_KEY = 'codeRunBattleHistory';
const subscriptionIntervalMs = 1000;

function nowIso(): string {
  return new Date().toISOString();
}

function createStorageSafeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in restricted browser environments.
  }
}

function readRooms(): BattleRoom[] {
  return readJson<BattleRoom[]>(ROOMS_STORAGE_KEY, []);
}

function writeRooms(rooms: BattleRoom[]): void {
  writeJson(ROOMS_STORAGE_KEY, rooms);
}

function readParticipants(): BattleParticipant[] {
  return readJson<BattleParticipant[]>(PARTICIPANTS_STORAGE_KEY, []);
}

function writeParticipants(participants: BattleParticipant[]): void {
  writeJson(PARTICIPANTS_STORAGE_KEY, participants);
}

function readHistory(): BattleRoomHistory[] {
  return readJson<BattleRoomHistory[]>(HISTORY_STORAGE_KEY, []);
}

function writeHistory(history: BattleRoomHistory[]): void {
  writeJson(HISTORY_STORAGE_KEY, history);
}

function getRoomParticipants(roomId: string): BattleParticipant[] {
  return readParticipants().filter((participant) => participant.roomId === roomId);
}

function replaceRoom(room: BattleRoom): void {
  const rooms = readRooms();
  writeRooms(rooms.map((currentRoom) => (currentRoom.id === room.id ? room : currentRoom)));
}

function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

export function generateRoomCode(): string {
  const existingRoomCodes = new Set(readRooms().map((room) => room.roomCode));

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const roomCode = String(Math.floor(100000 + Math.random() * 900000));

    if (!existingRoomCodes.has(roomCode)) {
      return roomCode;
    }
  }

  return String(Date.now()).slice(-6);
}

export function sortLeaderboard(entries: BattleLeaderboardEntry[]): BattleLeaderboardEntry[] {
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

export function createLeaderboard(participants: BattleParticipant[]): BattleLeaderboardEntry[] {
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

function createCurrentSeed(roomCode: string, createdAt: string): string {
  return `code-run-battle-${roomCode}-${createdAt}`;
}

function assertRoomCanBeJoined(room: BattleRoom): void {
  const canJoinByStatus = room.status === 'waiting' || (room.status === 'playing' && room.config.allowLateJoin);

  if (!canJoinByStatus) {
    throw new Error('현재 입장할 수 없는 배틀룸입니다.');
  }

  if (room.participantCount >= room.config.maxParticipants) {
    throw new Error('배틀룸 최대 참여 인원을 초과했습니다.');
  }
}

function createRoomHistoryEntry(room: BattleRoom): BattleRoomHistory {
  const leaderboard = createLeaderboard(getRoomParticipants(room.id));

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

function saveRoomHistory(room: BattleRoom): void {
  const history = readHistory();
  const historyEntry = createRoomHistoryEntry(room);
  const existingIndex = history.findIndex((entry) => entry.roomId === room.id);

  if (existingIndex >= 0) {
    const nextHistory = [...history];
    nextHistory[existingIndex] = historyEntry;
    writeHistory(nextHistory);
    return;
  }

  writeHistory([historyEntry, ...history]);
}

/**
 * Development-only localStorage BattleRoomService.
 * It lets one browser simulate room creation, joining, scoring, ranking, and history
 * before Firebase config is available. Replace this implementation with a Firebase
 * implementation behind the same BattleRoomService interface later.
 */
export const localBattleRoomService: BattleRoomService = {
  async createRoom(input: BattleRoomCreateInput): Promise<BattleRoom> {
    const createdAt = nowIso();
    const roomCode = generateRoomCode();
    const room: BattleRoom = {
      id: createStorageSafeId('room'),
      roomCode,
      status: 'waiting',
      config: input.config,
      createdAt,
      currentSeed: createCurrentSeed(roomCode, createdAt),
      participantCount: 0,
    };

    writeRooms([...readRooms(), room]);
    return room;
  },

  async getRoomByCode(roomCode: string): Promise<BattleRoom | null> {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    return readRooms().find((room) => room.roomCode === normalizedRoomCode) ?? null;
  },

  async joinRoom(input: BattleRoomJoinInput): Promise<{ room: BattleRoom; participant: BattleParticipant }> {
    const normalizedRoomCode = normalizeRoomCode(input.roomCode);
    const rooms = readRooms();
    const room = rooms.find((candidate) => candidate.roomCode === normalizedRoomCode);

    if (!room) {
      throw new Error('입장 코드를 찾을 수 없습니다.');
    }

    assertRoomCanBeJoined(room);

    const participant: BattleParticipant = {
      id: createStorageSafeId('participant'),
      roomId: room.id,
      nickname: input.nickname.trim(),
      joinedAt: nowIso(),
      isOnline: true,
      score: 0,
      correctInputs: 0,
      wrongInputs: 0,
      solvedProblems: 0,
      maxCombo: 0,
      currentCombo: 0,
      accuracy: 0,
    };
    const nextRoom: BattleRoom = {
      ...room,
      participantCount: room.participantCount + 1,
    };

    writeParticipants([...readParticipants(), participant]);
    writeRooms(rooms.map((currentRoom) => (currentRoom.id === room.id ? nextRoom : currentRoom)));

    return { room: nextRoom, participant };
  },

  async leaveRoom(roomId: string, participantId: string): Promise<void> {
    writeParticipants(
      readParticipants().map((participant) =>
        participant.roomId === roomId && participant.id === participantId
          ? { ...participant, isOnline: false }
          : participant,
      ),
    );
  },

  async startRoom(roomId: string): Promise<void> {
    const room = readRooms().find((candidate) => candidate.id === roomId);

    if (!room) {
      return;
    }

    replaceRoom({
      ...room,
      status: 'playing',
      startedAt: room.startedAt ?? nowIso(),
    });
  },

  async finishRoom(roomId: string): Promise<void> {
    const room = readRooms().find((candidate) => candidate.id === roomId);

    if (!room) {
      return;
    }

    const finishedRoom: BattleRoom = {
      ...room,
      status: 'finished',
      endedAt: room.endedAt ?? nowIso(),
    };

    replaceRoom(finishedRoom);
    saveRoomHistory(finishedRoom);
  },

  async updateParticipantScore(
    roomId: string,
    participantId: string,
    update: Partial<BattleParticipant>,
  ): Promise<void> {
    writeParticipants(
      readParticipants().map((participant) =>
        participant.roomId === roomId && participant.id === participantId
          ? { ...participant, ...update, id: participant.id, roomId: participant.roomId }
          : participant,
      ),
    );

    const room = readRooms().find((candidate) => candidate.id === roomId);

    if (room?.status === 'finished') {
      saveRoomHistory(room);
    }
  },

  subscribeRoom(roomId: string, callback: (room: BattleRoom | null) => void): () => void {
    callback(readRooms().find((room) => room.id === roomId) ?? null);

    const intervalId = window.setInterval(() => {
      callback(readRooms().find((room) => room.id === roomId) ?? null);
    }, subscriptionIntervalMs);

    return () => window.clearInterval(intervalId);
  },

  subscribeParticipants(roomId: string, callback: (participants: BattleParticipant[]) => void): () => void {
    callback(getRoomParticipants(roomId));

    const intervalId = window.setInterval(() => {
      callback(getRoomParticipants(roomId));
    }, subscriptionIntervalMs);

    return () => window.clearInterval(intervalId);
  },

  async getRoomHistory(): Promise<BattleRoomHistory[]> {
    return readHistory();
  },
};
