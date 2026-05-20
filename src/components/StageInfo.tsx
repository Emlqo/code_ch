import type { Stage } from '../types/game';

interface StageInfoProps {
  stage: Stage;
  paintedTargetCount: number;
  targetCellCount: number;
  currentCommandIndex: number;
  totalCommands: number;
  mistakes: number;
  maxMistakes: number;
  score: number;
  scoreDelta?: number | null;
  combo: number;
  maxCombo: number;
  currentRepeatInfo?: string;
}

export function StageInfo({
  stage,
  paintedTargetCount,
  targetCellCount,
  currentCommandIndex,
  totalCommands,
  mistakes,
  maxMistakes,
  score,
  scoreDelta = null,
  combo,
  maxCombo,
  currentRepeatInfo,
}: StageInfoProps) {
  return (
    <header className="rounded-lg border border-sky-100 bg-white p-4 shadow-panel sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Stage {stage.id}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">코드 드로잉 챌린지</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {stage.title} · {stage.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold sm:grid-cols-3 xl:min-w-[42rem] xl:grid-cols-6">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-slate-400">난이도</span>
            <span className="mt-1 block text-slate-800">{stage.difficulty}</span>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="block text-emerald-500">진행</span>
            <span className="mt-1 block text-emerald-800">
              {currentCommandIndex}/{totalCommands}
            </span>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="block text-amber-500">그림</span>
            <span className="mt-1 block text-amber-800">
              {paintedTargetCount}/{targetCellCount}
            </span>
          </div>
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
            <span className="block text-rose-500">실수</span>
            <span className="mt-1 block text-rose-800">
              {mistakes}/{maxMistakes}
            </span>
          </div>
          <div className="relative rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
            <span className="block text-indigo-500">점수</span>
            <span className="mt-1 block text-indigo-800">{score}</span>
            {scoreDelta !== null ? (
              <span
                className={[
                  'absolute -right-2 -top-2 rounded px-2 py-1 text-[11px] font-black shadow-sm animate-bounce',
                  scoreDelta >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white',
                ].join(' ')}
              >
                {scoreDelta >= 0 ? '+' : ''}
                {scoreDelta}
              </span>
            ) : null}
          </div>
          <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
            <span className="block text-sky-500">콤보</span>
            <span className="mt-1 block text-sky-800">
              {combo} · 최고 {maxCombo}
            </span>
            {combo >= 3 ? <span className="mt-1 block text-[11px] font-black text-fuchsia-700">{combo} COMBO!</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {currentRepeatInfo ? (
          <div className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-sm font-black text-fuchsia-800">
            현재 실행: {currentRepeatInfo}
          </div>
        ) : null}
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
          <span className="font-black text-slate-800">{stage.concept}</span>
          <span className="mx-2 text-slate-300">|</span>
          필요하면 힌트 패널에서 도움말을 한 줄씩 열어 볼 수 있어요.
        </div>
      </div>
    </header>
  );
}
