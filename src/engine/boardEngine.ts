import type { BoardCell, Direction, GameProgress, GameSnapshot, MoveResult, Position, Stage } from '../types/game';

type MovableGameState = Pick<GameProgress, 'currentPosition'> | Pick<GameSnapshot, 'player'>;

const directionDelta: Record<Direction, Position> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

export function getNextPosition(position: Position, direction: Direction): Position {
  const delta = directionDelta[direction];

  return {
    row: position.row + delta.row,
    col: position.col + delta.col,
  };
}

export function isSamePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isInsideBoard(position: Position, board: BoardCell[][]): boolean {
  const rowCount = board.length;
  const colCount = board[0]?.length ?? 0;

  return position.row >= 0 && position.row < rowCount && position.col >= 0 && position.col < colCount;
}

export function canMoveTo(position: Position, board: BoardCell[][]): boolean {
  if (!isInsideBoard(position, board)) {
    return false;
  }

  const cell = board[position.row][position.col];
  return cell.type !== 'wall' && cell.type !== 'blocked';
}

export function applyMove(gameState: MovableGameState, direction: Direction, stage: Stage): MoveResult {
  const currentPosition = 'currentPosition' in gameState ? gameState.currentPosition : gameState.player.position;
  const nextPosition = getNextPosition(currentPosition, direction);

  if (!isInsideBoard(nextPosition, stage.board)) {
    return {
      success: false,
      newPosition: currentPosition,
      message: '보드 밖으로 이동할 수 없어요.',
    };
  }

  if (!canMoveTo(nextPosition, stage.board)) {
    return {
      success: false,
      newPosition: currentPosition,
      message: '벽으로 이동할 수 없어요.',
    };
  }

  return {
    success: true,
    newPosition: nextPosition,
    paintedKey: `${nextPosition.row}-${nextPosition.col}`,
    message: '좋아요. 이동한 칸이 색칠되었어요.',
  };
}

export function createBoard(stage: Stage): BoardCell[][] {
  return stage.board.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const position = { row: rowIndex, col: colIndex };
      return {
        ...cell,
        isPainted: cell.isPainted || isSamePosition(position, stage.startPosition),
      };
    }),
  );
}

export function createInitialSnapshot(stage: Stage): GameSnapshot {
  return {
    board: createBoard(stage),
    player: {
      position: stage.startPosition,
      direction: 'right',
    },
    moveCount: 0,
    message: '의사코드를 보고 방향키를 눌러 그림을 완성해 보세요.',
  };
}

export function paintCell(board: BoardCell[][], position: Position): BoardCell[][] {
  return board.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (!isSamePosition({ row: rowIndex, col: colIndex }, position)) {
        return cell;
      }

      const paintColor = cell.targetColor && cell.targetColor !== 'transparent' ? cell.targetColor : cell.color;

      return {
        ...cell,
        isPainted: true,
        color: paintColor === 'transparent' ? '#bae6fd' : paintColor,
      };
    }),
  );
}

export function countPaintedTargets(board: BoardCell[][]): number {
  return board.flat().filter((cell) => isTargetCell(cell) && cell.isPainted).length;
}

export function countTargetCells(board: BoardCell[][]): number {
  return board.flat().filter((cell) => isTargetCell(cell)).length;
}

function isTargetCell(cell: BoardCell): boolean {
  return cell.type === 'paint' || cell.type === 'checkpoint';
}
