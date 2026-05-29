import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  calculateAccuracy,
  calculateCorrectInputScore,
  calculateGrade,
  calculateProblemClearBonus,
  calculateWrongInputPenalty,
  clampScore,
} from '../../engine/challengeScoreEngine';
import { generateChallengeProblems } from '../../engine/challengeGenerator';
import { checkInput } from '../../engine/inputEngine';
import { useKeyboardInput } from '../../hooks/useKeyboardInput';
import type { ChallengeResultData, ChallengeSetupConfig, ChallengeStats } from '../../types/challenge';
import type { BoardCell, Direction, Position } from '../../types/game';
import { createResultCode } from '../../utils/resultCode';
import { CodePanel } from '../CodePanel';
import { GameBoard } from '../GameBoard';
import { VirtualDPad } from '../VirtualDPad';
import { ChallengeHud } from './ChallengeHud';

interface ChallengePlayProps {
  config: ChallengeSetupConfig;
  onExit: () => void;
  onFinish: (result: ChallengeResultData) => void;
}

const challengeProblemCount = 30;
const challengeBoardSize = 101;
const challengeBoardCenter: Position = {
  row: Math.floor(challengeBoardSize / 2),
  col: Math.floor(challengeBoardSize / 2),
};

const problemTypeLabel = {
  sequence: '순서 코스',
  for: '반복 코스',
} as const;

function createChallengeBoard(): BoardCell[][] {
  return Array.from({ length: challengeBoardSize }, (_, row) =>
    Array.from({ length: challengeBoardSize }, (_, col) => ({
      type: row === challengeBoardCenter.row && col === challengeBoardCenter.col ? 'start' : 'empty',
      color: 'transparent',
      isPainted: false,
      targetColor: 'transparent',
    })),
  );
}

function getNextBoardPosition(position: Position, direction: Direction): Position {
  const nextPositionByDirection: Record<Direction, Position> = {
    up: { row: position.row - 1, col: position.col },
    down: { row: position.row + 1, col: position.col },
    left: { row: position.row, col: position.col - 1 },
    right: { row: position.row, col: position.col + 1 },
  };

  return nextPositionByDirection[direction];
}

function positionKey(position: Position): string {
  return `${position.row}-${position.col}`;
}

function formatTodayForSeed(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createChallengeSeed(config: ChallengeSetupConfig): string {
  if (config.mode === 'daily') {
    return `challenge-${formatTodayForSeed()}-${config.difficulty}-${config.duration}`;
  }

  return `challenge-${Date.now()}-${config.difficulty}-${config.duration}`;
}

function createInitialStats(duration: ChallengeSetupConfig['duration']): ChallengeStats {
  return {
    score: 0,
    correctInputs: 0,
    wrongInputs: 0,
    solvedProblems: 0,
    combo: 0,
    maxCombo: 0,
    currentProblemIndex: 0,
    currentCommandIndex: 0,
    remainingTime: duration,
    startedAt: Date.now(),
  };
}

export function ChallengePlay({ config, onExit, onFinish }: ChallengePlayProps) {
  const challengeBoard = useMemo(() => createChallengeBoard(), []);
  const challengeSeed = useMemo(
    () => createChallengeSeed(config),
    [config.difficulty, config.duration, config.mode],
  );
  const problems = useMemo(
    () =>
      generateChallengeProblems({
        count: challengeProblemCount,
        difficulty: config.difficulty,
        seed: challengeSeed,
      }),
    [challengeSeed, config.difficulty],
  );

  const problemStartedAtRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const [message, setMessage] = useState('첫 번째 방향을 입력해 보세요.');
  const [isCodeVisibleOnMobile, setIsCodeVisibleOnMobile] = useState(true);
  const [boardPosition, setBoardPosition] = useState<Position>(challengeBoardCenter);
  const [paintedBoardKeys, setPaintedBoardKeys] = useState<ReadonlySet<string>>(
    () => new Set([positionKey(challengeBoardCenter)]),
  );
  const [stats, setStats] = useState<ChallengeStats>(() => createInitialStats(config.duration));
  const statsRef = useRef(stats);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const currentProblem = problems[stats.currentProblemIndex];
  const totalCommands = currentProblem?.executionQueue.length ?? 0;
  const progressPercent = totalCommands > 0 ? (stats.currentCommandIndex / totalCommands) * 100 : 0;
  const isFinished = finishedRef.current || stats.remainingTime <= 0;

  const finishChallenge = useCallback(
    (finalStats: ChallengeStats, finalMessage: string) => {
      if (finishedRef.current) {
        return;
      }

      finishedRef.current = true;

      const endedAt = Date.now();
      const score = clampScore(finalStats.score);
      const accuracy = calculateAccuracy(finalStats.correctInputs, finalStats.wrongInputs);
      const grade = calculateGrade(score);
      const resultBase: ChallengeResultData = {
        nickname: config.nickname,
        difficulty: config.difficulty,
        duration: config.duration,
        score,
        grade,
        accuracy,
        solvedProblems: finalStats.solvedProblems,
        correctInputs: finalStats.correctInputs,
        wrongInputs: finalStats.wrongInputs,
        maxCombo: finalStats.maxCombo,
        playedAt: new Date(endedAt).toISOString(),
      };
      const result: ChallengeResultData = {
        ...resultBase,
        resultCode: createResultCode(resultBase),
      };

      setMessage(finalMessage);
      setStats((currentStats) => ({
        ...currentStats,
        remainingTime: Math.max(0, finalStats.remainingTime),
        endedAt,
      }));
      onFinish(result);
    },
    [config, onFinish],
  );

  useEffect(() => {
    if (finishedRef.current) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setStats((currentStats) => {
        if (finishedRef.current || currentStats.remainingTime <= 0) {
          return currentStats;
        }

        const nextStats: ChallengeStats = {
          ...currentStats,
          remainingTime: Math.max(0, currentStats.remainingTime - 1),
        };

        statsRef.current = nextStats;

        if (nextStats.remainingTime === 0) {
          window.setTimeout(() => {
            finishChallenge(statsRef.current, '러닝 시간이 끝났어요. 결과를 확인합니다.');
          }, 0);
        }

        return nextStats;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [finishChallenge]);

  const moveChallengeBoard = useCallback((direction: Direction) => {
    setBoardPosition((currentPosition) => {
      const nextBoardPosition = getNextBoardPosition(currentPosition, direction);

      setPaintedBoardKeys((currentKeys) => new Set([...currentKeys, positionKey(nextBoardPosition)]));
      return nextBoardPosition;
    });
  }, []);

  const handleDirectionInput = useCallback(
    (direction: Direction) => {
      if (finishedRef.current || stats.remainingTime <= 0) {
        return;
      }

      const problem = problems[stats.currentProblemIndex];
      const expectedCommand = problem?.executionQueue[stats.currentCommandIndex];

      if (!problem || !expectedCommand) {
        return;
      }

      const inputResult = checkInput(direction, expectedCommand);

      if (!inputResult.correct) {
        setStats((currentStats) => {
          const nextStats = {
            ...currentStats,
            wrongInputs: currentStats.wrongInputs + 1,
            combo: 0,
            score: clampScore(currentStats.score + calculateWrongInputPenalty()),
          };
          statsRef.current = nextStats;
          return nextStats;
        });
        setMessage(inputResult.message);
        return;
      }

      moveChallengeBoard(direction);

      const nextCombo = stats.combo + 1;
      const nextMaxCombo = Math.max(stats.maxCombo, nextCombo);
      const nextCommandIndex = stats.currentCommandIndex + 1;
      const inputScore = calculateCorrectInputScore(nextCombo);
      const completedProblem = nextCommandIndex >= problem.executionQueue.length;

      if (!completedProblem) {
        setStats((currentStats) => {
          const nextStats = {
            ...currentStats,
            currentCommandIndex: currentStats.currentCommandIndex + 1,
            correctInputs: currentStats.correctInputs + 1,
            combo: nextCombo,
            maxCombo: Math.max(currentStats.maxCombo, nextCombo),
            score: clampScore(currentStats.score + inputScore),
          };
          statsRef.current = nextStats;
          return nextStats;
        });
        setMessage(inputResult.message);
        return;
      }

      const elapsedSeconds = (Date.now() - problemStartedAtRef.current) / 1000;
      const clearBonus = calculateProblemClearBonus(problem, elapsedSeconds);
      const nextProblemIndex = stats.currentProblemIndex + 1;
      const solvedProblems = stats.solvedProblems + 1;
      const nextScore = clampScore(stats.score + inputScore + clearBonus);
      const completedStats: ChallengeStats = {
        ...stats,
        currentCommandIndex: nextCommandIndex,
        correctInputs: stats.correctInputs + 1,
        combo: nextCombo,
        maxCombo: nextMaxCombo,
        solvedProblems,
        score: nextScore,
      };

      if (nextProblemIndex >= problems.length) {
        const finalStats: ChallengeStats = {
          ...completedStats,
          endedAt: Date.now(),
        };

        statsRef.current = finalStats;
        setStats(finalStats);
        finishChallenge(finalStats, '마지막 코스까지 완주했어요. 결과를 확인합니다.');
        return;
      }

      problemStartedAtRef.current = Date.now();
      setBoardPosition(challengeBoardCenter);
      setPaintedBoardKeys(new Set([positionKey(challengeBoardCenter)]));

      const nextStats: ChallengeStats = {
        ...completedStats,
        currentProblemIndex: nextProblemIndex,
        currentCommandIndex: 0,
      };

      statsRef.current = nextStats;
      setStats(nextStats);
      setMessage(`${problem.title} 완주! 다음 코스로 넘어갑니다.`);
    },
    [finishChallenge, moveChallengeBoard, problems, stats],
  );

  useKeyboardInput({
    disabled: !currentProblem || isFinished,
    onDirectionInput: handleDirectionInput,
  });

  if (!currentProblem) {
    return (
      <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <section className="pixel-card mx-auto grid w-full max-w-3xl gap-4 p-6">
          <h1 className="text-2xl font-black text-slate-950">생성된 코드런 코스가 없습니다.</h1>
          <button type="button" onClick={onExit} className="pixel-button w-fit">
            나가기
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-3 py-3 text-slate-900 sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:gap-5">
        <div className="flex flex-row items-center justify-between gap-3">
          <button type="button" onClick={onExit} className="pixel-button w-fit text-sm">
            나가기
          </button>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm font-black text-slate-700 shadow-sm">
            코스 {stats.currentProblemIndex + 1} / {problems.length}
          </div>
        </div>

        <ChallengeHud config={config} stats={stats} totalProblems={problems.length} />

        <section className="pixel-card grid gap-3 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Current Course</p>
              <h2 className="text-xl font-black text-slate-950">{currentProblem.title}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm font-black text-slate-700 sm:min-w-72">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                입력 {stats.currentCommandIndex} / {totalCommands}
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-amber-800">
                완주 보너스 +{currentProblem.bonusScore}
              </div>
            </div>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(520px,1fr)_minmax(320px,380px)] lg:items-start">
          <section className="grid min-w-0 gap-3">
            <button
              type="button"
              onClick={() => setIsCodeVisibleOnMobile((currentValue) => !currentValue)}
              className="pixel-button flex items-center justify-between lg:hidden"
              aria-expanded={isCodeVisibleOnMobile}
            >
              <span>코드 {isCodeVisibleOnMobile ? '접기' : '보기'}</span>
              <span>{isCodeVisibleOnMobile ? '▲' : '▼'}</span>
            </button>

            <div className={isCodeVisibleOnMobile ? 'block' : 'hidden lg:block'}>
              <CodePanel
                code={currentProblem.code}
                codeDisplayMode="pseudocode"
                currentCommandIndex={stats.currentCommandIndex}
                completedCommandIndexes={Array.from({ length: stats.currentCommandIndex }, (_, index) => index)}
                enableLineHighlight
              />
            </div>
          </section>

          <aside className="grid gap-4">
            <GameBoard
              board={challengeBoard}
              currentPosition={boardPosition}
              paintedPositions={paintedBoardKeys}
              previewMode="hidden"
              cameraMode
              cameraSize={9}
              isInputDisabled={isFinished}
              onDirectionInput={handleDirectionInput}
            />

            <section className="pixel-card p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-2 text-sm font-bold text-slate-600">
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  유형: {problemTypeLabel[currentProblem.type]}
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  난이도: {currentProblem.estimatedDifficultyLabel ?? config.difficulty}
                </div>
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-950">입력 피드백</h2>
              <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-black leading-6 text-slate-700">
                {message}
              </p>
            </section>

            <VirtualDPad onDirectionInput={handleDirectionInput} status={isFinished ? 'success' : 'playing'} />
          </aside>
        </div>
      </div>
    </main>
  );
}
