import type { Direction } from '../types/game';

export const directionLabel: Record<Direction, string> = {
  up: '위',
  right: '오른쪽',
  down: '아래',
  left: '왼쪽',
};

export const directionArrow: Record<Direction, string> = {
  up: '↑',
  right: '→',
  down: '↓',
  left: '←',
};
