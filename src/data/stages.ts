import type { BoardCell, CodeNode, ConditionType, Direction, Position, Stage } from '../types/game';

type StageConfig = Omit<Stage, 'board'> & {
  rows: number;
  cols: number;
  targetColor: string;
  walls?: Position[];
  markers?: Array<Position & { color: string }>;
};

const directionDelta: Record<Direction, Position> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

const emptyCell = (): BoardCell => ({
  type: 'empty',
  color: '#f8fafc',
  isPainted: false,
  targetColor: 'transparent',
});

const startCell = (targetColor: string): BoardCell => ({
  type: 'start',
  color: '#e0f2fe',
  isPainted: true,
  targetColor,
  label: 'S',
});

const paintCell = (targetColor: string): BoardCell => ({
  type: 'paint',
  color: '#fefce8',
  isPainted: false,
  targetColor,
});

const wallCell = (): BoardCell => ({
  type: 'wall',
  color: '#1e293b',
  isPainted: false,
  targetColor: 'transparent',
});

const m = (direction: Direction, sourceLineId: string, label?: string): CodeNode => ({
  type: 'move',
  direction,
  sourceLineId,
  label,
});

const f = (count: number, sourceLineId: string, children: CodeNode[], label?: string): CodeNode => ({
  type: 'for',
  count,
  sourceLineId,
  children,
  label,
});

const iff = (
  condition: ConditionType,
  checkDirection: Direction,
  sourceLineId: string,
  thenNodes: CodeNode[],
  elseNodes?: CodeNode[],
  label?: string,
): CodeNode => ({
  type: 'if',
  condition,
  checkDirection,
  sourceLineId,
  then: thenNodes,
  else: elseNodes,
  label,
});

function keyOf(position: Position): string {
  return `${position.row}-${position.col}`;
}

function getNextPosition(position: Position, direction: Direction): Position {
  const delta = directionDelta[direction];
  return { row: position.row + delta.row, col: position.col + delta.col };
}

function isInsideBoard(position: Position, rows: number, cols: number): boolean {
  return position.row >= 0 && position.row < rows && position.col >= 0 && position.col < cols;
}

function getCellColor(cell: BoardCell | undefined): string {
  return (cell?.targetColor && cell.targetColor !== 'transparent' ? cell.targetColor : cell?.color ?? '').toLowerCase();
}

function canMoveTo(position: Position, board: BoardCell[][]): boolean {
  const rowCount = board.length;
  const colCount = board[0]?.length ?? 0;

  if (!isInsideBoard(position, rowCount, colCount)) {
    return false;
  }

  const cell = board[position.row][position.col];
  return cell.type !== 'wall' && cell.type !== 'blocked';
}

function evaluateCondition(
  condition: ConditionType,
  checkDirection: Direction,
  position: Position,
  board: BoardCell[][],
): boolean {
  const nextPosition = getNextPosition(position, checkDirection);
  const nextCell = canMoveTo(nextPosition, board) ? board[nextPosition.row][nextPosition.col] : undefined;
  const nextColor = getCellColor(nextCell);

  if (condition === 'pathIsOpen') {
    return canMoveTo(nextPosition, board);
  }

  if (condition === 'frontIsWall') {
    return !canMoveTo(nextPosition, board);
  }

  if (condition === 'nextTileIsBlue') {
    return ['#38bdf8', '#06b6d4', '#0ea5e9', '#3b82f6'].includes(nextColor);
  }

  if (condition === 'nextTileIsRed') {
    return ['#ef4444', '#f43f5e', '#fb7185', '#dc2626'].includes(nextColor);
  }

  return ['#facc15', '#eab308', '#fbbf24', '#fde047'].includes(nextColor);
}

function makeBoard(config: StageConfig): BoardCell[][] {
  const wallKeys = new Set((config.walls ?? []).map(keyOf));
  const board = Array.from({ length: config.rows }, () => Array.from({ length: config.cols }, () => emptyCell()));
  let currentPosition = config.startPosition;

  if (!isInsideBoard(config.startPosition, config.rows, config.cols)) {
    throw new Error(`Stage ${config.id}: startPosition is outside board.`);
  }

  (config.markers ?? []).forEach((marker) => {
    if (!isInsideBoard(marker, config.rows, config.cols)) {
      throw new Error(`Stage ${config.id}: marker is outside board.`);
    }

    board[marker.row][marker.col] = {
      ...emptyCell(),
      targetColor: marker.color,
    };
  });

  (config.walls ?? []).forEach((wall) => {
    if (!isInsideBoard(wall, config.rows, config.cols)) {
      throw new Error(`Stage ${config.id}: wall is outside board.`);
    }

    board[wall.row][wall.col] = wallCell();
  });

  board[config.startPosition.row][config.startPosition.col] = startCell(config.targetColor);

  config.solutionInput.forEach((direction) => {
    currentPosition = getNextPosition(currentPosition, direction);

    if (!isInsideBoard(currentPosition, config.rows, config.cols)) {
      throw new Error(`Stage ${config.id}: solution leaves board at ${keyOf(currentPosition)}.`);
    }

    if (wallKeys.has(keyOf(currentPosition))) {
      throw new Error(`Stage ${config.id}: solution hits wall at ${keyOf(currentPosition)}.`);
    }

    board[currentPosition.row][currentPosition.col] = paintCell(config.targetColor);
  });

  return board;
}

function buildSolutionFromCode(code: CodeNode[], board: BoardCell[][], startPosition: Position): Direction[] {
  const directions: Direction[] = [];

  function walk(nodes: CodeNode[], position: Position): Position {
    let currentPosition = position;

    nodes.forEach((node) => {
      if (node.type === 'move') {
        directions.push(node.direction);
        currentPosition = getNextPosition(currentPosition, node.direction);
        return;
      }

      if (node.type === 'for') {
        for (let iteration = 0; iteration < node.count; iteration += 1) {
          currentPosition = walk(node.children, currentPosition);
        }
        return;
      }

      const branch = evaluateCondition(node.condition, node.checkDirection ?? 'right', currentPosition, board)
        ? node.then
        : node.else ?? [];
      currentPosition = walk(branch, currentPosition);
    });

    return currentPosition;
  }

  walk(code, startPosition);
  return directions;
}

function createStage(config: StageConfig): Stage {
  const { rows, cols, targetColor, walls, markers, ...stage } = config;
  const board = makeBoard(config);
  const computedSolution = buildSolutionFromCode(stage.code, board, stage.startPosition);

  if (computedSolution.join(',') !== stage.solutionInput.join(',')) {
    throw new Error(`Stage ${stage.id}: code and solutionInput do not match.`);
  }

  return {
    ...stage,
    board,
  };
}

export const stages: Stage[] = [
  createStage({
    id: 1,
    chapter: 'Chapter 1. 순서대로 움직이기',
    title: '가로 선 그리기',
    description: '오른쪽으로 한 칸씩 이동하며 가장 단순한 선을 완성합니다.',
    concept: '순차 실행',
    difficulty: '입문',
    rows: 5,
    cols: 5,
    startPosition: { row: 2, col: 0 },
    code: [m('right', 's1-1'), m('right', 's1-2'), m('right', 's1-3'), m('right', 's1-4')],
    targetImageName: '가로 선',
    solutionInput: ['right', 'right', 'right', 'right'],
    targetColor: '#38bdf8',
    hints: ['코드는 위에서 아래로 실행돼요.', 'RIGHT는 오른쪽 방향키예요.', '같은 방향이 이어질 때는 리듬을 유지해 보세요.'],
    maxMistakes: 2,
    checkpointMode: 'retryCurrent',
  }),
  createStage({
    id: 2,
    chapter: 'Chapter 1. 순서대로 움직이기',
    title: '세로 선 그리기',
    description: '아래로 내려가며 세로 선을 완성합니다.',
    concept: '같은 명령 반복 감각',
    difficulty: '입문',
    rows: 5,
    cols: 5,
    startPosition: { row: 0, col: 2 },
    code: [m('down', 's2-1'), m('down', 's2-2'), m('down', 's2-3'), m('down', 's2-4')],
    targetImageName: '세로 선',
    solutionInput: ['down', 'down', 'down', 'down'],
    targetColor: '#22c55e',
    hints: ['DOWN은 아래쪽 방향키예요.', '공의 현재 위치를 먼저 확인하세요.', '위에서 아래로 같은 명령이 이어져요.'],
    maxMistakes: 2,
    checkpointMode: 'retryCurrent',
  }),
  createStage({
    id: 3,
    chapter: 'Chapter 1. 순서대로 움직이기',
    title: 'ㄱ자 모양',
    description: '가로로 이동한 뒤 아래로 꺾어 ㄱ자 모양을 만듭니다.',
    concept: '방향 전환',
    difficulty: '입문',
    rows: 5,
    cols: 5,
    startPosition: { row: 0, col: 0 },
    code: [m('right', 's3-1'), m('right', 's3-2'), m('down', 's3-3'), m('down', 's3-4')],
    targetImageName: 'ㄱ자',
    solutionInput: ['right', 'right', 'down', 'down'],
    targetColor: '#f97316',
    hints: ['처음 두 줄은 오른쪽이에요.', '세 번째 줄에서 방향이 바뀝니다.', '꺾이는 지점을 눈으로 확인해 보세요.'],
    maxMistakes: 2,
    checkpointMode: 'retryCurrent',
  }),
  createStage({
    id: 4,
    chapter: 'Chapter 1. 순서대로 움직이기',
    title: '계단 오르기',
    description: '오른쪽과 아래쪽을 번갈아 입력해 계단 모양을 만듭니다.',
    concept: '패턴 읽기',
    difficulty: '기초',
    rows: 5,
    cols: 5,
    startPosition: { row: 0, col: 0 },
    code: [m('right', 's4-1'), m('down', 's4-2'), m('right', 's4-3'), m('down', 's4-4'), m('right', 's4-5'), m('down', 's4-6')],
    targetImageName: '계단',
    solutionInput: ['right', 'down', 'right', 'down', 'right', 'down'],
    targetColor: '#a855f7',
    hints: ['RIGHT와 DOWN이 번갈아 나와요.', '계단은 한 칸 옆, 한 칸 아래로 만들어져요.', '입력 전 다음 코드 줄을 먼저 보세요.'],
    maxMistakes: 3,
    checkpointMode: 'retryCurrent',
  }),
  createStage({
    id: 5,
    chapter: 'Chapter 1. 순서대로 움직이기',
    title: '번개 조각',
    description: '대각선처럼 꺾이는 경로로 번개 일부를 그립니다.',
    concept: '긴 순차 코드',
    difficulty: '기초',
    rows: 6,
    cols: 6,
    startPosition: { row: 0, col: 1 },
    code: [m('right', 's5-1'), m('right', 's5-2'), m('down', 's5-3'), m('left', 's5-4'), m('down', 's5-5'), m('right', 's5-6'), m('right', 's5-7')],
    targetImageName: '번개',
    solutionInput: ['right', 'right', 'down', 'left', 'down', 'right', 'right'],
    targetColor: '#facc15',
    hints: ['중간에 LEFT가 한 번 있어요.', '번개는 한 방향으로만 가지 않고 꺾입니다.', '입력 순서를 소리 내어 읽어도 좋아요.'],
    maxMistakes: 3,
    checkpointMode: 'retryCurrent',
  }),
  createStage({
    id: 6,
    chapter: 'Chapter 1. 순서대로 움직이기',
    title: '작은 별 일부',
    description: '여러 방향으로 짧게 움직여 별의 일부처럼 보이는 선을 만듭니다.',
    concept: '순차 코드 종합',
    difficulty: '기초',
    rows: 6,
    cols: 6,
    startPosition: { row: 3, col: 1 },
    code: [m('up', 's6-1'), m('right', 's6-2'), m('down', 's6-3'), m('right', 's6-4'), m('up', 's6-5'), m('right', 's6-6'), m('down', 's6-7')],
    targetImageName: '별 일부',
    solutionInput: ['up', 'right', 'down', 'right', 'up', 'right', 'down'],
    targetColor: '#fbbf24',
    hints: ['UP과 DOWN이 번갈아 섞여 있어요.', '현재 위치가 위로 갔는지 아래로 갔는지 확인하세요.', '줄 번호를 하나씩 따라가면 안전합니다.'],
    maxMistakes: 3,
    checkpointMode: 'retryCurrent',
  }),

  createStage({
    id: 7,
    chapter: 'Chapter 2. 반복해서 움직이기',
    title: '반복 선',
    description: 'FOR를 사용해 같은 오른쪽 이동을 짧게 표현합니다.',
    concept: 'FOR 반복문',
    difficulty: '기초',
    rows: 5,
    cols: 5,
    startPosition: { row: 2, col: 0 },
    code: [f(4, 's7-for-1', [m('right', 's7-1')], '오른쪽 이동 4번 반복')],
    targetImageName: '반복 가로 선',
    solutionInput: ['right', 'right', 'right', 'right'],
    targetColor: '#06b6d4',
    hints: ['FOR 4 TIMES는 아래 명령을 4번 반복해요.', '코드 줄은 하나처럼 보여도 입력은 네 번 필요해요.', '반복 횟수를 손가락으로 세어 보세요.'],
    maxMistakes: 2,
    checkpointMode: 'retryCurrent',
  }),
  createStage({
    id: 8,
    chapter: 'Chapter 2. 반복해서 움직이기',
    title: '열린 네모',
    description: '세 방향의 반복 이동으로 열린 사각형을 만듭니다.',
    concept: '여러 FOR 블록',
    difficulty: '기초',
    rows: 6,
    cols: 6,
    startPosition: { row: 1, col: 1 },
    code: [f(3, 's8-for-1', [m('right', 's8-1')]), f(3, 's8-for-2', [m('down', 's8-2')]), f(3, 's8-for-3', [m('left', 's8-3')])],
    targetImageName: '열린 네모',
    solutionInput: ['right', 'right', 'right', 'down', 'down', 'down', 'left', 'left', 'left'],
    targetColor: '#eab308',
    hints: ['첫 FOR는 윗변을 그려요.', '두 번째 FOR에서 아래로 내려갑니다.', '세 번째 FOR는 왼쪽으로 돌아와요.'],
    maxMistakes: 3,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 9,
    chapter: 'Chapter 2. 반복해서 움직이기',
    title: '큰 ㄴ자',
    description: '아래 반복과 오른쪽 반복을 이어 큰 ㄴ자 모양을 그립니다.',
    concept: '반복 블록 순서',
    difficulty: '기초',
    rows: 6,
    cols: 6,
    startPosition: { row: 0, col: 1 },
    code: [f(4, 's9-for-1', [m('down', 's9-1')]), f(4, 's9-for-2', [m('right', 's9-2')])],
    targetImageName: '큰 ㄴ자',
    solutionInput: ['down', 'down', 'down', 'down', 'right', 'right', 'right', 'right'],
    targetColor: '#10b981',
    hints: ['먼저 아래로 네 칸 이동해요.', '그 다음 오른쪽으로 네 칸 이동합니다.', 'FOR 블록이 바뀔 때 방향도 바뀌어요.'],
    maxMistakes: 3,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 10,
    chapter: 'Chapter 2. 반복해서 움직이기',
    title: '지그재그 리본',
    description: '반복문 안에 두 명령을 넣어 지그재그를 만듭니다.',
    concept: '반복 블록 내부 순서',
    difficulty: '기초',
    rows: 6,
    cols: 6,
    startPosition: { row: 0, col: 0 },
    code: [f(3, 's10-for-1', [m('right', 's10-1'), m('down', 's10-2')]), m('right', 's10-3')],
    targetImageName: '지그재그',
    solutionInput: ['right', 'down', 'right', 'down', 'right', 'down', 'right'],
    targetColor: '#ec4899',
    hints: ['반복문 안에는 RIGHT, DOWN 두 줄이 들어 있어요.', '두 줄짜리 묶음이 3번 반복됩니다.', '마지막 RIGHT는 반복문 밖에 있어요.'],
    maxMistakes: 3,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 11,
    chapter: 'Chapter 2. 반복해서 움직이기',
    title: '로봇 팔',
    description: '반복과 단일 명령을 섞어 로봇 팔처럼 꺾인 모양을 만듭니다.',
    concept: 'FOR와 단일 명령 조합',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 1, col: 1 },
    code: [f(3, 's11-for-1', [m('right', 's11-1')]), m('down', 's11-2'), f(2, 's11-for-2', [m('left', 's11-3')]), m('down', 's11-4'), f(3, 's11-for-3', [m('right', 's11-5')])],
    targetImageName: '로봇 팔',
    solutionInput: ['right', 'right', 'right', 'down', 'left', 'left', 'down', 'right', 'right', 'right'],
    targetColor: '#94a3b8',
    hints: ['반복문 사이에 DOWN이 끼어 있어요.', '두 번째 반복은 LEFT 2번입니다.', '마지막 반복은 다시 RIGHT 3번이에요.'],
    maxMistakes: 4,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 12,
    chapter: 'Chapter 2. 반복해서 움직이기',
    title: '왕관 밑그림',
    description: '반복되는 뾰족한 패턴으로 왕관의 밑그림을 만듭니다.',
    concept: '패턴 반복',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 4, col: 0 },
    code: [f(3, 's12-for-1', [m('up', 's12-1'), m('right', 's12-2'), m('down', 's12-3'), m('right', 's12-4')])],
    targetImageName: '왕관',
    solutionInput: ['up', 'right', 'down', 'right', 'up', 'right', 'down', 'right', 'up', 'right', 'down', 'right'],
    targetColor: '#facc15',
    hints: ['UP, RIGHT, DOWN, RIGHT 묶음이 반복돼요.', '왕관의 뾰족한 부분을 하나씩 만든다고 생각하세요.', '반복 횟수는 3번입니다.'],
    maxMistakes: 4,
    checkpointMode: 'resetToStart',
  }),

  createStage({
    id: 13,
    chapter: 'Chapter 3. 조건 보고 움직이기',
    title: '열린 길 찾기',
    description: '오른쪽 길이 열려 있으면 오른쪽으로 이동합니다.',
    concept: 'IF pathIsOpen',
    difficulty: '기초',
    rows: 5,
    cols: 5,
    startPosition: { row: 2, col: 1 },
    code: [iff('pathIsOpen', 'right', 's13-if-1', [m('right', 's13-1')], [m('up', 's13-else-1')]), m('right', 's13-2'), m('down', 's13-3')],
    targetImageName: '갈림길 선',
    solutionInput: ['right', 'right', 'down'],
    targetColor: '#38bdf8',
    hints: ['오른쪽 칸이 비어 있으므로 THEN을 실행해요.', 'IF 다음에도 일반 명령이 이어집니다.', '조건 결과를 먼저 읽고 방향을 입력하세요.'],
    maxMistakes: 3,
    checkpointMode: 'retryCurrent',
  }),
  createStage({
    id: 14,
    chapter: 'Chapter 3. 조건 보고 움직이기',
    title: '벽 앞에서 꺾기',
    description: '앞에 벽이 있으면 아래로 꺾어 안전한 길을 선택합니다.',
    concept: 'IF frontIsWall',
    difficulty: '기초',
    rows: 5,
    cols: 5,
    startPosition: { row: 1, col: 3 },
    code: [iff('frontIsWall', 'right', 's14-if-1', [m('down', 's14-1')], [m('right', 's14-else-1')]), m('down', 's14-2'), m('left', 's14-3')],
    targetImageName: '벽 피하기',
    solutionInput: ['down', 'down', 'left'],
    targetColor: '#22c55e',
    walls: [{ row: 1, col: 4 }],
    hints: ['오른쪽에 벽이 있어요.', 'frontIsWall이 참이면 THEN을 실행합니다.', '벽으로 직접 이동하지 않도록 조심하세요.'],
    maxMistakes: 3,
    checkpointMode: 'retryCurrent',
  }),
  createStage({
    id: 15,
    chapter: 'Chapter 3. 조건 보고 움직이기',
    title: '파란 타일 확인',
    description: '오른쪽 타일이 파란색이면 오른쪽으로 이동합니다.',
    concept: '색 조건',
    difficulty: '기초',
    rows: 6,
    cols: 6,
    startPosition: { row: 3, col: 1 },
    code: [iff('nextTileIsBlue', 'right', 's15-if-1', [m('right', 's15-1'), m('right', 's15-2')], [m('up', 's15-else-1')]), m('up', 's15-3'), m('right', 's15-4')],
    targetImageName: '파란 열쇠',
    solutionInput: ['right', 'right', 'up', 'right'],
    targetColor: '#38bdf8',
    hints: ['오른쪽 칸은 파란 목표 칸이에요.', '조건이 참이면 THEN 블록을 따라갑니다.', 'THEN 안에는 RIGHT가 두 번 있어요.'],
    maxMistakes: 3,
    checkpointMode: 'retryCurrent',
  }),
  createStage({
    id: 16,
    chapter: 'Chapter 3. 조건 보고 움직이기',
    title: '빨간 타일이 아니면',
    description: '오른쪽이 빨간색이 아니어서 ELSE 경로를 실행합니다.',
    concept: 'ELSE 분기',
    difficulty: '도전',
    rows: 6,
    cols: 6,
    startPosition: { row: 2, col: 2 },
    code: [iff('nextTileIsRed', 'right', 's16-if-1', [m('right', 's16-then-1')], [m('down', 's16-1'), m('right', 's16-2')]), m('right', 's16-3'), m('up', 's16-4')],
    targetImageName: '우회 경로',
    solutionInput: ['down', 'right', 'right', 'up'],
    targetColor: '#a855f7',
    markers: [{ row: 2, col: 3, color: '#38bdf8' }],
    hints: ['오른쪽 칸은 빨간색이 아니에요.', '조건이 거짓이면 ELSE를 실행합니다.', 'ELSE 안에는 DOWN, RIGHT가 들어 있어요.'],
    maxMistakes: 3,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 17,
    chapter: 'Chapter 3. 조건 보고 움직이기',
    title: '노란 보물 길',
    description: '아래쪽 노란 타일을 확인하고 보물 모양으로 이동합니다.',
    concept: 'checkDirection 사용',
    difficulty: '도전',
    rows: 6,
    cols: 6,
    startPosition: { row: 1, col: 1 },
    code: [iff('nextTileIsYellow', 'down', 's17-if-1', [m('down', 's17-1')], [m('right', 's17-else-1')]), f(2, 's17-for-1', [m('right', 's17-2')]), m('down', 's17-3'), m('left', 's17-4')],
    targetImageName: '보물 조각',
    solutionInput: ['down', 'right', 'right', 'down', 'left'],
    targetColor: '#facc15',
    hints: ['이번 조건은 아래쪽을 검사해요.', '아래 칸이 노란색이라 THEN이 실행됩니다.', '조건 뒤에는 RIGHT 반복이 이어져요.'],
    maxMistakes: 4,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 18,
    chapter: 'Chapter 3. 조건 보고 움직이기',
    title: '막힌 길 판단',
    description: '왼쪽 길이 막혀 있음을 확인하고 다른 길로 이동합니다.',
    concept: '조건 판단 종합',
    difficulty: '도전',
    rows: 6,
    cols: 6,
    startPosition: { row: 3, col: 1 },
    code: [iff('frontIsWall', 'left', 's18-if-1', [m('up', 's18-1'), m('right', 's18-2')], [m('left', 's18-else-1')]), f(2, 's18-for-1', [m('right', 's18-3')]), m('down', 's18-4')],
    targetImageName: '막힌 길 우회',
    solutionInput: ['up', 'right', 'right', 'right', 'down'],
    targetColor: '#fb7185',
    walls: [{ row: 3, col: 0 }],
    hints: ['왼쪽에 벽이 있습니다.', '조건이 참이면 UP, RIGHT를 먼저 실행해요.', '그 다음 RIGHT가 두 번 반복됩니다.'],
    maxMistakes: 4,
    checkpointMode: 'resetToStart',
  }),

  createStage({
    id: 19,
    chapter: 'Chapter 4. 섞어서 움직이기',
    title: '슬라임 몸통',
    description: '반복과 조건을 섞어 둥근 슬라임 일부를 만듭니다.',
    concept: 'FOR + IF',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 4, col: 1 },
    code: [f(3, 's19-for-1', [m('right', 's19-1')]), iff('pathIsOpen', 'up', 's19-if-1', [m('up', 's19-2'), m('up', 's19-3')], [m('down', 's19-else-1')]), f(3, 's19-for-2', [m('left', 's19-4')])],
    targetImageName: '슬라임',
    solutionInput: ['right', 'right', 'right', 'up', 'up', 'left', 'left', 'left'],
    targetColor: '#34d399',
    hints: ['먼저 오른쪽으로 3번 이동합니다.', '위쪽 길이 열려 있어서 THEN을 실행해요.', '마지막은 왼쪽으로 3번 돌아옵니다.'],
    maxMistakes: 4,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 20,
    chapter: 'Chapter 4. 섞어서 움직이기',
    title: '웃는 입',
    description: '조건으로 시작 방향을 정한 뒤 반복으로 웃는 입 모양을 그립니다.',
    concept: '분기 후 반복',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 2, col: 1 },
    code: [iff('nextTileIsBlue', 'right', 's20-if-1', [m('right', 's20-1')], [m('down', 's20-else-1')]), m('down', 's20-2'), f(3, 's20-for-1', [m('right', 's20-3')]), m('up', 's20-4')],
    targetImageName: '웃는 얼굴 입',
    solutionInput: ['right', 'down', 'right', 'right', 'right', 'up'],
    targetColor: '#38bdf8',
    hints: ['오른쪽 칸이 파란색이라 RIGHT부터 시작해요.', '그 다음 아래로 내려가 입의 아래쪽을 그립니다.', 'RIGHT 3번 반복 뒤 UP으로 마무리해요.'],
    maxMistakes: 4,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 21,
    chapter: 'Chapter 4. 섞어서 움직이기',
    title: '고양이 귀',
    description: '뾰족한 귀 모양을 반복 패턴과 벽 조건으로 만듭니다.',
    concept: '조건 회피',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 5, col: 1 },
    code: [f(2, 's21-for-1', [m('up', 's21-1'), m('right', 's21-2')]), iff('frontIsWall', 'up', 's21-if-1', [m('right', 's21-3')], [m('up', 's21-else-1')]), f(2, 's21-for-2', [m('down', 's21-4'), m('right', 's21-5')])],
    targetImageName: '고양이 귀',
    solutionInput: ['up', 'right', 'up', 'right', 'right', 'down', 'right', 'down', 'right'],
    targetColor: '#f472b6',
    walls: [{ row: 2, col: 3 }],
    hints: ['UP, RIGHT 묶음이 먼저 2번 반복돼요.', '위쪽에 벽이 있어서 RIGHT로 꺾습니다.', '뒤쪽 반복은 DOWN, RIGHT 묶음입니다.'],
    maxMistakes: 4,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 22,
    chapter: 'Chapter 4. 섞어서 움직이기',
    title: '강아지 발바닥',
    description: '작은 발자국처럼 올라갔다 내려오는 패턴을 만듭니다.',
    concept: '복합 패턴',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 5, col: 0 },
    code: [f(2, 's22-for-1', [m('up', 's22-1'), m('right', 's22-2'), m('down', 's22-3'), m('right', 's22-4')]), iff('pathIsOpen', 'right', 's22-if-1', [m('right', 's22-5'), m('up', 's22-6')], [m('left', 's22-else-1')])],
    targetImageName: '강아지 발바닥',
    solutionInput: ['up', 'right', 'down', 'right', 'up', 'right', 'down', 'right', 'right', 'up'],
    targetColor: '#fb923c',
    hints: ['UP, RIGHT, DOWN, RIGHT가 발가락처럼 반복돼요.', '마지막 조건은 오른쪽 길이 열려 있어요.', '조건이 참이라 RIGHT, UP으로 끝납니다.'],
    maxMistakes: 5,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 23,
    chapter: 'Chapter 4. 섞어서 움직이기',
    title: '로봇 얼굴',
    description: '조건으로 색 타일을 확인하고 로봇 얼굴의 한쪽 테두리를 그립니다.',
    concept: '색 조건 + 반복',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 1, col: 1 },
    code: [f(4, 's23-for-1', [m('right', 's23-1')]), iff('pathIsOpen', 'down', 's23-if-1', [m('down', 's23-2')], [m('left', 's23-else-1')]), f(3, 's23-for-2', [m('down', 's23-3')]), f(4, 's23-for-3', [m('left', 's23-4')])],
    targetImageName: '로봇 얼굴',
    solutionInput: ['right', 'right', 'right', 'right', 'down', 'down', 'down', 'down', 'left', 'left', 'left', 'left'],
    targetColor: '#94a3b8',
    hints: ['윗변은 RIGHT 4번입니다.', '아래쪽 길이 열려 있어서 THEN을 실행해요.', '아래로 총 4칸 내려간 뒤 왼쪽으로 돌아옵니다.'],
    maxMistakes: 5,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 24,
    chapter: 'Chapter 4. 섞어서 움직이기',
    title: '게임 아이템',
    description: '조건과 반복을 조합해 아이템 아이콘 같은 모양을 만듭니다.',
    concept: '복합 코드 읽기',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 3, col: 1 },
    code: [iff('nextTileIsYellow', 'right', 's24-if-1', [m('right', 's24-1'), m('up', 's24-2')], [m('down', 's24-else-1')]), f(2, 's24-for-1', [m('right', 's24-3'), m('down', 's24-4')]), f(2, 's24-for-2', [m('left', 's24-5')])],
    targetImageName: '게임 아이템',
    solutionInput: ['right', 'up', 'right', 'down', 'right', 'down', 'left', 'left'],
    targetColor: '#facc15',
    hints: ['오른쪽 칸이 노란색이라 THEN 경로입니다.', 'RIGHT, DOWN 묶음이 2번 반복돼요.', '마지막에는 LEFT를 2번 입력합니다.'],
    maxMistakes: 5,
    checkpointMode: 'resetToStart',
  }),

  createStage({
    id: 25,
    chapter: 'Chapter 5. 그림 완성 챌린지',
    title: '작은 하트',
    description: '순차, 반복, 조건을 모두 사용해 작은 하트를 완성합니다.',
    concept: '종합 챌린지',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 3, col: 3 },
    code: [m('up', 's25-1'), m('left', 's25-2'), f(2, 's25-for-1', [m('down', 's25-3')]), m('right', 's25-4'), iff('pathIsOpen', 'down', 's25-if-1', [m('down', 's25-5')], [m('up', 's25-else-1')]), m('right', 's25-6'), f(2, 's25-for-2', [m('up', 's25-7')]), m('left', 's25-8')],
    targetImageName: '작은 하트',
    solutionInput: ['up', 'left', 'down', 'down', 'right', 'down', 'right', 'up', 'up', 'left'],
    targetColor: '#fb7185',
    hints: ['하트는 가운데에서 시작해 왼쪽 곡선을 먼저 그려요.', 'FOR 2 TIMES가 두 번 등장합니다.', '조건은 아래 길이 열려 있어서 DOWN을 실행해요.'],
    maxMistakes: 5,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 26,
    chapter: 'Chapter 5. 그림 완성 챌린지',
    title: '별 라인',
    description: '별의 외곽선을 따라가듯 꺾이는 긴 경로를 입력합니다.',
    concept: '긴 코드 추적',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 5, col: 1 },
    code: [f(2, 's26-for-1', [m('up', 's26-1'), m('right', 's26-2')]), m('right', 's26-3'), f(2, 's26-for-2', [m('down', 's26-4'), m('right', 's26-5')]), iff('frontIsWall', 'right', 's26-if-1', [m('up', 's26-6')], [m('right', 's26-else-1')]), f(2, 's26-for-3', [m('left', 's26-7')])],
    targetImageName: '별',
    solutionInput: ['up', 'right', 'up', 'right', 'right', 'down', 'right', 'down', 'right', 'up', 'left', 'left'],
    targetColor: '#fbbf24',
    hints: ['처음은 UP, RIGHT 묶음 2번입니다.', '오른쪽 벽을 만나면 UP으로 꺾어요.', '마지막 LEFT 2번을 놓치지 마세요.'],
    maxMistakes: 5,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 27,
    chapter: 'Chapter 5. 그림 완성 챌린지',
    title: '웃는 얼굴',
    description: '웃는 얼굴의 눈과 입처럼 보이는 경로를 완성합니다.',
    concept: '조건 분기 종합',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 1, col: 1 },
    code: [m('right', 's27-1'), iff('nextTileIsBlue', 'right', 's27-if-1', [m('right', 's27-2')], [m('down', 's27-else-1')]), m('down', 's27-3'), f(3, 's27-for-1', [m('right', 's27-4')]), m('down', 's27-5'), f(4, 's27-for-2', [m('left', 's27-6')])],
    targetImageName: '웃는 얼굴',
    solutionInput: ['right', 'right', 'down', 'right', 'right', 'right', 'down', 'left', 'left', 'left', 'left'],
    targetColor: '#38bdf8',
    hints: ['오른쪽 파란 칸을 확인한 뒤 RIGHT를 실행합니다.', '입 부분은 RIGHT 3번으로 길게 그려요.', '마지막은 LEFT 4번입니다.'],
    maxMistakes: 5,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 28,
    chapter: 'Chapter 5. 그림 완성 챌린지',
    title: '고양이 얼굴',
    description: '귀와 얼굴 테두리를 이어 고양이 얼굴 일부를 그립니다.',
    concept: '복합 반복 패턴',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 5, col: 1 },
    code: [f(2, 's28-for-1', [m('up', 's28-1'), m('right', 's28-2')]), iff('pathIsOpen', 'right', 's28-if-1', [m('right', 's28-3')], [m('down', 's28-else-1')]), f(2, 's28-for-2', [m('right', 's28-4'), m('down', 's28-5')]), f(4, 's28-for-3', [m('left', 's28-6')])],
    targetImageName: '고양이 얼굴',
    solutionInput: ['up', 'right', 'up', 'right', 'right', 'right', 'down', 'right', 'down', 'left', 'left', 'left', 'left'],
    targetColor: '#f472b6',
    hints: ['귀 부분은 UP, RIGHT가 반복돼요.', '오른쪽 길이 열려 있어 THEN을 실행합니다.', '얼굴 아래쪽은 LEFT 4번으로 닫습니다.'],
    maxMistakes: 6,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 29,
    chapter: 'Chapter 5. 그림 완성 챌린지',
    title: '왕관 챌린지',
    description: '왕관의 봉우리와 아래 선을 복합 코드로 완성합니다.',
    concept: '반복과 조건 마무리',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 5, col: 0 },
    code: [f(3, 's29-for-1', [m('up', 's29-1'), m('right', 's29-2'), m('down', 's29-3'), m('right', 's29-4')]), iff('frontIsWall', 'right', 's29-if-1', [m('up', 's29-5')], [m('right', 's29-else-1')])],
    targetImageName: '왕관 챌린지',
    solutionInput: ['up', 'right', 'down', 'right', 'up', 'right', 'down', 'right', 'up', 'right', 'down', 'right', 'up'],
    targetColor: '#facc15',
    hints: ['왕관 봉우리 묶음이 3번 반복돼요.', '마지막에는 오른쪽 벽을 확인합니다.', '벽이 있으면 UP으로 마무리해요.'],
    maxMistakes: 6,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 30,
    chapter: 'Chapter 5. 그림 완성 챌린지',
    title: '최종 아이템',
    description: '조건, 반복, 순차 실행을 모두 활용해 게임 아이템을 완성합니다.',
    concept: '최종 종합',
    difficulty: '도전',
    rows: 7,
    cols: 7,
    startPosition: { row: 3, col: 0 },
    code: [iff('nextTileIsYellow', 'right', 's30-if-1', [m('right', 's30-1'), m('up', 's30-2')], [m('down', 's30-else-1')]), f(2, 's30-for-1', [m('right', 's30-3'), m('down', 's30-4')]), iff('pathIsOpen', 'right', 's30-if-2', [m('right', 's30-5')], [m('left', 's30-else-2')]), f(3, 's30-for-2', [m('up', 's30-6')]), f(3, 's30-for-3', [m('left', 's30-7')])],
    targetImageName: '최종 게임 아이템',
    solutionInput: ['right', 'up', 'right', 'down', 'right', 'down', 'right', 'up', 'up', 'up', 'left', 'left', 'left'],
    targetColor: '#facc15',
    hints: ['첫 조건은 오른쪽 노란 칸을 확인합니다.', 'RIGHT, DOWN 묶음이 2번 반복돼요.', '두 번째 조건 이후 UP 3번, LEFT 3번으로 마무리합니다.'],
    maxMistakes: 6,
    checkpointMode: 'failImmediately',
  }),
];
