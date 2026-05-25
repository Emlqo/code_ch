import type { CodeDisplayMode } from '../../types/admin';
import type { Stage } from '../../types/game';
import { toStageOrderId } from '../../utils/stageOrder';

interface StageCodeDisplayManagerProps {
  stages: Stage[];
  codeDisplayModes: Record<string, CodeDisplayMode>;
  selectedStageId?: number;
  onSelectStage: (stageId: number) => void;
  onChangeStageMode: (stageId: string, mode: CodeDisplayMode) => void;
  onSetAllModes: (mode: CodeDisplayMode) => void;
  onResetModes: () => void;
}

const modeLabels: Record<CodeDisplayMode, string> = {
  pseudocode: '의사코드',
  cStyle: 'C언어 느낌 코드',
};

export function StageCodeDisplayManager({
  stages,
  codeDisplayModes,
  selectedStageId,
  onSelectStage,
  onChangeStageMode,
  onSetAllModes,
  onResetModes,
}: StageCodeDisplayManagerProps) {
  return (
    <section className="pixel-card p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Code Display</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">코드 표시 방식 관리</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            각 스테이지의 코드 패널을 의사코드 또는 C언어 느낌 코드로 표시하도록 설정합니다.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border-2 border-sky-100 bg-sky-50 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h3 className="text-base font-black text-slate-950">전체 문제 코드 표시 방식</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              모든 스테이지에 같은 코드 표시 방식을 한 번에 적용합니다. 개별 스테이지 설정은 아래 목록에서 다시 바꿀 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSetAllModes('pseudocode')}
              className="pixel-button bg-emerald-500 text-sm hover:bg-emerald-400"
            >
              전체 의사코드 적용
            </button>
            <button
              type="button"
              onClick={() => onSetAllModes('cStyle')}
              className="pixel-button bg-sky-600 text-sm hover:bg-sky-500"
            >
              전체 C언어 느낌 적용
            </button>
            <button type="button" onClick={onResetModes} className="pixel-button text-sm">
              설정 초기화
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <div className="hidden grid-cols-[5rem_1fr_12rem] bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 md:grid">
          <span>Stage</span>
          <span>정보</span>
          <span>표시 방식</span>
        </div>

        <div className="divide-y divide-slate-200">
          {stages.map((stage) => {
            const stageOrderId = toStageOrderId(stage.id);
            const selectedMode = codeDisplayModes[stageOrderId] ?? 'pseudocode';
            const isSelected = selectedStageId === stage.id;

            return (
              <article
                key={stageOrderId}
                className={[
                  'grid gap-3 bg-white p-4 transition md:grid-cols-[5rem_1fr_12rem] md:items-center',
                  isSelected ? 'bg-sky-50' : 'hover:bg-slate-50',
                ].join(' ')}
              >
                <button type="button" onClick={() => onSelectStage(stage.id)} className="text-left">
                  <span className="block text-xs font-black uppercase tracking-wide text-slate-400">Stage</span>
                  <span className="block font-mono text-xl font-black text-slate-950">{stage.id}</span>
                </button>

                <button type="button" onClick={() => onSelectStage(stage.id)} className="min-w-0 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                      {stage.difficulty}
                    </span>
                    {isSelected ? (
                      <span className="rounded-lg bg-sky-100 px-2 py-1 text-xs font-black text-sky-700">
                        미리보기 중
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 truncate text-base font-black text-slate-950">{stage.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{stage.concept}</p>
                </button>

                <label className="grid gap-2 text-sm font-black text-slate-700">
                  <span className="md:hidden">코드 표시</span>
                  <select
                    value={selectedMode}
                    onFocus={() => onSelectStage(stage.id)}
                    onChange={(event) => {
                      onSelectStage(stage.id);
                      onChangeStageMode(stageOrderId, event.target.value as CodeDisplayMode);
                    }}
                    className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  >
                    <option value="pseudocode">{modeLabels.pseudocode}</option>
                    <option value="cStyle">{modeLabels.cStyle}</option>
                  </select>
                </label>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
