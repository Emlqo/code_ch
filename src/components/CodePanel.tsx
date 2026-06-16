import { useEffect, useRef } from 'react';
import { type ConditionEvaluation, type DisplayCodeLine } from '../engine/codeParser';
import { formatCodeForDisplay } from '../engine/codeFormatter';
import type { CodeDisplayMode } from '../types/admin';
import type { CodeNode } from '../types/game';

interface CodePanelProps {
  code: CodeNode[];
  codeDisplayMode?: CodeDisplayMode;
  currentCommandIndex?: number;
  completedCommandIndexes?: readonly number[];
  errorCommandIndex?: number | null;
  currentSourceLineId?: string;
  completedSourceLineIds?: readonly string[];
  errorSourceLineId?: string | null;
  activeParentInfo?: string;
  conditionEvaluations?: readonly ConditionEvaluation[];
  enableLineHighlight?: boolean;
}

type LineState = 'structure' | 'pending' | 'current' | 'completed' | 'error';

function getLineState(
  line: DisplayCodeLine,
  currentCommandIndex: number,
  completedCommandIndexes: readonly number[],
  errorCommandIndex: number | null,
  currentSourceLineId?: string,
  completedSourceLineIds: readonly string[] = [],
  errorSourceLineId: string | null = null,
  enableLineHighlight = false,
): LineState {
  if (!enableLineHighlight) {
    return line.commandIndex === undefined ? 'structure' : 'pending';
  }

  // Assist highlighting is opt-in so each game mode can choose its own level of guidance.
  if (line.commandIndex === errorCommandIndex || line.id === errorSourceLineId) {
    return 'error';
  }

  if (line.commandIndex === currentCommandIndex || line.id === currentSourceLineId) {
    return 'current';
  }

  if (line.commandIndex !== undefined && completedCommandIndexes.includes(line.commandIndex)) {
    return 'completed';
  }

  if (line.commandIndex !== undefined && completedSourceLineIds.includes(line.id)) {
    return 'completed';
  }

  return line.commandIndex === undefined ? 'structure' : 'pending';
}

function shouldHideCompletedLine(line: DisplayCodeLine, lineState: LineState): boolean {
  void line;
  void lineState;

  /*
   * Completed-line folding is part of the same assistive highlight feature.
   * Disable it so students always read the full code instead of following
   * disappearing/current lines.
  return lineState === 'completed' && line.commandIndex !== undefined;
   */
  return false;
}

function getStateClassName(lineState: LineState): string {
  const classNames: Record<LineState, string> = {
    structure: 'bg-slate-900/80 text-slate-300',
    pending: 'bg-slate-950 text-slate-100',
    current: 'bg-sky-500/25 text-white ring-2 ring-inset ring-sky-300',
    completed: 'bg-emerald-500/15 text-emerald-100',
    error: 'bg-rose-500/25 text-rose-50 ring-2 ring-inset ring-rose-300',
  };

  return classNames[lineState];
}

function getBlockAccentClassName(line: DisplayCodeLine): string {
  if (line.nodeType === 'for') {
    return 'border-l-fuchsia-400';
  }

  if (line.nodeType === 'if') {
    return 'border-l-amber-400';
  }

  if (line.nodeType === 'else') {
    return 'border-l-orange-400';
  }

  if (line.depth > 0) {
    return 'border-l-fuchsia-300/70';
  }

  return 'border-l-transparent';
}

function getBlockTintClassName(line: DisplayCodeLine, lineState: LineState): string {
  if (lineState === 'current' || lineState === 'error') {
    return '';
  }

  if (line.nodeType === 'for') {
    return 'bg-fuchsia-400/10';
  }

  if (line.nodeType === 'if') {
    return 'bg-amber-400/10';
  }

  if (line.nodeType === 'else') {
    return 'bg-orange-400/10';
  }

  if (line.depth > 0) {
    return 'bg-fuchsia-400/[0.06]';
  }

  return '';
}

function getDepthGuideClassName(depthIndex: number): string {
  const guideClassNames = [
    'bg-fuchsia-400',
    'bg-amber-400',
    'bg-sky-400',
    'bg-emerald-400',
  ];

  return guideClassNames[depthIndex % guideClassNames.length];
}

function getBlockLabel(line: DisplayCodeLine): string | null {
  if (line.nodeType === 'for') {
    return '반복할 내용';
  }

  if (line.nodeType === 'if') {
    return '참이면 실행';
  }

  if (line.nodeType === 'else') {
    return '아니면 실행';
  }

  if (line.depth > 0) {
    return '안쪽 명령';
  }

  return null;
}

function getBadgeText(line: DisplayCodeLine, lineState: LineState, codeDisplayMode: CodeDisplayMode): string {
  if (lineState === 'completed') {
    return codeDisplayMode === 'pseudocode' ? '완료' : 'OK';
  }

  if (line.nodeType === 'for') {
    return codeDisplayMode === 'pseudocode' ? '반복' : 'FOR';
  }

  if (line.nodeType === 'if') {
    return codeDisplayMode === 'pseudocode' ? '만약' : 'IF';
  }

  if (line.nodeType === 'else') {
    return codeDisplayMode === 'pseudocode' ? '아니면' : 'ELSE';
  }

  if (line.nodeType === 'block') {
    return codeDisplayMode === 'pseudocode' ? '블록' : 'BLOCK';
  }

  if (codeDisplayMode === 'pseudocode') {
    return line.commandIndex === undefined ? '블록' : '이동';
  }

  return line.commandIndex === undefined ? 'BLOCK' : 'RUN';
}

export function CodePanel({
  code,
  codeDisplayMode = 'pseudocode',
  currentCommandIndex = 0,
  completedCommandIndexes = [],
  errorCommandIndex = null,
  currentSourceLineId,
  completedSourceLineIds = [],
  errorSourceLineId = null,
  activeParentInfo,
  conditionEvaluations = [],
  enableLineHighlight = false,
}: CodePanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lineElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lines = formatCodeForDisplay(code, codeDisplayMode);
  const showExecutionHighlight = enableLineHighlight;
  const panelTitle = codeDisplayMode === 'cStyle' ? 'C언어 느낌 코드' : '한글 블록 코드';
  const panelEyebrow = codeDisplayMode === 'cStyle' ? 'C Style Code' : 'Block Code';
  const currentLineText =
    codeDisplayMode === 'cStyle'
      ? currentSourceLineId
        ? lines.find((line) => line.id === currentSourceLineId)?.text
        : lines.find((line) => line.commandIndex === currentCommandIndex)?.text
      : undefined;
  const lineStates = new Map(
    lines.map((line) => [
      line.id,
      getLineState(
        line,
        currentCommandIndex,
        completedCommandIndexes,
        errorCommandIndex,
        currentSourceLineId,
        completedSourceLineIds,
        errorSourceLineId,
        showExecutionHighlight,
      ),
    ]),
  );
  const visibleLines = lines.filter((line) => !shouldHideCompletedLine(line, lineStates.get(line.id) ?? 'pending'));
  const hiddenCompletedCount = lines.length - visibleLines.length;
  const currentLine =
    lines.find((line) => line.id === currentSourceLineId) ??
    lines.find((line) => line.commandIndex === currentCommandIndex);
  const conditionResultByLineId = Object.fromEntries(
    conditionEvaluations.map((evaluation) => [evaluation.sourceLineId, evaluation]),
  );
  // Assist mode is kept in code but disabled so students must interpret the code flow themselves.
  const showExecutionAssist = false;
  const showConditionEvaluationAssist = false;
  const isCodeOnlyMode = codeDisplayMode === 'cStyle';

  useEffect(() => {
    if (!showExecutionHighlight || isCodeOnlyMode || !currentLine?.id) {
      return undefined;
    }

    const scrollContainer = scrollContainerRef.current;
    const currentLineElement = lineElementRefs.current.get(currentLine.id);

    if (!scrollContainer || !currentLineElement) {
      return undefined;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const lineRect = currentLineElement.getBoundingClientRect();
      const nextScrollTop =
        scrollContainer.scrollTop +
        (lineRect.top - containerRect.top) -
        scrollContainer.clientHeight / 2 +
        currentLineElement.clientHeight / 2;

      scrollContainer.scrollTo({
        top: Math.max(0, nextScrollTop),
        behavior: 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [currentLine?.id, isCodeOnlyMode, showExecutionHighlight]);

  return (
    <section className="pixel-card min-w-0 overflow-hidden">
      <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-5">
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">{panelEyebrow}</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{panelTitle}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">코드를 위에서 아래로 읽고 직접 실행 순서를 해석해 보세요.</p>
      </div>

      {showExecutionAssist && activeParentInfo ? (
        <div className="mx-4 mt-4 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-sm font-black text-fuchsia-800 sm:mx-5">
          {activeParentInfo} 실행 중
        </div>
      ) : null}

      {showExecutionAssist && hiddenCompletedCount > 0 ? (
        <div className="mx-4 mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 sm:mx-5">
          완료된 실행 줄 {hiddenCompletedCount}개 숨김
        </div>
      ) : null}

      <div className="p-3 sm:p-5">
        <div
          ref={scrollContainerRef}
          className="max-h-[42vh] overflow-y-auto overflow-x-hidden rounded-xl border-2 border-slate-900 bg-slate-950 font-mono text-xs text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] sm:text-sm lg:max-h-[62vh]"
        >
          {isCodeOnlyMode ? (
            <pre className="whitespace-pre-wrap px-4 py-4 leading-7 text-slate-100">
              {visibleLines.map((line) => `${'  '.repeat(line.depth)}${line.text}`).join('\n')}
            </pre>
          ) : (
            visibleLines.map((line) => {
            const lineState = lineStates.get(line.id) ?? 'pending';
            const isStructure = lineState === 'structure';
            const conditionResult = conditionResultByLineId[line.id];
            const blockLabel = getBlockLabel(line);

            return (
              <div
                key={line.id}
                ref={(element) => {
                  if (element) {
                    lineElementRefs.current.set(line.id, element);
                    return;
                  }

                  lineElementRefs.current.delete(line.id);
                }}
                className={[
                  'grid grid-cols-1 border-b border-l-4 border-slate-800 transition-colors duration-200 last:border-b-0',
                  getStateClassName(lineState),
                  getBlockAccentClassName(line),
                  getBlockTintClassName(line, lineState),
                ].join(' ')}
              >
                <div
                  className="relative min-w-0 px-2.5 py-3 sm:px-3"
                  style={{ paddingLeft: `${line.depth * 1.35 + 0.75}rem` }}
                >
                  {Array.from({ length: line.depth }, (_, depthIndex) => (
                    <span
                      key={depthIndex}
                      className={[
                        'absolute bottom-1.5 top-1.5 w-1 rounded-full opacity-80 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]',
                        getDepthGuideClassName(depthIndex),
                      ].join(' ')}
                      style={{ left: `${depthIndex * 1.35 + 0.38}rem` }}
                      aria-hidden="true"
                    />
                  ))}
                  <div className="flex min-w-0 flex-wrap items-start gap-2">
                    <span className="mt-0.5 w-9 shrink-0 rounded bg-white/10 px-1 py-0.5 text-center font-sans text-[10px] font-black">
                      {getBadgeText(line, lineState, codeDisplayMode)}
                    </span>
                    <code
                      className={[
                        'min-w-0 flex-1 whitespace-normal break-keep font-black leading-5 tracking-wide',
                        isStructure ? 'text-slate-300' : '',
                      ].join(' ')}
                    >
                      {line.text}
                    </code>
                    {blockLabel ? (
                      <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 font-sans text-[10px] font-black text-slate-300 xl:inline-flex">
                        {blockLabel}
                      </span>
                    ) : null}
                  </div>
                  {line.description ? (
                    <p className="mt-1 pl-11 font-sans text-xs font-semibold leading-5 text-slate-400">
                      {line.description}
                    </p>
                  ) : null}
                  {showConditionEvaluationAssist && conditionResult ? (
                    <p className="mt-2 rounded-lg border border-amber-300/40 bg-amber-300/10 px-2 py-1 font-sans text-xs font-black text-amber-100">
                      {conditionResult.text} · {conditionResult.branch === 'then' ? 'THEN 실행' : 'ELSE 실행'}
                    </p>
                  ) : null}
                </div>
              </div>
            );
            })
          )}
        </div>

        {showExecutionAssist ? (
          <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50 px-3 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">현재 줄</p>
            <p className="mt-1 text-sm font-bold text-sky-950">
              {activeParentInfo ? `${activeParentInfo} 실행 중 · ` : ''}
              {currentLineText ?? currentLine?.description ?? '스테이지 코드를 위에서 아래로 읽어 보세요.'}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
