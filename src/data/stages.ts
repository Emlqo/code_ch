import type { BoardCell, CodeNode, ConditionType, Direction, Position, Stage } from '../types/game';

type StageConfig = Omit<Stage, 'board'> & {
  rows: number;
  cols: number;
  targetColor: string;
  walls?: Position[];
  markers?: Array<Position & { color: string }>;
};

type StageMarker = Position & { color: string };

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

const repeatDirections = (direction: Direction, count: number): Direction[] =>
  Array.from({ length: count }, () => direction);

const lineMarkers = (start: Position, direction: Direction, count: number, color: string): StageMarker[] => {
  const delta = directionDelta[direction];
  return Array.from({ length: count }, (_, index) => ({
    row: start.row + delta.row * index,
    col: start.col + delta.col * index,
    color,
  }));
};

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

const conditionalMoveBlock = (
  count: number,
  condition: ConditionType,
  checkDirection: Direction,
  sourceLineId: string,
  thenDirection: Direction,
  elseDirection: Direction,
  label?: string,
): CodeNode =>
  f(
    count,
    sourceLineId,
    [
      iff(
        condition,
        checkDirection,
        `${sourceLineId}-if`,
        [m(thenDirection, `${sourceLineId}-then`)],
        [m(elseDirection, `${sourceLineId}-else`)],
      ),
    ],
    label,
  );

const conditionalMove = (
  condition: ConditionType,
  checkDirection: Direction,
  sourceLineId: string,
  thenDirection: Direction,
  elseDirection: Direction,
  label?: string,
): CodeNode =>
  iff(
    condition,
    checkDirection,
    sourceLineId,
    [m(thenDirection, `${sourceLineId}-then`)],
    [m(elseDirection, `${sourceLineId}-else`)],
    label,
  );

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
  const currentCell = canMoveTo(position, board) ? board[position.row][position.col] : undefined;
  const currentColor = getCellColor(currentCell);
  const nextCell = canMoveTo(nextPosition, board) ? board[nextPosition.row][nextPosition.col] : undefined;
  const nextColor = getCellColor(nextCell);

  if (condition === 'currentTileIsBlue') {
    return ['#38bdf8', '#06b6d4', '#0ea5e9', '#3b82f6'].includes(currentColor);
  }

  if (condition === 'currentTileIsRed') {
    return ['#ef4444', '#f43f5e', '#fb7185', '#dc2626'].includes(currentColor);
  }

  if (condition === 'currentTileIsYellow') {
    return ['#facc15', '#eab308', '#fbbf24', '#fde047'].includes(currentColor);
  }

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
  const markerColorByKey = new Map((config.markers ?? []).map((marker) => [keyOf(marker), marker.color]));
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

  board[config.startPosition.row][config.startPosition.col] = startCell(
    markerColorByKey.get(keyOf(config.startPosition)) ?? config.targetColor,
  );

  config.solutionInput.forEach((direction) => {
    currentPosition = getNextPosition(currentPosition, direction);

    if (!isInsideBoard(currentPosition, config.rows, config.cols)) {
      throw new Error(`Stage ${config.id}: solution leaves board at ${keyOf(currentPosition)}.`);
    }

    if (wallKeys.has(keyOf(currentPosition))) {
      throw new Error(`Stage ${config.id}: solution hits wall at ${keyOf(currentPosition)}.`);
    }

    board[currentPosition.row][currentPosition.col] = paintCell(markerColorByKey.get(keyOf(currentPosition)) ?? config.targetColor);
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

const baseStages: Stage[] = [
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
    title: '픽셀 하트',
    description: '더 넓은 보드에서 반복문을 활용해 하트 픽셀아트를 완성합니다.',
    concept: '픽셀아트 경로 설계',
    difficulty: '도전',
    rows: 17,
    cols: 17,
    startPosition: { row: 2, col: 4 },
    code: [
      f(2, 's25-for-1', [m('right', 's25-1')], '왼쪽 하트 봉우리 채우기'),
      m('down', 's25-2'),
      f(3, 's25-for-2', [m('left', 's25-3')], '왼쪽 윗곡선으로 이동'),
      f(10, 's25-for-3', [m('right', 's25-4')], '가운데 연결선을 길게 채우기'),
      m('left', 's25-4b'),
      m('up', 's25-5'),
      f(2, 's25-for-4', [m('left', 's25-6')], '오른쪽 하트 봉우리 채우기'),
      m('down', 's25-7'),
      f(3, 's25-for-5', [m('right', 's25-8')], '몸통 시작점으로 돌아가기'),
      m('down', 's25-9'),
      m('right', 's25-10'),
      f(10, 's25-for-6', [m('left', 's25-11')], '하트 윗몸통 왼쪽으로 채우기'),
      f(2, 's25-for-7', [m('left', 's25-12')], '하트 윗몸통 마무리'),
      m('down', 's25-13'),
      f(10, 's25-for-8', [m('right', 's25-14')], '하트 가운데 몸통 채우기'),
      f(2, 's25-for-9', [m('right', 's25-15')], '하트 가운데 몸통 마무리'),
      m('down', 's25-16'),
      f(10, 's25-for-10', [m('left', 's25-17')], '하트 아래 몸통 채우기'),
      f(2, 's25-for-11', [m('left', 's25-18')], '하트 아래 몸통 마무리'),
      m('right', 's25-19'),
      m('down', 's25-20'),
      f(10, 's25-for-12', [m('right', 's25-21')], '하트가 좁아지는 줄 채우기'),
      m('left', 's25-22'),
      m('down', 's25-23'),
      f(8, 's25-for-13', [m('left', 's25-24')], '아래쪽 곡선 채우기'),
      m('right', 's25-25'),
      m('down', 's25-26'),
      f(6, 's25-for-14', [m('right', 's25-27')], '하트 아랫부분 채우기'),
      m('left', 's25-28'),
      m('down', 's25-29'),
      f(4, 's25-for-15', [m('left', 's25-30')], '하트 끝으로 모으기'),
      m('right', 's25-31'),
      m('down', 's25-32'),
      f(2, 's25-for-16', [m('right', 's25-33')], '하트 끝 직전 채우기'),
      m('left', 's25-34'),
      m('down', 's25-35'),
    ],
    targetImageName: '픽셀 하트',
    solutionInput: [
      ...repeatDirections('right', 2),
      'down',
      ...repeatDirections('left', 3),
      ...repeatDirections('right', 10),
      'left',
      'up',
      ...repeatDirections('left', 2),
      'down',
      ...repeatDirections('right', 3),
      'down',
      'right',
      ...repeatDirections('left', 10),
      ...repeatDirections('left', 2),
      'down',
      ...repeatDirections('right', 10),
      ...repeatDirections('right', 2),
      'down',
      ...repeatDirections('left', 10),
      ...repeatDirections('left', 2),
      'right',
      'down',
      ...repeatDirections('right', 10),
      'left',
      'down',
      ...repeatDirections('left', 8),
      'right',
      'down',
      ...repeatDirections('right', 6),
      'left',
      'down',
      ...repeatDirections('left', 4),
      'right',
      'down',
      ...repeatDirections('right', 2),
      'left',
      'down',
    ],
    targetColor: '#fb7185',
    hints: [
      '이번 하트는 큰 보드에서 줄 단위로 채우는 픽셀아트예요.',
      '긴 FOR 블록은 하트의 가로줄을 채우는 역할을 합니다.',
      '위쪽 봉우리 두 개를 만든 뒤, 아래로 갈수록 가로줄이 짧아지는지 확인해 보세요.',
    ],
    maxMistakes: 5,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 26,
    chapter: 'Chapter 5. 그림 완성 챌린지',
    title: '픽셀 별',
    description: '넓은 보드에서 위쪽 꼭짓점, 양쪽 팔, 아래쪽 꼬리가 있는 별 픽셀아트를 완성합니다.',
    concept: '픽셀아트 반복 채우기',
    difficulty: '도전',
    rows: 17,
    cols: 17,
    startPosition: { row: 1, col: 8 },
    code: [
      m('down', 's26-1'),
      m('left', 's26-2'),
      f(2, 's26-for-1', [m('right', 's26-3')], '별 윗부분을 넓히기'),
      m('down', 's26-4'),
      f(2, 's26-for-2', [m('left', 's26-5')], '윗부분 반대쪽 채우기'),
      m('down', 's26-6'),
      m('left', 's26-7'),
      f(4, 's26-for-3', [m('right', 's26-8')], '별 중심 위쪽 채우기'),
      m('down', 's26-9'),
      f(5, 's26-for-4', [m('right', 's26-10')], '오른쪽 팔 끝으로 이동'),
      f(10, 's26-for-5', [m('left', 's26-11')], '별 팔을 왼쪽으로 길게 채우기'),
      f(4, 's26-for-6', [m('left', 's26-12')], '왼쪽 팔 끝까지 채우기'),
      f(2, 's26-for-7', [m('right', 's26-13')], '다음 줄 시작점 맞추기'),
      m('down', 's26-14'),
      f(10, 's26-for-8', [m('right', 's26-15')], '별 몸통 넓게 채우기'),
      f(2, 's26-for-9', [m('left', 's26-16')], '다음 줄 시작점 맞추기'),
      m('down', 's26-17'),
      f(6, 's26-for-10', [m('left', 's26-18')], '별 몸통을 좁히기'),
      m('right', 's26-19'),
      m('down', 's26-20'),
      f(4, 's26-for-11', [m('right', 's26-21')], '가운데 좁은 줄 채우기'),
      m('down', 's26-22'),
      m('right', 's26-23'),
      f(6, 's26-for-12', [m('left', 's26-24')], '별 아래쪽을 다시 넓히기'),
      m('down', 's26-25'),
      m('left', 's26-26'),
      f(8, 's26-for-13', [m('right', 's26-27')], '아래쪽 중심 채우기'),
      m('down', 's26-28'),
      m('right', 's26-29'),
      f(10, 's26-for-14', [m('left', 's26-30')], '아래쪽 넓은 줄 채우기'),
      m('right', 's26-31'),
      m('down', 's26-32'),
      f(8, 's26-for-15', [m('right', 's26-33')], '아래쪽을 좁히기'),
      m('left', 's26-34'),
      m('down', 's26-35'),
      f(6, 's26-for-16', [m('left', 's26-36')], '별 꼬리로 모으기'),
      m('right', 's26-37'),
      m('down', 's26-38'),
      f(4, 's26-for-17', [m('right', 's26-39')], '꼬리 윗부분 채우기'),
      m('left', 's26-40'),
      m('down', 's26-41'),
      f(2, 's26-for-18', [m('left', 's26-42')], '꼬리 끝 직전 채우기'),
      m('right', 's26-43'),
      m('down', 's26-44'),
    ],
    targetImageName: '픽셀 별',
    solutionInput: [
      'down',
      'left',
      ...repeatDirections('right', 2),
      'down',
      ...repeatDirections('left', 2),
      'down',
      'left',
      ...repeatDirections('right', 4),
      'down',
      ...repeatDirections('right', 5),
      ...repeatDirections('left', 10),
      ...repeatDirections('left', 4),
      ...repeatDirections('right', 2),
      'down',
      ...repeatDirections('right', 10),
      ...repeatDirections('left', 2),
      'down',
      ...repeatDirections('left', 6),
      'right',
      'down',
      ...repeatDirections('right', 4),
      'down',
      'right',
      ...repeatDirections('left', 6),
      'down',
      'left',
      ...repeatDirections('right', 8),
      'down',
      'right',
      ...repeatDirections('left', 10),
      'right',
      'down',
      ...repeatDirections('right', 8),
      'left',
      'down',
      ...repeatDirections('left', 6),
      'right',
      'down',
      ...repeatDirections('right', 4),
      'left',
      'down',
      ...repeatDirections('left', 2),
      'right',
      'down',
    ],
    targetColor: '#fbbf24',
    hints: [
      '별은 위쪽 꼭짓점에서 시작해 점점 넓어졌다가 다시 좁아지는 모양이에요.',
      '가장 긴 FOR 블록은 별의 양쪽 팔을 만드는 부분입니다.',
      '아래쪽에서는 다시 넓어졌다가 마지막 한 칸으로 모이며 별 꼬리를 만듭니다.',
    ],
    maxMistakes: 5,
    checkpointMode: 'resetToStart',
  }),
];

const advancedStageReplacements: Stage[] = [
  createStage({
    id: 27,
    chapter: 'Chapter 5. 그림 완성 챌린지',
    title: '번개 화살표',
    description: '현재 칸의 노란색 신호를 읽으며 지그재그로 꺾이는 큰 번개 화살표를 완성합니다.',
    concept: 'FOR + IF currentTileIsYellow',
    difficulty: '어려움 입문',
    rows: 15,
    cols: 15,
    startPosition: { row: 1, col: 2 },
    code: [
      conditionalMoveBlock(8, 'currentTileIsYellow', 'right', 's27-bolt-1', 'right', 'left'),
      f(2, 's27-drop-1', [m('down', 's27-drop-1-step')]),
      conditionalMoveBlock(3, 'currentTileIsYellow', 'right', 's27-bolt-2', 'right', 'left'),
      m('down', 's27-drop-2'),
      conditionalMoveBlock(7, 'currentTileIsYellow', 'right', 's27-bolt-3', 'right', 'left'),
      f(2, 's27-drop-3', [m('down', 's27-drop-3-step')]),
      conditionalMoveBlock(5, 'currentTileIsYellow', 'right', 's27-bolt-4', 'right', 'left'),
      m('down', 's27-drop-4'),
      conditionalMoveBlock(4, 'currentTileIsYellow', 'right', 's27-bolt-5', 'right', 'left'),
      f(2, 's27-drop-5', [m('down', 's27-drop-5-step')]),
      conditionalMoveBlock(6, 'currentTileIsYellow', 'right', 's27-bolt-6', 'right', 'left'),
      m('down', 's27-drop-6'),
      conditionalMoveBlock(5, 'currentTileIsYellow', 'right', 's27-bolt-7', 'right', 'left'),
      f(2, 's27-drop-7', [m('down', 's27-drop-7-step')]),
      conditionalMoveBlock(4, 'currentTileIsYellow', 'right', 's27-bolt-8', 'right', 'left'),
    ],
    targetImageName: '번개 화살표',
    solutionInput: [
      ...repeatDirections('right', 8),
      ...repeatDirections('down', 2),
      ...repeatDirections('left', 3),
      'down',
      ...repeatDirections('right', 7),
      ...repeatDirections('down', 2),
      ...repeatDirections('left', 5),
      'down',
      ...repeatDirections('right', 4),
      ...repeatDirections('down', 2),
      ...repeatDirections('left', 6),
      'down',
      ...repeatDirections('right', 5),
      ...repeatDirections('down', 2),
      ...repeatDirections('left', 4),
    ],
    targetColor: '#a855f7',
    markers: [
      ...lineMarkers({ row: 1, col: 2 }, 'right', 8, '#facc15'),
      ...lineMarkers({ row: 4, col: 7 }, 'right', 7, '#facc15'),
      ...lineMarkers({ row: 7, col: 9 }, 'right', 4, '#facc15'),
      ...lineMarkers({ row: 10, col: 7 }, 'right', 5, '#facc15'),
    ],
    hints: [
      'IF CURRENT TILE IS YELLOW는 현재 밟고 있는 칸이 노란색인지 확인하는 조건이에요.',
      '노란 칸에서는 THEN의 RIGHT가 실행되고, 보라색 칸에서는 ELSE의 LEFT가 실행돼요.',
      '긴 가로줄보다 꺾이는 지점을 먼저 찾으면 번개 모양이 더 잘 보여요.',
    ],
    maxMistakes: 5,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 28,
    chapter: 'Chapter 5. 그림 완성 챌린지',
    title: '로봇 얼굴 실루엣',
    description: '파란 칸과 빨간 칸을 구분해서 넓고 좁은 줄을 번갈아 그리며 로봇 얼굴을 완성합니다.',
    concept: 'FOR 안의 IF + currentTileIsBlue',
    difficulty: '어려움',
    rows: 16,
    cols: 16,
    startPosition: { row: 2, col: 5 },
    code: [
      conditionalMoveBlock(6, 'currentTileIsBlue', 'right', 's28-face-1', 'right', 'left'),
      m('down', 's28-drop-1'),
      conditionalMoveBlock(8, 'currentTileIsBlue', 'right', 's28-face-2', 'right', 'left'),
      m('down', 's28-drop-2'),
      conditionalMoveBlock(10, 'currentTileIsBlue', 'right', 's28-face-3', 'right', 'left'),
      m('down', 's28-drop-3'),
      conditionalMoveBlock(10, 'currentTileIsBlue', 'right', 's28-face-4', 'right', 'left'),
      m('down', 's28-drop-4'),
      conditionalMoveBlock(8, 'currentTileIsBlue', 'right', 's28-face-5', 'right', 'left'),
      m('down', 's28-drop-5'),
      conditionalMoveBlock(8, 'currentTileIsBlue', 'right', 's28-face-6', 'right', 'left'),
      m('down', 's28-drop-6'),
      conditionalMoveBlock(10, 'currentTileIsBlue', 'right', 's28-face-7', 'right', 'left'),
      m('down', 's28-drop-7'),
      conditionalMoveBlock(8, 'currentTileIsBlue', 'right', 's28-face-8', 'right', 'left'),
      m('down', 's28-drop-8'),
      conditionalMoveBlock(6, 'currentTileIsBlue', 'right', 's28-face-9', 'right', 'left'),
    ],
    targetImageName: '로봇 얼굴',
    solutionInput: [
      ...repeatDirections('right', 6),
      'down',
      ...repeatDirections('left', 8),
      'down',
      ...repeatDirections('right', 10),
      'down',
      ...repeatDirections('left', 10),
      'down',
      ...repeatDirections('right', 8),
      'down',
      ...repeatDirections('left', 8),
      'down',
      ...repeatDirections('right', 10),
      'down',
      ...repeatDirections('left', 8),
      'down',
      ...repeatDirections('right', 6),
    ],
    targetColor: '#94a3b8',
    markers: [
      ...lineMarkers({ row: 2, col: 5 }, 'right', 6, '#38bdf8'),
      ...lineMarkers({ row: 3, col: 11 }, 'left', 8, '#ef4444'),
      ...lineMarkers({ row: 4, col: 3 }, 'right', 10, '#38bdf8'),
      ...lineMarkers({ row: 5, col: 13 }, 'left', 10, '#ef4444'),
      ...lineMarkers({ row: 6, col: 3 }, 'right', 8, '#38bdf8'),
      ...lineMarkers({ row: 7, col: 11 }, 'left', 8, '#ef4444'),
      ...lineMarkers({ row: 8, col: 3 }, 'right', 10, '#38bdf8'),
      ...lineMarkers({ row: 9, col: 13 }, 'left', 8, '#ef4444'),
      ...lineMarkers({ row: 10, col: 5 }, 'right', 6, '#38bdf8'),
    ],
    hints: [
      'IF CURRENT TILE IS BLUE는 현재 칸이 파란색이면 THEN을 실행해요.',
      '빨간 칸에서는 조건이 거짓이므로 ELSE의 LEFT가 실행돼요.',
      '줄마다 길이가 달라서 가운데가 넓은 로봇 얼굴 실루엣이 만들어집니다.',
    ],
    maxMistakes: 6,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 29,
    chapter: 'Chapter 5. 그림 완성 챌린지',
    title: '큰 방패',
    description: '다음 칸의 파란색과 노란색 신호를 보고 방향을 고르며 아래로 좁아지는 방패를 완성합니다.',
    concept: 'FOR + IF + ELSE + nextTileIsBlue/Yellow',
    difficulty: '매우 어려움',
    rows: 13,
    cols: 15,
    startPosition: { row: 1, col: 5 },
    code: [
      conditionalMoveBlock(6, 'nextTileIsBlue', 'right', 's29-shield-1', 'right', 'down'),
      conditionalMove('nextTileIsBlue', 'right', 's29-turn-1', 'right', 'down'),
      conditionalMoveBlock(10, 'nextTileIsYellow', 'left', 's29-shield-2', 'left', 'down'),
      conditionalMove('nextTileIsYellow', 'left', 's29-turn-2', 'left', 'down'),
      conditionalMoveBlock(10, 'nextTileIsBlue', 'right', 's29-shield-3a', 'right', 'down'),
      conditionalMoveBlock(2, 'nextTileIsBlue', 'right', 's29-shield-3b', 'right', 'down'),
      conditionalMove('nextTileIsBlue', 'right', 's29-turn-3', 'right', 'down'),
      conditionalMoveBlock(10, 'nextTileIsYellow', 'left', 's29-shield-4a', 'left', 'down'),
      conditionalMoveBlock(2, 'nextTileIsYellow', 'left', 's29-shield-4b', 'left', 'down'),
      conditionalMove('nextTileIsYellow', 'left', 's29-turn-4', 'left', 'down'),
      conditionalMoveBlock(10, 'nextTileIsBlue', 'right', 's29-shield-5', 'right', 'down'),
      conditionalMove('nextTileIsBlue', 'right', 's29-turn-5', 'right', 'down'),
      conditionalMoveBlock(8, 'nextTileIsYellow', 'left', 's29-shield-6', 'left', 'down'),
      conditionalMove('nextTileIsYellow', 'left', 's29-turn-6', 'left', 'down'),
      conditionalMoveBlock(6, 'nextTileIsBlue', 'right', 's29-shield-7', 'right', 'down'),
      conditionalMove('nextTileIsBlue', 'right', 's29-turn-7', 'right', 'down'),
      conditionalMoveBlock(4, 'nextTileIsYellow', 'left', 's29-shield-8', 'left', 'down'),
      conditionalMove('nextTileIsYellow', 'left', 's29-turn-8', 'left', 'down'),
      conditionalMoveBlock(2, 'nextTileIsBlue', 'right', 's29-shield-9', 'right', 'down'),
    ],
    targetImageName: '큰 방패',
    solutionInput: [
      ...repeatDirections('right', 6),
      'down',
      ...repeatDirections('left', 10),
      'down',
      ...repeatDirections('right', 12),
      'down',
      ...repeatDirections('left', 12),
      'down',
      ...repeatDirections('right', 10),
      'down',
      ...repeatDirections('left', 8),
      'down',
      ...repeatDirections('right', 6),
      'down',
      ...repeatDirections('left', 4),
      'down',
      ...repeatDirections('right', 2),
    ],
    targetColor: '#64748b',
    markers: [
      ...lineMarkers({ row: 1, col: 6 }, 'right', 6, '#38bdf8'),
      ...lineMarkers({ row: 2, col: 10 }, 'left', 10, '#facc15'),
      ...lineMarkers({ row: 3, col: 2 }, 'right', 12, '#38bdf8'),
      ...lineMarkers({ row: 4, col: 12 }, 'left', 12, '#facc15'),
      ...lineMarkers({ row: 5, col: 2 }, 'right', 10, '#38bdf8'),
      ...lineMarkers({ row: 6, col: 10 }, 'left', 8, '#facc15'),
      ...lineMarkers({ row: 7, col: 4 }, 'right', 6, '#38bdf8'),
      ...lineMarkers({ row: 8, col: 8 }, 'left', 4, '#facc15'),
      ...lineMarkers({ row: 9, col: 6 }, 'right', 2, '#38bdf8'),
    ],
    hints: [
      'NEXT TILE 조건은 checkDirection 방향의 다음 칸 색을 확인해요.',
      '파란색 신호가 오른쪽에 있으면 오른쪽으로, 노란색 신호가 왼쪽에 있으면 왼쪽으로 이동해요.',
      '각 줄의 끝에서는 다음 칸 색이 맞지 않아서 ELSE의 DOWN이 실행됩니다.',
    ],
    maxMistakes: 6,
    checkpointMode: 'resetToStart',
  }),
  createStage({
    id: 30,
    chapter: 'Chapter 5. 그림 완성 챌린지',
    title: '로봇 보스 트로피',
    description: '현재 칸과 다음 칸의 색상 조건을 함께 해석해 최종 보스 트로피 실루엣을 완성합니다.',
    concept: 'FOR + IF + currentTile/nextTile 색상 조건',
    difficulty: '최종 문제',
    rows: 13,
    cols: 16,
    startPosition: { row: 1, col: 5 },
    code: [
      conditionalMoveBlock(6, 'currentTileIsRed', 'right', 's30-boss-1', 'right', 'down'),
      conditionalMove('currentTileIsRed', 'right', 's30-turn-1', 'right', 'down'),
      conditionalMoveBlock(8, 'nextTileIsYellow', 'left', 's30-boss-2', 'left', 'down'),
      conditionalMove('nextTileIsYellow', 'left', 's30-turn-2', 'left', 'down'),
      conditionalMoveBlock(10, 'currentTileIsRed', 'right', 's30-boss-3', 'right', 'down'),
      conditionalMove('currentTileIsRed', 'right', 's30-turn-3', 'right', 'down'),
      conditionalMoveBlock(10, 'nextTileIsYellow', 'left', 's30-boss-4', 'left', 'down'),
      conditionalMove('nextTileIsYellow', 'left', 's30-turn-4', 'left', 'down'),
      conditionalMoveBlock(8, 'currentTileIsRed', 'right', 's30-boss-5', 'right', 'down'),
      conditionalMove('currentTileIsRed', 'right', 's30-turn-5', 'right', 'down'),
      conditionalMoveBlock(6, 'nextTileIsBlue', 'left', 's30-boss-6', 'left', 'down'),
      conditionalMove('nextTileIsBlue', 'left', 's30-turn-6', 'left', 'down'),
      conditionalMoveBlock(8, 'currentTileIsRed', 'right', 's30-boss-7', 'right', 'down'),
      conditionalMove('currentTileIsRed', 'right', 's30-turn-7', 'right', 'down'),
      conditionalMoveBlock(10, 'nextTileIsYellow', 'left', 's30-boss-8a', 'left', 'down'),
      conditionalMoveBlock(2, 'nextTileIsYellow', 'left', 's30-boss-8b', 'left', 'down'),
      conditionalMove('nextTileIsYellow', 'left', 's30-turn-8', 'left', 'down'),
      conditionalMoveBlock(10, 'currentTileIsRed', 'right', 's30-boss-9a', 'right', 'down'),
      conditionalMoveBlock(2, 'currentTileIsRed', 'right', 's30-boss-9b', 'right', 'down'),
      conditionalMove('currentTileIsRed', 'right', 's30-turn-9', 'right', 'down'),
      conditionalMoveBlock(8, 'nextTileIsBlue', 'left', 's30-boss-10', 'left', 'down'),
    ],
    targetImageName: '로봇 보스 트로피',
    solutionInput: [
      ...repeatDirections('right', 6),
      'down',
      ...repeatDirections('left', 8),
      'down',
      ...repeatDirections('right', 10),
      'down',
      ...repeatDirections('left', 10),
      'down',
      ...repeatDirections('right', 8),
      'down',
      ...repeatDirections('left', 6),
      'down',
      ...repeatDirections('right', 8),
      'down',
      ...repeatDirections('left', 12),
      'down',
      ...repeatDirections('right', 12),
      'down',
      ...repeatDirections('left', 8),
    ],
    targetColor: '#a855f7',
    markers: [
      ...lineMarkers({ row: 1, col: 5 }, 'right', 6, '#ef4444'),
      ...lineMarkers({ row: 2, col: 10 }, 'left', 8, '#facc15'),
      ...lineMarkers({ row: 3, col: 3 }, 'right', 10, '#ef4444'),
      ...lineMarkers({ row: 4, col: 12 }, 'left', 10, '#facc15'),
      ...lineMarkers({ row: 5, col: 3 }, 'right', 8, '#ef4444'),
      ...lineMarkers({ row: 6, col: 10 }, 'left', 6, '#38bdf8'),
      ...lineMarkers({ row: 7, col: 5 }, 'right', 8, '#ef4444'),
      ...lineMarkers({ row: 8, col: 12 }, 'left', 12, '#facc15'),
      ...lineMarkers({ row: 9, col: 1 }, 'right', 12, '#ef4444'),
      ...lineMarkers({ row: 10, col: 12 }, 'left', 8, '#38bdf8'),
    ],
    hints: [
      'CURRENT TILE 조건은 현재 칸의 색, NEXT TILE 조건은 지정 방향 다음 칸의 색을 봅니다.',
      '빨간 현재 칸에서는 오른쪽으로 이동하고, 노란색 또는 파란색 다음 칸은 왼쪽 이동 신호예요.',
      '줄 끝에서는 조건이 거짓이 되어 ELSE의 DOWN으로 다음 줄에 내려갑니다.',
    ],
    maxMistakes: 6,
    checkpointMode: 'failImmediately',
  }),
];


export const stages: Stage[] = [...baseStages, ...advancedStageReplacements];
