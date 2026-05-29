import type {
  ChallengeDifficulty,
  ChallengeRecords as ChallengeRecordsData,
  ChallengeResultData,
} from '../../types/challenge';

interface ChallengeRecordsProps {
  records: ChallengeRecordsData;
}

const difficultyLabel: Record<ChallengeDifficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
  mixed: '섞어서',
};

const difficultyOrder: readonly ChallengeDifficulty[] = ['easy', 'normal', 'hard', 'mixed'];

function formatDuration(seconds: number): string {
  return seconds === 180 ? '3분' : '5분';
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function EmptyRecord({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm font-bold text-slate-500">
      {label}
    </div>
  );
}

function RecordCard({ result, title }: { result: ChallengeResultData; title?: string }) {
  return (
    <article className="rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm">
      {title ? <p className="text-xs font-black uppercase tracking-wide text-sky-700">{title}</p> : null}
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">{result.nickname}</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(result.playedAt)}</p>
        </div>
        <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-lg font-black text-amber-800">
          {result.grade}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 sm:grid-cols-4">
        <span className="rounded bg-slate-50 px-2 py-2">난이도 {difficultyLabel[result.difficulty]}</span>
        <span className="rounded bg-slate-50 px-2 py-2">시간 {formatDuration(result.duration)}</span>
        <span className="rounded bg-slate-50 px-2 py-2">러닝 점수 {result.score}</span>
        <span className="rounded bg-slate-50 px-2 py-2">정확도 {result.accuracy}%</span>
        <span className="rounded bg-slate-50 px-2 py-2">최고 연속 입력 {result.maxCombo}</span>
        <span className="rounded bg-slate-50 px-2 py-2">완료 코스 {result.solvedProblems}</span>
      </div>
    </article>
  );
}

export function ChallengeRecords({ records }: ChallengeRecordsProps) {
  return (
    <section className="pixel-card grid gap-5 p-5 sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Code Run Records</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">내 코드런 기록</h2>
      </div>

      <div className="grid gap-3">
        <h3 className="text-sm font-black text-slate-800">전체 최고 기록</h3>
        {records.bestOverall ? (
          <RecordCard result={records.bestOverall} title="Best Overall" />
        ) : (
          <EmptyRecord label="아직 전체 최고 기록이 없습니다." />
        )}
      </div>

      <div className="grid gap-3">
        <h3 className="text-sm font-black text-slate-800">난이도별 최고 기록</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {difficultyOrder.map((difficulty) => {
            const result = records.bestByDifficulty[difficulty];

            return result ? (
              <RecordCard key={difficulty} result={result} title={`${difficultyLabel[difficulty]} 최고 기록`} />
            ) : (
              <EmptyRecord key={difficulty} label={`${difficultyLabel[difficulty]} 기록이 없습니다.`} />
            );
          })}
        </div>
      </div>

      <div className="grid gap-3">
        <h3 className="text-sm font-black text-slate-800">최근 10회 기록</h3>
        {records.recentRuns.length > 0 ? (
          <div className="grid gap-3">
            {records.recentRuns.map((result, index) => (
              <RecordCard key={`${result.playedAt}-${index}`} result={result} title={`최근 기록 ${index + 1}`} />
            ))}
          </div>
        ) : (
          <EmptyRecord label="아직 최근 기록이 없습니다." />
        )}
      </div>
    </section>
  );
}
