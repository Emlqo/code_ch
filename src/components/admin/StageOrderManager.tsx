import type { Stage } from '../../types/game';
import { getStageOrderIds } from '../../utils/stageOrder';

interface StageOrderManagerProps {
  stages: Stage[];
  selectedStageId?: number;
  onSelectStage: (stageId: number) => void;
  onStartStage?: (stageId: number) => void;
  onMoveStage: (stageIndex: number, direction: 'up' | 'down') => void;
  onResetOrder: () => void;
}

export function StageOrderManager({
  stages,
  selectedStageId,
  onSelectStage,
  onStartStage,
  onMoveStage,
  onResetOrder,
}: StageOrderManagerProps) {
  const stageOrderIds = getStageOrderIds(stages);

  return (
    <section className="pixel-card p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Stage Order</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">스테이지 순서 관리</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            위/아래 버튼으로 스테이지 선택 화면의 표시 순서를 조정합니다. 스테이지를 선택하면 오른쪽에서 코드를
            미리볼 수 있습니다.
          </p>
        </div>
        <button type="button" onClick={onResetOrder} className="pixel-button w-fit text-sm">
          기본 순서로 초기화
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {stages.map((stage, index) => {
          const isFirst = index === 0;
          const isLast = index === stages.length - 1;
          const isSelected = selectedStageId === stage.id;

          return (
            <article
              key={stageOrderIds[index]}
              className={[
                'grid gap-3 rounded-xl border bg-white p-4 shadow-sm transition lg:grid-cols-[4rem_1fr_auto] lg:items-center',
                isSelected ? 'border-sky-400 ring-4 ring-sky-100' : 'border-slate-200 hover:border-sky-200',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => onSelectStage(stage.id)}
                className="flex items-center gap-2 text-left lg:block"
              >
                <span className="block text-xs font-black uppercase tracking-wide text-slate-400">순서</span>
                <span className="block font-mono text-2xl font-black text-slate-950">{index + 1}</span>
              </button>

              <button type="button" onClick={() => onSelectStage(stage.id)} className="min-w-0 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-sky-100 px-2 py-1 text-xs font-black text-sky-800">
                    ID {stage.id}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                    {stage.difficulty}
                  </span>
                  {isSelected ? (
                    <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">
                      미리보기 중
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 text-lg font-black text-slate-950">{stage.title}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{stage.chapter}</p>
                <p className="mt-2 text-sm font-bold text-slate-700">학습 개념: {stage.concept}</p>
              </button>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-36 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={() => onSelectStage(stage.id)}
                  className="pixel-button px-3 py-2 text-sm"
                >
                  선택
                </button>
                <button
                  type="button"
                  onClick={() => onStartStage?.(stage.id)}
                  className="pixel-button bg-emerald-500 px-3 py-2 text-sm hover:bg-emerald-400"
                >
                  실행
                </button>
                <button
                  type="button"
                  onClick={() => onMoveStage(index, 'up')}
                  disabled={isFirst}
                  className="pixel-button px-3 py-2 text-sm"
                >
                  위로
                </button>
                <button
                  type="button"
                  onClick={() => onMoveStage(index, 'down')}
                  disabled={isLast}
                  className="pixel-button px-3 py-2 text-sm"
                >
                  아래로
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
