interface HintPanelProps {
  hints: readonly string[];
  revealedCount: number;
  hintCount: number;
  notice?: string;
  onRequestHint: () => void;
}

export function HintPanel({ hints, revealedCount, hintCount, notice, onRequestHint }: HintPanelProps) {
  const visibleHints = hints.slice(0, revealedCount);
  const hasMoreHints = revealedCount < hints.length;
  const buttonLabel = revealedCount === 0 ? '힌트 보기' : hasMoreHints ? '다음 힌트' : '힌트 더 보기';

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/95 p-4 shadow-panel sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-amber-950">힌트</h2>
          <p className="mt-1 text-sm font-semibold text-amber-800">막히면 한 줄씩 열어 보세요. 게임은 계속 진행됩니다.</p>
        </div>
        <span className="rounded-lg bg-white px-2 py-1 text-xs font-black text-amber-700">{hintCount}회 사용</span>
      </div>

      <div className="mt-3">
        {visibleHints.length > 0 ? (
          <ol className="grid gap-2">
            {visibleHints.map((hint, index) => (
              <li
                key={`${index}-${hint}`}
                className="rounded-lg border border-amber-200 bg-white px-3 py-3 text-sm font-bold leading-6 text-slate-700"
              >
                <span className="mr-2 font-black text-amber-600">Hint {index + 1}</span>
                {hint}
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-lg border border-dashed border-amber-300 bg-white/70 px-3 py-4 text-sm font-bold text-amber-700">
            아직 열린 힌트가 없습니다.
          </div>
        )}
      </div>

      {notice ? (
        <p className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-black text-amber-800">
          {notice}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onRequestHint}
        className="mt-3 w-full rounded-lg border-2 border-amber-700 bg-amber-500 px-4 py-3 text-sm font-black text-white shadow-[0_5px_0_rgba(146,64,14,0.28)] transition hover:-translate-y-0.5 hover:bg-amber-400 active:translate-y-1 active:shadow-[0_2px_0_rgba(146,64,14,0.28)]"
      >
        {buttonLabel}
      </button>
    </section>
  );
}
