import { useEffect, useState } from 'react';
import type { BattleParticipant, BattleRoom, BattleRoomRole } from '../../types/battleRoom';
import { battleRoomService } from '../../services/battleRoom/battleRoomService';
import { BattleCodeRunPlay } from './BattleCodeRunPlay';
import { BattleHistory } from './BattleHistory';
import { BattleLobby } from './BattleLobby';
import { BattleRanking } from './BattleRanking';
import { StudentJoinRoom } from './StudentJoinRoom';
import { TeacherCreateRoom } from './TeacherCreateRoom';

interface BattleRoomContainerProps {
  onExit: () => void;
  mode?: 'student' | 'admin';
}

type BattleRoomScreen = 'selectRole' | 'teacherCreate' | 'studentJoin' | 'lobby' | 'play' | 'ranking' | 'history';

function PlaceholderScreen({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <section className="pixel-card mx-auto grid w-full max-w-4xl gap-4 p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Code Run Battle</p>
        <h1 className="text-3xl font-black text-slate-950">{title}</h1>
        <p className="text-sm font-semibold leading-6 text-slate-600">{description}</p>
        <button type="button" onClick={onBack} className="pixel-button w-fit">
          돌아가기
        </button>
      </section>
    </main>
  );
}

function getRoomRemainingMilliseconds(room: BattleRoom): number | null {
  if (!room.startedAt) {
    return null;
  }

  const startedAtMs = new Date(room.startedAt).getTime();

  if (Number.isNaN(startedAtMs)) {
    return null;
  }

  const finishAtMs = startedAtMs + room.config.duration * 1000;
  return Math.max(0, finishAtMs - Date.now());
}

export function BattleRoomContainer({ onExit, mode = 'student' }: BattleRoomContainerProps) {
  const [screen, setScreen] = useState<BattleRoomScreen>('selectRole');
  const [role, setRole] = useState<BattleRoomRole | null>(null);
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [participant, setParticipant] = useState<BattleParticipant | null>(null);
  const [participants, setParticipants] = useState<BattleParticipant[]>([]);
  const isAdminMode = mode === 'admin';

  useEffect(() => {
    if (!room?.id || !['lobby', 'play', 'ranking'].includes(screen)) {
      return undefined;
    }

    const unsubscribeRoom = battleRoomService.subscribeRoom(room.id, (updatedRoom) => {
      if (!updatedRoom) {
        setRoom(null);
        setScreen('selectRole');
        return;
      }

      setRoom(updatedRoom);

      if (updatedRoom.status === 'playing' && screen === 'lobby') {
        setScreen('play');
      }

      if (updatedRoom.status === 'finished') {
        setScreen('ranking');
      }
    });

    const unsubscribeParticipants = battleRoomService.subscribeParticipants(room.id, (updatedParticipants) => {
      setParticipants(updatedParticipants);

      if (participant?.id) {
        const updatedParticipant = updatedParticipants.find((candidate) => candidate.id === participant.id);
        setParticipant((currentParticipant) => updatedParticipant ?? currentParticipant);
      }
    });

    return () => {
      unsubscribeRoom();
      unsubscribeParticipants();
    };
  }, [participant?.id, room?.id, screen]);

  useEffect(() => {
    if (!room || room.status !== 'playing') {
      return undefined;
    }

    const remainingMilliseconds = getRoomRemainingMilliseconds(room);

    if (remainingMilliseconds === null) {
      return undefined;
    }

    if (remainingMilliseconds <= 0) {
      void battleRoomService.finishRoom(room.id);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void battleRoomService.finishRoom(room.id);
    }, remainingMilliseconds);

    return () => window.clearTimeout(timeoutId);
  }, [room]);

  const resetToRoleSelect = () => {
    setRole(null);
    setRoom(null);
    setParticipant(null);
    setParticipants([]);
    setScreen('selectRole');
  };

  const handleLeaveRoom = async () => {
    if (room && participant) {
      await battleRoomService.leaveRoom(room.id, participant.id);
    }

    resetToRoleSelect();
  };

  const handleBattlePlayFinish = () => {
    setScreen('ranking');
  };

  const handleTeacherRoomCreated = (createdRoom: BattleRoom) => {
    setRole('teacher');
    setRoom(createdRoom);
    setParticipant(null);
    setParticipants([]);
    setScreen('lobby');
  };

  const handleStudentJoined = (joinedRoom: BattleRoom, joinedParticipant: BattleParticipant) => {
    setRole('student');
    setRoom(joinedRoom);
    setParticipant(joinedParticipant);
    setParticipants([joinedParticipant]);
    setScreen('lobby');
  };

  if (screen === 'teacherCreate') {
    if (!isAdminMode) {
      return (
        <PlaceholderScreen
          title="관리자 전용 기능"
          description="방 만들기는 관리자 페이지에서만 사용할 수 있습니다."
          onBack={resetToRoleSelect}
        />
      );
    }

    return (
      <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <TeacherCreateRoom onRoomCreated={handleTeacherRoomCreated} onBack={resetToRoleSelect} />
      </main>
    );
  }

  if (screen === 'studentJoin') {
    return (
      <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <StudentJoinRoom onJoined={handleStudentJoined} onBack={resetToRoleSelect} />
      </main>
    );
  }

  if (screen === 'lobby') {
    if (!room || !role) {
      return (
        <PlaceholderScreen
          title="배틀 대기실"
          description="방 정보를 찾을 수 없습니다. 처음 화면으로 돌아가 다시 시도해 주세요."
          onBack={resetToRoleSelect}
        />
      );
    }

    return (
      <BattleLobby
        room={room}
        role={role}
        participant={participant}
        participants={participants}
        onLeave={handleLeaveRoom}
      />
    );
  }

  if (screen === 'play') {
    if (role === 'teacher' && room) {
      return (
        <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
          <section className="pixel-card mx-auto grid w-full max-w-4xl gap-4 p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Teacher Control</p>
            <h1 className="text-3xl font-black text-slate-950">배틀 관리 화면</h1>
            <p className="text-sm font-semibold leading-6 text-slate-600">
              학생들이 코드런 배틀을 진행 중입니다. 교사는 실시간 랭킹을 확인하거나 대기실 정보를 다시 볼 수 있습니다.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setScreen('ranking')} className="pixel-button text-left">
                실시간 랭킹 보기
              </button>
              <button type="button" onClick={() => setScreen('lobby')} className="pixel-button text-left">
                대기실 정보 보기
              </button>
            </div>
          </section>
        </main>
      );
    }

    if (!room || role !== 'student' || !participant) {
      return (
        <PlaceholderScreen
          title="배틀 플레이"
          description="학생 참가자 정보가 없어 플레이 화면을 열 수 없습니다. 학생으로 입장해 주세요."
          onBack={resetToRoleSelect}
        />
      );
    }

    return <BattleCodeRunPlay room={room} participant={participant} onFinish={handleBattlePlayFinish} />;
  }

  if (screen === 'ranking') {
    if (!room || !role) {
      return (
        <PlaceholderScreen
          title="배틀 랭킹"
          description="방 정보를 찾을 수 없습니다. 처음 화면으로 돌아가 다시 시도해 주세요."
          onBack={resetToRoleSelect}
        />
      );
    }

    return (
      <BattleRanking
        room={room}
        role={role}
        participant={participant}
        participants={participants}
        onBackToLobby={() => setScreen('lobby')}
        onExit={handleLeaveRoom}
      />
    );
  }

  if (screen === 'history') {
    if (!isAdminMode) {
      return (
        <PlaceholderScreen
          title="관리자 전용 기능"
          description="지난 배틀 기록은 관리자 페이지에서만 확인할 수 있습니다."
          onBack={resetToRoleSelect}
        />
      );
    }

    return <BattleHistory onBack={resetToRoleSelect} />;
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <section className="pixel-card-strong mx-auto grid w-full max-w-5xl gap-5 overflow-hidden">
        <div className="grid gap-4 p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Code Run Battle Room</p>
          <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">코드런 배틀룸</h1>
          <p className="max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            {isAdminMode
              ? '관리자는 배틀룸을 만들고 지난 배틀 기록을 확인할 수 있습니다.'
              : '학생은 선생님이 알려준 입장 코드로 코드런 배틀룸에 참여할 수 있습니다.'}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {isAdminMode ? (
              <button type="button" onClick={() => setScreen('teacherCreate')} className="pixel-button text-left">
                교사용 방 만들기
              </button>
            ) : null}
            <button type="button" onClick={() => setScreen('studentJoin')} className="pixel-button text-left">
              학생 입장 코드 입력
            </button>
            {isAdminMode ? (
              <button type="button" onClick={() => setScreen('history')} className="pixel-button text-left">
                지난 배틀 기록
              </button>
            ) : null}
            <button type="button" onClick={onExit} className="pixel-button text-left">
              돌아가기
            </button>
          </div>
        </div>
        <div className="h-2 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300" />
      </section>
    </main>
  );
}
