import { flattenCodeForDisplay, type ConditionEvaluation, type DisplayCodeLine } from '../engine/codeParser';
import type { CodeNode } from '../types/game';

interface CodePanelProps {
  code: CodeNode[];
  currentCommandIndex?: number;
  completedCommandIndexes?: readonly number[];
  errorCommandIndex?: number | null;
  currentSourceLineId?: string;
  completedSourceLineIds?: readonly string[];
  errorSourceLineId?: string | null;
  activeParentInfo?: string;
  conditionEvaluations?: readonly ConditionEvaluation[];
}

type LineState = 'structure' | 'pending' | 'current' | 'completed' | 'error';

function isActiveForLine(line: DisplayCodeLine, activeParentInfo?: string): boolean {
  if (!activeParentInfo || line.nodeType !== 'for') {
    return false;
  }

  return activeParentInfo.startsWith(line.text.replace(':', ''));
}

function isActiveIfLine(line: DisplayCodeLine, activeParentInfo?: string): boolean {
  if (!activeParentInfo || line.nodeType !== 'if') {
    return false;
  }

  return activeParentInfo.startsWith(line.text.replace(':', ''));
}

function getLineState(
  line: DisplayCodeLine,
  currentCommandIndex: number,
  completedCommandIndexes: readonly number[],
  errorCommandIndex: number | null,
  currentSourceLineId?: string,
  completedSourceLineIds: readonly string[] = [],
  errorSourceLineId: string | null = null,
  activeParentInfo?: string,
): LineState {
  if (line.commandIndex === errorCommandIndex || line.id === errorSourceLineId) {
    return 'error';
  }

  if (
    line.commandIndex === currentCommandIndex ||
    line.id === currentSourceLineId ||
    isActiveForLine(line, activeParentInfo) ||
    isActiveIfLine(line, activeParentInfo)
  ) {
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

export function CodePanel({
  code,
  currentCommandIndex = 0,
  completedCommandIndexes = [],
  errorCommandIndex = null,
  currentSourceLineId,
  completedSourceLineIds = [],
  errorSourceLineId = null,
  activeParentInfo,
  conditionEvaluations = [],
}: CodePanelProps) {
  const lines = flattenCodeForDisplay(code);
  const currentLine =
    lines.find((line) => line.id === currentSourceLineId) ??
    lines.find((line) => line.commandIndex === currentCommandIndex);
  const conditionResultByLineId = Object.fromEntries(
    conditionEvaluations.map((evaluation) => [evaluation.sourceLineId, evaluation]),
  );

  return (
    <section className="pixel-card min-w-0 overflow-hidden">
      <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-5">
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Pseudo Code</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">의사코드</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">강조된 줄을 보고 같은 방향키를 입력하세요.</p>
      </div>

      {activeParentInfo ? (
        <div className="mx-4 mt-4 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-sm font-black text-fuchsia-800 sm:mx-5">
          {activeParentInfo} 실행 중
        </div>
      ) : null}

      <div className="p-3 sm:p-5">
        <div className="max-h-[42vh] overflow-y-auto overflow-x-hidden rounded-xl border-2 border-slate-900 bg-slate-950 font-mono text-xs text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] sm:text-sm lg:max-h-[62vh]">
          {lines.map((line, index) => {
            const lineState = getLineState(
              line,
              currentCommandIndex,
              completedCommandIndexes,
              errorCommandIndex,
              currentSourceLineId,
              completedSourceLineIds,
              errorSourceLineId,
              activeParentInfo,
            );
            const isStructure = lineState === 'structure';
            const isForLine = line.nodeType === 'for';
            const isIfLine = line.nodeType === 'if';
            const conditionResult = conditionResultByLineId[line.id];
            const stateClassName: Record<LineState, string> = {
              structure: 'bg-slate-900/70 text-slate-300',
              pending: 'bg-slate-950 text-slate-100',
              current: 'bg-sky-500/25 text-white ring-2 ring-inset ring-sky-300',
              completed: 'bg-emerald-500/15 text-emerald-100',
              error: 'bg-rose-500/25 text-rose-50 ring-2 ring-inset ring-rose-300',
            };

            return (
              <div
                key={line.id}
                className={[
                  'grid grid-cols-[3rem_1fr] border-b border-slate-800 transition-colors duration-200 last:border-b-0',
                  stateClassName[lineState],
                  isForLine ? 'border-l-4 border-l-fuchsia-400' : '',
                  isIfLine ? 'border-l-4 border-l-amber-400' : '',
                ].join(' ')}
              >
                <span className="flex items-center justify-end bg-slate-900 px-3 py-3 text-xs font-bold text-slate-400">
                  {index + 1}
                </span>
                <div className="min-w-0 px-3 py-3" style={{ paddingLeft: `${line.depth * 1.3 + 0.75}rem` }}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-9 shrink-0 rounded bg-white/10 px-1 py-0.5 text-center font-sans text-[10px] font-black">
                      {lineState === 'completed' ? 'OK' : isForLine ? 'FOR' : isIfLine ? 'IF' : isStructure ? 'BLOCK' : 'RUN'}
                    </span>
                  <code className={['min-w-0 truncate font-black tracking-wide', isStructure ? 'text-slate-300' : ''].join(' ')}>
                      {line.text}
                    </code>
                  </div>
                  {line.description ? (
                    <p className="mt-1 pl-11 font-sans text-xs font-semibold leading-5 text-slate-400">
                      {line.description}
                    </p>
                  ) : null}
                  {conditionResult ? (
                    <p className="mt-2 rounded-lg border border-amber-300/40 bg-amber-300/10 px-2 py-1 font-sans text-xs font-black text-amber-100">
                      {conditionResult.text} · {conditionResult.branch === 'then' ? 'THEN 실행' : 'ELSE 실행'}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50 px-3 py-3">
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">현재 줄</p>
          <p className="mt-1 text-sm font-bold text-sky-950">
            {activeParentInfo ? `${activeParentInfo} 실행 중 · ` : ''}
            {currentLine?.description ?? '스테이지 코드를 위에서 아래로 읽어 보세요.'}
          </p>
        </div>
      </div>
    </section>
  );
}
