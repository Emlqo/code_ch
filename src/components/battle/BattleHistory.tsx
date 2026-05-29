import { useEffect, useMemo, useState } from 'react';
import type { BattleRoomHistory } from '../../types/battleRoom';
import type { ChallengeDifficulty } from '../../types/challenge';
import { battleRoomService } from '../../services/battleRoom/battleRoomService';

interface BattleHistoryProps {
  onBack: () => void;
}

const difficultyLabels: Record<ChallengeDifficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
  mixed: '섞어서',
};

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}분`;
}

function formatDate(value?: string): string {
  if (!value) {
    return '기록 없음';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '기록 없음';
  }

  return date.toLocaleString();
}

export function BattleHistory({ onBack }: BattleHistoryProps) {
  const [history, setHistory] = useState<BattleRoomHistory[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      const records = await battleRoomService.getRoomHistory();

      if (!isMounted) {
        return;
      }

      setHistory(records);
      setSelectedRoomId(records[0]?.roomId ?? null);
      setIsLoading(false);
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedHistory = useMemo(
    () =>
      [...history].sort((a, b) => {
        const aTime = new Date(a.endedAt ?? a.startedAt ?? a.createdAt).getTime();
        const bTime = new Date(b.endedAt ?? b.startedAt ?? b.createdAt).getTime();
        return bTime - aTime;
      }),
    [history],
  );
  const selectedHistory = sortedHistory.find((record) => record.roomId === selectedRoomId) ?? sortedHistory[0];

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <section className="pixel-card-strong mx-auto grid w-full max-w-6xl gap-5 overflow-hidden">
        <div className="grid gap-5 p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Battle History</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">지난 코드런 배틀 기록</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                종료된 코드런 배틀 결과와 최종 랭킹을 다시 확인할 수 있습니다.
              </p>
            </div>
            <button type="button" onClick={onBack} className="pixel-button w-fit">
              돌아가기
            </button>
          </div>

          {isLoading ? (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm font-bold text-slate-500">
              기록을 불러오는 중입니다.
            </p>
          ) : null}

          {!isLoading && sortedHistory.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm font-bold text-slate-500">
              아직 저장된 배틀 기록이 없습니다.
            </p>
          ) : null}

          {sortedHistory.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr] lg:items-start">
              <section className="grid gap-3">
                <h2 className="text-lg font-black text-slate-950">기록 목록</h2>
                {sortedHistory.map((record) => {
                  const selected = record.roomId === selectedHistory?.roomId;

                  return (
                    <button
                      key={record.roomId}
                      type="button"
                      onClick={() => setSelectedRoomId(record.roomId)}
                      className={[
                        'rounded-xl border-2 p-4 text-left transition',
                        selected
                          ? 'border-sky-300 bg-sky-50 shadow-[0_5px_0_rgba(14,165,233,0.16)]'
                          : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-sky-700">방 코드</p>
                          <p className="font-mono text-2xl font-black tracking-[0.16em] text-slate-950">
                            {record.roomCode}
                          </p>
                        </div>
                        <span className="rounded-lg bg-white px-2 py-1 text-xs font-black text-slate-500">
                          {record.participants.length}명
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm font-bold text-slate-600">
                        <p>진행 날짜: {formatDate(record.endedAt ?? record.startedAt ?? record.createdAt)}</p>
                        <p>
                          {formatDuration(record.config.duration)} · {difficultyLabels[record.config.difficulty]}
                        </p>
                        <p>
                          1등: {record.winner?.nickname ?? '없음'} · {record.winner?.score ?? 0}점
                        </p>
                      </div>
                    </button>
                  );
                })}
              </section>

              <section className="grid gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">상세 보기</h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      방 코드 {selectedHistory?.roomCode ?? '-'} · {formatDate(selectedHistory?.endedAt)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">
                    1등 {selectedHistory?.winner?.nickname ?? '없음'} · {selectedHistory?.winner?.score ?? 0}점
                  </div>
                </div>

                {selectedHistory?.participants.length ? (
                  <div className="grid gap-2">
                    {selectedHistory.participants.map((entry) => (
                      <div
                        key={entry.participantId}
                        className="grid gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 sm:grid-cols-[72px_1fr_repeat(4,minmax(88px,auto))] sm:items-center"
                      >
                        <div className="text-2xl font-black text-slate-950">{entry.rank}위</div>
                        <div>
                          <p className="font-black text-slate-950">{entry.nickname}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {entry.finishedAt ? '완료' : '미완료'}
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-bold text-slate-500">
                    이 배틀에는 최종 랭킹 기록이 없습니다.
                  </p>
                )}
              </section>
            </div>
          ) : null}
        </div>
        <div className="h-2 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300" />
      </section>
    </main>
  );
}
