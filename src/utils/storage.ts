import type { Stage } from '../types/game';

const STORAGE_KEY = 'codeDrawingChallengeStageProgress';

export interface StageResult {
  cleared: boolean;
  bestMistakes: number;
  bestCombo: number;
  stars: number;
  clearedAt: string;
}

export type StageProgressMap = Record<number, StageResult>;

export type SaveStageResultInput = Omit<StageResult, 'cleared' | 'clearedAt'> & {
  clearedAt?: string;
};

function isStageResult(value: unknown): value is StageResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as Partial<StageResult>;
  return (
    typeof result.cleared === 'boolean' &&
    typeof result.bestMistakes === 'number' &&
    typeof result.bestCombo === 'number' &&
    typeof result.stars === 'number' &&
    typeof result.clearedAt === 'string'
  );
}

function normalizeProgress(rawProgress: unknown): StageProgressMap {
  if (!rawProgress || typeof rawProgress !== 'object') {
    return {};
  }

  return Object.entries(rawProgress as Record<string, unknown>).reduce<StageProgressMap>((progress, [stageId, result]) => {
    const numericStageId = Number(stageId);

    if (Number.isInteger(numericStageId) && isStageResult(result)) {
      progress[numericStageId] = result;
    }

    return progress;
  }, {});
}

function writeProgress(progress: StageProgressMap): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 저장소 접근이 막힌 환경에서는 진행 저장만 건너뜁니다.
  }
}

export function getStageProgress(): StageProgressMap {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawProgress = window.localStorage.getItem(STORAGE_KEY);

    if (!rawProgress) {
      return {};
    }

    return normalizeProgress(JSON.parse(rawProgress));
  } catch {
    return {};
  }
}

export function getStageResult(stageId: number): StageResult | null {
  return getStageProgress()[stageId] ?? null;
}

export function saveStageResult(stageId: number, result: SaveStageResultInput): StageProgressMap {
  const progress = getStageProgress();
  const previousResult = progress[stageId];
  const shouldUpdate =
    !previousResult ||
    result.stars > previousResult.stars ||
    (result.stars === previousResult.stars && result.bestMistakes < previousResult.bestMistakes);

  if (!shouldUpdate) {
    return progress;
  }

  const nextProgress: StageProgressMap = {
    ...progress,
    [stageId]: {
      cleared: true,
      bestMistakes: result.bestMistakes,
      bestCombo: Math.max(previousResult?.bestCombo ?? 0, result.bestCombo),
      stars: result.stars,
      clearedAt: result.clearedAt ?? new Date().toISOString(),
    },
  };

  writeProgress(nextProgress);
  return nextProgress;
}

export function isStageUnlocked(stageId: number, stages: Stage[]): boolean {
  const stageIndex = stages.findIndex((stage) => stage.id === stageId);

  if (stageIndex <= 0) {
    return stageIndex === 0;
  }

  const previousStage = stages[stageIndex - 1];
  return getStageResult(previousStage.id)?.cleared ?? false;
}

export function resetProgress(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장소 접근이 막힌 환경에서는 무시합니다.
  }
}
