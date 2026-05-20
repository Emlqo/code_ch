import { canMoveTo, getNextPosition, isInsideBoard } from '../engine/boardEngine';
import { buildExecutionQueueWithConditions, validateCode } from '../engine/codeParser';
import type { BoardCell, Direction, Position, Stage } from '../types/game';

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationResult {
  stageId: number;
  title: string;
  valid: boolean;
  commandCount: number;
  paintedTargetCount: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationSummary {
  valid: boolean;
  totalStages: number;
  validStages: number;
  invalidStages: number;
  results: ValidationResult[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const requiredStringFields = ['chapter', 'title', 'description', 'concept', 'difficulty', 'targetImageName'] as const;

function positionKey(position: Position): string {
  return `${position.row}-${position.col}`;
}

function hasPaintTarget(cell: BoardCell): boolean {
  return (cell.type === 'start' || cell.type === 'paint' || cell.type === 'checkpoint') && cell.targetColor !== 'transparent';
}

function hasVisiblePaintColor(cell: BoardCell): boolean {
  return cell.targetColor !== 'transparent' || cell.color !== 'transparent';
}

function directionsEqual(a: readonly Direction[], b: readonly Direction[]): boolean {
  return a.length === b.length && a.every((direction, index) => direction === b[index]);
}

function addIssue(issues: ValidationIssue[], code: string, message: string): void {
  issues.push({ code, message });
}

function validateRequiredFields(stage: Stage, errors: ValidationIssue[], warnings: ValidationIssue[]): void {
  if (!Number.isInteger(stage.id)) {
    addIssue(errors, 'missing-id', 'stage.id는 정수여야 합니다.');
  }

  requiredStringFields.forEach((fieldName) => {
    if (typeof stage[fieldName] !== 'string' || stage[fieldName].trim().length === 0) {
      addIssue(errors, `missing-${fieldName}`, `stage.${fieldName} 값이 비어 있습니다.`);
    }
  });

  if (!Array.isArray(stage.code) || stage.code.length === 0) {
    addIssue(errors, 'missing-code', 'stage.code는 비어 있지 않은 CodeNode 배열이어야 합니다.');
  }

  if (!Array.isArray(stage.solutionInput) || stage.solutionInput.length === 0) {
    addIssue(errors, 'missing-solution-input', 'stage.solutionInput은 비어 있지 않은 Direction 배열이어야 합니다.');
  }

  if (!Array.isArray(stage.hints) || stage.hints.length === 0) {
    addIssue(errors, 'missing-hints', 'stage.hints는 비어 있지 않은 문자열 배열이어야 합니다.');
  } else if (stage.hints.length < 3) {
    addIssue(warnings, 'few-hints', '힌트가 3개 미만입니다.');
  }

  if (!stage.startPosition || !Number.isInteger(stage.startPosition.row) || !Number.isInteger(stage.startPosition.col)) {
    addIssue(errors, 'missing-start-position', 'stage.startPosition에는 row와 col 정수가 필요합니다.');
  }

  if (!Number.isInteger(stage.maxMistakes) || stage.maxMistakes < 0) {
    addIssue(errors, 'invalid-max-mistakes', 'stage.maxMistakes는 0 이상의 정수여야 합니다.');
  }
}

function validateBoardShape(stage: Stage, errors: ValidationIssue[]): void {
  if (!Array.isArray(stage.board) || stage.board.length === 0) {
    addIssue(errors, 'missing-board', 'stage.board는 비어 있지 않은 2차원 배열이어야 합니다.');
    return;
  }

  const columnCount = stage.board[0]?.length ?? 0;

  if (columnCount === 0) {
    addIssue(errors, 'empty-board-row', 'stage.board의 첫 번째 행이 비어 있습니다.');
    return;
  }

  stage.board.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== columnCount) {
      addIssue(errors, 'ragged-board', `stage.board[${rowIndex}]의 길이가 다른 행과 다릅니다.`);
    }
  });

  if (!isInsideBoard(stage.startPosition, stage.board)) {
    addIssue(errors, 'start-outside-board', `시작 위치 (${stage.startPosition.row}, ${stage.startPosition.col})가 보드 밖입니다.`);
  }
}

function simulateSolution(stage: Stage, errors: ValidationIssue[]): Set<string> {
  const paintedKeys = new Set<string>();
  let currentPosition = stage.startPosition;

  if (isInsideBoard(currentPosition, stage.board)) {
    paintedKeys.add(positionKey(currentPosition));
  }

  stage.solutionInput.forEach((direction, index) => {
    const nextPosition = getNextPosition(currentPosition, direction);

    if (!isInsideBoard(nextPosition, stage.board)) {
      addIssue(
        errors,
        'path-outside-board',
        `${index + 1}번째 입력(${direction}) 후 위치 (${nextPosition.row}, ${nextPosition.col})가 보드 밖입니다.`,
      );
      return;
    }

    if (!canMoveTo(nextPosition, stage.board)) {
      addIssue(
        errors,
        'path-hits-wall',
        `${index + 1}번째 입력(${direction}) 후 위치 (${nextPosition.row}, ${nextPosition.col})가 벽 또는 blocked 칸입니다.`,
      );
      return;
    }

    const nextCell = stage.board[nextPosition.row][nextPosition.col];

    if (!hasVisiblePaintColor(nextCell)) {
      addIssue(
        errors,
        'paint-color-missing',
        `${index + 1}번째 입력 위치 (${nextPosition.row}, ${nextPosition.col})에 칠할 색이 없습니다.`,
      );
    }

    paintedKeys.add(positionKey(nextPosition));
    currentPosition = nextPosition;
  });

  return paintedKeys;
}

function validatePaintTargets(stage: Stage, paintedKeys: Set<string>, errors: ValidationIssue[]): number {
  let paintedTargetCount = 0;

  stage.board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!hasPaintTarget(cell)) {
        return;
      }

      const key = `${rowIndex}-${colIndex}`;

      if (paintedKeys.has(key)) {
        paintedTargetCount += 1;
        return;
      }

      addIssue(errors, 'unpainted-target', `목표 칸 (${rowIndex}, ${colIndex})이 solutionInput 경로에서 색칠되지 않습니다.`);
    });
  });

  return paintedTargetCount;
}

export function validateStage(stage: Stage): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let commandCount = 0;

  validateRequiredFields(stage, errors, warnings);
  validateBoardShape(stage, errors);

  const parseResult = validateCode(stage.code);

  if (!parseResult.success) {
    addIssue(errors, 'code-parser-error', parseResult.message);
  }

  const executionQueue = buildExecutionQueueWithConditions(stage.code, stage.startPosition, stage.board);
  const queueDirections = executionQueue.map((command) => command.direction);
  commandCount = executionQueue.length;

  if (!directionsEqual(queueDirections, stage.solutionInput)) {
    addIssue(
      errors,
      'solution-input-mismatch',
      `executionQueue(${queueDirections.join(', ')})와 solutionInput(${stage.solutionInput.join(', ')})이 일치하지 않습니다.`,
    );
  }

  if (executionQueue.length === 0) {
    addIssue(errors, 'empty-execution-queue', '모든 명령 실행 후 실행 큐가 비어 있습니다.');
  }

  const paintedKeys = simulateSolution(stage, errors);
  const paintedTargetCount = validatePaintTargets(stage, paintedKeys, errors);

  if (stage.solutionInput.length !== executionQueue.length) {
    addIssue(
      errors,
      'command-count-mismatch',
      `solutionInput 길이(${stage.solutionInput.length})와 실행 명령 수(${executionQueue.length})가 다릅니다.`,
    );
  }

  return {
    stageId: stage.id,
    title: stage.title,
    valid: errors.length === 0,
    commandCount,
    paintedTargetCount,
    errors,
    warnings,
  };
}

export function validateAllStages(stages: readonly Stage[]): ValidationSummary {
  const results = stages.map(validateStage);
  const errors = results.flatMap((result) =>
    result.errors.map((issue) => ({
      code: `stage-${result.stageId}:${issue.code}`,
      message: `[${result.stageId}. ${result.title}] ${issue.message}`,
    })),
  );
  const warnings = results.flatMap((result) =>
    result.warnings.map((issue) => ({
      code: `stage-${result.stageId}:${issue.code}`,
      message: `[${result.stageId}. ${result.title}] ${issue.message}`,
    })),
  );
  const validStages = results.filter((result) => result.valid).length;

  return {
    valid: errors.length === 0,
    totalStages: stages.length,
    validStages,
    invalidStages: stages.length - validStages,
    results,
    errors,
    warnings,
  };
}

export function logStageValidationSummary(summary: ValidationSummary): void {
  const heading = summary.valid
    ? `[StageValidator] 모든 스테이지 검증 통과 (${summary.validStages}/${summary.totalStages})`
    : `[StageValidator] 스테이지 검증 실패 (${summary.invalidStages}/${summary.totalStages})`;

  if (summary.valid) {
    console.info(heading);
  } else {
    console.error(heading);
    console.table(summary.errors);
  }

  if (summary.warnings.length > 0) {
    console.warn(`[StageValidator] 경고 ${summary.warnings.length}개`);
    console.table(summary.warnings);
  }
}
