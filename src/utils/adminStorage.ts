import type { CodeDisplayMode } from '../types/admin';

const STAGE_ORDER_STORAGE_KEY = 'codeDrawingStageOrder';
const STAGE_CODE_DISPLAY_MODES_STORAGE_KEY = 'codeDrawingStageCodeDisplayModes';

interface StoredStageOrder {
  orderedStageIds: string[];
}

function isStoredStageOrder(value: unknown): value is StoredStageOrder {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeOrder = value as Partial<StoredStageOrder>;
  return Array.isArray(maybeOrder.orderedStageIds) && maybeOrder.orderedStageIds.every((stageId) => typeof stageId === 'string');
}

function isCodeDisplayMode(value: unknown): value is CodeDisplayMode {
  return value === 'pseudocode' || value === 'cStyle';
}

function isStageCodeDisplayModes(value: unknown): value is Record<string, CodeDisplayMode> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(([stageId, mode]) => typeof stageId === 'string' && isCodeDisplayMode(mode));
}

export function getSavedStageOrder(): string[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STAGE_ORDER_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    return isStoredStageOrder(parsedValue) ? parsedValue.orderedStageIds : null;
  } catch {
    return null;
  }
}

export function saveStageOrder(stageIds: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      STAGE_ORDER_STORAGE_KEY,
      JSON.stringify({
        orderedStageIds: stageIds,
      }),
    );
  } catch {
    // localStorage 접근이 막힌 환경에서는 순서 저장만 건너뜁니다.
  }
}

export function resetStageOrder(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(STAGE_ORDER_STORAGE_KEY);
  } catch {
    // localStorage 접근이 막힌 환경에서는 초기화만 건너뜁니다.
  }
}

export function getStageCodeDisplayModes(): Record<string, CodeDisplayMode> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(STAGE_CODE_DISPLAY_MODES_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    return isStageCodeDisplayModes(parsedValue) ? parsedValue : {};
  } catch {
    return {};
  }
}

export function saveStageCodeDisplayMode(stageId: string, mode: CodeDisplayMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      STAGE_CODE_DISPLAY_MODES_STORAGE_KEY,
      JSON.stringify({
        ...getStageCodeDisplayModes(),
        [stageId]: mode,
      }),
    );
  } catch {
    // localStorage access can fail in restricted browser environments.
  }
}

export function saveAllStageCodeDisplayModes(stageIds: string[], mode: CodeDisplayMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const nextModes = stageIds.reduce<Record<string, CodeDisplayMode>>((modes, stageId) => {
      modes[stageId] = mode;
      return modes;
    }, {});

    window.localStorage.setItem(STAGE_CODE_DISPLAY_MODES_STORAGE_KEY, JSON.stringify(nextModes));
  } catch {
    // localStorage access can fail in restricted browser environments.
  }
}

export function resetStageCodeDisplayModes(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(STAGE_CODE_DISPLAY_MODES_STORAGE_KEY);
  } catch {
    // localStorage access can fail in restricted browser environments.
  }
}

export function getCodeDisplayModeForStage(stageId: string): CodeDisplayMode {
  return getStageCodeDisplayModes()[stageId] ?? 'pseudocode';
}
