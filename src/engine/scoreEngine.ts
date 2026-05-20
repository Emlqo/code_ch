export interface CalculateInputScoreInput {
  correct: boolean;
  combo: number;
}

export interface InputScoreResult {
  delta: number;
  comboBonus: number;
}

export interface CalculateFinalScoreInput {
  score: number;
  mistakes: number;
  maxMistakes: number;
  hintCount: number;
  hintPenaltyEnabled?: boolean;
}

export interface FinalScoreResult {
  finalScore: number;
  clearBonus: number;
  hintPenalty: number;
}

export interface CalculateStarsInput {
  success: boolean;
  mistakes: number;
  hintCount: number;
  hintPenaltyEnabled?: boolean;
}

export interface StarResult {
  stars: number;
  perfect: boolean;
}

const correctInputScore = 100;
const incorrectInputPenalty = -50;
const comboBonusStart = 3;
const comboBonusPerStep = 20;
const clearBonusPerRemainingMistake = 100;
const hintPenalty = 30;

export function calculateInputScore({ correct, combo }: CalculateInputScoreInput): InputScoreResult {
  if (!correct) {
    return {
      delta: incorrectInputPenalty,
      comboBonus: 0,
    };
  }

  const comboBonus = combo >= comboBonusStart ? (combo - comboBonusStart + 1) * comboBonusPerStep : 0;

  return {
    delta: correctInputScore + comboBonus,
    comboBonus,
  };
}

export function calculateFinalScore({
  score,
  mistakes,
  maxMistakes,
  hintCount,
  hintPenaltyEnabled = false,
}: CalculateFinalScoreInput): FinalScoreResult {
  const remainingMistakes = Math.max(maxMistakes - mistakes, 0);
  const clearBonus = remainingMistakes * clearBonusPerRemainingMistake;
  const appliedHintPenalty = hintPenaltyEnabled ? hintCount * hintPenalty : 0;

  return {
    finalScore: Math.max(score + clearBonus - appliedHintPenalty, 0),
    clearBonus,
    hintPenalty: appliedHintPenalty,
  };
}

export function calculateStars({ success, mistakes, hintCount, hintPenaltyEnabled = false }: CalculateStarsInput): StarResult {
  if (!success) {
    return {
      stars: 0,
      perfect: false,
    };
  }

  const baseStars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const stars = hintPenaltyEnabled && hintCount > 0 ? Math.min(baseStars, 2) : baseStars;

  return {
    stars,
    perfect: mistakes === 0 && hintCount === 0,
  };
}
