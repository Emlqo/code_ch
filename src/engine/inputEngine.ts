import type { Direction, ExecutionCommand } from '../types/game';

export interface InputResult {
  correct: boolean;
  message: string;
  expectedDirection: Direction;
  inputDirection: Direction;
}

const keyToDirection: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

const directionText: Record<Direction, string> = {
  up: 'UP',
  down: 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
};

export function normalizeKeyToDirection(key: string): Direction | null {
  return keyToDirection[key] ?? null;
}

export function checkInput(inputDirection: Direction, expectedCommand: ExecutionCommand): InputResult {
  const expectedDirection = expectedCommand.direction;
  const correct = inputDirection === expectedDirection;

  return {
    correct,
    message: correct
      ? `정답! ${directionText[inputDirection]}를 정확히 입력했어요.`
      : `현재 코드는 ${directionText[expectedDirection]}인데 ${directionText[inputDirection]}를 눌렀어요.`,
    expectedDirection,
    inputDirection,
  };
}
