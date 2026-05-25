/** 공 캐릭터와 실행 명령이 사용할 네 방향입니다. */
export type Direction = 'up' | 'down' | 'left' | 'right';

/** 격자 보드에서 하나의 칸을 가리키는 좌표입니다. */
export interface Position {
  row: number;
  col: number;
}

/** 보드 칸의 기본 역할입니다. */
export type CellType = 'empty' | 'wall' | 'start' | 'paint' | 'checkpoint' | 'blocked';

/** 아직 칠하지 않은 정답 칸을 보드에 얼마나 보여줄지 정합니다. */
export type BoardPreviewMode = 'hidden' | 'silhouette';

/** 실제 보드의 한 칸을 표현합니다. */
export interface BoardCell {
  /** 칸의 역할입니다. */
  type: CellType;
  /** 현재 화면에 표시할 색상입니다. */
  color: string;
  /** 플레이어가 지나가서 칠한 칸인지 여부입니다. */
  isPainted: boolean;
  /** 정답 그림에서 이 칸이 가져야 할 목표 색상입니다. */
  targetColor: string;
  /** START, A, B 같은 보조 표시가 필요할 때 사용합니다. */
  label?: string;
}

/** 조건문에서 판정할 수 있는 조건 이름입니다. */
export type ConditionType =
  | 'currentTileIsYellow'
  | 'currentTileIsBlue'
  | 'currentTileIsRed'
  | 'nextTileIsBlue'
  | 'nextTileIsRed'
  | 'nextTileIsYellow'
  | 'frontIsWall'
  | 'pathIsOpen';

/** 코드 노드가 공통으로 가질 수 있는 확장 필드입니다. */
export interface BaseCodeNode {
  /** 에디터나 실행 로그에서 추적할 때 사용할 선택적 ID입니다. */
  id?: string;
  /** 화면에 표시되는 코드 줄과 연결할 선택적 ID입니다. */
  sourceLineId?: string;
  /** UI에서 보여줄 보조 설명입니다. */
  label?: string;
}

/** 한 칸 이동을 나타내는 가장 작은 실행 단위입니다. */
export interface MoveCodeNode extends BaseCodeNode {
  type: 'move';
  direction: Direction;
}

/** 같은 코드 묶음을 정해진 횟수만큼 반복하는 노드입니다. */
export interface ForCodeNode extends BaseCodeNode {
  type: 'for';
  count: number;
  children: CodeNode[];
}

/** 조건 결과에 따라 다른 코드 묶음을 실행하는 노드입니다. */
export interface IfCodeNode extends BaseCodeNode {
  type: 'if';
  condition: ConditionType;
  checkDirection?: Direction;
  then: CodeNode[];
  else?: CodeNode[];
}

/** 스테이지 의사코드를 구성하는 실행 트리입니다. */
export type CodeNode = MoveCodeNode | ForCodeNode | IfCodeNode;

/** 실행 명령이 어떤 상위 코드 구조에서 만들어졌는지 설명합니다. */
export interface ExecutionParentInfo {
  type: 'for' | 'if';
  sourceLineId?: string;
  label?: string;
  iteration?: number;
  branch?: 'then' | 'else';
}

/** 플레이어가 실제로 입력해야 하는 방향키 명령입니다. */
export interface ExecutionCommand {
  direction: Direction;
  sourceLineId: string;
  displayText: string;
  depth: number;
  parentInfo?: string;
}

/** 플레이어 입력을 단계별로 복습할 수 있도록 저장하는 실행 로그입니다. */
export interface ExecutionLogEntry {
  stepNumber: number;
  expectedDirection: Direction;
  inputDirection: Direction;
  correct: boolean;
  message: string;
  position: Position;
  combo: number;
  parentInfo?: string;
}

/** 스테이지 난이도 표시용 값입니다. */
export type StageDifficulty = '입문' | '기초' | '도전' | '어려움 입문' | '어려움' | '매우 어려움' | '최종 문제';

/** 체크포인트를 어떤 방식으로 검사할지 나타냅니다. */
export type CheckpointMode = 'retryCurrent' | 'resetToStart' | 'failImmediately' | 'checkpoint';

/** 다음 스테이지 해금 조건입니다. */
export interface UnlockRequirement {
  stageId: number;
  requiredStatus: 'success';
  maxMistakes?: number;
}

/** 하나의 게임 스테이지에 필요한 모든 정적 데이터입니다. */
export interface Stage {
  id: number;
  chapter: string;
  title: string;
  description: string;
  concept: string;
  difficulty: StageDifficulty;
  board: BoardCell[][];
  startPosition: Position;
  code: CodeNode[];
  targetImageName: string;
  /** 개발 검증용 정답 입력 순서입니다. 실제 게임 화면에는 표시하지 않습니다. */
  solutionInput: Direction[];
  hints: string[];
  maxMistakes: number;
  checkpointMode: CheckpointMode;
  unlockRequirement?: UnlockRequirement;
}

/** 현재 게임의 큰 진행 상태입니다. */
export type GameStatus = 'ready' | 'playing' | 'success' | 'failed';

/** 플레이어가 칠한 칸과 색상 기록입니다. */
export interface PaintedCell {
  position: Position;
  color: string;
}

/** 플레이 중 계속 변하는 진행 정보입니다. */
export interface GameProgress {
  currentStageId: number;
  currentCommandIndex: number;
  currentPosition: Position;
  paintedCells: PaintedCell[];
  score: number;
  mistakes: number;
  combo: number;
  maxCombo: number;
  status: GameStatus;
  message: string;
}

/** 화면 뼈대에서 공 캐릭터를 그리기 위한 현재 상태입니다. */
export interface PlayerState {
  position: Position;
  direction: Direction;
}

/** 현재 샘플 UI가 보드와 플레이어 상태를 한 번에 다룰 때 쓰는 스냅샷입니다. */
export interface GameSnapshot {
  board: BoardCell[][];
  player: PlayerState;
  moveCount: number;
  message: string;
}

/** 입력 처리 결과입니다. */
export interface MoveResult {
  success: boolean;
  newPosition: Position;
  paintedKey?: string;
  message: string;
}
