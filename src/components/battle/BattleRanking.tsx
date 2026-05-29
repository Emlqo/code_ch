import { useMemo, useState } from 'react';
import type { BattleLeaderboardEntry, BattleParticipant, BattleRoom, BattleRoomRole } from '../../types/battleRoom';
import { battleRoomService } from '../../services/battleRoom/battleRoomService';

interface BattleRankingProps {
  room: BattleRoom;
  role: BattleRoomRole;
  participant: BattleParticipant | null;
  participants: BattleParticipant[];
  onBackToLobby: () => void;
  onExit: () => void;
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

function createRanking(participants: BattleParticipant[]): BattleLeaderboardEntry[] {
  return [...participants]
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      if (a.solvedProblems !== b.solvedProblems) {
        return b.solvedProblems - a.solvedProblems;
      }

      if (a.accuracy !== b.accuracy) {
        return b.accuracy - a.accuracy;
      }

      if (a.maxCombo !== b.maxCombo) {
        return b.maxCombo - a.maxCombo;
      }

      return a.nickname.localeCompare(b.nickname);
    })
    .map((currentParticipant, index) => ({
      rank: index + 1,
      participantId: currentParticipant.id,
      nickname: currentParticipant.nickname,
      score: currentParticipant.score,
      solvedProblems: currentParticipant.solvedProblems,
      accuracy: currentParticipant.accuracy,
      maxCombo: currentParticipant.maxCombo,
      isOnline: currentParticipant.isOnline,
      finishedAt: currentParticipant.finishedAt,
    }));
}

function formatRoomTime(room: BattleRoom): string {
  if (room.status === 'finished') {
    return room.endedAt ? `종료 시간 ${new Date(room.endedAt).toLocaleTimeString()}` : '종료됨';
  }

  if (!room.startedAt) {
    return '아직 시작 전';
  }

  const startedAtMs = new Date(room.startedAt).getTime();

  if (Number.isNaN(startedAtMs)) {
    return '시간 정보 없음';
  }

  const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
  const remainingSeconds = Math.max(0, room.config.duration - elapsedSeconds);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return `남은 시간 ${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function BattleRanking({
  room,
  role,
  participant,
  participants,
  onBackToLobby,
  onExit,
}: BattleRankingProps) {
  const [message, setMessage] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);
  const ranking = useMemo(() => createRanking(participants), [participants]);
  const isTeacher = role === 'teacher';
  const myRank = participant ? ranking.find((entry) => entry.participantId === participant.id) : undefined;

  const handleFinishRoom = async () => {
    if (isFinishing) {
      return;
    }

    setIsFinishing(true);
    setMessage('');

    try {
      await battleRoomService.finishRoom(room.id);
      setMessage('방을 종료했습니다.');
    } catch {
      setMessage('방 종료에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <section className="pixel-card-strong mx-auto grid w-full max-w-6xl gap-5 overflow-hidden">
        <div className="grid gap-5 p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Battle Ranking</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">코드런 배틀 랭킹</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                {isTeacher ? '현재 방의 점수 흐름을 확인하고 경기를 종료할 수 있습니다.' : '내 순위와 결과를 확인하세요.'}
              </p>
            </div>

            <div className="grid gap-2 rounded-2xl border-2 border-sky-200 bg-sky-50 px-5 py-4 text-center sm:min-w-72">
              <p className="text-xs font-black text-sky-700">방 코드</p>
              <p className="font-mono text-3xl font-black tracking-[0.2em] text-slate-950">{room.roomCode}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-black text-slate-400">방 상태</p>
              <p className="mt-1 text-lg font-black text-slate-900">{statusLabel(room.status)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-black text-slate-400">시간</p>
              <p className="mt-1 text-lg font-black text-slate-900">{formatRoomTime(room)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-black text-slate-400">참여 인원</p>
              <p className="mt-1 text-lg font-black text-slate-900">{participants.length}명</p>
            </div>
          </div>

          {myRank ? (
            <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              내 순위: <span className="font-black">{myRank.rank}위</span> · {myRank.score}점 · 완료 코스{' '}
              {myRank.solvedProblems}개
            </div>
          ) : null}

          <section className="grid gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">랭킹 목록</h2>
              <span className="rounded-lg bg-white px-3 py-1 text-xs font-black text-slate-500">
                {ranking.length}명
              </span>
            </div>

            {ranking.length > 0 ? (
              <div className="grid gap-2">
                {ranking.map((entry) => {
                  const isMe = participant?.id === entry.participantId;

                  return (
                    <div
                      key={entry.participantId}
                      className={[
                        'grid gap-3 rounded-xl border-2 px-4 py-3 sm:grid-cols-[72px_1fr_repeat(5,minmax(88px,auto))] sm:items-center',
                        isMe ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white',
                      ].join(' ')}
                    >
                      <div className="text-2xl font-black text-slate-950">{entry.rank}위</div>
                      <div>
                        <p className="font-black text-slate-950">{entry.nickname}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {entry.isOnline ? '온라인' : '오프라인'} · {entry.finishedAt ? '종료' : '진행 중'}
                        </p>
                      </div>
                      <div className="text-sm font-bold text-slate-500">
                        점수
                        <p className="text-lg font-black text-sky-700">{entry.score}</p>
                      </div>
                      <div className="text-sm font-bold text-slate-500">
                        코스
                        <p className="text-lg font-black text-slate-900">{entry.solvedProblems}</p>
                      </div>
                      <div className="text-sm font-bold text-slate-500">
                        정확도
                        <p className="text-lg font-black text-slate-900">{entry.accuracy}%</p>
                      </div>
                      <div className="text-sm font-bold text-slate-500">
                        최고 연속
                        <p className="text-lg font-black text-slate-900">{entry.maxCombo}</p>
                      </div>
                      <div className="text-sm font-bold text-slate-500">
                        상태
                        <p className="text-lg font-black text-slate-900">{entry.finishedAt ? '완료' : '진행'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-bold text-slate-500">
                아직 랭킹에 표시할 참가자가 없습니다.
              </p>
            )}
          </section>

          {message ? (
            <p className="rounded-xl border-2 border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
              {message}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              {isTeacher ? (
                <button type="button" onClick={onBackToLobby} className="pixel-button">
                  대기실로 돌아가기
                </button>
              ) : null}
              <button type="button" onClick={onExit} className="pixel-button">
                나가기
              </button>
            </div>

            {isTeacher && room.status === 'playing' ? (
              <button
                type="button"
                onClick={handleFinishRoom}
                disabled={isFinishing}
                className="pixel-button bg-rose-500 px-8 text-white hover:bg-rose-400 disabled:bg-white disabled:text-slate-400"
              >
                {isFinishing ? '종료 중...' : '방 종료'}
              </button>
            ) : null}
          </div>
        </div>
        <div className="h-2 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300" />
      </section>
    </main>
  );
}
