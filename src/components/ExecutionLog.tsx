import type { Direction, ExecutionLogEntry } from '../types/game';

interface ExecutionLogProps {
  logs: readonly ExecutionLogEntry[];
  latestFirst?: boolean;
}

const directionText: Record<Direction, string> = {
  up: 'UP',
  down: 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
};

function getLogText(log: ExecutionLogEntry): string {
  if (log.message) {
    return log.message;
  }

  if (log.correct) {
    return `${log.stepNumber}단계: ${directionText[log.inputDirection]} 입력 성공, 현재 위치 (${log.position.row}, ${log.position.col})`;
  }

  return `${log.stepNumber}단계: 현재 코드는 ${directionText[log.expectedDirection]}인데 ${directionText[log.inputDirection]}를 눌렀어요.`;
}

export function ExecutionLog({ logs, latestFirst = false }: ExecutionLogProps) {
  const orderedLogs = latestFirst ? [...logs].reverse() : logs;

  return (
    <section className="pixel-card p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">실행 로그</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">입력 흐름과 실수 지점을 단계별로 확인하세요.</p>
        </div>
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{logs.length}개</span>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm font-bold text-slate-500">
          아직 입력 기록이 없습니다.
        </div>
      ) : (
        <ol className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {orderedLogs.map((log, index) => {
            const tone = log.correct
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-rose-200 bg-rose-50 text-rose-950';
            const badgeTone = log.correct ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white';

            return (
              <li
                key={`${log.stepNumber}-${index}-${log.inputDirection}-${log.correct ? 'ok' : 'miss'}`}
                className={`rounded-lg border px-3 py-3 ${tone}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 rounded px-2 py-1 text-xs font-black ${badgeTone}`}>
                    {log.correct ? 'OK' : 'MISS'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black leading-5">{getLogText(log)}</p>
                    {log.parentInfo ? <p className="mt-1 text-xs font-bold opacity-75">{log.parentInfo}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold opacity-80">
                      <span>예상: {directionText[log.expectedDirection]}</span>
                      <span>입력: {directionText[log.inputDirection]}</span>
                      <span>콤보: {log.combo}</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
