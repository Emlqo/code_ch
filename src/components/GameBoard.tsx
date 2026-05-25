import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { BoardCell, BoardPreviewMode, Direction, Position } from '../types/game';

type PaintedPositions = ReadonlySet<string> | readonly string[];

const zoomLevels = [100, 150, 200, 300] as const;

interface GameBoardProps {
  board: BoardCell[][];
  currentPosition: Position;
  paintedPositions: PaintedPositions;
  colorCluePositions?: ReadonlySet<string> | readonly string[];
  isAnimating?: boolean;
  previewMode?: BoardPreviewMode;
  isInputDisabled?: boolean;
  onDirectionInput?: (direction: Direction) => void;
}

function positionKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function hasPosition(positions: PaintedPositions, key: string): boolean {
  return 'has' in positions ? positions.has(key) : positions.includes(key);
}

function getAdjacentDirection(from: Position, to: Position): Direction | null {
  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;

  if (rowDelta === -1 && colDelta === 0) {
    return 'up';
  }

  if (rowDelta === 1 && colDelta === 0) {
    return 'down';
  }

  if (rowDelta === 0 && colDelta === -1) {
    return 'left';
  }

  if (rowDelta === 0 && colDelta === 1) {
    return 'right';
  }

  return null;
}

function colorWithAlpha(color: string, alpha: number): string {
  if (!color.startsWith('#') || color.length !== 7) {
    return color;
  }

  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function hasColorClue(cell: BoardCell, isColorCluePosition: boolean): boolean {
  return isColorCluePosition && cell.targetColor !== 'transparent';
}

function getCellClassName(
  cell: BoardCell,
  isPainted: boolean,
  isCurrentPosition: boolean,
  isColorCluePosition: boolean,
  previewMode: BoardPreviewMode,
): string {
  if (cell.type === 'wall') {
    return 'border-slate-950 bg-slate-800 shadow-inner';
  }

  if (cell.type === 'blocked') {
    return 'border-rose-300 bg-rose-100 shadow-inner';
  }

  if (isPainted) {
    return `border-slate-700 shadow-inner paint-pop ${isCurrentPosition ? 'brightness-105' : ''}`;
  }

  if (cell.type === 'start') {
    return 'border-sky-300 bg-sky-50';
  }

  if (cell.type === 'checkpoint') {
    return 'border-amber-300 bg-amber-50';
  }

  if (cell.type === 'paint') {
    return previewMode === 'silhouette' ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50';
  }

  if (hasColorClue(cell, isColorCluePosition)) {
    return 'border-slate-300 bg-white';
  }

  return 'border-slate-200 bg-slate-50';
}

function getCellStyle(
  cell: BoardCell,
  isPainted: boolean,
  isColorCluePosition: boolean,
  previewMode: BoardPreviewMode,
): CSSProperties | undefined {
  const paintColor = cell.targetColor !== 'transparent' ? cell.targetColor : cell.color;

  if (isPainted) {
    return {
      backgroundColor: paintColor,
      boxShadow: `inset 0 -4px 0 ${colorWithAlpha('#0f172a', 0.12)}`,
    };
  }

  if (hasColorClue(cell, isColorCluePosition)) {
    return {
      backgroundColor: colorWithAlpha(paintColor, 0.22),
      boxShadow: `inset 0 0 0 2px ${colorWithAlpha(paintColor, 0.35)}`,
    };
  }

  if (previewMode === 'silhouette' && (cell.type === 'paint' || cell.type === 'checkpoint')) {
    return { backgroundColor: colorWithAlpha(paintColor, 0.14) };
  }

  return undefined;
}

export function GameBoard({
  board,
  currentPosition,
  paintedPositions,
  colorCluePositions = [],
  isAnimating = false,
  previewMode = 'hidden',
  isInputDisabled = false,
  onDirectionInput,
}: GameBoardProps) {
  const rowCount = board.length;
  const columnCount = board[0]?.length ?? 0;
  const defaultZoom = rowCount >= 15 || columnCount >= 15 ? 150 : 100;
  const [zoomPercent, setZoomPercent] = useState(defaultZoom);
  const paintedCount = useMemo(
    () =>
      board
        .flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = positionKey(rowIndex, colIndex);
            return cell.isPainted || hasPosition(paintedPositions, key);
          }),
        )
        .filter(Boolean).length,
    [board, paintedPositions],
  );
  const currentZoomIndex = zoomLevels.findIndex((zoomLevel) => zoomLevel === zoomPercent);
  const canZoomOut = currentZoomIndex > 0;
  const canZoomIn = currentZoomIndex >= 0 && currentZoomIndex < zoomLevels.length - 1;

  useEffect(() => {
    setZoomPercent(defaultZoom);
  }, [defaultZoom, rowCount, columnCount]);

  const zoomOut = () => {
    if (!canZoomOut) {
      return;
    }

    setZoomPercent(zoomLevels[currentZoomIndex - 1]);
  };

  const zoomIn = () => {
    if (!canZoomIn) {
      return;
    }

    setZoomPercent(zoomLevels[currentZoomIndex + 1]);
  };

  const handleCellPress = (row: number, col: number) => {
    if (isInputDisabled || !onDirectionInput) {
      return;
    }

    const direction = getAdjacentDirection(currentPosition, { row, col });

    if (direction) {
      onDirectionInput(direction);
    }
  };

  return (
    <section className="pixel-card w-full min-w-0 max-w-[700px] p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Puzzle Board</p>
          <h2 className="mt-0.5 text-xl font-black text-slate-950">픽셀 보드</h2>
          <p className="mt-0.5 text-sm font-semibold text-slate-500">
            현재 캐릭터와 맞닿은 칸을 터치하면 해당 방향으로 이동합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={zoomOut}
            disabled={!canZoomOut}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-black text-slate-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="보드 축소"
            title="보드 축소"
          >
            -
          </button>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-black text-slate-700">
            {zoomPercent}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={!canZoomIn}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-black text-slate-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="보드 확대"
            title="보드 확대"
          >
            +
          </button>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-black text-slate-700">
            {paintedCount} painted
          </span>
          <span className="rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs font-black text-white">
            {rowCount} x {columnCount}
          </span>
        </div>
      </div>

      <div className="mx-auto w-full">
        <div className="aspect-square overflow-auto rounded-2xl border-[3px] border-slate-900 bg-slate-900 p-1.5 shadow-[0_10px_0_rgba(15,23,42,0.16),0_24px_44px_rgba(15,23,42,0.16)] sm:border-4">
          <div className="relative aspect-square min-w-full" style={{ width: `${zoomPercent}%` }}>
            <div
              className="grid h-full w-full overflow-hidden rounded-lg bg-slate-900"
              style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
              aria-label="코드 드로잉 픽셀 보드"
            >
              {board.flatMap((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const key = positionKey(rowIndex, colIndex);
                  const isPainted = cell.isPainted || hasPosition(paintedPositions, key);
                  const isCurrentPosition = currentPosition.row === rowIndex && currentPosition.col === colIndex;
                  const isTarget = cell.type === 'paint' || cell.type === 'checkpoint';
                  const isColorCluePosition = hasPosition(colorCluePositions, key);
                  const touchDirection = getAdjacentDirection(currentPosition, { row: rowIndex, col: colIndex });
                  const isTouchTarget = Boolean(touchDirection) && !isInputDisabled && Boolean(onDirectionInput);
                  const shouldShowTargetPreview = previewMode === 'silhouette' && isTarget && !isPainted;
                  const shouldShowColorClue = hasColorClue(cell, isColorCluePosition) && !isPainted;

                  return (
                    <div
                      key={key}
                      role={isTouchTarget ? 'button' : undefined}
                      tabIndex={isTouchTarget ? 0 : undefined}
                      onClick={() => handleCellPress(rowIndex, colIndex)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleCellPress(rowIndex, colIndex);
                        }
                      }}
                      className={[
                        'relative flex items-center justify-center border text-center transition-all duration-300',
                        'outline outline-1 outline-slate-900/20',
                        getCellClassName(cell, isPainted, isCurrentPosition, isColorCluePosition, previewMode),
                        isCurrentPosition ? 'z-10 ring-2 ring-sky-300 ring-inset' : '',
                        isTouchTarget ? 'cursor-pointer ring-2 ring-inset ring-emerald-300 hover:brightness-105 active:scale-95' : '',
                      ].join(' ')}
                      style={getCellStyle(cell, isPainted, isColorCluePosition, previewMode)}
                      aria-label={
                        isTouchTarget && touchDirection
                          ? `${rowIndex}행 ${colIndex}열, ${touchDirection} 방향으로 이동`
                          : `${rowIndex}행 ${colIndex}열 ${cell.type}`
                      }
                    >
                      {cell.type === 'start' && !isPainted ? (
                        <span className="font-mono text-[10px] font-black text-sky-700 sm:text-xs">START</span>
                      ) : null}

                      {cell.type === 'checkpoint' && shouldShowTargetPreview ? (
                        <span className="h-3 w-3 rounded-full border-2 border-amber-400 bg-white/90" aria-hidden="true" />
                      ) : null}

                      {shouldShowTargetPreview ? (
                        <span
                          className="h-2.5 w-2.5 rounded-sm opacity-80 shadow-sm"
                          style={{ backgroundColor: cell.targetColor }}
                          aria-hidden="true"
                        />
                      ) : null}

                      {shouldShowColorClue ? (
                        <span
                          className="h-4 w-4 rounded border-2 border-white shadow-[0_2px_0_rgba(15,23,42,0.18)]"
                          style={{ backgroundColor: cell.targetColor }}
                          aria-label="조건 확인용 색 타일"
                        />
                      ) : null}

                      {cell.label && cell.type !== 'start' ? (
                        <span className="absolute bottom-1 right-1 font-mono text-[9px] font-black text-slate-500">
                          {cell.label}
                        </span>
                      ) : null}
                    </div>
                  );
                }),
              )}
            </div>

            {columnCount > 0 && rowCount > 0 ? (
              <div
                className={[
                  'pointer-events-none absolute left-0 top-0 flex items-center justify-center',
                  'transition-[transform] duration-300 ease-out',
                  isAnimating ? 'scale-105' : '',
                ].join(' ')}
                style={{
                  width: `calc(100% / ${columnCount})`,
                  height: `calc(100% / ${rowCount})`,
                  transform: `translate(${currentPosition.col * 100}%, ${currentPosition.row * 100}%)`,
                }}
                aria-hidden="true"
              >
                <div className="relative h-[70%] w-[70%] rounded-full border-2 border-slate-950 bg-gradient-to-br from-lime-200 via-emerald-300 to-sky-400 shadow-[0_7px_0_rgba(15,23,42,0.22)] soft-pulse">
                  <div className="absolute left-[22%] top-[26%] h-[17%] w-[17%] rounded-full bg-slate-950" />
                  <div className="absolute right-[22%] top-[26%] h-[17%] w-[17%] rounded-full bg-slate-950" />
                  <div className="absolute left-[26%] top-[15%] h-[12%] w-[20%] rounded-full bg-white/85" />
                  <div className="absolute bottom-[23%] left-1/2 h-[9%] w-[30%] -translate-x-1/2 rounded-full bg-slate-800/75" />
                  <div className="absolute -bottom-1 left-1/2 h-1.5 w-1/2 -translate-x-1/2 rounded-full bg-slate-950/25 blur-[1px]" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
