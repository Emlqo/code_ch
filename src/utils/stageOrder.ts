import type { Stage } from '../types/game';

export function toStageOrderId(stageId: number): string {
  return `stage-${stageId}`;
}

export function fromStageOrderId(stageOrderId: string): number | null {
  const match = /^stage-(\d+)$/.exec(stageOrderId);

  if (!match) {
    return null;
  }

  const numericStageId = Number(match[1]);
  return Number.isInteger(numericStageId) ? numericStageId : null;
}

export function applyStageOrder(stages: readonly Stage[], orderedStageIds: readonly string[] | null): Stage[] {
  if (!orderedStageIds || orderedStageIds.length === 0) {
    return [...stages];
  }

  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const usedStageIds = new Set<number>();
  const orderedStages: Stage[] = [];

  orderedStageIds.forEach((stageOrderId) => {
    const stageId = fromStageOrderId(stageOrderId);

    if (stageId === null || usedStageIds.has(stageId)) {
      return;
    }

    const stage = stageById.get(stageId);

    if (!stage) {
      return;
    }

    orderedStages.push(stage);
    usedStageIds.add(stageId);
  });

  stages.forEach((stage) => {
    if (!usedStageIds.has(stage.id)) {
      orderedStages.push(stage);
    }
  });

  return orderedStages;
}

export function getStageOrderIds(stages: readonly Stage[]): string[] {
  return stages.map((stage) => toStageOrderId(stage.id));
}
