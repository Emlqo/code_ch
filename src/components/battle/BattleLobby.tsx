import { useState } from 'react';
import type { BattleParticipant, BattleRoom, BattleRoomRole } from '../../types/battleRoom';
import type { ChallengeDifficulty, ChallengeMode } from '../../types/challenge';
import { battleRoomService } from '../../services/battleRoom/battleRoomService';

interface BattleLobbyProps {
  room: BattleRoom;
  role: BattleRoomRole;
  participant: BattleParticipant | null;
  participants: BattleParticipant[];
  onLeave: () => void;
}

const difficultyLabels: Record<ChallengeDifficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
  mixed: '섞어서',
};

const modeLabels: Record<ChallengeMode, string> = {
  random: '자유 랜덤',
  daily: '오늘의 챌린지',
};

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}분`;
}

function statusLabel(status: BattleRoom['status']): string {
  switch (status) {
    case 'waiting':
      return '대기 중';
    case 'countdown':
      return '시작 준비 중';
    case 'playing':
      return '진행 중';
    case 'finished':
      return '종료됨';
    case 'cancelled':
      return '취소됨';
    default:
      return status;
  }
}

export function BattleLobby({ room, role, participant, participants, onLeave }: BattleLobbyProps) {
  const [message, setMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const isTeacher = role === 'teacher';
  const onlineParticipants = participants.filter((currentParticipant) => currentParticipant.isOnline);
  const canStart = isTeacher && onlineParticipants.length > 0 && room.status === 'waiting' && !isStarting;

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setMessage('입장 코드를 복사했습니다.');
    } catch {
      setMessage('복사에 실패했습니다. 입장 코드를 직접 알려주세요.');
    }
  };

  const handleStartRoom = async () => {
    if (!canStart) {
      return;
    }

    setIsStarting(true);
    setMessage('');

    try {
      await battleRoomService.startRoom(room.id);
      setMessage('배틀을 시작합니다.');
    } catch {
      setMessage('배틀을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <section className="pixel-card-strong mx-auto grid w-full max-w-6xl gap-5 overflow-hidden">
        <div className="grid gap-5 p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Battle Lobby</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">코드런 배틀 대기실</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                {isTeacher
                  ? '학생들이 입장하면 시작 버튼으로 동시에 코드런 배틀을 시작할 수 있어요.'
                  : '선생님이 시작할 때까지 기다려주세요.'}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 px-5 py-4 text-center">
              <p className="text-xs font-black text-sky-700">입장 코드</p>
              <p className="mt-1 font-mono text-4xl font-black tracking-[0.2em] text-slate-950">{room.roomCode}</p>
              {isTeacher ? (
                <button type="button" onClick={handleCopyRoomCode} className="pixel-button mt-3 text-sm">
                  입장 코드 복사
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-black text-slate-400">제한 시간</p>
              <p className="mt-1 text-lg font-black text-slate-900">{formatDuration(room.config.duration)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-black text-slate-400">난이도</p>
              <p className="mt-1 text-lg font-black text-slate-900">{difficultyLabels[room.config.difficulty]}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-black text-slate-400">모드</p>
              <p className="mt-1 text-lg font-black text-slate-900">{modeLabels[room.config.mode]}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-black text-slate-400">참여 인원</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {onlineParticipants.length}/{room.config.maxParticipants}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-black text-slate-400">방 상태</p>
              <p className="mt-1 text-lg font-black text-slate-900">{statusLabel(room.status)}</p>
            </div>
          </div>

          {participant ? (
            <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              내 닉네임: <span className="font-black">{participant.nickname}</span>
            </div>
          ) : null}

          <section className="grid gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">참여 학생 목록</h2>
              <span className="rounded-lg bg-white px-3 py-1 text-xs font-black text-slate-500">
                {onlineParticipants.length}명
              </span>
            </div>

            {participants.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {participants.map((currentParticipant) => (
                  <div
                    key={currentParticipant.id}
                    className={[
                      'rounded-xl border-2 px-4 py-3',
                      currentParticipant.isOnline
                        ? 'border-emerald-100 bg-white text-slate-900'
                        : 'border-slate-200 bg-slate-100 text-slate-400',
                    ].join(' ')}
                  >
                    <p className="font-black">{currentParticipant.nickname}</p>
                    <p className="mt-1 text-xs font-bold">{currentParticipant.isOnline ? '대기 중' : '나감'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-bold text-slate-500">
                아직 입장한 학생이 없습니다.
              </p>
            )}
          </section>

          {message ? (
            <p className="rounded-xl border-2 border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
              {message}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={onLeave} className="pixel-button">
              나가기
            </button>

            {isTeacher ? (
              <button
                type="button"
                onClick={handleStartRoom}
                disabled={!canStart}
                className="pixel-button bg-emerald-500 px-8 text-white hover:bg-emerald-400 disabled:bg-white disabled:text-slate-400"
              >
                {onlineParticipants.length === 0 ? '학생 입장 대기 중' : isStarting ? '시작 중...' : '시작'}
              </button>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
                시작 전에는 조작할 수 없어요.
              </p>
            )}
          </div>
        </div>
        <div className="h-2 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300" />
      </section>
    </main>
  );
}
