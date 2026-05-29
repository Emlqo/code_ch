import { useState } from 'react';
import type { BattleParticipant, BattleRoom } from '../../types/battleRoom';
import { battleRoomService } from '../../services/battleRoom/battleRoomService';

interface StudentJoinRoomProps {
  onJoined: (room: BattleRoom, participant: BattleParticipant) => void;
  onBack: () => void;
}

function normalizeRoomCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
}

export function StudentJoinRoom({ onJoined, onBack }: StudentJoinRoomProps) {
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const trimmedNickname = nickname.trim();
  const canJoin = roomCode.length === 6 && trimmedNickname.length > 0 && !isJoining;

  const handleJoinRoom = async () => {
    if (!canJoin) {
      return;
    }

    setIsJoining(true);
    setErrorMessage('');

    try {
      const { room, participant } = await battleRoomService.joinRoom({
        roomCode,
        nickname: trimmedNickname,
      });
      onJoined(room, participant);
    } catch (error) {
      const fallbackMessage = '입장할 수 없습니다. 입장 코드와 방 상태를 확인해 주세요.';
      setErrorMessage(error instanceof Error && error.message ? error.message : fallbackMessage);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <section className="pixel-card-strong mx-auto grid w-full max-w-3xl gap-5 overflow-hidden">
      <div className="grid gap-5 p-5 sm:p-7">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Student Join</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">코드런 배틀룸 입장</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            선생님이 알려준 6자리 입장 코드와 닉네임을 입력하고 배틀룸 대기실로 들어가세요.
          </p>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-800">입장 코드</span>
          <input
            value={roomCode}
            onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))}
            inputMode="text"
            autoComplete="off"
            placeholder="예: 123456"
            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-center font-mono text-3xl font-black tracking-[0.35em] text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          />
          <span className="text-xs font-bold text-slate-500">숫자와 영문을 사용할 수 있고, 6자리까지 입력됩니다.</span>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-800">닉네임</span>
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value.slice(0, 12))}
            maxLength={12}
            placeholder="닉네임을 입력하세요"
            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />
          <span className="text-xs font-bold text-slate-500">최대 12글자까지 사용할 수 있어요.</span>
        </label>

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
            onClick={handleJoinRoom}
            disabled={!canJoin}
            className="pixel-button bg-emerald-500 px-8 text-white hover:bg-emerald-400 disabled:bg-white disabled:text-slate-400"
          >
            {isJoining ? '입장 중...' : '입장하기'}
          </button>
        </div>
      </div>
      <div className="h-2 bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-300" />
    </section>
  );
}
