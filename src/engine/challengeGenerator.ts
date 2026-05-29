import { parseCodeToExecutionQueue, validateCode } from './codeParser';
import type { ChallengeDifficulty, ChallengeProblem } from '../types/challenge';
import type { CodeNode, Direction, ExecutionCommand } from '../types/game';
import { createSeededRandom, createSeedFromString, pickRandom, randomInt } from '../utils/seededRandom';

export interface GenerateChallengeProblemParams {
  difficulty: ChallengeDifficulty;
  seed?: string | number;
  index?: number;
  random?: () => number;
}

export interface GenerateChallengeProblemsParams {
  count: number;
  difficulty: ChallengeDifficulty;
  seed?: string | number;
}

const directions: readonly Direction[] = ['up', 'down', 'left', 'right'];

const sequenceLengthRange: Record<ChallengeDifficulty, readonly [number, number]> = {
  easy: [3, 5],
  normal: [5, 8],
  hard: [8, 12],
  mixed: [5, 12],
};

const difficultyLabel: Record<ChallengeDifficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
  mixed: '섞어서',
};

function createRandom(seed: string | number | undefined, fallbackKey: string): () => number {
  if (typeof seed === 'number') {
    return createSeededRandom(seed);
  }

  return createSeededRandom(createSeedFromString(seed ?? `${fallbackKey}-${Date.now()}`));
}

function createSourceLineId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function createMoveNode(direction: Direction, sourceLineId: string): CodeNode {
  return {
    type: 'move',
    direction,
    sourceLineId,
  };
}

function pickDirection(random: () => number): Direction {
  return pickRandom(directions, random) ?? 'right';
}

function createProblemId(type: ChallengeProblem['type'], difficulty: ChallengeDifficulty, index: number): string {
  return `challenge-${difficulty}-${type}-${index + 1}`;
}

function buildProblem(
  id: string,
  type: ChallengeProblem['type'],
  difficulty: ChallengeDifficulty,
  title: string,
  code: CodeNode[],
): ChallengeProblem {
  const parseResult = validateCode(code);

  if (!parseResult.success) {
    throw new Error(`Challenge problem ${id} failed validation: ${parseResult.message}`);
  }

  const executionQueue: ExecutionCommand[] = parseCodeToExecutionQueue(code);
  const solutionInput = executionQueue.map((command) => command.direction);

  return {
    id,
    type,
    difficulty,
    title,
    code,
    executionQueue,
    solutionInput,
    bonusScore: type === 'sequence' ? 200 : 400,
    estimatedDifficultyLabel: difficultyLabel[difficulty],
  };
}

export function generateSequenceProblem(params: GenerateChallengeProblemParams): ChallengeProblem {
  const { difficulty, index = 0 } = params;
  const random = params.random ?? createRandom(params.seed, `sequence-${difficulty}-${index}`);
  const [minLength, maxLength] = sequenceLengthRange[difficulty];
  const moveCount = randomInt(minLength, maxLength, random);
  const code = Array.from({ length: moveCount }, (_, moveIndex) =>
    createMoveNode(pickDirection(random), createSourceLineId(`challenge-sequence-${index + 1}`, moveIndex)),
  );

  return buildProblem(
    createProblemId('sequence', difficulty, index),
    'sequence',
    difficulty,
    `${moveCount}칸 순서 코스`,
    code,
  );
}

export function generateForProblem(params: GenerateChallengeProblemParams): ChallengeProblem {
  const { difficulty, index = 0 } = params;
  const random = params.random ?? createRandom(params.seed, `for-${difficulty}-${index}`);
  const repeatCount = randomInt(2, 5, random);
  const childMoveCount = difficulty === 'normal' ? 1 : randomInt(1, 2, random);
  const children = Array.from({ length: childMoveCount }, (_, childIndex) =>
    createMoveNode(pickDirection(random), createSourceLineId(`challenge-for-${index + 1}-move`, childIndex)),
  );
  const code: CodeNode[] = [
    {
      type: 'for',
      count: repeatCount,
      sourceLineId: createSourceLineId('challenge-for', index),
      children,
    },
  ];

  return buildProblem(
    createProblemId('for', difficulty, index),
    'for',
    difficulty,
    `${repeatCount}번 반복 코스`,
    code,
  );
}

function shouldGenerateForProblem(difficulty: ChallengeDifficulty, random: () => number): boolean {
  if (difficulty === 'easy') {
    return false;
  }

  if (difficulty === 'normal') {
    return random() < 0.3;
  }

  return random() < 0.5;
}

export function generateChallengeProblems(params: GenerateChallengeProblemsParams): ChallengeProblem[] {
  const count = Math.max(0, Math.floor(params.count));
  const random = createRandom(params.seed, `challenge-${params.difficulty}-${count}`);

  return Array.from({ length: count }, (_, index) => {
    const problemParams: GenerateChallengeProblemParams = {
      difficulty: params.difficulty,
      index,
      random,
    };

    return shouldGenerateForProblem(params.difficulty, random)
      ? generateForProblem(problemParams)
      : generateSequenceProblem(problemParams);
  });
}
