import { useMemo, useState } from 'react';
import { formatCodeForDisplay } from '../../engine/codeFormatter';
import type { CodeDisplayMode } from '../../types/admin';
import type { Stage } from '../../types/game';
import { toStageOrderId } from '../../utils/stageOrder';
import { StageCodeDisplayManager } from './StageCodeDisplayManager';
import { StageOrderManager } from './StageOrderManager';

interface AdminPageProps {
  stages: Stage[];
  codeDisplayModes: Record<string, CodeDisplayMode>;
  onBackHome: () => void;
  onMoveStage: (stageIndex: number, direction: 'up' | 'down') => void;
  onResetStageOrder: () => void;
  onChangeStageCodeDisplayMode: (stageId: string, mode: CodeDisplayMode) => void;
  onSetAllStageCodeDisplayModes: (mode: CodeDisplayMode) => void;
  onResetStageCodeDisplayModes: () => void;
}

const modeLabels: Record<CodeDisplayMode, string> = {
  pseudocode: '의사코드',
  cStyle: 'C언어 느낌 코드',
};

function confirmAction(message: string): boolean {
  return typeof window === 'undefined' ? true : window.confirm(message);
}

export function AdminPage({
  stages,
  codeDisplayModes,
  onBackHome,
  onMoveStage,
  onResetStageOrder,
  onChangeStageCodeDisplayMode,
  onSetAllStageCodeDisplayModes,
  onResetStageCodeDisplayModes,
}: AdminPageProps) {
  const [selectedStageId, setSelectedStageId] = useState(stages[0]?.id ?? 0);
  const [statusMessage, setStatusMessage] = useState('설정을 변경하면 이곳에 저장 상태가 표시됩니다.');
  const selectedStage = stages.find((stage) => stage.id === selectedStageId) ?? stages[0];
  const selectedStageOrderId = selectedStage ? toStageOrderId(selectedStage.id) : '';
  const selectedCodeDisplayMode = codeDisplayModes[selectedStageOrderId] ?? 'pseudocode';
  const previewLines = useMemo(
    () => (selectedStage ? formatCodeForDisplay(selectedStage.code, selectedCodeDisplayMode) : []),
    [selectedCodeDisplayMode, selectedStage],
  );

  const handleMoveStage = (stageIndex: number, direction: 'up' | 'down') => {
    onMoveStage(stageIndex, direction);
    setStatusMessage('스테이지 순서가 저장되었습니다.');
  };

  const handleResetStageOrder = () => {
    if (!confirmAction('스테이지 순서를 기본값으로 초기화할까요?')) {
      return;
    }

    onResetStageOrder();
    setStatusMessage('스테이지 순서가 기본값으로 초기화되었습니다.');
  };

  const handleChangeStageCodeDisplayMode = (stageId: string, mode: CodeDisplayMode) => {
    onChangeStageCodeDisplayMode(stageId, mode);
    setStatusMessage('코드 표시 방식이 저장되었습니다.');
  };

  const handleSetAllStageCodeDisplayModes = (mode: CodeDisplayMode) => {
    if (!confirmAction(`모든 스테이지를 ${modeLabels[mode]}로 설정할까요?`)) {
      return;
    }

    onSetAllStageCodeDisplayModes(mode);
    setStatusMessage(`모든 스테이지가 ${modeLabels[mode]}로 설정되었습니다.`);
  };

  const handleResetStageCodeDisplayModes = () => {
    if (!confirmAction('코드 표시 방식 설정을 모두 초기화할까요?')) {
      return;
    }

    onResetStageCodeDisplayModes();
    setStatusMessage('코드 표시 방식 설정이 초기화되었습니다.');
  };

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="pixel-card-strong overflow-hidden">
          <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Admin</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">관리자 페이지</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                스테이지 순서와 코드 표시 방식을 조정하고, 선택한 스테이지의 코드 미리보기를 확인합니다.
              </p>
            </div>
            <button type="button" onClick={onBackHome} className="pixel-button w-fit">
              홈으로 돌아가기
            </button>
          </div>
          <div className="h-2 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300" />
        </header>

        <section className="pixel-card grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Guide</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">관리자 안내</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              목록에서 스테이지를 선택하면 아래 미리보기가 함께 바뀝니다. 변경 내용은 localStorage에 저장되어
              스테이지 선택 화면과 게임 화면에 반영됩니다.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
            {statusMessage}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] xl:items-start">
          <div className="grid min-w-0 gap-5">
            <StageOrderManager
              stages={stages}
              selectedStageId={selectedStage?.id}
              onSelectStage={setSelectedStageId}
              onMoveStage={handleMoveStage}
              onResetOrder={handleResetStageOrder}
            />
            <StageCodeDisplayManager
              stages={stages}
              codeDisplayModes={codeDisplayModes}
              selectedStageId={selectedStage?.id}
              onSelectStage={setSelectedStageId}
              onChangeStageMode={handleChangeStageCodeDisplayMode}
              onSetAllModes={handleSetAllStageCodeDisplayModes}
              onResetModes={handleResetStageCodeDisplayModes}
            />
          </div>

          <section className="pixel-card sticky top-4 overflow-hidden">
            <div className="border-b border-slate-100 bg-white px-5 py-4">
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Code Preview</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">선택한 스테이지 코드 미리보기</h2>
              {selectedStage ? (
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Stage {selectedStage.id} · {selectedStage.title} · {modeLabels[selectedCodeDisplayMode]}
                </p>
              ) : null}
            </div>

            <div className="p-4 sm:p-5">
              {selectedStage ? (
                <>
                  <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600">
                    <span>챕터: {selectedStage.chapter}</span>
                    <span>학습 개념: {selectedStage.concept}</span>
                    <span>완성 그림: {selectedStage.targetImageName}</span>
                  </div>
                  <div className="max-h-[62vh] overflow-y-auto rounded-xl border-2 border-slate-900 bg-slate-950 font-mono text-xs text-slate-100 sm:text-sm">
                    {previewLines.map((line, index) => (
                      <div
                        key={line.id}
                        className="grid grid-cols-[3rem_1fr] border-b border-slate-800 last:border-b-0"
                      >
                        <span className="flex items-center justify-end bg-slate-900 px-3 py-3 text-xs font-bold text-slate-400">
                          {index + 1}
                        </span>
                        <div className="min-w-0 px-3 py-3" style={{ paddingLeft: `${line.depth * 1.25 + 0.75}rem` }}>
                          <code className="block truncate font-black tracking-wide">{line.text}</code>
                          {line.description ? (
                            <p className="mt-1 font-sans text-xs font-semibold leading-5 text-slate-400">
                              {line.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  미리볼 스테이지가 없습니다.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
