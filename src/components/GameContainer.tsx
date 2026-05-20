import { useState } from 'react';
import { stages } from '../data/stages';
import { getStageProgress, saveStageResult, type StageProgressMap } from '../utils/storage';
import { GameLayout } from './GameLayout';
import { StageSelect } from './StageSelect';

type Screen = 'stageSelect' | 'game';

export function GameContainer() {
  const [screen, setScreen] = useState<Screen>('stageSelect');
  const [selectedStageId, setSelectedStageId] = useState(stages[0].id);
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

  if (screen === 'stageSelect') {
    return <StageSelect stages={stages} progressByStageId={progressByStageId} onSelectStage={startStage} />;
  }

  return (
    <GameLayout
      selectedStageId={selectedStageId}
      onBackToStageSelect={() => setScreen('stageSelect')}
      onSelectStage={setSelectedStageId}
      onStageClear={handleStageClear}
    />
  );
}
