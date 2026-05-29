import { useState } from 'react';
import type { ChallengeResultData } from '../../types/challenge';

interface ChallengeResultProps {
  result: ChallengeResultData;
  isNewBestOverall: boolean;
  isNewBestByDifficulty: boolean;
  onRetry: () => void;
  onSetup: () => void;
  onExit: () => void;
}

function ResultStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

export function ChallengeResult({
  result,
  isNewBestOverall,
  isNewBestByDifficulty,
  onRetry,
  onSetup,
  onExit,
}: ChallengeResultProps) {
  const [copied, setCopied] = useState(false);
  const recordMessage = (() => {
    if (isNewBestOverall) {
      return '전체 최고 기록을 새로 세웠어요!';
    }

    if (isNewBestByDifficulty) {
      return '현재 난이도의 최고 기록을 갱신했어요!';
    }

    return '코드런 기록이 저장되었습니다. 다음 도전에서 최고 기록을 노려보세요.';
  })();

  const copyResultCode = async () => {
    if (!result.resultCode || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(result.resultCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main className="min-h-screen px-3 py-4 text-slate-900 sm:px-6 sm:py-6 lg:px-8">
      <section className="pixel-card mx-auto grid w-full max-w-5xl gap-5 p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Code Run Result</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">코드런 챌린지 결과</h1>
            <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-black text-amber-800">
              {recordMessage}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:min-w-96">
            <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-4 text-center text-sky-950">
              <p className="text-xs font-black uppercase tracking-wide opacity-70">Running Score</p>
              <p className="mt-1 text-4xl font-black leading-none sm:text-5xl">{result.score}</p>
            </div>
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-emerald-800">
              <p className="text-xs font-black uppercase tracking-wide opacity-70">Grade</p>
              <p className="mt-1 text-4xl font-black leading-none sm:text-5xl">{result.grade}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResultStat label="닉네임" value={result.nickname} />
          <ResultStat label="정확도" value={`${result.accuracy}%`} />
          <ResultStat label="완료한 코스 수" value={result.solvedProblems} />
          <ResultStat label="최고 연속 입력" value={result.maxCombo} />
          <ResultStat label="정답 입력" value={result.correctInputs} />
          <ResultStat label="오답 입력" value={result.wrongInputs} />
        </div>

        <div className="rounded-xl border-2 border-sky-200 bg-sky-50 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Code Run Record Code</p>
              <p className="mt-2 break-all font-mono text-xl font-black text-sky-950">{result.resultCode ?? '-'}</p>
            </div>
            <button
              type="button"
              onClick={copyResultCode}
              disabled={!result.resultCode}
              className="pixel-button shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? '복사 완료' : '코드런 기록 코드 복사'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={onRetry} className="pixel-button">
            다시 도전
          </button>
          <button type="button" onClick={onSetup} className="pixel-button">
            설정으로 돌아가기
          </button>
          <button type="button" onClick={onExit} className="pixel-button">
            스테이지 선택으로 돌아가기
          </button>
        </div>
      </section>
    </main>
  );
}
