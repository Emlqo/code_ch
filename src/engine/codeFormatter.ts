import type { CodeDisplayMode } from '../types/admin';
import type { CodeNode, ConditionType, Direction } from '../types/game';
import { type DisplayCodeLine } from './codeParser';

const moveFunctionName: Record<Direction, string> = {
  up: 'upMove',
  down: 'downMove',
  left: 'leftMove',
  right: 'rightMove',
};

const conditionFunctionName: Record<ConditionType, string> = {
  currentTileIsYellow: 'currentTileIsYellow',
  currentTileIsBlue: 'currentTileIsBlue',
  currentTileIsRed: 'currentTileIsRed',
  nextTileIsBlue: 'nextTileIsBlue',
  nextTileIsRed: 'nextTileIsRed',
  nextTileIsYellow: 'nextTileIsYellow',
  frontIsWall: 'frontIsWall',
  pathIsOpen: 'pathIsOpen',
};

const koreanMoveText: Record<Direction, string> = {
  up: '위쪽으로 이동하기',
  down: '아래쪽으로 이동하기',
  left: '왼쪽으로 이동하기',
  right: '오른쪽으로 이동하기',
};

const koreanMoveDescription: Record<Direction, string> = {
  up: '위쪽 방향키를 누릅니다.',
  down: '아래쪽 방향키를 누릅니다.',
  left: '왼쪽 방향키를 누릅니다.',
  right: '오른쪽 방향키를 누릅니다.',
};

const koreanDirectionLabel: Record<Direction, string> = {
  up: '위쪽',
  down: '아래쪽',
  left: '왼쪽',
  right: '오른쪽',
};

function getSourceLineId(node: CodeNode, fallbackId: string): string {
  return node.sourceLineId ?? node.id ?? fallbackId;
}

function formatKoreanCondition(condition: ConditionType, checkDirection: Direction): string {
  const directionLabel = koreanDirectionLabel[checkDirection];

  switch (condition) {
    case 'currentTileIsYellow':
      return '현재 칸이 노란색이라면';
    case 'currentTileIsBlue':
      return '현재 칸이 파란색이라면';
    case 'currentTileIsRed':
      return '현재 칸이 빨간색이라면';
    case 'nextTileIsYellow':
      return `${directionLabel} 칸이 노란색이라면`;
    case 'nextTileIsBlue':
      return `${directionLabel} 칸이 파란색이라면`;
    case 'nextTileIsRed':
      return `${directionLabel} 칸이 빨간색이라면`;
    case 'frontIsWall':
      return `${directionLabel} 칸이 벽이라면`;
    case 'pathIsOpen':
      return `${directionLabel}으로 갈 수 있다면`;
    default:
      return '조건이 맞다면';
  }
}

function formatCondition(condition: ConditionType): string {
  return `${conditionFunctionName[condition]}()`;
}

function createMoveLine(
  node: Extract<CodeNode, { type: 'move' }>,
  id: string,
  depth: number,
  commandIndex?: number,
): DisplayCodeLine {
  return {
    id,
    text: `${moveFunctionName[node.direction]}();`,
    depth,
    nodeType: 'move',
    commandIndex,
  };
}

function flattenCStyleCodeForDisplay(code: CodeNode[]): DisplayCodeLine[] {
  let nextCommandIndex = 0;

  function walk(nodes: CodeNode[], depth: number, pathPrefix: string, canCreateCommandIndex: boolean): DisplayCodeLine[] {
    return nodes.flatMap((node, index) => {
      const sourceLineId = getSourceLineId(node, `${pathPrefix}-${index}`);

      if (node.type === 'move') {
        const commandIndex = canCreateCommandIndex ? nextCommandIndex : undefined;

        if (canCreateCommandIndex) {
          nextCommandIndex += 1;
        }

        return [createMoveLine(node, sourceLineId, depth, commandIndex)];
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
            text: `for (int i = 0; i < ${node.count}; i++) {`,
            depth,
            nodeType: 'for',
          },
          ...childLines,
          {
            id: `${sourceLineId}-end`,
            text: '}',
            depth,
            nodeType: 'block',
          },
        ];
      }

      return [
        {
          id: sourceLineId,
          text: `if (${formatCondition(node.condition)}) {`,
          depth,
          nodeType: 'if',
        },
        ...walk(node.then, depth + 1, `${sourceLineId}-then`, false),
        ...(node.else
          ? [
              {
                id: `${sourceLineId}-else`,
                text: '} else {',
                depth,
                nodeType: 'else' as const,
              },
              ...walk(node.else, depth + 1, `${sourceLineId}-else`, false),
            ]
          : []),
        {
          id: `${sourceLineId}-end`,
          text: '}',
          depth,
          nodeType: 'block',
        },
      ];
    });
  }

  return walk(code, 0, 'code', true);
}

function flattenKoreanBlockCodeForDisplay(code: CodeNode[]): DisplayCodeLine[] {
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
            text: koreanMoveText[node.direction],
            depth,
            nodeType: 'move',
            commandIndex,
            description: koreanMoveDescription[node.direction],
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
            text: `${node.count}번 반복하기`,
            depth,
            nodeType: 'for',
            description: `안쪽 블록을 ${node.count}번 반복합니다.`,
          },
          ...childLines,
        ];
      }

      const checkDirection = node.checkDirection ?? 'right';

      return [
        {
          id: sourceLineId,
          text: `만약 ${formatKoreanCondition(node.condition, checkDirection)}`,
          depth,
          nodeType: 'if',
          description: '조건이 맞으면 안쪽 블록을 실행합니다.',
        },
        ...walk(node.then, depth + 1, `${sourceLineId}-then`, false),
        ...(node.else
          ? [
              {
                id: `${sourceLineId}-else`,
                text: '아니라면',
                depth,
                nodeType: 'else' as const,
                description: '조건이 맞지 않을 때 실행합니다.',
              },
              ...walk(node.else, depth + 1, `${sourceLineId}-else`, false),
            ]
          : []),
      ];
    });
  }

  return walk(code, 0, 'code', true);
}

export function formatCodeForDisplay(code: CodeNode[], mode: CodeDisplayMode = 'pseudocode'): DisplayCodeLine[] {
  if (mode === 'cStyle') {
    return flattenCStyleCodeForDisplay(code);
  }

  return flattenKoreanBlockCodeForDisplay(code);
}
