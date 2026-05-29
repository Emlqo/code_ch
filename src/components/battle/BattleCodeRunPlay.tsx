import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateChallengeProblems } from '../../engine/challengeGenerator';
import {
  calculateAccuracy,
  calculateCorrectInputScore,
  calculateGrade,
  calculateProblemClearBonus,
  calculateWrongInputPenalty,
  clampScore,
} from '../../engine/challengeScoreEngine';
import { checkInput } from '../../engine/inputEngine';
import { useKeyboardInput } from '../../hooks/useKeyboardInput';
import type { BattleParticipant, BattleRoom } from '../../types/battleRoom';
import type { BoardCell, Direction, Position } from '../../types/game';
import { battleRoomService } from '../../services/battleRoom/battleRoomService';
import { createResultCode } from '../../utils/resultCode';
import { CodePanel } from '../CodePanel';
import { GameBoard } from '../GameBoard';
import { VirtualDPad } from '../VirtualDPad';

interface BattleCodeRunPlayProps {
  room: BattleRoom;
  participant: BattleParticipant;
  onFinish: () => void;
}

interface BattlePlayStats {
  score: number;
  correctInputs: number;
  wrongInputs: number;
  solvedProblems: number;
  combo: number;
  maxCombo: number;
  currentProblemIndex: number;
  currentCommandIndex: number;
}

const problemCount = 30;
const boardSize = 101;
const boardCenter: Position = {
  row: Math.floor(boardSize / 2),
  col: Math.floor(boardSize / 2),
};

function createBattleBoard(): BoardCell[][] {
  return Array.from({ length: boardSize }, (_, row) =>
    Array.from({ length: boardSize }, (_, col) => ({
      type: row === boardCenter.row && col === boardCenter.col ? 'start' : 'empty',
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

function createInitialStats(): BattlePlayStats {
  return {
    score: 0,
    correctInputs: 0,
    wrongInputs: 0,
    solvedProblems: 0,
    combo: 0,
    maxCombo: 0,
    currentProblemIndex: 0,
    currentCommandIndex: 0,
  };
}

function calculateRemainingTime(room: BattleRoom): number {
  if (!room.startedAt) {
    return room.config.duration;
  }

  const startedAtMs = new Date(room.startedAt).getTime();

  if (Number.isNaN(startedAtMs)) {
    return room.config.duration;
  }

  const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
  return Math.max(0, room.config.duration - elapsedSeconds);
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes}:${String(restSeconds).padStart(2, '0')}`;
}

export function BattleCodeRunPlay({ room, participant, onFinish }: BattleCodeRunPlayProps) {
  const battleBoard = useMemo(() => createBattleBoard(), []);
  const problems = useMemo(
    () =>
      generateChallengeProblems({
        count: problemCount,
        difficulty: room.config.difficulty,
        seed: room.currentSeed,
      }),
    [room.config.difficulty, room.currentSeed],
  );
  const [stats, setStats] = useState<BattlePlayStats>(() => createInitialStats());
  const [remainingTime, setRemainingTime] = useState(() => calculateRemainingTime(room));
  const [message, setMessage] = useState('첫 번째 방향을 입력해 보세요.');
  const [boardPosition, setBoardPosition] = useState<Position>(boardCenter);
  const [paintedBoardKeys, setPaintedBoardKeys] = useState<ReadonlySet<string>>(() => new Set([positionKey(boardCenter)]));
  const statsRef = useRef(stats);
  const remainingTimeRef = useRef(remainingTime);
  const problemStartedAtRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const roomFinishRequestedRef = useRef(false);
  const lastSyncedAtRef = useRef(0);

  const currentProblem = problems[stats.currentProblemIndex];
  const totalCommands = currentProblem?.executionQueue.length ?? 0;
  const isFinished = finishedRef.current || remainingTime <= 0 || room.status === 'finished';
  const progressPercent = totalCommands > 0 ? (stats.currentCommandIndex / totalCommands) * 100 : 0;

  const syncParticipantScore = useCallback(
    async (nextStats: BattlePlayStats, force = false) => {
      const now = Date.now();

      if (!force && now - lastSyncedAtRef.current < 500) {
        return;
      }

      lastSyncedAtRef.current = now;
      const accuracy = calculateAccuracy(nextStats.correctInputs, nextStats.wrongInputs);
      await battleRoomService.updateParticipantScore(room.id, participant.id, {
        score: clampScore(nextStats.score),
        correctInputs: nextStats.correctInputs,
        wrongInputs: nextStats.wrongInputs,
        solvedProblems: nextStats.solvedProblems,
        currentCombo: nextStats.combo,
        maxCombo: nextStats.maxCombo,
        accuracy,
      });
    },
    [participant.id, room.id],
  );

  const finishPlay = useCallback(
    async (finalStats: BattlePlayStats) => {
      if (finishedRef.current) {
        return;
      }

      finishedRef.current = true;
      const score = clampScore(finalStats.score);
      const accuracy = calculateAccuracy(finalStats.correctInputs, finalStats.wrongInputs);
      const grade = calculateGrade(score);
      const resultCode = createResultCode({
        nickname: participant.nickname,
        difficulty: room.config.difficulty,
        duration: room.config.duration,
        score,
        grade,
        accuracy,
        solvedProblems: finalStats.solvedProblems,
        correctInputs: finalStats.correctInputs,
        wrongInputs: finalStats.wrongInputs,
        maxCombo: finalStats.maxCombo,
        playedAt: new Date().toISOString(),
      });

      await battleRoomService.updateParticipantScore(room.id, participant.id, {
        score,
        correctInputs: finalStats.correctInputs,
        wrongInputs: finalStats.wrongInputs,
        solvedProblems: finalStats.solvedProblems,
        currentCombo: finalStats.combo,
        maxCombo: finalStats.maxCombo,
        accuracy,
        finishedAt: new Date().toISOString(),
        resultCode,
      });
      onFinish();
    },
    [onFinish, participant.id, participant.nickname, room.config.difficulty, room.config.duration, room.id],
  );

  const requestRoomFinish = useCallback(async () => {
    if (roomFinishRequestedRef.current) {
      return;
    }

    roomFinishRequestedRef.current = true;
    await battleRoomService.finishRoom(room.id);
  }, [room.id]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    remainingTimeRef.current = remainingTime;
  }, [remainingTime]);

  useEffect(() => {
    if (finishedRef.current) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      const nextRemainingTime = calculateRemainingTime(room);
      setRemainingTime(nextRemainingTime);

      if (nextRemainingTime <= 0) {
        window.setTimeout(() => {
          void (async () => {
            await finishPlay(statsRef.current);
            await requestRoomFinish();
          })();
        }, 0);
      }
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [finishPlay, requestRoomFinish, room]);

  useEffect(() => {
    if (room.status === 'finished') {
      void finishPlay(statsRef.current);
    }
  }, [finishPlay, room.status]);

  const moveBattleBoard = useCallback((direction: Direction) => {
    setBoardPosition((currentPosition) => {
      const nextPosition = getNextBoardPosition(currentPosition, direction);

      setPaintedBoardKeys((currentKeys) => new Set([...currentKeys, positionKey(nextPosition)]));
      return nextPosition;
    });
  }, []);

  const handleDirectionInput = useCallback(
    (direction: Direction) => {
      if (finishedRef.current || remainingTimeRef.current <= 0 || room.status === 'finished') {
        return;
      }

      const problem = problems[statsRef.current.currentProblemIndex];
      const expectedCommand = problem?.executionQueue[statsRef.current.currentCommandIndex];

      if (!problem || !expectedCommand) {
        return;
      }

      const inputResult = checkInput(direction, expectedCommand);

      if (!inputResult.correct) {
        setStats((currentStats) => {
          const nextStats: BattlePlayStats = {
            ...currentStats,
            wrongInputs: currentStats.wrongInputs + 1,
            combo: 0,
            score: clampScore(currentStats.score + calculateWrongInputPenalty()),
          };
          statsRef.current = nextStats;
          void syncParticipantScore(nextStats);
          return nextStats;
        });
        setMessage(inputResult.message);
        return;
      }

      moveBattleBoard(direction);

      const currentStats = statsRef.current;
      const nextCombo = currentStats.combo + 1;
      const nextMaxCombo = Math.max(currentStats.maxCombo, nextCombo);
      const nextCommandIndex = currentStats.currentCommandIndex + 1;
      const inputScore = calculateCorrectInputScore(nextCombo);
      const completedProblem = nextCommandIndex >= problem.executionQueue.length;

      if (!completedProblem) {
        const nextStats: BattlePlayStats = {
          ...currentStats,
          currentCommandIndex: nextCommandIndex,
          correctInputs: currentStats.correctInputs + 1,
          combo: nextCombo,
          maxCombo: nextMaxCombo,
          score: clampScore(currentStats.score + inputScore),
        };

        statsRef.current = nextStats;
        setStats(nextStats);
        void syncParticipantScore(nextStats);
        setMessage(inputResult.message);
        return;
      }

      const elapsedSeconds = (Date.now() - problemStartedAtRef.current) / 1000;
      const clearBonus = calculateProblemClearBonus(problem, elapsedSeconds);
      const nextProblemIndex = currentStats.currentProblemIndex + 1;
      const solvedProblems = currentStats.solvedProblems + 1;
      const completedStats: BattlePlayStats = {
        ...currentStats,
        currentCommandIndex: nextCommandIndex,
        correctInputs: currentStats.correctInputs + 1,
        combo: nextCombo,
        maxCombo: nextMaxCombo,
        solvedProblems,
        score: clampScore(currentStats.score + inputScore + clearBonus),
      };

      if (nextProblemIndex >= problems.length) {
        statsRef.current = completedStats;
        setStats(completedStats);
        void syncParticipantScore(completedStats, true);
        void finishPlay(completedStats);
        return;
      }

      const nextStats: BattlePlayStats = {
        ...completedStats,
        currentProblemIndex: nextProblemIndex,
        currentCommandIndex: 0,
      };

      problemStartedAtRef.current = Date.now();
      setBoardPosition(boardCenter);
      setPaintedBoardKeys(new Set([positionKey(boardCenter)]));
      statsRef.current = nextStats;
      setStats(nextStats);
      void syncParticipantScore(nextStats, true);
      setMessage(`${problem.title} 완주! 다음 코스로 넘어갑니다.`);
    },
    [finishPlay, moveBattleBoard, problems, room.status, syncParticipantScore],
  );

  useKeyboardInput({
    disabled: !currentProblem || isFinished,
    onDirectionInput: handleDirectionInput,
  });

  if (!currentProblem) {
    return (
      <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <section className="pixel-card mx-auto grid w-full max-w-3xl gap-4 p-6">
          <h1 className="text-2xl font-black text-slate-950">생성된 배틀 코스가 없습니다.</h1>
          <button type="button" onClick={onFinish} className="pixel-button w-fit">
            나가기
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-3 py-3 text-slate-900 sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="pixel-card-strong grid gap-3 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Code Run Battle</p>
            <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">배틀 플레이</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {participant.nickname} · 코스 {stats.currentProblemIndex + 1}/{problems.length}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
              <p className="text-xs font-black text-slate-400">남은 시간</p>
              <p className={['text-2xl font-black', remainingTime <= 30 ? 'text-rose-600' : 'text-slate-950'].join(' ')}>
                {formatTime(remainingTime)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
              <p className="text-xs font-black text-slate-400">점수</p>
              <p className="text-2xl font-black text-sky-700">{stats.score}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
              <p className="text-xs font-black text-slate-400">연속 입력</p>
              <p className="text-2xl font-black text-emerald-700">{stats.combo}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
              <p className="text-xs font-black text-slate-400">완주</p>
              <p className="text-2xl font-black text-amber-700">{stats.solvedProblems}</p>
            </div>
          </div>
        </section>

        <section className="pixel-card grid gap-3 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Current Course</p>
              <h2 className="text-xl font-black text-slate-950">{currentProblem.title}</h2>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
              입력 {stats.currentCommandIndex} / {totalCommands}
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
          <section className="min-w-0">
            <CodePanel
              code={currentProblem.code}
              codeDisplayMode="pseudocode"
              currentCommandIndex={stats.currentCommandIndex}
              completedCommandIndexes={Array.from({ length: stats.currentCommandIndex }, (_, index) => index)}
              enableLineHighlight
            />
          </section>

          <aside className="grid gap-4">
            <GameBoard
              board={battleBoard}
              currentPosition={boardPosition}
              paintedPositions={paintedBoardKeys}
              previewMode="hidden"
              cameraMode
              cameraSize={9}
              isInputDisabled={isFinished}
              onDirectionInput={handleDirectionInput}
            />

            <section className="pixel-card p-4 sm:p-5">
              <h2 className="text-lg font-black text-slate-950">입력 피드백</h2>
              <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-black leading-6 text-slate-700">
                {message}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold text-slate-600">
                <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">정답 {stats.correctInputs}</div>
                <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">오답 {stats.wrongInputs}</div>
              </div>
            </section>

            <VirtualDPad onDirectionInput={handleDirectionInput} status={isFinished ? 'success' : 'playing'} />
          </aside>
        </div>
      </div>
    </main>
  );
}
