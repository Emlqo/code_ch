import type { Stage } from '../types/game';
import type { StageProgressMap } from '../utils/storage';

interface StageSelectProps {
  stages: Stage[];
  progressByStageId: StageProgressMap;
  onSelectStage: (stageId: number) => void;
  onOpenChallenge: () => void;
  onOpenBattleRoom: () => void;
  onOpenAdminPage: () => void;
}

function groupStagesByChapter(stages: Stage[]): Record<string, Stage[]> {
  return stages.reduce<Record<string, Stage[]>>((groupedStages, stage) => {
    groupedStages[stage.chapter] = [...(groupedStages[stage.chapter] ?? []), stage];
    return groupedStages;
  }, {});
}

function renderStars(stars: number) {
  return Array.from({ length: 3 }, (_, index) => (
    <span key={index} className={index < stars ? 'text-amber-400' : 'text-slate-300'}>
      ★
    </span>
  ));
}

export function StageSelect({
  stages,
  progressByStageId,
  onSelectStage,
  onOpenChallenge,
  onOpenBattleRoom,
  onOpenAdminPage,
}: StageSelectProps) {
  const chapters = groupStagesByChapter(stages);
  const clearedCount = Object.values(progressByStageId).filter((progress) => progress.cleared).length;
  const isUnlocked = (stage: Stage) => {
    const stageIndex = stages.findIndex((candidate) => candidate.id === stage.id);

    if (stageIndex === 0) {
      return true;
    }

    if (stageIndex < 0) {
      return false;
    }

    const previousStage = stages[stageIndex - 1];
    return progressByStageId[previousStage.id]?.cleared ?? false;
  };

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-7">
        <header className="pixel-card-strong overflow-hidden">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Code Drawing Challenge</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">코드 드로잉 챌린지</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                의사코드를 읽고 방향키를 입력해 픽셀 그림을 완성하세요. 순차, 반복, 조건을 스테이지별로 익힙니다.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
                클리어 {clearedCount}/{stages.length}
              </div>
              <button
                type="button"
                onClick={onOpenChallenge}
                className="rounded-xl border-2 border-sky-700 bg-sky-500 px-4 py-3 text-left font-black text-white shadow-[0_5px_0_rgba(14,116,144,0.28)] transition hover:-translate-y-0.5 hover:bg-sky-400 active:translate-y-1 active:shadow-[0_2px_0_rgba(14,116,144,0.28)]"
              >
                <span className="block text-sm">코드런 챌린지</span>
                <span className="mt-1 block text-xs font-bold leading-5 text-sky-50">
                  제한 시간 동안 코드를 읽고 캐릭터를 움직여 코스를 달려보세요.
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenBattleRoom}
                className="rounded-xl border-2 border-emerald-700 bg-emerald-500 px-4 py-3 text-left font-black text-white shadow-[0_5px_0_rgba(4,120,87,0.28)] transition hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-1 active:shadow-[0_2px_0_rgba(4,120,87,0.28)]"
              >
                <span className="block text-sm">코드런 배틀룸</span>
                <span className="mt-1 block text-xs font-bold leading-5 text-emerald-50">
                  입장 코드로 함께 참여하는 실시간 코드런 랭킹 배틀
                </span>
              </button>
              <button type="button" onClick={onOpenAdminPage} className="pixel-button text-sm">
                관리자 페이지
              </button>
            </div>
          </div>
          <div className="h-2 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300" />
        </header>

        {Object.entries(chapters).map(([chapterName, chapterStages]) => (
          <section key={chapterName} className="grid gap-4">
            <div className="flex items-center gap-3">
              <h2 className="shrink-0 text-xl font-black text-slate-950">{chapterName}</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {chapterStages.map((stage) => {
                const unlocked = isUnlocked(stage);
                const progress = progressByStageId[stage.id];

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => onSelectStage(stage.id)}
                    disabled={!unlocked}
                    className={[
                      'group min-h-72 rounded-xl border-2 p-5 text-left transition',
                      unlocked
                        ? 'border-slate-200 bg-white shadow-panel hover:-translate-y-1 hover:border-sky-300 hover:shadow-[0_18px_40px_rgba(14,165,233,0.16)]'
                        : 'cursor-not-allowed border-slate-200 bg-slate-100/90 opacity-75',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Stage {stage.id}</p>
                        <h3 className="mt-1 text-lg font-black text-slate-950">{stage.title}</h3>
                      </div>
                      <span
                        className={[
                          'rounded-lg px-2 py-1 text-xs font-black',
                          unlocked
                            ? progress?.cleared
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-800'
                            : 'bg-slate-200 text-slate-500',
                        ].join(' ')}
                      >
                        {unlocked ? (progress?.cleared ? 'CLEAR' : 'OPEN') : 'LOCK'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-xs font-bold text-slate-400">학습 개념</p>
                        <p className="mt-1 text-sm font-black text-slate-800">{stage.concept}</p>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-xs font-bold text-slate-400">완성 그림</p>
                        <p className="mt-1 font-mono text-sm font-black text-slate-800">{stage.targetImageName}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-600">
                        {stage.difficulty}
                      </span>
                      <span className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-lg font-black leading-none">
                        {renderStars(progress?.stars ?? 0)}
                      </span>
                    </div>

                    {progress?.cleared ? (
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                        <div className="rounded-lg bg-emerald-50 px-2 py-2 text-emerald-800">실수 {progress.bestMistakes}회</div>
                        <div className="rounded-lg bg-sky-50 px-2 py-2 text-sky-800">콤보 {progress.bestCombo}</div>
                      </div>
                    ) : null}

                    {!unlocked ? (
                      <p className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">
                        이전 스테이지를 클리어하면 열립니다.
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
