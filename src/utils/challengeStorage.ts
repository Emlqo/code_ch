import type { ChallengeDifficulty, ChallengeRecords, ChallengeResultData } from '../types/challenge';

const CHALLENGE_RECORDS_STORAGE_KEY = 'codeDrawingFiveMinuteChallengeRecords';
const maxRecentRuns = 10;

const challengeDifficulties: readonly ChallengeDifficulty[] = ['easy', 'normal', 'hard', 'mixed'];

function createEmptyRecords(): ChallengeRecords {
  return {
    bestOverall: null,
    bestByDifficulty: {},
    recentRuns: [],
  };
}

function isChallengeDifficulty(value: unknown): value is ChallengeDifficulty {
  return typeof value === 'string' && challengeDifficulties.includes(value as ChallengeDifficulty);
}

function isChallengeResultData(value: unknown): value is ChallengeResultData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as Partial<ChallengeResultData>;

  return (
    typeof result.nickname === 'string' &&
    isChallengeDifficulty(result.difficulty) &&
    (result.duration === 180 || result.duration === 300) &&
    typeof result.score === 'number' &&
    (result.grade === 'S' || result.grade === 'A' || result.grade === 'B' || result.grade === 'C' || result.grade === 'D') &&
    typeof result.accuracy === 'number' &&
    typeof result.solvedProblems === 'number' &&
    typeof result.correctInputs === 'number' &&
    typeof result.wrongInputs === 'number' &&
    typeof result.maxCombo === 'number' &&
    typeof result.playedAt === 'string' &&
    (result.resultCode === undefined || typeof result.resultCode === 'string')
  );
}

function normalizeBestByDifficulty(value: unknown): ChallengeRecords['bestByDifficulty'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<ChallengeRecords['bestByDifficulty']>(
    (records, [difficulty, result]) => {
      if (isChallengeDifficulty(difficulty) && isChallengeResultData(result)) {
        records[difficulty] = result;
      }

      return records;
    },
    {},
  );
}

function isChallengeRecords(value: unknown): value is ChallengeRecords {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const records = value as Partial<ChallengeRecords>;
  const bestOverallIsValid = records.bestOverall === null || isChallengeResultData(records.bestOverall);
  const recentRunsAreValid =
    Array.isArray(records.recentRuns) && records.recentRuns.every((result) => isChallengeResultData(result));

  return bestOverallIsValid && recentRunsAreValid;
}

function normalizeChallengeRecords(value: unknown): ChallengeRecords {
  if (!isChallengeRecords(value)) {
    return createEmptyRecords();
  }

  return {
    bestOverall: value.bestOverall,
    bestByDifficulty: normalizeBestByDifficulty(value.bestByDifficulty),
    recentRuns: value.recentRuns.slice(0, maxRecentRuns),
  };
}

function writeChallengeRecords(records: ChallengeRecords): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(CHALLENGE_RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage failures in restricted browser environments.
  }
}

export function getChallengeRecords(): ChallengeRecords {
  if (typeof window === 'undefined') {
    return createEmptyRecords();
  }

  try {
    const rawRecords = window.localStorage.getItem(CHALLENGE_RECORDS_STORAGE_KEY);

    if (!rawRecords) {
      return createEmptyRecords();
    }

    return normalizeChallengeRecords(JSON.parse(rawRecords));
  } catch {
    return createEmptyRecords();
  }
}

export function isBetterChallengeResult(
  a: ChallengeResultData,
  b: ChallengeResultData | null,
): boolean {
  if (!b) {
    return true;
  }

  if (a.score !== b.score) {
    return a.score > b.score;
  }

  if (a.accuracy !== b.accuracy) {
    return a.accuracy > b.accuracy;
  }

  return a.maxCombo > b.maxCombo;
}

export function saveChallengeResult(result: ChallengeResultData): ChallengeRecords {
  const records = getChallengeRecords();
  const previousDifficultyBest = records.bestByDifficulty[result.difficulty] ?? null;
  const nextRecords: ChallengeRecords = {
    bestOverall: isBetterChallengeResult(result, records.bestOverall) ? result : records.bestOverall,
    bestByDifficulty: {
      ...records.bestByDifficulty,
      ...(isBetterChallengeResult(result, previousDifficultyBest) ? { [result.difficulty]: result } : {}),
    },
    recentRuns: [result, ...records.recentRuns].slice(0, maxRecentRuns),
  };

  writeChallengeRecords(nextRecords);
  return nextRecords;
}

export function resetChallengeRecords(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(CHALLENGE_RECORDS_STORAGE_KEY);
  } catch {
    // Ignore storage failures in restricted browser environments.
  }
}
