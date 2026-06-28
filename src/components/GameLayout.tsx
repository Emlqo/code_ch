import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyMove, countPaintedTargets, countTargetCells, createBoard, paintCell } from '../engine/boardEngine';
import { buildExecutionQueueWithConditions, collectColorCluePositionKeys, getConditionEvaluations, validateCode } from '../engine/codeParser';
import { checkInput } from '../engine/inputEngine';
import { calculateFinalScore, calculateInputScore, calculateStars } from '../engine/scoreEngine';
import { useKeyboardInput } from '../hooks/useKeyboardInput';
import type { CodeDisplayMode } from '../types/admin';
import type { BoardCell, Direction, ExecutionLogEntry, GameProgress, GameStatus, PaintedCell, Stage } from '../types/game';
import { CodePanel } from './CodePanel';
import { ControlGuide } from './ControlGuide';
import { ExecutionLog } from './ExecutionLog';
import { GameBoard } from './GameBoard';
import { HintPanel } from './HintPanel';
import { ResultPanel } from './ResultPanel';
import { StageInfo } from './StageInfo';
import { VirtualDPad } from './VirtualDPad';

interface GameLayoutProps {
  stages: Stage[];
  selectedStageId: number;
  codeDisplayMode: CodeDisplayMode;
  onBackToStageSelect: () => void;
  onSelectStage: (stageId: number) => void;
  onStageClear: (stageId: number, stars: number, mistakes: number, bestCombo: number) => void;
  allowAutoPlay?: boolean;
}

const inputLockMs = 170;
const autoPlayDelayMs = 360;
const hintOptions = {
  penaltyEnabled: false,
};

const directionText: Record<Direction, string> = {
  up: 'UP',
  down: 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
};

function positionKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function createInitialPaintedCells(stage: Stage): PaintedCell[] {
  return [
    {
      position: stage.startPosition,
      color: stage.board[stage.startPosition.row][stage.startPosition.col].targetColor,
    },
  ];
}

function createInitialProgress(stage: Stage): GameProgress {
  return {
    currentStageId: stage.id,
    currentCommandIndex: 0,
    currentPosition: stage.startPosition,
    paintedCells: createInitialPaintedCells(stage),
    score: 0,
    mistakes: 0,
    combo: 0,
    maxCombo: 0,
    status: 'ready',
    message: '의사코드를 보고 첫 번째 방향키를 입력해 보세요.',
  };
}

function getPaintedPositionKeys(progress: GameProgress): string[] {
  return progress.paintedCells.map((cell) => positionKey(cell.position.row, cell.position.col));
}

export function GameLayout({
  stages,
  selectedStageId,
  codeDisplayMode,
  onBackToStageSelect,
  onSelectStage,
  onStageClear,
  allowAutoPlay = false,
}: GameLayoutProps) {
  const stageIndex = Math.max(
    stages.findIndex((stage) => stage.id === selectedStageId),
    0,
  );
  const currentStage = stages[stageIndex];
  const parseResult = useMemo(() => validateCode(currentStage.code), [currentStage]);
  const executionQueue = useMemo(
    () => buildExecutionQueueWithConditions(currentStage.code, currentStage.startPosition, currentStage.board),
    [currentStage],
  );
  const conditionEvaluations = useMemo(
    () => getConditionEvaluations(currentStage.code, currentStage.startPosition, currentStage.board),
    [currentStage],
  );
  const colorCluePositions = useMemo(
    () => collectColorCluePositionKeys(currentStage.code, currentStage.startPosition, currentStage.board),
    [currentStage],
  );

  const [board, setBoard] = useState<BoardCell[][]>(() => createBoard(currentStage));
  const [progress, setProgress] = useState<GameProgress>(() => createInitialProgress(currentStage));
  const [errorCommandIndex, setErrorCommandIndex] = useState<number | null>(null);
  const [errorSourceLineId, setErrorSourceLineId] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([]);
  const [revealedHintCount, setRevealedHintCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [hintNotice, setHintNotice] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);

  const inputLockedRef = useRef(false);
  const lockTimerRef = useRef<number | null>(null);
  const errorTimerRef = useRef<number | null>(null);
  const scoreTimerRef = useRef<number | null>(null);
  const autoPlayTimerRef = useRef<number | null>(null);

  const clearTransientState = useCallback(() => {
    setErrorCommandIndex(null);
    setErrorSourceLineId(null);
    setExecutionLogs([]);
    setRevealedHintCount(0);
    setHintCount(0);
    setHintNotice('');
    setIsAnimating(false);
    setIsAutoPlaying(false);
    setScoreDelta(null);
    inputLockedRef.current = false;

    if (lockTimerRef.current !== null) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }

    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }

    if (scoreTimerRef.current !== null) {
      window.clearTimeout(scoreTimerRef.current);
      scoreTimerRef.current = null;
    }

    if (autoPlayTimerRef.current !== null) {
      window.clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  }, []);

  const resetStage = useCallback(() => {
    setBoard(createBoard(currentStage));
    setProgress(createInitialProgress(currentStage));
    clearTransientState();
  }, [clearTransientState, currentStage]);

  useEffect(() => {
    resetStage();
  }, [resetStage]);

  const totalCommands = executionQueue.length;
  const currentCommand = executionQueue[progress.currentCommandIndex];
  const completedCommandIndexes = useMemo(
    () => Array.from({ length: progress.currentCommandIndex }, (_, index) => index),
    [progress.currentCommandIndex],
  );
  const completedSourceLineIds = useMemo(
    () => executionQueue.slice(0, progress.currentCommandIndex).map((command) => command.sourceLineId),
    [executionQueue, progress.currentCommandIndex],
  );
  const paintedPositions = useMemo(() => getPaintedPositionKeys(progress), [progress]);
  const paintedTargetCount = useMemo(() => countPaintedTargets(board), [board]);
  const targetCellCount = useMemo(() => countTargetCells(board), [board]);
  const useBoardCamera = currentStage.board.length >= 27 || (currentStage.board[0]?.length ?? 0) >= 27;

  const lockInputBriefly = () => {
    inputLockedRef.current = true;

    if (lockTimerRef.current !== null) {
      window.clearTimeout(lockTimerRef.current);
    }

    lockTimerRef.current = window.setTimeout(() => {
      inputLockedRef.current = false;
      setIsAnimating(false);
    }, inputLockMs);
  };

  const markTemporaryError = (commandIndex: number, sourceLineId: string) => {
    setErrorCommandIndex(commandIndex);
    setErrorSourceLineId(sourceLineId);

    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current);
    }

    errorTimerRef.current = window.setTimeout(() => {
      setErrorCommandIndex(null);
      setErrorSourceLineId(null);
    }, 450);
  };

  const showScoreChange = (delta: number) => {
    setScoreDelta(delta);

    if (scoreTimerRef.current !== null) {
      window.clearTimeout(scoreTimerRef.current);
    }

    scoreTimerRef.current = window.setTimeout(() => {
      setScoreDelta(null);
    }, 700);
  };

  const moveToNextStage = useCallback(() => {
    if (!allowAutoPlay && progress.status !== 'success') {
      return;
    }

    const nextStage = stages[stageIndex + 1];

    if (nextStage) {
      onSelectStage(nextStage.id);
    }
  }, [allowAutoPlay, onSelectStage, progress.status, stageIndex]);

  const handleRequestHint = useCallback(() => {
    setRevealedHintCount((currentCount) => {
      if (currentCount >= currentStage.hints.length) {
        setHintNotice('더 이상 힌트가 없어요.');
        return currentCount;
      }

      setHintCount((currentHintCount) => currentHintCount + 1);
      setHintNotice('');
      return currentCount + 1;
    });
  }, [currentStage.hints.length]);

  const handleWrongInput = (direction: Direction, inputMessage: string) => {
    if (!currentCommand) {
      return;
    }

    const nextMistakes = progress.mistakes + 1;
    const inputScore = calculateInputScore({ correct: false, combo: 0 });
    const shouldFail = currentStage.checkpointMode === 'failImmediately' || nextMistakes > currentStage.maxMistakes;
    const shouldResetToStart = currentStage.checkpointMode === 'resetToStart' && !shouldFail;
    const nextStatus: GameStatus = shouldFail ? 'failed' : 'playing';
    const modeMessage = (() => {
      if (currentStage.checkpointMode === 'failImmediately') {
        return '도전 모드는 오답 1회로 바로 실패합니다.';
      }

      if (nextMistakes > currentStage.maxMistakes) {
        return '실수 제한을 넘었어요.';
      }

      if (shouldResetToStart) {
        return '시작 위치로 돌아가 처음 코드부터 다시 시도해요.';
      }

      if (currentStage.checkpointMode === 'checkpoint') {
        return '체크포인트 기능은 준비 중이에요. 지금은 현재 줄에서 다시 시도합니다.';
      }

      return '위치는 그대로 유지하고 같은 코드 줄을 다시 시도해요.';
    })();
    const errorLog: ExecutionLogEntry = {
      stepNumber: progress.currentCommandIndex + 1,
      expectedDirection: currentCommand.direction,
      inputDirection: direction,
      correct: false,
      message: `${progress.currentCommandIndex + 1}단계: 현재 코드는 ${directionText[currentCommand.direction]}인데 ${directionText[direction]}를 눌렀어요.`,
      position: shouldResetToStart ? currentStage.startPosition : progress.currentPosition,
      combo: 0,
      parentInfo: currentCommand.parentInfo,
    };

    markTemporaryError(progress.currentCommandIndex, currentCommand.sourceLineId);
    showScoreChange(inputScore.delta);
    setExecutionLogs((currentLogs) => [...currentLogs, errorLog]);

    if (shouldResetToStart) {
      setBoard(createBoard(currentStage));
    }

    setProgress((currentProgress) => ({
      ...currentProgress,
      score: currentProgress.score + inputScore.delta,
      currentCommandIndex: shouldResetToStart ? 0 : currentProgress.currentCommandIndex,
      currentPosition: shouldResetToStart ? currentStage.startPosition : currentProgress.currentPosition,
      paintedCells: shouldResetToStart ? createInitialPaintedCells(currentStage) : currentProgress.paintedCells,
      mistakes: nextMistakes,
      combo: 0,
      status: nextStatus,
      message: `${inputMessage} ${modeMessage}`,
    }));
  };

  const handleDirectionInput = useCallback(
    (direction: Direction) => {
      if (inputLockedRef.current || progress.status === 'success' || progress.status === 'failed') {
        return;
      }

      if (!parseResult.success) {
        setProgress((currentProgress) => ({
          ...currentProgress,
          status: 'failed',
          message: parseResult.message,
        }));
        return;
      }

      if (!currentCommand) {
        setProgress((currentProgress) => ({
          ...currentProgress,
          status: 'success',
          message: '모든 명령을 완료했어요.',
        }));
        return;
      }

      lockInputBriefly();
      const inputResult = checkInput(direction, currentCommand);

      if (!inputResult.correct) {
        handleWrongInput(direction, inputResult.message);
        return;
      }

      const moveResult = applyMove(progress, direction, currentStage);

      if (!moveResult.success) {
        setProgress((currentProgress) => ({
          ...currentProgress,
          combo: 0,
          status: 'playing',
          message: moveResult.message,
        }));
        return;
      }

      const nextStepNumber = progress.currentCommandIndex + 1;
      const nextCombo = progress.combo + 1;
      const inputScore = calculateInputScore({ correct: true, combo: nextCombo });
      const willCompleteStage = nextStepNumber >= totalCommands;
      const scoreAfterInput = progress.score + inputScore.delta;
      const finalScore = willCompleteStage
        ? calculateFinalScore({
            score: scoreAfterInput,
            mistakes: progress.mistakes,
            maxMistakes: currentStage.maxMistakes,
            hintCount,
            hintPenaltyEnabled: hintOptions.penaltyEnabled,
          }).finalScore
        : scoreAfterInput;
      const successLog: ExecutionLogEntry = {
        stepNumber: nextStepNumber,
        expectedDirection: currentCommand.direction,
        inputDirection: direction,
        correct: true,
        message: `${nextStepNumber}단계: ${currentCommand.displayText} 입력 성공, 현재 위치 (${moveResult.newPosition.row}, ${moveResult.newPosition.col})`,
        position: moveResult.newPosition,
        combo: nextCombo,
        parentInfo: currentCommand.parentInfo,
      };

      if (willCompleteStage) {
        const { stars } = calculateStars({
          success: true,
          mistakes: progress.mistakes,
          hintCount,
          hintPenaltyEnabled: hintOptions.penaltyEnabled,
        });
        onStageClear(currentStage.id, stars, progress.mistakes, Math.max(progress.maxCombo, nextCombo));
      }

      setIsAnimating(true);
      showScoreChange(finalScore - progress.score);
      setExecutionLogs((currentLogs) => [...currentLogs, successLog]);
      setBoard((currentBoard) => paintCell(currentBoard, moveResult.newPosition));
      setProgress((currentProgress) => {
        const nextCommandIndex = currentProgress.currentCommandIndex + 1;
        const nextStatus: GameStatus = nextCommandIndex >= totalCommands ? 'success' : 'playing';
        const paintColor =
          currentStage.board[moveResult.newPosition.row][moveResult.newPosition.col].targetColor || '#38bdf8';

        return {
          ...currentProgress,
          currentCommandIndex: nextCommandIndex,
          currentPosition: moveResult.newPosition,
          score: finalScore,
          paintedCells: [
            ...currentProgress.paintedCells,
            {
              position: moveResult.newPosition,
              color: paintColor,
            },
          ],
          combo: nextCombo,
          maxCombo: Math.max(currentProgress.maxCombo, nextCombo),
          status: nextStatus,
          message:
            nextStatus === 'success'
              ? '성공! 모든 코드를 정확히 실행해서 그림을 완성했어요.'
              : currentCommand.parentInfo
                ? `${inputResult.message} (${currentCommand.parentInfo})`
                : inputResult.message,
        };
      });
    },
    [currentCommand, currentStage, hintCount, onStageClear, parseResult, progress, totalCommands],
  );

  const baseControlsDisabled = progress.status === 'success' || progress.status === 'failed' || !parseResult.success;
  const controlsDisabled = baseControlsDisabled || isAutoPlaying;

  useEffect(() => {
    if (!isAutoPlaying) {
      return undefined;
    }

    if (!allowAutoPlay || baseControlsDisabled || !currentCommand) {
      setIsAutoPlaying(false);
      return undefined;
    }

    autoPlayTimerRef.current = window.setTimeout(() => {
      handleDirectionInput(currentCommand.direction);
    }, autoPlayDelayMs);

    return () => {
      if (autoPlayTimerRef.current !== null) {
        window.clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [allowAutoPlay, baseControlsDisabled, currentCommand, handleDirectionInput, isAutoPlaying]);

  useEffect(() => {
    return () => clearTransientState();
  }, [clearTransientState]);

  useKeyboardInput({
    disabled: controlsDisabled,
    onDirectionInput: handleDirectionInput,
  });

  const startAutoPlayFromBeginning = () => {
    resetStage();
    window.setTimeout(() => {
      setIsAutoPlaying(true);
    }, 0);
  };

  return (
    <main className="min-h-screen overflow-x-hidden px-3 py-4 text-slate-900 sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBackToStageSelect}
            className="pixel-button w-fit text-sm"
          >
            스테이지 선택으로
          </button>
          <div className="flex flex-wrap gap-2">
            {allowAutoPlay ? (
              <>
                <button
                  type="button"
                  onClick={startAutoPlayFromBeginning}
                  disabled={isAutoPlaying || !parseResult.success}
                  className="pixel-button bg-emerald-500 text-sm hover:bg-emerald-400"
                >
                  모범답안 자동 실행
                </button>
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying(false)}
                  disabled={!isAutoPlaying}
                  className="pixel-button text-sm"
                >
                  자동 실행 멈춤
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => onSelectStage(stages[Math.max(stageIndex - 1, 0)].id)}
              disabled={stageIndex === 0}
              className="pixel-button text-sm"
            >
              이전
            </button>
            <button
              type="button"
              onClick={moveToNextStage}
              disabled={stageIndex === stages.length - 1 || (!allowAutoPlay && progress.status !== 'success')}
              className="pixel-button text-sm"
            >
              다음
            </button>
          </div>
        </div>

        <StageInfo
          stage={currentStage}
          paintedTargetCount={paintedTargetCount}
          targetCellCount={targetCellCount}
          currentCommandIndex={progress.currentCommandIndex}
          totalCommands={totalCommands}
          mistakes={progress.mistakes}
          maxMistakes={currentStage.maxMistakes}
          score={progress.score}
          scoreDelta={scoreDelta}
          combo={progress.combo}
          maxCombo={progress.maxCombo}
          currentRepeatInfo={currentCommand?.parentInfo}
        />

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(480px,600px)_minmax(460px,1fr)] lg:items-start lg:gap-4 xl:grid-cols-[minmax(520px,660px)_minmax(560px,1fr)]">
          <div className="min-w-0 lg:flex lg:justify-end">
            <GameBoard
              board={board}
              currentPosition={progress.currentPosition}
              paintedPositions={paintedPositions}
              colorCluePositions={colorCluePositions}
              isAnimating={isAnimating}
              cameraMode={useBoardCamera}
              cameraSize={useBoardCamera ? 15 : 9}
              isInputDisabled={controlsDisabled}
              onDirectionInput={handleDirectionInput}
            />
          </div>

          <aside className="grid min-w-0 content-start gap-4 sm:gap-5">
            <CodePanel
              code={currentStage.code}
              codeDisplayMode={codeDisplayMode}
              currentCommandIndex={progress.currentCommandIndex}
              completedCommandIndexes={completedCommandIndexes}
              errorCommandIndex={errorCommandIndex}
              currentSourceLineId={currentCommand?.sourceLineId}
              completedSourceLineIds={completedSourceLineIds}
              errorSourceLineId={errorSourceLineId}
              activeParentInfo={currentCommand?.parentInfo}
              conditionEvaluations={conditionEvaluations}
              enableLineHighlight={allowAutoPlay && isAutoPlaying}
            />
            <ResultPanel
              message={progress.message}
              status={progress.status}
              imageName={currentStage.targetImageName}
              completedCommands={Math.min(progress.currentCommandIndex, totalCommands)}
              totalCommands={totalCommands}
              mistakes={progress.mistakes}
              maxMistakes={currentStage.maxMistakes}
              maxCombo={progress.maxCombo}
              score={progress.score}
              hintCount={hintCount}
              hintPenaltyEnabled={hintOptions.penaltyEnabled}
              hasNextStage={stageIndex < stages.length - 1}
              onReset={resetStage}
              onNextStage={moveToNextStage}
              onStageSelect={onBackToStageSelect}
            />
          </aside>
        </div>

        <section className="grid min-w-0 gap-4 md:grid-cols-2 lg:items-start">
          <HintPanel
            hints={currentStage.hints}
            revealedCount={revealedHintCount}
            hintCount={hintCount}
            notice={hintNotice}
            onRequestHint={handleRequestHint}
          />
          <ExecutionLog logs={executionLogs} latestFirst />
        </section>

        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:gap-5">
          <ControlGuide onDirectionClick={handleDirectionInput} isDisabled={controlsDisabled} />
          <VirtualDPad onDirectionInput={handleDirectionInput} status={progress.status} />
        </div>
      </div>
    </main>
  );
}
