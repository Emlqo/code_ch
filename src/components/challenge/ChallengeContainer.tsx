import { useState } from 'react';
import type { ChallengeResultData, ChallengeSetupConfig } from '../../types/challenge';
import {
  getChallengeRecords,
  isBetterChallengeResult,
  saveChallengeResult,
} from '../../utils/challengeStorage';
import { ChallengePlay } from './ChallengePlay';
import { ChallengeResult } from './ChallengeResult';
import { ChallengeSetup } from './ChallengeSetup';

interface ChallengeContainerProps {
  onExit: () => void;
}

interface SavedResultState {
  result: ChallengeResultData;
  isNewBestOverall: boolean;
  isNewBestByDifficulty: boolean;
}

type ChallengeScreen = 'setup' | 'play' | 'result';

export function ChallengeContainer({ onExit }: ChallengeContainerProps) {
  const [screen, setScreen] = useState<ChallengeScreen>('setup');
  const [setupConfig, setSetupConfig] = useState<ChallengeSetupConfig | null>(null);
  const [savedResult, setSavedResult] = useState<SavedResultState | null>(null);

  const handleStart = (config: ChallengeSetupConfig) => {
    setSetupConfig(config);
    setSavedResult(null);
    setScreen('play');
  };

  const handleFinish = (result: ChallengeResultData) => {
    const previousRecords = getChallengeRecords();
    const previousDifficultyBest = previousRecords.bestByDifficulty[result.difficulty] ?? null;
    const isNewBestOverall = isBetterChallengeResult(result, previousRecords.bestOverall);
    const isNewBestByDifficulty = isBetterChallengeResult(result, previousDifficultyBest);

    saveChallengeResult(result);
    setSavedResult({
      result,
      isNewBestOverall,
      isNewBestByDifficulty,
    });
    setScreen('result');
  };

  const handleRetry = () => {
    if (!setupConfig) {
      setScreen('setup');
      return;
    }

    setSavedResult(null);
    setScreen('play');
  };

  const handleBackToSetup = () => {
    setSavedResult(null);
    setScreen('setup');
  };

  if (screen === 'setup' || !setupConfig) {
    return <ChallengeSetup onStart={handleStart} onExit={onExit} />;
  }

  if (screen === 'play') {
    return <ChallengePlay config={setupConfig} onExit={onExit} onFinish={handleFinish} />;
  }

  if (savedResult) {
    return (
      <ChallengeResult
        result={savedResult.result}
        isNewBestOverall={savedResult.isNewBestOverall}
        isNewBestByDifficulty={savedResult.isNewBestByDifficulty}
        onRetry={handleRetry}
        onSetup={handleBackToSetup}
        onExit={onExit}
      />
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <section className="pixel-card mx-auto grid w-full max-w-3xl gap-4 p-6">
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Code Run Result</p>
        <h1 className="text-3xl font-black text-slate-950">코드런 결과</h1>
        <p className="text-sm font-semibold leading-6 text-slate-600">아직 표시할 코드런 결과가 없습니다.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleBackToSetup} className="pixel-button">
            설정으로 돌아가기
          </button>
          <button type="button" onClick={onExit} className="pixel-button">
            스테이지 선택으로 돌아가기
          </button>
        </div>
      </section>
    </main>
  );
}
