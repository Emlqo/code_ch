import type {
  ChallengeDifficulty,
  ChallengeDuration,
  ChallengeGrade,
  ChallengeResultData,
  ChallengeSetupConfig,
} from './challenge';

/** Battle room lifecycle status. */
export type BattleRoomStatus = 'waiting' | 'countdown' | 'playing' | 'finished' | 'cancelled';

/** User role inside a battle room. */
export type BattleRoomRole = 'teacher' | 'student';

/** Teacher-selected configuration for one Code Run battle room. */
export interface BattleRoomConfig {
  duration: ChallengeDuration;
  difficulty: ChallengeDifficulty;
  mode: ChallengeSetupConfig['mode'];
  maxParticipants: number;
  allowLateJoin: boolean;
  showLiveRanking: boolean;
}

/** A live or completed battle room. */
export interface BattleRoom {
  id: string;
  roomCode: string;
  status: BattleRoomStatus;
  config: BattleRoomConfig;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  currentSeed: string;
  participantCount: number;
}

/** One student participant's current battle state and score snapshot. */
export interface BattleParticipant {
  id: string;
  roomId: string;
  nickname: string;
  joinedAt: string;
  isOnline: boolean;
  score: number;
  correctInputs: number;
  wrongInputs: number;
  solvedProblems: number;
  maxCombo: number;
  currentCombo: number;
  accuracy: number;
  finishedAt?: string;
  resultCode?: string;
}

/** Ranking row derived from battle participants. */
export interface BattleLeaderboardEntry {
  rank: number;
  participantId: string;
  nickname: string;
  score: number;
  solvedProblems: number;
  accuracy: number;
  maxCombo: number;
  isOnline: boolean;
  finishedAt?: string;
}

/** Input for creating a new battle room. */
export interface BattleRoomCreateInput {
  config: BattleRoomConfig;
}

/** Input for joining an existing battle room. */
export interface BattleRoomJoinInput {
  roomCode: string;
  nickname: string;
}

/** Persisted summary for a completed battle room. */
export interface BattleRoomHistory {
  roomId: string;
  roomCode: string;
  config: BattleRoomConfig;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  participants: BattleLeaderboardEntry[];
  winner?: BattleLeaderboardEntry;
}

/** Service contract that can be implemented by localStorage first and Firebase later. */
export interface BattleRoomService {
  createRoom(input: BattleRoomCreateInput): Promise<BattleRoom>;
  getRoomByCode(roomCode: string): Promise<BattleRoom | null>;
  joinRoom(input: BattleRoomJoinInput): Promise<{ room: BattleRoom; participant: BattleParticipant }>;
  leaveRoom(roomId: string, participantId: string): Promise<void>;
  startRoom(roomId: string): Promise<void>;
  finishRoom(roomId: string): Promise<void>;
  updateParticipantScore(
    roomId: string,
    participantId: string,
    update: Partial<BattleParticipant>,
  ): Promise<void>;
  subscribeRoom(roomId: string, callback: (room: BattleRoom | null) => void): () => void;
  subscribeParticipants(roomId: string, callback: (participants: BattleParticipant[]) => void): () => void;
  getRoomHistory(): Promise<BattleRoomHistory[]>;
}

/** Optional adapter shape for converting personal Code Run results into battle score updates later. */
export interface BattleResultPayload {
  result: ChallengeResultData;
  grade: ChallengeGrade;
}
