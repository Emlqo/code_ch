import { useState } from 'react';
import { stages } from '../data/stages';
import type { AdminScreen, CodeDisplayMode } from '../types/admin';
import {
  getStageCodeDisplayModes,
  getSavedStageOrder,
  resetStageCodeDisplayModes,
  resetStageOrder,
  saveAllStageCodeDisplayModes,
  saveStageCodeDisplayMode,
  saveStageOrder,
} from '../utils/adminStorage';
import { applyStageOrder, getStageOrderIds, toStageOrderId } from '../utils/stageOrder';
import { getStageProgress, saveStageResult, type StageProgressMap } from '../utils/storage';
import { AdminLogin } from './admin/AdminLogin';
import { AdminPage } from './admin/AdminPage';
import { GameLayout } from './GameLayout';
import { StageSelect } from './StageSelect';

type Screen = 'stageSelect' | 'game' | AdminScreen;

export function GameContainer() {
  const [screen, setScreen] = useState<Screen>('stageSelect');
  const [stageOrderIds, setStageOrderIds] = useState<string[] | null>(() => getSavedStageOrder());
  const [codeDisplayModes, setCodeDisplayModes] = useState<Record<string, CodeDisplayMode>>(() =>
    getStageCodeDisplayModes(),
  );
  const orderedStages = applyStageOrder(stages, stageOrderIds);
  const [selectedStageId, setSelectedStageId] = useState(orderedStages[0]?.id ?? stages[0].id);
  const [progressByStageId, setProgressByStageId] = useState<StageProgressMap>(() => getStageProgress());

  const startStage = (stageId: number) => {
    setSelectedStageId(stageId);
    setScreen('game');
  };

  const handleStageClear = (stageId: number, stars: number, mistakes: number, bestCombo: number) => {
    const nextProgress = saveStageResult(stageId, {
      stars,
      bestMistakes: mistakes,
      bestCombo,
    });
    setProgressByStageId(nextProgress);
  };

  const moveStage = (stageIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? stageIndex - 1 : stageIndex + 1;

    if (targetIndex < 0 || targetIndex >= orderedStages.length) {
      return;
    }

    const nextStages = [...orderedStages];
    const currentStage = nextStages[stageIndex];
    nextStages[stageIndex] = nextStages[targetIndex];
    nextStages[targetIndex] = currentStage;

    const nextStageOrderIds = getStageOrderIds(nextStages);
    saveStageOrder(nextStageOrderIds);
    setStageOrderIds(nextStageOrderIds);
  };

  const resetSavedStageOrder = () => {
    resetStageOrder();
    setStageOrderIds(null);
  };

  const changeStageCodeDisplayMode = (stageId: string, mode: CodeDisplayMode) => {
    saveStageCodeDisplayMode(stageId, mode);
    setCodeDisplayModes((currentModes) => ({
      ...currentModes,
      [stageId]: mode,
    }));
  };

  const setAllStageCodeDisplayModes = (mode: CodeDisplayMode) => {
    const stageIds = getStageOrderIds(stages);
    saveAllStageCodeDisplayModes(stageIds, mode);
    setCodeDisplayModes(
      stageIds.reduce<Record<string, CodeDisplayMode>>((nextModes, stageId) => {
        nextModes[stageId] = mode;
        return nextModes;
      }, {}),
    );
  };

  const resetSavedStageCodeDisplayModes = () => {
    resetStageCodeDisplayModes();
    setCodeDisplayModes({});
  };

  if (screen === 'stageSelect') {
    return (
      <StageSelect
        stages={orderedStages}
        progressByStageId={progressByStageId}
        onSelectStage={startStage}
        onOpenAdminPage={() => setScreen('adminLogin')}
      />
    );
  }

  if (screen === 'adminLogin') {
    return <AdminLogin onLoginSuccess={() => setScreen('adminPage')} onBackHome={() => setScreen('stageSelect')} />;
  }

  if (screen === 'adminPage') {
    return (
      <AdminPage
        stages={orderedStages}
        codeDisplayModes={codeDisplayModes}
        onBackHome={() => setScreen('stageSelect')}
        onMoveStage={moveStage}
        onResetStageOrder={resetSavedStageOrder}
        onChangeStageCodeDisplayMode={changeStageCodeDisplayMode}
        onSetAllStageCodeDisplayModes={setAllStageCodeDisplayModes}
        onResetStageCodeDisplayModes={resetSavedStageCodeDisplayModes}
      />
    );
  }

  const selectedStageOrderId = toStageOrderId(selectedStageId);

  return (
    <GameLayout
      selectedStageId={selectedStageId}
      codeDisplayMode={codeDisplayModes[selectedStageOrderId] ?? 'pseudocode'}
      onBackToStageSelect={() => setScreen('stageSelect')}
      onSelectStage={setSelectedStageId}
      onStageClear={handleStageClear}
      stages={orderedStages}
    />
  );
}
