import { useState } from 'react';
import type {
  ChallengeDifficulty,
  ChallengeDuration,
  ChallengeMode,
  ChallengeRecords as ChallengeRecordsData,
  ChallengeSetupConfig,
} from '../../types/challenge';
import { getChallengeRecords, resetChallengeRecords } from '../../utils/challengeStorage';
import { ChallengeRecords } from './ChallengeRecords';

interface ChallengeSetupProps {
  onStart: (config: ChallengeSetupConfig) => void;
  onExit: () => void;
}

const modeOptions: Array<{ label: string; value: ChallengeMode; description: string }> = [
  { label: '자유 러닝', value: 'random', description: '시작할 때마다 새로운 코스를 달려요.' },
  { label: '오늘의 코드런', value: 'daily', description: '오늘 같은 난이도와 시간을 고르면 모두 같은 코스를 달려요.' },
];

const durationOptions: Array<{ label: string; value: ChallengeDuration; description: string }> = [
  { label: '3분', value: 180, description: '짧게 집중' },
  { label: '5분', value: 300, description: '표준 경쟁' },
];

const difficultyOptions: Array<{ label: string; value: ChallengeDifficulty; description: string }> = [
  { label: '쉬움', value: 'easy', description: '짧은 순서 코드' },
  { label: '보통', value: 'normal', description: '순서와 반복' },
  { label: '어려움', value: 'hard', description: '긴 코드와 반복' },
  { label: '섞어서', value: 'mixed', description: '난이도 랜덤' },
];

export function ChallengeSetup({ onStart, onExit }: ChallengeSetupProps) {
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState<ChallengeMode>('random');
  const [duration, setDuration] = useState<ChallengeDuration>(300);
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('normal');
  const [showRecords, setShowRecords] = useState(false);
  const [records, setRecords] = useState<ChallengeRecordsData>(() => getChallengeRecords());
  const trimmedNickname = nickname.trim();
  const canStart = trimmedNickname.length > 0;

  const refreshRecords = () => {
    setRecords(getChallengeRecords());
  };

  const toggleRecords = () => {
    if (!showRecords) {
      refreshRecords();
    }

    setShowRecords((currentValue) => !currentValue);
  };

  const handleResetRecords = () => {
    const confirmed =
      typeof window === 'undefined' || window.confirm('코드런 챌린지 기록을 모두 초기화할까요?');

    if (!confirmed) {
      return;
    }

    resetChallengeRecords();
    refreshRecords();
  };

  const handleStart = () => {
    if (!canStart) {
      return;
    }

    onStart({
      nickname: trimmedNickname,
      mode,
      duration,
      difficulty,
    });
  };

  return (
    <main className="min-h-screen px-3 py-4 text-slate-900 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="pixel-card-strong overflow-hidden">
          <div className="grid gap-4 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Challenge Mode</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">코드런 챌린지</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                제한 시간 동안 코드를 읽고 캐릭터를 움직여 코스를 완주하세요.
                정확하게 입력할수록 러닝 점수와 연속 입력 보너스가 올라갑니다.
              </p>
            </div>
            <button type="button" onClick={toggleRecords} className="pixel-button h-fit">
              {showRecords ? '기록 닫기' : '내 기록 보기'}
            </button>
          </div>
          <div className="h-2 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300" />
        </header>

        <section className="pixel-card grid gap-5 p-4 sm:p-6">
          <label className="grid gap-2">
            <span className="text-sm font-black text-slate-800">닉네임</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value.slice(0, 12))}
              maxLength={12}
              placeholder="닉네임을 입력하세요"
              className="rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="grid gap-3">
              <h2 className="text-sm font-black text-slate-800">유형</h2>
              <div className="grid gap-2">
                {modeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={[
                      'min-h-20 rounded-xl border-2 p-3 text-left transition',
                      mode === option.value
                        ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-900 shadow-[0_5px_0_rgba(217,70,239,0.16)]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-fuchsia-200 hover:bg-fuchsia-50',
                    ].join(' ')}
                  >
                    <span className="block text-base font-black">{option.label}</span>
                    <span className="mt-1 block text-sm font-semibold text-slate-500">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <h2 className="text-sm font-black text-slate-800">시간</h2>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                {durationOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDuration(option.value)}
                    className={[
                      'min-h-20 rounded-xl border-2 px-4 py-3 text-center transition',
                      duration === option.value
                        ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-[0_5px_0_rgba(14,165,233,0.2)]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50',
                    ].join(' ')}
                  >
                    <span className="block text-2xl font-black">{option.label}</span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <h2 className="text-sm font-black text-slate-800">난이도</h2>
              <div className="grid grid-cols-2 gap-2">
                {difficultyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDifficulty(option.value)}
                    className={[
                      'min-h-20 rounded-xl border-2 p-3 text-left transition',
                      difficulty === option.value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-[0_5px_0_rgba(16,185,129,0.18)]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50',
                    ].join(' ')}
                  >
                    <span className="block text-base font-black">{option.label}</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onExit} className="pixel-button">
                돌아가기
              </button>
              {showRecords ? (
                <button type="button" onClick={handleResetRecords} className="pixel-button">
                  기록 초기화
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              className="pixel-button bg-sky-500 px-8 text-white hover:bg-sky-400 disabled:bg-white disabled:text-slate-400"
            >
              시작
            </button>
          </div>
        </section>

        {showRecords ? <ChallengeRecords records={records} /> : null}
      </div>
    </main>
  );
}
