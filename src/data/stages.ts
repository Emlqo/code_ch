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

type PixelRun = {
  row: number;
  from: number;
  to: number;
  color?: string;
};

type PixelIconCodeMode = 'forOnly' | 'pathIf' | 'ifElse' | 'colorIf';

type PixelIconStageConfig = {
  id: number;
  chapter: string;
  title: string;
  description: string;
  concept: string;
  difficulty: Stage['difficulty'];
  rows: number;
  cols: number;
  targetImageName: string;
  runs: PixelRun[];
  targetColor: string;
  hints: string[];
  maxMistakes: number;
  checkpointMode: Stage['checkpointMode'];
  codeMode: PixelIconCodeMode;
  accentMarkers?: StageMarker[];
  scale?: PixelIconScale;
};

type PixelPathStageConfig = Omit<PixelIconStageConfig, 'runs' | 'scale' | 'accentMarkers'> & {
  path: Position[];
};

type DirectionRun = {
  direction: Direction;
  count: number;
  startIndex: number;
};

type PixelIconScale = {
  row: number;
  col: number;
  rowOffset: number;
  colOffset: number;
};

const colorConditionByHex: Partial<Record<string, ConditionType>> = {
  '#facc15': 'nextTileIsYellow',
  '#eab308': 'nextTileIsYellow',
  '#fbbf24': 'nextTileIsYellow',
  '#fde047': 'nextTileIsYellow',
  '#38bdf8': 'nextTileIsBlue',
  '#06b6d4': 'nextTileIsBlue',
  '#0ea5e9': 'nextTileIsBlue',
  '#3b82f6': 'nextTileIsBlue',
  '#ef4444': 'nextTileIsRed',
  '#f43f5e': 'nextTileIsRed',
  '#fb7185': 'nextTileIsRed',
  '#dc2626': 'nextTileIsRed',
};

function positionsToDirections(path: Position[]): Direction[] {
  const directions: Direction[] = [];

  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];
    const rowDelta = current.row - previous.row;
    const colDelta = current.col - previous.col;

    if (rowDelta === -1 && colDelta === 0) {
      directions.push('up');
    } else if (rowDelta === 1 && colDelta === 0) {
      directions.push('down');
    } else if (rowDelta === 0 && colDelta === -1) {
      directions.push('left');
    } else if (rowDelta === 0 && colDelta === 1) {
      directions.push('right');
    } else {
      throw new Error(`Pixel icon path has a non-adjacent step: ${keyOf(previous)} -> ${keyOf(current)}`);
    }
  }

  return directions;
}

function addPathStep(path: Position[], markerByKey: Map<string, string>, position: Position, color: string): void {
  const previous = path[path.length - 1];

  if (previous && previous.row === position.row && previous.col === position.col) {
    markerByKey.set(keyOf(position), color);
    return;
  }

  path.push(position);
  markerByKey.set(keyOf(position), color);
}

function addStraightPath(
  path: Position[],
  markerByKey: Map<string, string>,
  from: Position,
  to: Position,
  color: string,
): void {
  let current = from;

  while (current.row !== to.row || current.col !== to.col) {
    current = {
      row: current.row + Math.sign(to.row - current.row),
      col: current.col + Math.sign(to.col - current.col),
    };
    addPathStep(path, markerByKey, current, color);
  }
}

function buildPathFromPixelRuns(runs: PixelRun[], fallbackColor: string): { path: Position[]; markers: StageMarker[] } {
  if (runs.length === 0) {
    throw new Error('Pixel icon stage requires at least one run.');
  }

  const orderedRuns = runs.map((run) => ({
    ...run,
    from: Math.min(run.from, run.to),
    to: Math.max(run.from, run.to),
  }));
  const markerByKey = new Map<string, string>();
  const firstRun = orderedRuns[0];
  const path: Position[] = [];
  let current = { row: firstRun.row, col: firstRun.from };

  addPathStep(path, markerByKey, current, firstRun.color ?? fallbackColor);
  addStraightPath(path, markerByKey, current, { row: firstRun.row, col: firstRun.to }, firstRun.color ?? fallbackColor);
  current = path[path.length - 1];

  for (let index = 1; index < orderedRuns.length; index += 1) {
    const previousRun = orderedRuns[index - 1];
    const run = orderedRuns[index];
    const color = run.color ?? fallbackColor;
    const entryCol = Math.abs(current.col - run.from) <= Math.abs(current.col - run.to) ? run.from : run.to;
    const exitCol = entryCol === run.from ? run.to : run.from;

    if (current.col !== entryCol) {
      addStraightPath(path, markerByKey, current, { row: current.row, col: entryCol }, previousRun.color ?? fallbackColor);
      current = path[path.length - 1];
    }

    if (current.row !== run.row) {
      addStraightPath(path, markerByKey, current, { row: run.row, col: entryCol }, color);
      current = path[path.length - 1];
    }

    addStraightPath(path, markerByKey, current, { row: run.row, col: exitCol }, color);
    current = path[path.length - 1];
  }

  return {
    path,
    markers: Array.from(markerByKey.entries()).map(([key, color]) => {
      const [row, col] = key.split('-').map(Number);
      return { row, col, color };
    }),
  };
}

function buildDirectionRuns(directions: Direction[]): DirectionRun[] {
  const runs: DirectionRun[] = [];

  directions.forEach((direction, index) => {
    const previousRun = runs[runs.length - 1];

    if (previousRun && previousRun.direction === direction) {
      previousRun.count += 1;
      return;
    }

    runs.push({ direction, count: 1, startIndex: index });
  });

  return runs;
}

function oppositeDirection(direction: Direction): Direction {
  if (direction === 'up') return 'down';
  if (direction === 'down') return 'up';
  if (direction === 'left') return 'right';
  return 'left';
}

function colorConditionForRun(
  path: Position[],
  markerByKey: Map<string, string>,
  run: DirectionRun,
  offset: number,
  count: number,
): ConditionType | null {
  const colors = new Set<string>();

  for (let index = 1; index <= count; index += 1) {
    const position = path[run.startIndex + offset + index];
    const color = markerByKey.get(keyOf(position))?.toLowerCase();

    if (color) {
      colors.add(color);
    }
  }

  if (colors.size !== 1) {
    return null;
  }

  return colorConditionByHex[Array.from(colors)[0]] ?? null;
}

function buildPixelIconCode(
  directions: Direction[],
  path: Position[],
  markers: StageMarker[],
  stageId: number,
  mode: PixelIconCodeMode,
): CodeNode[] {
  const markerByKey = new Map(markers.map((marker) => [keyOf(marker), marker.color]));
  const nodes: CodeNode[] = [];
  const runs = buildDirectionRuns(directions);

  runs.forEach((run, runIndex) => {
    let remaining = run.count;
    let offset = 0;

    while (remaining > 0) {
      const chunkCount = Math.min(remaining, 10);
      const sourceLineId = `s${stageId}-icon-${runIndex + 1}-${offset + 1}`;

      if (mode === 'forOnly') {
        nodes.push(
          chunkCount === 1
            ? m(run.direction, sourceLineId, '픽셀 한 칸 이동')
            : f(chunkCount, sourceLineId, [m(run.direction, `${sourceLineId}-move`)], '같은 방향으로 픽셀 채우기'),
        );
      } else {
        const condition =
          mode === 'colorIf' ? colorConditionForRun(path, markerByKey, run, offset, chunkCount) ?? 'pathIsOpen' : 'pathIsOpen';

        if (chunkCount === 1) {
          nodes.push(
            conditionalMove(
              condition,
              run.direction,
              sourceLineId,
              run.direction,
              oppositeDirection(run.direction),
              '조건을 확인하고 픽셀 한 칸 이동',
            ),
          );
        } else {
          nodes.push(
            conditionalMoveBlock(
              chunkCount,
              condition,
              run.direction,
              sourceLineId,
              run.direction,
              oppositeDirection(run.direction),
              '조건을 확인하며 같은 방향으로 채우기',
            ),
          );
        }
      }

      remaining -= chunkCount;
      offset += chunkCount;
    }
  });

  return nodes;
}

function createPixelIconStage(config: PixelIconStageConfig): Stage {
  const scaledRuns = config.scale ? scalePixelRuns(config.runs, config.scale) : config.runs;
  const scaledAccentMarkers = config.scale
    ? scaleStageMarkers(config.accentMarkers ?? [], config.runs, config.scale)
    : config.accentMarkers ?? [];
  const { path, markers } = buildPathFromPixelRuns(scaledRuns, config.targetColor);
  const solutionInput = positionsToDirections(path);
  const allMarkers = [...markers, ...scaledAccentMarkers];

  return createStage({
    id: config.id,
    chapter: config.chapter,
    title: config.title,
    description: config.description,
    concept: config.concept,
    difficulty: config.difficulty,
    rows: config.rows,
    cols: config.cols,
    startPosition: path[0],
    code: buildPixelIconCode(solutionInput, path, allMarkers, config.id, config.codeMode),
    targetImageName: config.targetImageName,
    solutionInput,
    targetColor: config.targetColor,
    markers: allMarkers,
    hints: config.hints,
    maxMistakes: config.maxMistakes,
    checkpointMode: config.checkpointMode,
  });
}

function createPixelPathStage(config: PixelPathStageConfig): Stage {
  const solutionInput = positionsToDirections(config.path);
  const pathMarkers = config.path.map((position) => ({
    ...position,
    color: config.targetColor,
  }));

  return createStage({
    id: config.id,
    chapter: config.chapter,
    title: config.title,
    description: config.description,
    concept: config.concept,
    difficulty: config.difficulty,
    rows: config.rows,
    cols: config.cols,
    startPosition: config.path[0],
    code: buildPixelIconCode(solutionInput, config.path, pathMarkers, config.id, config.codeMode),
    targetImageName: config.targetImageName,
    solutionInput,
    targetColor: config.targetColor,
    hints: config.hints,
    maxMistakes: config.maxMistakes,
    checkpointMode: config.checkpointMode,
  });
}

function createStageFromPathWithCode(
  config: Omit<PixelPathStageConfig, 'codeMode'> & {
    code: CodeNode[];
    markers?: StageMarker[];
    walls?: Position[];
  },
): Stage {
  const solutionInput = positionsToDirections(config.path);
  const pathMarkers = config.path.map((position) => ({
    ...position,
    color: config.targetColor,
  }));

  return createStage({
    id: config.id,
    chapter: config.chapter,
    title: config.title,
    description: config.description,
    concept: config.concept,
    difficulty: config.difficulty,
    rows: config.rows,
    cols: config.cols,
    startPosition: config.path[0],
    code: config.code,
    targetImageName: config.targetImageName,
    solutionInput,
    targetColor: config.targetColor,
    walls: config.walls,
    markers: [...pathMarkers, ...(config.markers ?? [])],
    hints: config.hints,
    maxMistakes: config.maxMistakes,
    checkpointMode: config.checkpointMode,
  });
}

function pathFromWaypoints(waypoints: Position[]): Position[] {
  if (waypoints.length === 0) {
    throw new Error('Pixel path stage requires at least one waypoint.');
  }

  const path = [waypoints[0]];
  const markerByKey = new Map([[keyOf(waypoints[0]), '#ffffff']]);

  for (let index = 1; index < waypoints.length; index += 1) {
    const current = path[path.length - 1];
    const waypoint = waypoints[index];

    if (current.row !== waypoint.row && current.col !== waypoint.col) {
      addStraightPath(path, markerByKey, current, { row: waypoint.row, col: current.col }, '#ffffff');
    }

    addStraightPath(path, markerByKey, path[path.length - 1], waypoint, '#ffffff');
  }

  return path;
}

function rowsFromIntervals(
  startRow: number,
  intervals: Array<[number, number]>,
  color: string | ((index: number) => string),
): PixelRun[] {
  return intervals.map(([from, to], index) => ({
    row: startRow + index,
    from,
    to,
    color: typeof color === 'function' ? color(index) : color,
  }));
}

function getScaleOrigin(runs: PixelRun[]): Position {
  return {
    row: Math.min(...runs.map((run) => run.row)),
    col: Math.min(...runs.flatMap((run) => [run.from, run.to])),
  };
}

function scaleCoordinate(value: number, origin: number, scale: number, offset: number): number {
  return offset + Math.round((value - origin) * scale);
}

function scalePixelRuns(runs: PixelRun[], scale: PixelIconScale): PixelRun[] {
  const origin = getScaleOrigin(runs);

  return runs
    .map((run) => {
      const from = scaleCoordinate(run.from, origin.col, scale.col, scale.colOffset);
      const to = scaleCoordinate(run.to, origin.col, scale.col, scale.colOffset);

      return {
        row: scaleCoordinate(run.row, origin.row, scale.row, scale.rowOffset),
        from: Math.min(from, to),
        to: Math.max(from, to),
        color: run.color,
      };
    })
    .filter((run, index, scaledRuns) => {
      const previousRun = scaledRuns[index - 1];
      return !previousRun || previousRun.row !== run.row || previousRun.from !== run.from || previousRun.to !== run.to;
    });
}

function scaleStageMarkers(markers: StageMarker[], referenceRuns: PixelRun[], scale: PixelIconScale): StageMarker[] {
  const origin = getScaleOrigin(referenceRuns);

  return markers.map((marker) => ({
    row: scaleCoordinate(marker.row, origin.row, scale.row, scale.rowOffset),
    col: scaleCoordinate(marker.col, origin.col, scale.col, scale.colOffset),
    color: marker.color,
  }));
}

const yellowBlueRed = (index: number): string => ['#facc15', '#38bdf8', '#ef4444'][index % 3];

const pixelIconStages: Stage[] = [
  createPixelIconStage({
    id: 31,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '대형 번개',
    description: '큰 보드에서 반복문으로 굵은 번개 아이콘을 완성합니다.',
    concept: '대형 픽셀아트와 FOR 반복',
    difficulty: '도전',
    rows: 20,
    cols: 20,
    targetImageName: '큰 번개',
    targetColor: '#facc15',
    codeMode: 'forOnly',
    scale: { row: 0.58, col: 0.58, rowOffset: 2, colOffset: 2 },
    runs: rowsFromIntervals(
      3,
      [
        [15, 23],
        [14, 23],
        [13, 22],
        [12, 22],
        [11, 21],
        [10, 21],
        [9, 20],
        [8, 20],
        [12, 24],
        [11, 23],
        [10, 22],
        [9, 21],
        [8, 20],
        [7, 19],
        [6, 18],
        [5, 17],
        [4, 16],
        [8, 17],
        [7, 16],
        [6, 15],
        [5, 14],
        [4, 13],
        [3, 12],
        [2, 11],
      ],
      '#facc15',
    ),
    hints: [
      '번개는 줄마다 시작 위치가 조금씩 움직이면서 굵은 사선 모양을 만들어요.',
      'FOR 블록은 같은 방향으로 긴 픽셀 줄을 채우는 역할을 해요.',
      '그림 전체를 한 번에 보려고 하지 말고, 현재 줄과 다음 줄의 연결을 차례대로 따라가 보세요.',
    ],
    maxMistakes: 6,
    checkpointMode: 'resetToStart',
  }),
  createPixelIconStage({
    id: 32,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '픽셀 왕관',
    description: '넓은 보드에서 왕관의 뾰족한 윗부분과 두꺼운 받침을 채웁니다.',
    concept: '대형 아이콘 실루엣 읽기',
    difficulty: '도전',
    rows: 22,
    cols: 22,
    targetImageName: '왕관',
    targetColor: '#facc15',
    codeMode: 'forOnly',
    scale: { row: 0.48, col: 0.48, rowOffset: 2, colOffset: 2 },
    runs: rowsFromIntervals(
      4,
      [
        [7, 10],
        [7, 15],
        [7, 20],
        [6, 26],
        [5, 27],
        [5, 27],
        [4, 28],
        [4, 28],
        [4, 28],
        [5, 27],
        [5, 27],
        [6, 26],
        [6, 26],
        [5, 27],
        [4, 28],
        [4, 28],
        [4, 28],
        [5, 27],
        [6, 26],
        [7, 25],
        [8, 24],
      ],
      (index) => (index === 3 || index === 13 ? '#fbbf24' : '#facc15'),
    ),
    accentMarkers: [
      { row: 10, col: 10, color: '#ef4444' },
      { row: 10, col: 16, color: '#38bdf8' },
      { row: 10, col: 22, color: '#ef4444' },
      { row: 17, col: 12, color: '#38bdf8' },
      { row: 17, col: 20, color: '#38bdf8' },
    ],
    hints: [
      '왕관은 위쪽의 뾰족한 부분이 먼저 만들어지고 아래로 갈수록 넓어져요.',
      '중간중간 다른 색 픽셀은 보석처럼 보이는 포인트예요.',
      '긴 FOR 줄을 읽을 때는 반복 횟수만큼 같은 방향을 정확히 입력하세요.',
    ],
    maxMistakes: 6,
    checkpointMode: 'resetToStart',
  }),
  createPixelIconStage({
    id: 33,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '픽셀 열쇠',
    description: '둥근 손잡이와 긴 몸통을 가진 큰 열쇠 아이콘을 완성합니다.',
    concept: 'FOR 반복으로 큰 도형 채우기',
    difficulty: '어려움',
    rows: 21,
    cols: 22,
    targetImageName: '열쇠',
    targetColor: '#facc15',
    codeMode: 'forOnly',
    scale: { row: 0.48, col: 0.48, rowOffset: 2, colOffset: 2 },
    runs: rowsFromIntervals(
      5,
      [
        [7, 16],
        [5, 18],
        [4, 20],
        [3, 21],
        [3, 22],
        [4, 23],
        [5, 29],
        [6, 31],
        [7, 32],
        [8, 33],
        [9, 31],
        [10, 30],
        [11, 33],
        [12, 34],
        [13, 31],
        [14, 29],
        [13, 24],
        [11, 21],
        [8, 18],
      ],
      (index) => (index >= 6 && index <= 14 ? '#fbbf24' : '#facc15'),
    ),
    accentMarkers: [
      { row: 9, col: 10, color: '#38bdf8' },
      { row: 9, col: 11, color: '#38bdf8' },
      { row: 10, col: 10, color: '#38bdf8' },
      { row: 10, col: 11, color: '#38bdf8' },
    ],
    hints: [
      '앞부분은 열쇠 손잡이, 뒤쪽으로 길게 이어지는 부분은 열쇠 몸통이에요.',
      'FOR 반복이 길어질수록 같은 방향 입력을 놓치지 않는 것이 중요해요.',
      '파란색 포인트는 손잡이 안쪽 구멍을 표현하는 픽셀입니다.',
    ],
    maxMistakes: 6,
    checkpointMode: 'resetToStart',
  }),
  createPixelIconStage({
    id: 34,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '대형 방패',
    description: '위가 넓고 아래가 좁아지는 방패 아이콘을 반복문으로 완성합니다.',
    concept: '줄 길이가 변하는 FOR 반복',
    difficulty: '어려움',
    rows: 23,
    cols: 23,
    targetImageName: '방패',
    targetColor: '#38bdf8',
    codeMode: 'forOnly',
    scale: { row: 0.56, col: 0.56, rowOffset: 2, colOffset: 2 },
    runs: rowsFromIntervals(
      4,
      [
        [6, 27],
        [5, 28],
        [4, 29],
        [4, 29],
        [4, 29],
        [5, 28],
        [5, 28],
        [6, 27],
        [6, 27],
        [7, 26],
        [7, 26],
        [8, 25],
        [8, 25],
        [9, 24],
        [9, 24],
        [10, 23],
        [10, 23],
        [11, 22],
        [12, 21],
        [13, 20],
        [14, 19],
        [15, 18],
        [16, 17],
      ],
      (index) => (index < 5 ? '#38bdf8' : index < 14 ? '#0ea5e9' : '#3b82f6'),
    ),
    accentMarkers: [
      { row: 10, col: 16, color: '#facc15' },
      { row: 11, col: 16, color: '#facc15' },
      { row: 12, col: 15, color: '#facc15' },
      { row: 12, col: 16, color: '#facc15' },
      { row: 12, col: 17, color: '#facc15' },
      { row: 13, col: 16, color: '#facc15' },
    ],
    hints: [
      '방패는 위쪽이 가장 넓고 아래로 갈수록 점점 좁아져요.',
      '각 줄의 반복 횟수가 조금씩 달라지는 이유를 생각해 보세요.',
      '가운데 노란 픽셀은 방패의 문장처럼 보이는 포인트예요.',
    ],
    maxMistakes: 7,
    checkpointMode: 'resetToStart',
  }),
  createPixelIconStage({
    id: 35,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '대형 로봇 얼굴',
    description: 'IF 조건으로 길이 열린지 확인하면서 로봇 얼굴을 채웁니다.',
    concept: 'FOR + 간단한 IF 조건',
    difficulty: '어려움',
    rows: 23,
    cols: 23,
    targetImageName: '로봇 얼굴',
    targetColor: '#94a3b8',
    codeMode: 'pathIf',
    scale: { row: 0.58, col: 0.58, rowOffset: 2, colOffset: 2 },
    runs: rowsFromIntervals(
      5,
      [
        [10, 23],
        [8, 25],
        [7, 26],
        [6, 27],
        [6, 27],
        [6, 27],
        [6, 27],
        [6, 27],
        [6, 27],
        [6, 27],
        [6, 27],
        [6, 27],
        [6, 27],
        [6, 27],
        [7, 26],
        [8, 25],
        [9, 24],
        [10, 23],
      ],
      '#94a3b8',
    ),
    accentMarkers: [
      { row: 11, col: 11, color: '#38bdf8' },
      { row: 11, col: 12, color: '#38bdf8' },
      { row: 11, col: 21, color: '#38bdf8' },
      { row: 11, col: 22, color: '#38bdf8' },
      { row: 18, col: 12, color: '#ef4444' },
      { row: 18, col: 13, color: '#ef4444' },
      { row: 18, col: 14, color: '#ef4444' },
      { row: 18, col: 19, color: '#ef4444' },
      { row: 18, col: 20, color: '#ef4444' },
      { row: 18, col: 21, color: '#ef4444' },
    ],
    hints: [
      'IF PATH IS OPEN은 지정한 방향으로 이동할 수 있는지 확인해요.',
      '조건이 참이면 THEN 쪽 이동이 실행됩니다.',
      '로봇 얼굴은 큰 회색 면 위에 눈과 입 포인트가 들어가요.',
    ],
    maxMistakes: 7,
    checkpointMode: 'resetToStart',
  }),
  createPixelIconStage({
    id: 36,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '게임 보석',
    description: '조건 확인과 반복 입력으로 반짝이는 보석 아이콘을 완성합니다.',
    concept: 'FOR + IF로 다이아몬드 채우기',
    difficulty: '어려움',
    rows: 22,
    cols: 22,
    targetImageName: '게임 보석',
    targetColor: '#38bdf8',
    codeMode: 'pathIf',
    scale: { row: 0.62, col: 0.62, rowOffset: 2, colOffset: 2 },
    runs: rowsFromIntervals(
      5,
      [
        [15, 18],
        [13, 20],
        [11, 22],
        [9, 24],
        [7, 26],
        [6, 27],
        [5, 28],
        [6, 27],
        [7, 26],
        [8, 25],
        [9, 24],
        [10, 23],
        [11, 22],
        [12, 21],
        [13, 20],
        [14, 19],
        [15, 18],
      ],
      (index) => (index < 5 ? '#38bdf8' : index < 10 ? '#0ea5e9' : '#3b82f6'),
    ),
    accentMarkers: [
      { row: 8, col: 16, color: '#facc15' },
      { row: 9, col: 15, color: '#facc15' },
      { row: 9, col: 16, color: '#facc15' },
      { row: 10, col: 14, color: '#facc15' },
      { row: 10, col: 15, color: '#facc15' },
      { row: 11, col: 13, color: '#facc15' },
    ],
    hints: [
      '보석은 위아래가 뾰족한 다이아몬드 모양이에요.',
      'PATH IS OPEN 조건은 현재 이동 방향이 막혀 있지 않은지 확인합니다.',
      '색이 바뀌는 줄은 보석의 반짝임을 표현하는 부분이에요.',
    ],
    maxMistakes: 7,
    checkpointMode: 'resetToStart',
  }),
  createPixelIconStage({
    id: 37,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '대형 트로피',
    description: 'IF와 ELSE 구조를 읽으며 트로피 컵과 받침을 완성합니다.',
    concept: 'FOR + IF + ELSE 구조',
    difficulty: '매우 어려움',
    rows: 25,
    cols: 25,
    targetImageName: '트로피',
    targetColor: '#facc15',
    codeMode: 'ifElse',
    scale: { row: 0.55, col: 0.55, rowOffset: 2, colOffset: 2 },
    runs: rowsFromIntervals(
      4,
      [
        [9, 26],
        [7, 28],
        [6, 29],
        [5, 30],
        [5, 30],
        [6, 29],
        [7, 28],
        [8, 27],
        [9, 26],
        [10, 25],
        [11, 24],
        [12, 23],
        [13, 22],
        [14, 21],
        [15, 20],
        [16, 19],
        [15, 20],
        [14, 21],
        [12, 23],
        [10, 25],
        [8, 27],
        [7, 28],
        [7, 28],
        [8, 27],
      ],
      (index) => (index < 16 ? '#facc15' : '#fbbf24'),
    ),
    accentMarkers: [
      { row: 8, col: 7, color: '#fbbf24' },
      { row: 8, col: 28, color: '#fbbf24' },
      { row: 9, col: 6, color: '#fbbf24' },
      { row: 9, col: 29, color: '#fbbf24' },
      { row: 25, col: 15, color: '#38bdf8' },
      { row: 25, col: 20, color: '#38bdf8' },
    ],
    hints: [
      'IF와 ELSE가 같이 있어도 조건 결과에 따라 한쪽만 실행돼요.',
      '트로피 컵은 넓게 시작했다가 아래로 갈수록 목 부분이 좁아집니다.',
      '반복문 안의 조건문은 반복될 때마다 다시 확인된다고 생각하세요.',
    ],
    maxMistakes: 8,
    checkpointMode: 'resetToStart',
  }),
  createPixelIconStage({
    id: 38,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '픽셀 우주선',
    description: '조건문과 반복문을 따라가며 넓은 우주선 실루엣을 완성합니다.',
    concept: 'FOR + IF + ELSE로 넓은 아이콘 완성',
    difficulty: '매우 어려움',
    rows: 22,
    cols: 24,
    targetImageName: '우주선',
    targetColor: '#38bdf8',
    codeMode: 'ifElse',
    scale: { row: 0.48, col: 0.48, rowOffset: 2, colOffset: 2 },
    runs: rowsFromIntervals(
      5,
      [
        [18, 21],
        [16, 23],
        [14, 25],
        [12, 27],
        [10, 29],
        [8, 31],
        [6, 33],
        [5, 34],
        [4, 35],
        [3, 36],
        [4, 35],
        [6, 33],
        [8, 31],
        [10, 29],
        [12, 27],
        [14, 25],
        [16, 23],
        [18, 21],
      ],
      (index) => (index < 9 ? '#38bdf8' : '#0ea5e9'),
    ),
    accentMarkers: [
      { row: 11, col: 18, color: '#facc15' },
      { row: 11, col: 19, color: '#facc15' },
      { row: 11, col: 20, color: '#facc15' },
      { row: 11, col: 21, color: '#facc15' },
      { row: 14, col: 8, color: '#ef4444' },
      { row: 14, col: 31, color: '#ef4444' },
      { row: 20, col: 18, color: '#ef4444' },
      { row: 20, col: 21, color: '#ef4444' },
    ],
    hints: [
      '우주선은 가운데가 넓고 위아래가 좁은 대칭 구조예요.',
      'IF PATH IS OPEN이 참이면 THEN 방향으로 이동합니다.',
      'ELSE 블록은 조건이 맞지 않을 때의 예비 경로라고 생각하면 좋아요.',
    ],
    maxMistakes: 8,
    checkpointMode: 'resetToStart',
  }),
  createPixelIconStage({
    id: 39,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '보스 얼굴',
    description: '색상 조건 IF를 읽으며 거대한 보스 얼굴 아이콘을 완성합니다.',
    concept: '색상 조건 IF + 반복문',
    difficulty: '최종 문제',
    rows: 23,
    cols: 23,
    targetImageName: '보스 얼굴',
    targetColor: '#ef4444',
    codeMode: 'colorIf',
    scale: { row: 0.43, col: 0.43, rowOffset: 2, colOffset: 2 },
    runs: rowsFromIntervals(
      5,
      [
        [15, 26],
        [12, 29],
        [10, 31],
        [8, 33],
        [7, 34],
        [6, 35],
        [6, 35],
        [6, 35],
        [6, 35],
        [6, 35],
        [6, 35],
        [6, 35],
        [7, 34],
        [8, 33],
        [9, 32],
        [10, 31],
        [10, 31],
        [10, 31],
        [11, 30],
        [12, 29],
        [13, 28],
        [14, 27],
        [15, 26],
      ],
      yellowBlueRed,
    ),
    accentMarkers: [
      { row: 13, col: 13, color: '#facc15' },
      { row: 13, col: 14, color: '#facc15' },
      { row: 13, col: 27, color: '#facc15' },
      { row: 13, col: 28, color: '#facc15' },
      { row: 20, col: 15, color: '#38bdf8' },
      { row: 20, col: 16, color: '#38bdf8' },
      { row: 20, col: 25, color: '#38bdf8' },
      { row: 20, col: 26, color: '#38bdf8' },
      { row: 24, col: 17, color: '#facc15' },
      { row: 24, col: 18, color: '#facc15' },
      { row: 24, col: 23, color: '#facc15' },
      { row: 24, col: 24, color: '#facc15' },
    ],
    hints: [
      '색상 조건은 다음 칸의 색을 보고 THEN 또는 ELSE 중 하나를 실행해요.',
      'NEXT TILE IS BLUE처럼 쓰인 조건은 checkDirection 방향의 다음 칸을 확인합니다.',
      '보스 얼굴은 빨강, 파랑, 노랑 줄이 섞여 있어서 조건을 더 꼼꼼히 읽어야 해요.',
    ],
    maxMistakes: 8,
    checkpointMode: 'failImmediately',
  }),
  createPixelIconStage({
    id: 40,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '최종 픽셀 별',
    description: '색상 조건과 반복문을 결합해 마지막 대형 별 아이콘을 완성합니다.',
    concept: '최종 색상 조건 픽셀아트',
    difficulty: '최종 문제',
    rows: 24,
    cols: 24,
    targetImageName: '최종 별',
    targetColor: '#facc15',
    codeMode: 'colorIf',
    scale: { row: 0.43, col: 0.43, rowOffset: 2, colOffset: 2 },
    runs: rowsFromIntervals(
      4,
      [
        [20, 23],
        [19, 24],
        [18, 25],
        [17, 26],
        [16, 27],
        [15, 28],
        [9, 34],
        [7, 36],
        [6, 37],
        [8, 35],
        [10, 33],
        [12, 31],
        [14, 29],
        [12, 31],
        [10, 33],
        [8, 35],
        [6, 37],
        [7, 36],
        [9, 34],
        [15, 28],
        [16, 27],
        [17, 26],
        [18, 25],
        [19, 24],
        [20, 23],
      ],
      (index) => (index % 4 === 0 ? '#facc15' : index % 4 === 1 ? '#fbbf24' : index % 4 === 2 ? '#38bdf8' : '#ef4444'),
    ),
    accentMarkers: [
      { row: 13, col: 21, color: '#facc15' },
      { row: 14, col: 20, color: '#facc15' },
      { row: 14, col: 21, color: '#facc15' },
      { row: 14, col: 22, color: '#facc15' },
      { row: 21, col: 15, color: '#38bdf8' },
      { row: 21, col: 28, color: '#38bdf8' },
      { row: 24, col: 21, color: '#ef4444' },
      { row: 25, col: 20, color: '#ef4444' },
      { row: 25, col: 21, color: '#ef4444' },
      { row: 25, col: 22, color: '#ef4444' },
    ],
    hints: [
      '최종 별은 줄마다 색이 바뀌기 때문에 색상 조건을 정확히 확인해야 해요.',
      'FOR 안의 IF는 반복되는 동안 계속 같은 규칙으로 다음 칸 색을 검사합니다.',
      '큰 별은 가운데가 넓고 위아래가 좁아지는 구조라 줄 길이가 크게 달라집니다.',
    ],
    maxMistakes: 8,
    checkpointMode: 'failImmediately',
  }),
];

const pixelIconStageCorrections: Stage[] = [
  createPixelPathStage({
    id: 33,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '테두리 열쇠',
    description: '속을 모두 채우지 않고 고리, 몸통, 이빨의 테두리만 따라가며 열쇠 아이콘을 완성합니다.',
    concept: '테두리 픽셀아트와 FOR 반복',
    difficulty: '어려움',
    rows: 20,
    cols: 28,
    targetImageName: '테두리 열쇠',
    targetColor: '#facc15',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 10, col: 4 },
      { row: 7, col: 4 },
      { row: 7, col: 10 },
      { row: 9, col: 10 },
      { row: 9, col: 23 },
      { row: 11, col: 23 },
      { row: 11, col: 21 },
      { row: 13, col: 21 },
      { row: 13, col: 18 },
      { row: 11, col: 18 },
      { row: 11, col: 10 },
      { row: 13, col: 10 },
      { row: 13, col: 4 },
      { row: 10, col: 4 },
      { row: 10, col: 23 },
    ]),
    hints: [
      '이번 열쇠는 내부를 채우지 않고 바깥 테두리를 따라가는 픽셀아트예요.',
      '왼쪽 네모 고리는 열쇠 손잡이, 오른쪽 긴 선은 열쇠 몸통입니다.',
      '오른쪽 아래로 꺾이는 부분은 열쇠 이빨이니 방향이 바뀌는 지점을 잘 확인하세요.',
    ],
    maxMistakes: 6,
    checkpointMode: 'resetToStart',
  }),
  createPixelPathStage({
    id: 35,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '테두리 로봇 얼굴',
    description: '로봇 얼굴의 외곽선, 안테나, 눈, 입을 선으로 따라가며 완성합니다.',
    concept: 'FOR + IF로 특징선 그리기',
    difficulty: '어려움',
    rows: 24,
    cols: 24,
    targetImageName: '테두리 로봇 얼굴',
    targetColor: '#94a3b8',
    codeMode: 'pathIf',
    path: pathFromWaypoints([
      { row: 4, col: 12 },
      { row: 2, col: 12 },
      { row: 2, col: 13 },
      { row: 4, col: 13 },
      { row: 4, col: 18 },
      { row: 6, col: 18 },
      { row: 6, col: 21 },
      { row: 9, col: 21 },
      { row: 9, col: 18 },
      { row: 19, col: 18 },
      { row: 19, col: 6 },
      { row: 9, col: 6 },
      { row: 9, col: 3 },
      { row: 6, col: 3 },
      { row: 6, col: 6 },
      { row: 4, col: 6 },
      { row: 4, col: 18 },
      { row: 8, col: 18 },
      { row: 8, col: 15 },
      { row: 10, col: 15 },
      { row: 10, col: 17 },
      { row: 8, col: 17 },
      { row: 8, col: 9 },
      { row: 10, col: 9 },
      { row: 10, col: 7 },
      { row: 8, col: 7 },
      { row: 8, col: 9 },
      { row: 15, col: 9 },
      { row: 15, col: 15 },
      { row: 17, col: 15 },
      { row: 17, col: 9 },
      { row: 15, col: 9 },
    ]),
    hints: [
      '이번 로봇은 얼굴을 채우는 문제가 아니라 외곽선과 표정을 그리는 문제예요.',
      '양쪽 귀, 위쪽 안테나, 눈, 입이 어느 순서로 이어지는지 확인하세요.',
      'IF PATH IS OPEN은 다음 칸으로 갈 수 있는지 확인한 뒤 이동합니다.',
    ],
    maxMistakes: 7,
    checkpointMode: 'resetToStart',
  }),
  createStageFromPathWithCode({
    id: 37,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '테두리 트로피',
    description: '트로피의 손잡이, 컵, 목, 받침을 테두리 중심으로 완성합니다.',
    concept: 'FOR + IF + ELSE로 아이콘 테두리 읽기',
    difficulty: '매우 어려움',
    rows: 24,
    cols: 24,
    targetImageName: '테두리 트로피',
    targetColor: '#facc15',
    path: pathFromWaypoints([
      { row: 5, col: 6 },
      { row: 5, col: 18 },
      { row: 7, col: 18 },
      { row: 7, col: 21 },
      { row: 12, col: 21 },
      { row: 12, col: 18 },
      { row: 14, col: 18 },
      { row: 14, col: 15 },
      { row: 17, col: 15 },
      { row: 17, col: 18 },
      { row: 20, col: 18 },
      { row: 20, col: 6 },
      { row: 17, col: 6 },
      { row: 17, col: 9 },
      { row: 14, col: 9 },
      { row: 14, col: 6 },
      { row: 12, col: 6 },
      { row: 12, col: 3 },
      { row: 7, col: 3 },
      { row: 7, col: 6 },
      { row: 5, col: 6 },
      { row: 5, col: 12 },
      { row: 14, col: 12 },
    ]),
    code: [
      f(10, 's37-cup-top-a', [m('right', 's37-cup-top-a-move')], '트로피 컵 윗줄 채우기'),
      f(2, 's37-cup-top-b', [m('right', 's37-cup-top-b-move')], '오른쪽 끝까지 이동'),
      iff('frontIsWall', 'right', 's37-right-edge-turn', [m('down', 's37-right-edge-down')], [m('right', 's37-right-edge-right')], '오른쪽 벽이면 아래로'),
      m('down', 's37-right-edge-down-more'),
      f(3, 's37-right-handle-out', [m('right', 's37-right-handle-out-move')], '오른쪽 손잡이 바깥쪽'),
      iff('frontIsWall', 'right', 's37-right-handle-turn', [m('down', 's37-right-handle-down')], [m('right', 's37-right-handle-right')], '손잡이 끝 벽이면 아래로'),
      f(4, 's37-right-handle-side', [m('down', 's37-right-handle-side-move')], '오른쪽 손잡이 아래로'),
      f(3, 's37-right-handle-in', [m('left', 's37-right-handle-in-move')], '컵 안쪽으로 돌아오기'),
      f(2, 's37-cup-neck-down', [m('down', 's37-cup-neck-down-move')], '컵에서 목으로'),
      f(3, 's37-neck-left', [m('left', 's37-neck-left-move')], '목 윗부분 왼쪽'),
      f(3, 's37-neck-down', [m('down', 's37-neck-down-move')], '목 아래로'),
      f(3, 's37-base-right-top', [m('right', 's37-base-right-top-move')], '받침 오른쪽'),
      f(3, 's37-base-down', [m('down', 's37-base-down-move')], '받침 아래로'),
      f(10, 's37-base-left-a', [m('left', 's37-base-left-a-move')], '받침 왼쪽으로'),
      f(2, 's37-base-left-b', [m('left', 's37-base-left-b-move')], '왼쪽 끝까지'),
      iff('frontIsWall', 'left', 's37-left-base-turn', [m('up', 's37-left-base-up')], [m('left', 's37-left-base-left')], '왼쪽 벽이면 위로'),
      f(2, 's37-left-base-up-more', [m('up', 's37-left-base-up-more-move')], '왼쪽 받침 위로'),
      f(3, 's37-neck-right', [m('right', 's37-neck-right-move')], '목으로 돌아오기'),
      f(3, 's37-left-neck-up', [m('up', 's37-left-neck-up-move')], '컵 쪽으로 올라가기'),
      f(3, 's37-left-cup-in', [m('left', 's37-left-cup-in-move')], '왼쪽 컵 안쪽'),
      f(2, 's37-left-cup-up', [m('up', 's37-left-cup-up-move')], '컵 위쪽으로'),
      f(3, 's37-left-handle-out', [m('left', 's37-left-handle-out-move')], '왼쪽 손잡이 바깥쪽'),
      f(5, 's37-left-handle-up', [m('up', 's37-left-handle-up-move')], '왼쪽 손잡이 위로'),
      iff('frontIsWall', 'up', 's37-left-handle-return', [m('right', 's37-left-handle-return-right')], [m('up', 's37-left-handle-return-up')], '위쪽 벽이면 오른쪽으로'),
      f(2, 's37-left-handle-in', [m('right', 's37-left-handle-in-move')], '컵 왼쪽으로 돌아오기'),
      f(2, 's37-left-cup-up-more', [m('up', 's37-left-cup-up-more-move')], '컵 윗줄로'),
      f(6, 's37-center-line-right', [m('right', 's37-center-line-right-move')], '가운데 선으로 이동'),
      f(9, 's37-center-line-down', [m('down', 's37-center-line-down-move')], '트로피 중심선'),
    ],
    walls: [
      { row: 5, col: 19 },
      { row: 7, col: 22 },
      { row: 20, col: 5 },
      { row: 6, col: 3 },
    ],
    hints: [
      '트로피는 양쪽 손잡이와 가운데 컵, 아래 받침이 보여야 해요.',
      'IF FRONT IS WALL은 지정한 방향의 다음 칸이 벽인지 확인하고, 벽이면 THEN 쪽 명령을 실행해요.',
      '오른쪽 끝, 왼쪽 끝, 위쪽 끝에서 벽을 만나면 방향이 꺾이는지 확인해 보세요.',
    ],
    maxMistakes: 8,
    checkpointMode: 'resetToStart',
  }),
  createPixelPathStage({
    id: 38,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '테두리 우주선',
    description: '우주선의 몸체, 창문, 날개, 엔진 부분을 선으로 표현합니다.',
    concept: 'FOR + IF + ELSE로 우주선 외곽선 그리기',
    difficulty: '매우 어려움',
    rows: 24,
    cols: 28,
    targetImageName: '테두리 우주선',
    targetColor: '#38bdf8',
    codeMode: 'ifElse',
    path: pathFromWaypoints([
      { row: 12, col: 3 },
      { row: 10, col: 3 },
      { row: 10, col: 6 },
      { row: 8, col: 6 },
      { row: 8, col: 10 },
      { row: 6, col: 10 },
      { row: 6, col: 18 },
      { row: 8, col: 18 },
      { row: 8, col: 22 },
      { row: 10, col: 22 },
      { row: 10, col: 25 },
      { row: 12, col: 25 },
      { row: 14, col: 25 },
      { row: 14, col: 22 },
      { row: 16, col: 22 },
      { row: 16, col: 18 },
      { row: 18, col: 18 },
      { row: 18, col: 10 },
      { row: 16, col: 10 },
      { row: 16, col: 6 },
      { row: 14, col: 6 },
      { row: 14, col: 3 },
      { row: 12, col: 3 },
      { row: 12, col: 12 },
      { row: 10, col: 12 },
      { row: 10, col: 16 },
      { row: 14, col: 16 },
      { row: 14, col: 12 },
      { row: 12, col: 12 },
      { row: 18, col: 12 },
      { row: 21, col: 10 },
      { row: 21, col: 18 },
      { row: 18, col: 16 },
    ]),
    hints: [
      '우주선은 외곽선이 먼저 보이고 가운데 창문과 아래 엔진이 이어져요.',
      '날개처럼 튀어나온 좌우 부분을 찾으면 전체 모양을 이해하기 쉬워요.',
      '긴 선보다 방향이 자주 바뀌는 지점을 조심해서 입력하세요.',
    ],
    maxMistakes: 8,
    checkpointMode: 'resetToStart',
  }),
  createPixelPathStage({
    id: 39,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '테두리 보스 얼굴',
    description: '뿔, 얼굴 외곽, 눈, 입을 색상 조건 IF로 따라가며 완성합니다.',
    concept: '색상 조건 IF + 얼굴 특징선',
    difficulty: '최종 문제',
    rows: 24,
    cols: 24,
    targetImageName: '테두리 보스 얼굴',
    targetColor: '#ef4444',
    codeMode: 'colorIf',
    path: pathFromWaypoints([
      { row: 7, col: 6 },
      { row: 4, col: 6 },
      { row: 4, col: 3 },
      { row: 8, col: 3 },
      { row: 8, col: 6 },
      { row: 6, col: 6 },
      { row: 6, col: 18 },
      { row: 8, col: 18 },
      { row: 8, col: 21 },
      { row: 4, col: 21 },
      { row: 4, col: 18 },
      { row: 7, col: 18 },
      { row: 18, col: 18 },
      { row: 18, col: 16 },
      { row: 21, col: 16 },
      { row: 21, col: 8 },
      { row: 18, col: 8 },
      { row: 18, col: 6 },
      { row: 7, col: 6 },
      { row: 10, col: 8 },
      { row: 10, col: 10 },
      { row: 12, col: 10 },
      { row: 12, col: 8 },
      { row: 10, col: 8 },
      { row: 10, col: 14 },
      { row: 10, col: 16 },
      { row: 12, col: 16 },
      { row: 12, col: 14 },
      { row: 10, col: 14 },
      { row: 15, col: 9 },
      { row: 15, col: 15 },
      { row: 17, col: 15 },
      { row: 17, col: 9 },
      { row: 15, col: 9 },
    ]),
    hints: [
      '보스 얼굴은 양쪽 뿔, 눈, 입이 보이면 훨씬 알아보기 쉬워요.',
      '색상 조건 IF는 다음 칸 색을 확인하고 맞으면 THEN 방향으로 이동합니다.',
      '얼굴 외곽선을 먼저 따라간 뒤 눈과 입을 그리는 흐름을 떠올려 보세요.',
    ],
    maxMistakes: 8,
    checkpointMode: 'failImmediately',
  }),
  createPixelPathStage({
    id: 40,
    chapter: 'Chapter 6. 대형 픽셀 아이콘 완성 심화',
    title: '테두리 최종 별',
    description: 'IF 없이 반복 이동만으로 다섯 꼭짓점이 또렷한 최종 별 아이콘을 완성합니다.',
    concept: 'FOR 반복으로 최종 픽셀 별 완성',
    difficulty: '최종 문제',
    rows: 21,
    cols: 21,
    targetImageName: '테두리 최종 별',
    targetColor: '#facc15',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 2, col: 10 },
      { row: 5, col: 11 },
      { row: 5, col: 12 },
      { row: 7, col: 12 },
      { row: 7, col: 18 },
      { row: 9, col: 18 },
      { row: 9, col: 14 },
      { row: 11, col: 14 },
      { row: 11, col: 13 },
      { row: 16, col: 17 },
      { row: 18, col: 17 },
      { row: 18, col: 15 },
      { row: 14, col: 11 },
      { row: 19, col: 11 },
      { row: 19, col: 9 },
      { row: 14, col: 9 },
      { row: 18, col: 5 },
      { row: 18, col: 3 },
      { row: 16, col: 3 },
      { row: 11, col: 7 },
      { row: 11, col: 6 },
      { row: 9, col: 6 },
      { row: 9, col: 2 },
      { row: 7, col: 2 },
      { row: 7, col: 8 },
      { row: 5, col: 8 },
      { row: 5, col: 9 },
      { row: 2, col: 10 },
      { row: 11, col: 10 },
    ]),
    hints: [
      '이번 최종 별은 IF 없이 위에서 아래로 FOR 반복을 읽으며 따라가는 문제예요.',
      '오른쪽 날개, 아래 두 꼭짓점, 왼쪽 날개가 별의 외곽선을 만듭니다.',
      '마지막에는 별 꼭대기에서 가운데로 내려오며 중심선을 완성해요.',
    ],
    maxMistakes: 8,
    checkpointMode: 'failImmediately',
  }),
  createPixelPathStage({
    id: 41,
    chapter: 'Chapter 7. 픽셀아트 마스터 챌린지',
    title: '픽셀 음표',
    description: '음표의 머리, 기둥, 깃발을 테두리 선으로 이어서 완성합니다.',
    concept: 'FOR 반복으로 곡선 느낌의 아이콘 읽기',
    difficulty: '매우 어려움',
    rows: 20,
    cols: 20,
    targetImageName: '픽셀 음표',
    targetColor: '#38bdf8',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 4, col: 11 },
      { row: 4, col: 14 },
      { row: 14, col: 14 },
      { row: 14, col: 12 },
      { row: 16, col: 12 },
      { row: 16, col: 8 },
      { row: 14, col: 8 },
      { row: 14, col: 12 },
      { row: 6, col: 12 },
      { row: 6, col: 7 },
      { row: 4, col: 7 },
      { row: 4, col: 11 },
      { row: 8, col: 11 },
      { row: 8, col: 7 },
      { row: 11, col: 7 },
      { row: 11, col: 5 },
      { row: 13, col: 5 },
      { row: 13, col: 2 },
      { row: 11, col: 2 },
      { row: 11, col: 5 },
    ]),
    hints: [
      '먼저 오른쪽 긴 기둥을 그리고 아래쪽 음표 머리로 내려갑니다.',
      '위쪽 가로선은 음표의 깃발처럼 보이는 부분이에요.',
      '마지막 작은 네모는 왼쪽 아래의 두 번째 음표 머리입니다.',
    ],
    maxMistakes: 8,
    checkpointMode: 'resetToStart',
  }),
  createPixelPathStage({
    id: 42,
    chapter: 'Chapter 7. 픽셀아트 마스터 챌린지',
    title: '픽셀 말풍선',
    description: '말풍선의 둥근 테두리와 아래 꼬리를 픽셀 선으로 완성합니다.',
    concept: '긴 외곽선과 짧은 꺾임 읽기',
    difficulty: '매우 어려움',
    rows: 21,
    cols: 23,
    targetImageName: '픽셀 말풍선',
    targetColor: '#facc15',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 5, col: 5 },
      { row: 5, col: 17 },
      { row: 7, col: 17 },
      { row: 7, col: 19 },
      { row: 13, col: 19 },
      { row: 13, col: 16 },
      { row: 16, col: 16 },
      { row: 13, col: 13 },
      { row: 13, col: 5 },
      { row: 11, col: 5 },
      { row: 11, col: 3 },
      { row: 7, col: 3 },
      { row: 7, col: 5 },
      { row: 5, col: 5 },
      { row: 9, col: 7 },
      { row: 9, col: 8 },
      { row: 9, col: 11 },
      { row: 9, col: 12 },
      { row: 9, col: 15 },
      { row: 9, col: 16 },
    ]),
    hints: [
      '말풍선은 위쪽 긴 선에서 시작해 오른쪽과 아래쪽을 돌아갑니다.',
      '아래로 튀어나온 부분은 말풍선 꼬리입니다.',
      '마지막 짧은 선들은 말풍선 안쪽의 말줄임표처럼 보이는 포인트예요.',
    ],
    maxMistakes: 8,
    checkpointMode: 'resetToStart',
  }),
  createPixelPathStage({
    id: 43,
    chapter: 'Chapter 7. 픽셀아트 마스터 챌린지',
    title: '픽셀 검',
    description: '칼날, 손잡이, 가드를 꺾인 픽셀 선으로 따라가며 검 아이콘을 완성합니다.',
    concept: '대각선 느낌을 계단형 이동으로 표현하기',
    difficulty: '매우 어려움',
    rows: 22,
    cols: 22,
    targetImageName: '픽셀 검',
    targetColor: '#94a3b8',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 18, col: 4 },
      { row: 16, col: 4 },
      { row: 16, col: 6 },
      { row: 14, col: 6 },
      { row: 14, col: 8 },
      { row: 7, col: 15 },
      { row: 5, col: 15 },
      { row: 5, col: 17 },
      { row: 7, col: 17 },
      { row: 7, col: 19 },
      { row: 9, col: 19 },
      { row: 9, col: 17 },
      { row: 16, col: 10 },
      { row: 18, col: 10 },
      { row: 18, col: 12 },
      { row: 20, col: 12 },
      { row: 20, col: 8 },
      { row: 18, col: 8 },
      { row: 18, col: 4 },
      { row: 16, col: 8 },
      { row: 18, col: 10 },
    ]),
    hints: [
      '검은 대각선처럼 보이지만 실제 입력은 계단식 상하좌우 이동입니다.',
      '오른쪽 위의 작은 모양은 칼끝, 아래쪽 넓은 부분은 손잡이예요.',
      '긴 이동과 짧은 꺾임이 섞여 있으니 FOR 횟수를 차분히 세어 보세요.',
    ],
    maxMistakes: 8,
    checkpointMode: 'resetToStart',
  }),
  createPixelPathStage({
    id: 44,
    chapter: 'Chapter 7. 픽셀아트 마스터 챌린지',
    title: '마법 지팡이',
    description: '계단형 지팡이와 끝의 반짝임을 이어 그리는 픽셀아트 문제입니다.',
    concept: '지그재그 반복과 장식선 읽기',
    difficulty: '매우 어려움',
    rows: 22,
    cols: 22,
    targetImageName: '마법 지팡이',
    targetColor: '#facc15',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 18, col: 4 },
      { row: 18, col: 7 },
      { row: 15, col: 7 },
      { row: 15, col: 10 },
      { row: 12, col: 10 },
      { row: 12, col: 13 },
      { row: 9, col: 13 },
      { row: 9, col: 16 },
      { row: 7, col: 16 },
      { row: 7, col: 18 },
      { row: 5, col: 18 },
      { row: 5, col: 16 },
      { row: 7, col: 16 },
      { row: 7, col: 14 },
      { row: 5, col: 14 },
      { row: 5, col: 12 },
      { row: 7, col: 12 },
      { row: 7, col: 14 },
      { row: 3, col: 14 },
      { row: 3, col: 16 },
      { row: 9, col: 16 },
    ]),
    hints: [
      '아래 왼쪽에서 시작해 오른쪽 위로 계단처럼 올라갑니다.',
      '끝부분의 작은 십자 모양은 마법 지팡이의 반짝임이에요.',
      '반짝임 구간에서는 이동 방향이 짧게 자주 바뀝니다.',
    ],
    maxMistakes: 8,
    checkpointMode: 'resetToStart',
  }),
  createPixelPathStage({
    id: 45,
    chapter: 'Chapter 7. 픽셀아트 마스터 챌린지',
    title: '보물상자',
    description: '상자의 뚜껑, 몸통, 잠금장치를 선으로 따라가며 완성합니다.',
    concept: '큰 사각형과 내부 구조선 연결하기',
    difficulty: '매우 어려움',
    rows: 22,
    cols: 24,
    targetImageName: '보물상자',
    targetColor: '#facc15',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 7, col: 5 },
      { row: 7, col: 19 },
      { row: 10, col: 19 },
      { row: 10, col: 21 },
      { row: 18, col: 21 },
      { row: 18, col: 3 },
      { row: 10, col: 3 },
      { row: 10, col: 5 },
      { row: 7, col: 5 },
      { row: 10, col: 12 },
      { row: 18, col: 12 },
      { row: 14, col: 8 },
      { row: 14, col: 16 },
      { row: 12, col: 16 },
      { row: 12, col: 8 },
      { row: 14, col: 8 },
      { row: 12, col: 12 },
      { row: 15, col: 12 },
    ]),
    hints: [
      '처음에는 보물상자의 큰 외곽선을 따라갑니다.',
      '가운데 세로선은 상자 뚜껑과 몸통을 나누는 기준선이에요.',
      '작은 네모 부분은 잠금장치이므로 방향이 짧게 꺾입니다.',
    ],
    maxMistakes: 8,
    checkpointMode: 'resetToStart',
  }),
  createPixelPathStage({
    id: 46,
    chapter: 'Chapter 7. 픽셀아트 마스터 챌린지',
    title: '픽셀 카메라',
    description: '카메라 몸통, 윗부분, 렌즈를 하나의 경로로 이어서 그립니다.',
    concept: '외곽선과 내부 원형 느낌 표현',
    difficulty: '최종 문제',
    rows: 22,
    cols: 24,
    targetImageName: '픽셀 카메라',
    targetColor: '#38bdf8',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 7, col: 5 },
      { row: 7, col: 8 },
      { row: 5, col: 8 },
      { row: 5, col: 15 },
      { row: 7, col: 15 },
      { row: 7, col: 19 },
      { row: 17, col: 19 },
      { row: 17, col: 4 },
      { row: 7, col: 4 },
      { row: 7, col: 5 },
      { row: 10, col: 10 },
      { row: 10, col: 14 },
      { row: 14, col: 14 },
      { row: 14, col: 10 },
      { row: 10, col: 10 },
      { row: 12, col: 8 },
      { row: 12, col: 16 },
      { row: 8, col: 17 },
      { row: 9, col: 18 },
    ]),
    hints: [
      '카메라의 윗부분과 큰 몸통을 먼저 완성합니다.',
      '가운데 작은 네모는 카메라 렌즈입니다.',
      '렌즈를 그린 뒤 가로선을 지나 오른쪽 위 버튼까지 이어집니다.',
    ],
    maxMistakes: 8,
    checkpointMode: 'resetToStart',
  }),
  createPixelPathStage({
    id: 47,
    chapter: 'Chapter 7. 픽셀아트 마스터 챌린지',
    title: '픽셀 성문',
    description: '성벽의 톱니 모양과 가운데 문을 반복 이동으로 완성합니다.',
    concept: '반복되는 탑 모양과 내부 문 구조',
    difficulty: '최종 문제',
    rows: 24,
    cols: 24,
    targetImageName: '픽셀 성문',
    targetColor: '#94a3b8',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 20, col: 4 },
      { row: 8, col: 4 },
      { row: 8, col: 6 },
      { row: 5, col: 6 },
      { row: 5, col: 8 },
      { row: 8, col: 8 },
      { row: 8, col: 10 },
      { row: 5, col: 10 },
      { row: 5, col: 12 },
      { row: 8, col: 12 },
      { row: 8, col: 14 },
      { row: 5, col: 14 },
      { row: 5, col: 16 },
      { row: 8, col: 16 },
      { row: 8, col: 18 },
      { row: 5, col: 18 },
      { row: 5, col: 20 },
      { row: 20, col: 20 },
      { row: 20, col: 4 },
      { row: 20, col: 10 },
      { row: 14, col: 10 },
      { row: 14, col: 14 },
      { row: 20, col: 14 },
      { row: 11, col: 7 },
      { row: 12, col: 8 },
      { row: 11, col: 16 },
      { row: 12, col: 17 },
    ]),
    hints: [
      '성벽 위쪽은 톱니처럼 같은 높낮이가 반복됩니다.',
      '큰 외곽선을 완성한 뒤 가운데 문을 그립니다.',
      '마지막 작은 선들은 성문 양쪽의 창문 포인트입니다.',
    ],
    maxMistakes: 8,
    checkpointMode: 'resetToStart',
  }),
  createPixelPathStage({
    id: 48,
    chapter: 'Chapter 7. 픽셀아트 마스터 챌린지',
    title: '픽셀 불꽃',
    description: '큰 불꽃 외곽선과 안쪽 작은 불꽃을 이어서 완성합니다.',
    concept: '불규칙한 꺾임과 내부 포인트 따라가기',
    difficulty: '최종 문제',
    rows: 23,
    cols: 23,
    targetImageName: '픽셀 불꽃',
    targetColor: '#ef4444',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 20, col: 11 },
      { row: 18, col: 7 },
      { row: 14, col: 7 },
      { row: 14, col: 5 },
      { row: 10, col: 7 },
      { row: 7, col: 10 },
      { row: 4, col: 10 },
      { row: 7, col: 13 },
      { row: 9, col: 16 },
      { row: 13, col: 18 },
      { row: 16, col: 16 },
      { row: 20, col: 11 },
      { row: 17, col: 11 },
      { row: 14, col: 9 },
      { row: 11, col: 10 },
      { row: 13, col: 12 },
      { row: 10, col: 13 },
      { row: 14, col: 15 },
      { row: 17, col: 11 },
    ]),
    hints: [
      '불꽃은 좌우가 완전히 대칭이 아니어서 방향 전환을 특히 잘 봐야 합니다.',
      '먼저 큰 외곽선을 그리고, 안쪽 작은 불꽃으로 돌아옵니다.',
      '위쪽 뾰족한 부분과 오른쪽으로 휘는 부분이 불꽃 느낌을 만듭니다.',
    ],
    maxMistakes: 8,
    checkpointMode: 'failImmediately',
  }),
  createPixelPathStage({
    id: 49,
    chapter: 'Chapter 7. 픽셀아트 마스터 챌린지',
    title: '게임패드',
    description: '컨트롤러 외곽선, 방향키, 버튼을 픽셀 선으로 완성합니다.',
    concept: '복합 아이콘의 외곽선과 내부 기호',
    difficulty: '최종 문제',
    rows: 23,
    cols: 25,
    targetImageName: '게임패드',
    targetColor: '#38bdf8',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 12, col: 4 },
      { row: 9, col: 4 },
      { row: 9, col: 7 },
      { row: 7, col: 7 },
      { row: 7, col: 17 },
      { row: 9, col: 17 },
      { row: 9, col: 20 },
      { row: 12, col: 20 },
      { row: 15, col: 18 },
      { row: 17, col: 18 },
      { row: 17, col: 6 },
      { row: 15, col: 6 },
      { row: 12, col: 4 },
      { row: 12, col: 8 },
      { row: 12, col: 11 },
      { row: 10, col: 9 },
      { row: 14, col: 9 },
      { row: 12, col: 9 },
      { row: 12, col: 16 },
      { row: 11, col: 16 },
      { row: 11, col: 18 },
      { row: 13, col: 18 },
      { row: 13, col: 16 },
    ]),
    hints: [
      '게임패드는 먼저 전체 외곽선을 크게 돌아갑니다.',
      '왼쪽 안쪽은 십자 방향키, 오른쪽 안쪽은 버튼 포인트입니다.',
      '외곽선에서 내부 기호로 들어갈 때 위치가 크게 이동하니 코드 순서를 놓치지 마세요.',
    ],
    maxMistakes: 8,
    checkpointMode: 'failImmediately',
  }),
  createPixelPathStage({
    id: 50,
    chapter: 'Chapter 7. 픽셀아트 마스터 챌린지',
    title: '마스터 배지',
    description: '방패 모양 배지와 가운데 별, 아래 리본을 완성하는 최종 스테이지입니다.',
    concept: '최종 픽셀아트 경로 해석',
    difficulty: '최종 문제',
    rows: 24,
    cols: 24,
    targetImageName: '마스터 배지',
    targetColor: '#facc15',
    codeMode: 'forOnly',
    path: pathFromWaypoints([
      { row: 3, col: 12 },
      { row: 5, col: 18 },
      { row: 12, col: 20 },
      { row: 18, col: 16 },
      { row: 21, col: 12 },
      { row: 18, col: 8 },
      { row: 12, col: 4 },
      { row: 5, col: 6 },
      { row: 3, col: 12 },
      { row: 9, col: 12 },
      { row: 10, col: 14 },
      { row: 12, col: 14 },
      { row: 11, col: 16 },
      { row: 13, col: 15 },
      { row: 15, col: 16 },
      { row: 14, col: 14 },
      { row: 16, col: 12 },
      { row: 14, col: 10 },
      { row: 15, col: 8 },
      { row: 13, col: 9 },
      { row: 11, col: 8 },
      { row: 12, col: 10 },
      { row: 10, col: 10 },
      { row: 9, col: 12 },
      { row: 18, col: 10 },
      { row: 22, col: 8 },
      { row: 20, col: 12 },
      { row: 22, col: 16 },
      { row: 18, col: 14 },
    ]),
    hints: [
      '최종 배지는 바깥 방패 모양을 먼저 그리고 가운데 별로 들어갑니다.',
      '가운데 별은 짧은 이동이 많아서 방향 전환을 천천히 확인해야 해요.',
      '마지막 아래쪽 선은 배지에 달린 리본처럼 보이는 부분입니다.',
    ],
    maxMistakes: 8,
    checkpointMode: 'failImmediately',
  }),
];

function applyStageCorrections(sourceStages: Stage[], corrections: Stage[]): Stage[] {
  const correctionById = new Map(corrections.map((stage) => [stage.id, stage]));
  const sourceIds = new Set(sourceStages.map((stage) => stage.id));
  const correctedStages = sourceStages.map((stage) => correctionById.get(stage.id) ?? stage);
  const addedStages = corrections.filter((stage) => !sourceIds.has(stage.id));

  return [...correctedStages, ...addedStages];
}

export const stages: Stage[] = applyStageCorrections(
  [...baseStages, ...advancedStageReplacements, ...pixelIconStages],
  pixelIconStageCorrections,
);
