import type { ChallengeSetupConfig, ChallengeStats } from '../../types/challenge';

interface ChallengeHudProps {
  config: ChallengeSetupConfig;
  stats: ChallengeStats;
  totalProblems: number;
}

const difficultyLabel: Record<ChallengeSetupConfig['difficulty'], string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
  mixed: '섞어서',
};

const modeLabel: Record<ChallengeSetupConfig['mode'], string> = {
  random: '자유 러닝',
  daily: '오늘의 코드런',
};

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function PrimaryStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'warning' | 'combo';
}) {
  const toneClassName = {
    default: 'border-sky-200 bg-sky-50 text-sky-950',
    warning: 'border-rose-300 bg-rose-50 text-rose-700 animate-pulse',
    combo: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }[tone];

  return (
    <div className={`rounded-xl border-2 px-4 py-3 text-center shadow-sm ${toneClassName}`}>
      <span className="block text-xs font-black uppercase tracking-wide opacity-70">{label}</span>
      <span className="mt-1 block text-3xl font-black leading-none sm:text-4xl">{value}</span>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center shadow-sm">
      <span className="block text-xs font-black text-slate-400">{label}</span>
      <span className="mt-1 block text-base font-black text-slate-900">{value}</span>
    </div>
  );
}

export function ChallengeHud({ config, stats, totalProblems }: ChallengeHudProps) {
  const isLowTime = stats.remainingTime <= 30;

  return (
    <section className="pixel-card p-3 sm:p-5">
      <div className="grid gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Code Run Challenge</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
              {config.nickname}의 코드런
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {modeLabel[config.mode]} · {difficultyLabel[config.difficulty]} · {formatTime(config.duration)} · 총{' '}
              {totalProblems}코스
            </p>
          </div>
          {isLowTime ? (
            <span className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-black text-rose-700">
              마지막 30초!
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <PrimaryStat label="남은 시간" value={formatTime(stats.remainingTime)} tone={isLowTime ? 'warning' : 'default'} />
          <PrimaryStat label="러닝 점수" value={stats.score} />
          <PrimaryStat label="연속 입력" value={stats.combo} tone="combo" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <SmallStat label="최고 연속 입력" value={stats.maxCombo} />
          <SmallStat label="완료 코스" value={stats.solvedProblems} />
          <SmallStat label="입력" value={stats.currentCommandIndex} />
        </div>
      </div>
    </section>
  );
}
