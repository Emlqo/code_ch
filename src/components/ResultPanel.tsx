import { calculateStars } from '../engine/scoreEngine';
import type { GameStatus } from '../types/game';

interface ResultPanelProps {
  message: string;
  status: GameStatus;
  imageName: string;
  completedCommands: number;
  totalCommands: number;
  mistakes: number;
  maxMistakes: number;
  maxCombo: number;
  score: number;
  hintCount?: number;
  hintPenaltyEnabled?: boolean;
  hasNextStage: boolean;
  onReset: () => void;
  onNextStage: () => void;
  onStageSelect: () => void;
}

function getAccuracy(completedCommands: number, mistakes: number): number {
  const totalInputs = completedCommands + mistakes;

  if (totalInputs === 0) {
    return 100;
  }

  return Math.round((completedCommands / totalInputs) * 100);
}

function renderStars(stars: number) {
  return Array.from({ length: 3 }, (_, index) => (
    <span key={index} className={index < stars ? 'text-amber-400' : 'text-slate-300'}>
      ★
    </span>
  ));
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center text-slate-700">
      <span className="block truncate text-xs font-black text-slate-400">{label}</span>
      <span className="mt-1 block break-words text-sm font-black text-slate-800">{value}</span>
    </div>
  );
}

export function ResultPanel({
  message,
  status,
  imageName,
  completedCommands,
  totalCommands,
  mistakes,
  maxMistakes,
  maxCombo,
  score,
  hintCount = 0,
  hintPenaltyEnabled = false,
  hasNextStage,
  onReset,
  onNextStage,
  onStageSelect,
}: ResultPanelProps) {
  const isSuccess = status === 'success';
  const isFailed = status === 'failed';
  const accuracy = getAccuracy(completedCommands, mistakes);
  const starResult = calculateStars({ success: isSuccess, mistakes, hintCount, hintPenaltyEnabled });

  if (isSuccess) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-panel sm:p-5">
        <div className="grid gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Stage Clear</p>
            <h2 className="mt-1 text-2xl font-black text-emerald-950">그림 완성!</h2>
            <p className="mt-2 text-sm font-bold text-emerald-800">완성한 그림: {imageName}</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-white p-4">
            <div className="text-center text-4xl font-black leading-none" aria-label={`별점 ${starResult.stars}개`}>
              {renderStars(starResult.stars)}
            </div>
            {starResult.perfect ? (
              <p className="mt-2 text-center text-sm font-black text-emerald-700">퍼펙트! 오답 0회, 힌트 0회</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm font-black sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            <StatTile label="최종 점수" value={score} />
            <StatTile label="정확도" value={`${accuracy}%`} />
            <StatTile label="오답" value={`${mistakes}회`} />
            <StatTile label="최고 콤보" value={maxCombo} />
            <StatTile label="명령" value={`${completedCommands}/${totalCommands}`} />
            <StatTile label="힌트" value={`${hintCount}회`} />
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <button type="button" onClick={onReset} className="pixel-button min-w-0 whitespace-normal border-emerald-700 text-emerald-800">
              다시 하기
            </button>
            <button
              type="button"
              onClick={onNextStage}
              disabled={!hasNextStage}
              className="pixel-button min-w-0 whitespace-normal border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              다음 스테이지
            </button>
            <button type="button" onClick={onStageSelect} className="pixel-button min-w-0 whitespace-normal">
              스테이지 선택
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (isFailed) {
    return (
      <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-panel sm:p-5">
        <div className="grid gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-rose-700">Try Again</p>
            <h2 className="mt-1 text-2xl font-black text-rose-950">아쉽습니다!</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-rose-800">실패 이유: {message}</p>
          </div>

          <div className="rounded-lg border border-rose-200 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-700">
            현재 코드 줄과 입력 방향을 다시 비교해 보세요. 오답은 {mistakes}/{maxMistakes}회, 힌트는 {hintCount}회
            사용했습니다. 현재 점수는 {score}점입니다.
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <button
              type="button"
              onClick={onReset}
              className="pixel-button min-w-0 whitespace-normal border-rose-700 bg-rose-600 text-white hover:bg-rose-500"
            >
              다시 도전
            </button>
            <button type="button" onClick={onStageSelect} className="pixel-button min-w-0 whitespace-normal">
              스테이지 선택
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pixel-card min-w-0 p-4 sm:p-5">
      <div className="grid min-w-0 gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-slate-950">결과 메시지</h2>
          <p className="mt-1 whitespace-normal break-keep text-sm font-bold leading-6 text-slate-600">{message}</p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-4">
          <StatTile label="점수" value={score} />
          <StatTile label="명령" value={`${completedCommands}/${totalCommands}`} />
          <StatTile label="실수" value={`${mistakes}/${maxMistakes}`} />
          <button type="button" onClick={onReset} className="pixel-button min-w-0 whitespace-normal px-3 py-3 text-sm">
            다시 시작
          </button>
        </div>
      </div>
    </section>
  );
}
