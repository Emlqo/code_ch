import type { CodeNode, Direction, ExecutionCommand } from './game';

/** Challenge duration in seconds. */
export type ChallengeDuration = 180 | 300;

/** Difficulty option selected before starting a challenge run. */
export type ChallengeDifficulty = 'easy' | 'normal' | 'hard' | 'mixed';

/** Challenge problem generation mode. */
export type ChallengeMode = 'random' | 'daily';

/**
 * First supported challenge problem types.
 *
 * TODO: Later problem types may include "if", "blank", and "debug".
 */
export type ChallengeProblemType = 'sequence' | 'for';

/** A single generated challenge problem. */
export interface ChallengeProblem {
  id: string;
  type: ChallengeProblemType;
  difficulty: ChallengeDifficulty;
  title: string;
  code: CodeNode[];
  executionQueue: ExecutionCommand[];
  solutionInput: Direction[];
  bonusScore: number;
  estimatedDifficultyLabel?: string;
}

/** User-selected options for starting a challenge run. */
export interface ChallengeSetupConfig {
  nickname: string;
  duration: ChallengeDuration;
  difficulty: ChallengeDifficulty;
  mode: ChallengeMode;
}

/** High-level screen/status state for the challenge mode. */
export type ChallengeStatus = 'setup' | 'playing' | 'finished';

/** Mutable gameplay stats tracked during an active challenge run. */
export interface ChallengeStats {
  score: number;
  correctInputs: number;
  wrongInputs: number;
  solvedProblems: number;
  combo: number;
  maxCombo: number;
  currentProblemIndex: number;
  currentCommandIndex: number;
  remainingTime: number;
  startedAt: number;
  endedAt?: number;
}

/** Final grade derived from a challenge score. */
export type ChallengeGrade = 'S' | 'A' | 'B' | 'C' | 'D';

/** Persistable result data for one completed challenge run. */
export interface ChallengeResultData {
  nickname: string;
  difficulty: ChallengeDifficulty;
  duration: ChallengeDuration;
  score: number;
  grade: ChallengeGrade;
  accuracy: number;
  solvedProblems: number;
  correctInputs: number;
  wrongInputs: number;
  maxCombo: number;
  playedAt: string;
  resultCode?: string;
}

/** localStorage-friendly challenge records. */
export interface ChallengeRecords {
  bestOverall: ChallengeResultData | null;
  bestByDifficulty: Partial<Record<ChallengeDifficulty, ChallengeResultData>>;
  /** TODO: Add daily challenge best records by date/difficulty/duration when the daily mode ranking is expanded. */
  recentRuns: ChallengeResultData[];
}
