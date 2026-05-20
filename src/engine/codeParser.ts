import { canMoveTo, getNextPosition, isInsideBoard } from './boardEngine';
import type { BoardCell, CodeNode, ConditionType, Direction, ExecutionCommand, Position } from '../types/game';

export interface DisplayCodeLine {
  id: string;
  text: string;
  depth: number;
  nodeType: CodeNode['type'] | 'else';
  commandIndex?: number;
  description?: string;
}

export interface ConditionEvaluation {
  sourceLineId: string;
  condition: ConditionType;
  checkDirection: Direction;
  result: boolean;
  branch: 'then' | 'else';
  text: string;
}

export type ParseResult =
  | {
      success: true;
      queue: ExecutionCommand[];
      displayLines: DisplayCodeLine[];
    }
  | {
      success: false;
      message: string;
    };

const validDirections: readonly Direction[] = ['up', 'down', 'left', 'right'];

const directionText: Record<Direction, string> = {
  up: 'UP',
  down: 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
};

const directionLabel: Record<Direction, string> = {
  up: '위쪽',
  down: '아래쪽',
  left: '왼쪽',
  right: '오른쪽',
};

const moveDescription: Record<Direction, string> = {
  up: '위쪽 방향키를 누르세요.',
  down: '아래쪽 방향키를 누르세요.',
  left: '왼쪽 방향키를 누르세요.',
  right: '오른쪽 방향키를 누르세요.',
};

const conditionText: Record<ConditionType, string> = {
  nextTileIsBlue: 'NEXT TILE IS BLUE',
  nextTileIsRed: 'NEXT TILE IS RED',
  nextTileIsYellow: 'NEXT TILE IS YELLOW',
  frontIsWall: 'FRONT IS WALL',
  pathIsOpen: 'PATH IS OPEN',
};

const conditionDescription: Record<ConditionType, string> = {
  nextTileIsBlue: '지정한 방향의 다음 칸이 파란색인지 확인합니다.',
  nextTileIsRed: '지정한 방향의 다음 칸이 빨간색인지 확인합니다.',
  nextTileIsYellow: '지정한 방향의 다음 칸이 노란색인지 확인합니다.',
  frontIsWall: '지정한 방향의 다음 칸이 벽인지 확인합니다.',
  pathIsOpen: '지정한 방향으로 이동할 수 있는지 확인합니다.',
};

const colorConditions: ReadonlySet<ConditionType> = new Set(['nextTileIsBlue', 'nextTileIsRed', 'nextTileIsYellow']);

function isDirection(value: string): value is Direction {
  return validDirections.includes(value as Direction);
}

function getNodeType(node: CodeNode): string {
  return (node as { type?: string }).type ?? 'unknown';
}

function getSourceLineId(node: CodeNode, fallbackId: string): string {
  return node.sourceLineId ?? node.id ?? fallbackId;
}

function getCellColor(cell: BoardCell | undefined): string {
  return (cell?.targetColor && cell.targetColor !== 'transparent' ? cell.targetColor : cell?.color ?? '').toLowerCase();
}

function isBlue(color: string): boolean {
  return ['#38bdf8', '#06b6d4', '#0ea5e9', '#3b82f6'].includes(color);
}

function isRed(color: string): boolean {
  return ['#ef4444', '#f43f5e', '#fb7185', '#dc2626'].includes(color);
}

function isYellow(color: string): boolean {
  return ['#facc15', '#eab308', '#fbbf24', '#fde047'].includes(color);
}

export function evaluateCondition(
  condition: ConditionType,
  checkDirection: Direction = 'right',
  position: Position,
  board: BoardCell[][],
): boolean {
  const nextPosition = getNextPosition(position, checkDirection);
  const nextCell = isInsideBoard(nextPosition, board) ? board[nextPosition.row][nextPosition.col] : undefined;
  const nextColor = getCellColor(nextCell);

  if (condition === 'nextTileIsBlue') {
    return isBlue(nextColor);
  }

  if (condition === 'nextTileIsRed') {
    return isRed(nextColor);
  }

  if (condition === 'nextTileIsYellow') {
    return isYellow(nextColor);
  }

  if (condition === 'frontIsWall') {
    return !isInsideBoard(nextPosition, board) || nextCell?.type === 'wall' || nextCell?.type === 'blocked';
  }

  return canMoveTo(nextPosition, board);
}

function getConditionDisplayText(condition: ConditionType, checkDirection: Direction, result: boolean): string {
  return `${directionLabel[checkDirection]} 칸이 ${conditionText[condition]}인가요? → ${result ? '예' : '아니요'}`;
}

function appendMoveCommand(
  queue: ExecutionCommand[],
  node: Extract<CodeNode, { type: 'move' }>,
  sourceLineId: string,
  depth: number,
  parentInfo?: string,
): void {
  queue.push({
    direction: node.direction,
    sourceLineId,
    displayText: directionText[node.direction],
    depth,
    parentInfo,
  });
}

function walkExecutionQueue(
  nodes: CodeNode[],
  queue: ExecutionCommand[],
  depth: number,
  pathPrefix: string,
  position: Position,
  board: BoardCell[][],
  conditionEvaluations?: ConditionEvaluation[],
  parentInfo?: string,
): Position {
  let currentPosition = position;

  nodes.forEach((node, index) => {
    const sourceLineId = getSourceLineId(node, `${pathPrefix}-${index}`);

    if (node.type === 'move') {
      appendMoveCommand(queue, node, sourceLineId, depth, parentInfo);
      currentPosition = getNextPosition(currentPosition, node.direction);
      return;
    }

    if (node.type === 'for') {
      for (let iteration = 1; iteration <= node.count; iteration += 1) {
        currentPosition = walkExecutionQueue(
          node.children,
          queue,
          depth + 1,
          `${sourceLineId}-loop-${iteration}`,
          currentPosition,
          board,
          conditionEvaluations,
          `FOR ${node.count} TIMES - ${iteration}번째 반복`,
        );
      }
      return;
    }

    const checkDirection = node.checkDirection ?? 'right';
    const result = evaluateCondition(node.condition, checkDirection, currentPosition, board);
    const branch = result ? 'then' : 'else';
    conditionEvaluations?.push({
      sourceLineId,
      condition: node.condition,
      checkDirection,
      result,
      branch,
      text: getConditionDisplayText(node.condition, checkDirection, result),
    });
    currentPosition = walkExecutionQueue(
      result ? node.then : node.else ?? [],
      queue,
      depth + 1,
      `${sourceLineId}-${branch}`,
      currentPosition,
      board,
      conditionEvaluations,
      `IF ${conditionText[node.condition]} → ${branch.toUpperCase()}`,
    );
  });

  return currentPosition;
}

export function buildExecutionQueueWithConditions(
  code: CodeNode[],
  currentPosition: Position,
  board: BoardCell[][],
): ExecutionCommand[] {
  const queue: ExecutionCommand[] = [];
  walkExecutionQueue(code, queue, 0, 'code', currentPosition, board);
  return queue;
}

export function getConditionEvaluations(code: CodeNode[], currentPosition: Position, board: BoardCell[][]): ConditionEvaluation[] {
  const queue: ExecutionCommand[] = [];
  const evaluations: ConditionEvaluation[] = [];
  walkExecutionQueue(code, queue, 0, 'code', currentPosition, board, evaluations);
  return evaluations;
}

export function collectColorCluePositionKeys(code: CodeNode[], currentPosition: Position, board: BoardCell[][]): string[] {
  const clueKeys = new Set<string>();

  function walk(nodes: CodeNode[], position: Position): Position {
    let nextPosition = position;

    nodes.forEach((node) => {
      if (node.type === 'move') {
        nextPosition = getNextPosition(nextPosition, node.direction);
        return;
      }

      if (node.type === 'for') {
        for (let iteration = 0; iteration < node.count; iteration += 1) {
          nextPosition = walk(node.children, nextPosition);
        }
        return;
      }

      const checkDirection = node.checkDirection ?? 'right';
      const cluePosition = getNextPosition(nextPosition, checkDirection);

      if (colorConditions.has(node.condition) && isInsideBoard(cluePosition, board)) {
        clueKeys.add(`${cluePosition.row}-${cluePosition.col}`);
      }

      const branch = evaluateCondition(node.condition, checkDirection, nextPosition, board) ? node.then : node.else ?? [];
      nextPosition = walk(branch, nextPosition);
    });

    return nextPosition;
  }

  walk(code, currentPosition);
  return Array.from(clueKeys);
}

export function parseCodeToExecutionQueue(code: CodeNode[]): ExecutionCommand[] {
  const queue: ExecutionCommand[] = [];
  walkExecutionQueue(code, queue, 0, 'code', { row: 0, col: 0 }, []);
  return queue;
}

export function flattenCodeForDisplay(code: CodeNode[]): DisplayCodeLine[] {
  let nextCommandIndex = 0;

  function walk(nodes: CodeNode[], depth: number, pathPrefix: string, canCreateCommandIndex: boolean): DisplayCodeLine[] {
    return nodes.flatMap((node, index) => {
      const sourceLineId = getSourceLineId(node, `${pathPrefix}-${index}`);

      if (node.type === 'move') {
        const commandIndex = canCreateCommandIndex ? nextCommandIndex : undefined;

        if (canCreateCommandIndex) {
          nextCommandIndex += 1;
        }

        return [
          {
            id: sourceLineId,
            text: directionText[node.direction],
            depth,
            nodeType: 'move',
            commandIndex,
            description: moveDescription[node.direction],
          },
        ];
      }

      if (node.type === 'for') {
        const childCommandStartIndex = nextCommandIndex;
        const childLines = walk(node.children, depth + 1, sourceLineId, canCreateCommandIndex);
        const commandsPerLoop = nextCommandIndex - childCommandStartIndex;

        if (canCreateCommandIndex && commandsPerLoop > 0) {
          nextCommandIndex += commandsPerLoop * (node.count - 1);
        }

        return [
          {
            id: sourceLineId,
            text: `FOR ${node.count} TIMES:`,
            depth,
            nodeType: 'for',
            description: `아래 명령을 ${node.count}번 반복합니다.`,
          },
          ...childLines,
        ];
      }

      return [
        {
          id: sourceLineId,
          text: `IF ${conditionText[node.condition]}:`,
          depth,
          nodeType: 'if',
          description: `${conditionDescription[node.condition]} 확인 방향: ${directionLabel[node.checkDirection ?? 'right']}`,
        },
        ...walk(node.then, depth + 1, `${sourceLineId}-then`, false),
        ...(node.else
          ? [
              {
                id: `${sourceLineId}-else`,
                text: 'ELSE:',
                depth,
                nodeType: 'else' as const,
                description: '조건이 맞지 않으면 아래 명령을 실행합니다.',
              },
              ...walk(node.else, depth + 1, `${sourceLineId}-else`, false),
            ]
          : []),
      ];
    });
  }

  return walk(code, 0, 'code', true);
}

function validateNode(node: CodeNode, path: string, insideFor: boolean): string | null {
  const nodeType = getNodeType(node);

  if (nodeType !== 'move' && nodeType !== 'for' && nodeType !== 'if') {
    return `${path}: 알 수 없는 코드 타입입니다.`;
  }

  if (node.type === 'move') {
    return isDirection(node.direction) ? null : `${path}: move direction이 올바르지 않습니다.`;
  }

  if (node.type === 'for') {
    if (insideFor) {
      return `${path}: 중첩 for는 아직 사용할 수 없습니다.`;
    }

    if (!Number.isInteger(node.count) || node.count < 1 || node.count > 10) {
      return `${path}: for count는 1 이상 10 이하의 정수여야 합니다.`;
    }

    if (!Array.isArray(node.children) || node.children.length === 0) {
      return `${path}: for children이 비어 있습니다.`;
    }

    return validateNodes(node.children, `${path}.children`, true);
  }

  if (node.checkDirection !== undefined && !isDirection(node.checkDirection)) {
    return `${path}: if checkDirection이 올바르지 않습니다.`;
  }

  const thenError = validateNodes(node.then, `${path}.then`, insideFor);

  if (thenError) {
    return thenError;
  }

  return node.else ? validateNodes(node.else, `${path}.else`, insideFor) : null;
}

function validateNodes(nodes: CodeNode[], path: string, insideFor: boolean): string | null {
  if (!Array.isArray(nodes)) {
    return `${path}: 코드 목록은 배열이어야 합니다.`;
  }

  for (let index = 0; index < nodes.length; index += 1) {
    const error = validateNode(nodes[index], `${path}[${index}]`, insideFor);

    if (error) {
      return error;
    }
  }

  return null;
}

export function validateCode(code: CodeNode[]): ParseResult {
  const error = validateNodes(code, 'code', false);

  if (error) {
    return {
      success: false,
      message: error,
    };
  }

  return {
    success: true,
    queue: parseCodeToExecutionQueue(code),
    displayLines: flattenCodeForDisplay(code),
  };
}
