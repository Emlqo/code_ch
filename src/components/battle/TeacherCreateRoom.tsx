import { useState } from 'react';
import type { BattleRoom, BattleRoomConfig } from '../../types/battleRoom';
import type { ChallengeDifficulty, ChallengeDuration, ChallengeMode } from '../../types/challenge';
import { battleRoomService } from '../../services/battleRoom/battleRoomService';

interface TeacherCreateRoomProps {
  onRoomCreated: (room: BattleRoom) => void;
  onBack: () => void;
}

const createRoomTimeoutMs = 12000;

const durationOptions: Array<{ label: string; value: ChallengeDuration }> = [
  { label: '3분', value: 180 },
  { label: '5분', value: 300 },
];

const difficultyOptions: Array<{ label: string; value: ChallengeDifficulty }> = [
  { label: '쉬움', value: 'easy' },
  { label: '보통', value: 'normal' },
  { label: '어려움', value: 'hard' },
  { label: '섞어서', value: 'mixed' },
];

const modeOptions: Array<{ label: string; value: ChallengeMode; description: string }> = [
  { label: '자유 랜덤', value: 'random', description: '매번 다른 코드런 코스로 진행합니다.' },
  { label: '오늘의 챌린지', value: 'daily', description: '같은 날짜와 설정이면 같은 코스로 진행합니다.' },
];

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          '방 생성 요청 시간이 초과되었습니다. Firebase 프로젝트, Firestore Database 생성 여부, 보안 규칙, 네트워크 상태를 확인해 주세요.',
        ),
      );
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function getCreateRoomErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '방을 만드는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

export function TeacherCreateRoom({ onRoomCreated, onBack }: TeacherCreateRoomProps) {
  const [duration, setDuration] = useState<ChallengeDuration>(300);
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('normal');
  const [mode, setMode] = useState<ChallengeMode>('random');
  const [showLiveRanking, setShowLiveRanking] = useState(true);
  const [allowLateJoin, setAllowLateJoin] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(30);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const normalizedMaxParticipants = Math.max(1, Math.min(99, Math.trunc(maxParticipants) || 30));

  const handleCreateRoom = async () => {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setErrorMessage('');

    const config: BattleRoomConfig = {
      duration,
      difficulty,
      mode,
      maxParticipants: normalizedMaxParticipants,
      allowLateJoin,
      showLiveRanking,
    };

    try {
      const room = await withTimeout(battleRoomService.createRoom({ config }), createRoomTimeoutMs);
      onRoomCreated(room);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[BattleRoom] Failed to create room.', error);
      }

      setErrorMessage(getCreateRoomErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="pixel-card-strong mx-auto grid w-full max-w-5xl gap-5 overflow-hidden">
      <div className="grid gap-5 p-5 sm:p-7">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Teacher Room Setup</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">코드런 배틀룸 만들기</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            수업 상황에 맞게 시간, 난이도, 입장 규칙을 정한 뒤 학생들에게 입장 코드를 공유하세요.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="grid gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
            <h2 className="text-sm font-black text-slate-800">제한 시간</h2>
            <div className="grid grid-cols-2 gap-2">
              {durationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDuration(option.value)}
                  className={[
                    'rounded-xl border-2 px-4 py-4 text-center text-lg font-black transition',
                    duration === option.value
                      ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-[0_4px_0_rgba(14,165,233,0.18)]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
            <h2 className="text-sm font-black text-slate-800">난이도</h2>
            <div className="grid grid-cols-2 gap-2">
              {difficultyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDifficulty(option.value)}
                  className={[
                    'rounded-xl border-2 px-3 py-3 text-center font-black transition',
                    difficulty === option.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-[0_4px_0_rgba(16,185,129,0.18)]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
            <h2 className="text-sm font-black text-slate-800">최대 참여 인원</h2>
            <input
              type="number"
              min={1}
              max={99}
              value={maxParticipants}
              onChange={(event) => setMaxParticipants(Number(event.target.value))}
              className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-black text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
            <p className="text-xs font-bold text-slate-500">기본값은 30명이며, 1명부터 99명까지 설정할 수 있어요.</p>
          </section>
        </div>

        <section className="grid gap-3 rounded-xl border-2 border-slate-100 bg-white p-4">
          <h2 className="text-sm font-black text-slate-800">챌린지 방식</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {modeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                className={[
                  'min-h-24 rounded-xl border-2 p-4 text-left transition',
                  mode === option.value
                    ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-900 shadow-[0_4px_0_rgba(217,70,239,0.16)]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-fuchsia-200 hover:bg-fuchsia-50',
                ].join(' ')}
              >
                <span className="block text-base font-black">{option.label}</span>
                <span className="mt-1 block text-sm font-semibold text-slate-500">{option.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3 rounded-xl border-2 border-slate-100 bg-white p-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={showLiveRanking}
              onChange={(event) => setShowLiveRanking(event.target.checked)}
              className="mt-1 h-5 w-5 accent-sky-500"
            />
            <span>
              <span className="block text-sm font-black text-slate-800">실시간 랭킹 공개</span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                진행 중 학생들이 현재 순위를 볼 수 있게 합니다.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={allowLateJoin}
              onChange={(event) => setAllowLateJoin(event.target.checked)}
              className="mt-1 h-5 w-5 accent-emerald-500"
            />
            <span>
              <span className="block text-sm font-black text-slate-800">늦은 입장 허용</span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                배틀 시작 후에도 학생이 입장할 수 있게 합니다.
              </span>
            </span>
          </label>
        </section>

        {errorMessage ? (
          <p className="rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onBack} className="pixel-button">
            돌아가기
          </button>
          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="pixel-button bg-emerald-500 px-8 text-white hover:bg-emerald-400 disabled:bg-white disabled:text-slate-400"
          >
            {isCreating ? '방 만드는 중...' : '방 만들기'}
          </button>
        </div>
      </div>
      <div className="h-2 bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-300" />
    </section>
  );
}
