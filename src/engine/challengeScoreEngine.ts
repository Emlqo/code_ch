import type { ChallengeGrade, ChallengeProblem } from '../types/challenge';

const correctInputScore = 50;
const comboStep = 5;
const comboStepBonus = 100;
const wrongInputPenalty = -100;
const sequenceClearBonus = 200;
const forClearBonus = 400;

/** Keeps challenge scores from going below zero. */
export function clampScore(score: number): number {
  return Math.max(0, score);
}

/** Calculates score for one correct direction input. */
export function calculateCorrectInputScore(combo: number): number {
  const comboBonus = combo > 0 && combo % comboStep === 0 ? comboStepBonus : 0;
  return correctInputScore + comboBonus;
}

/** Calculates penalty for one wrong direction input. */
export function calculateWrongInputPenalty(): number {
  return wrongInputPenalty;
}

/** Calculates clear bonus for a completed challenge problem. */
export function calculateProblemClearBonus(problem: ChallengeProblem, elapsedSeconds: number): number {
  const baseBonus = problem.type === 'for' ? forClearBonus : sequenceClearBonus;
  const fastClearBonus = (() => {
    if (elapsedSeconds <= 5) {
      return 300;
    }

    if (elapsedSeconds <= 10) {
      return 150;
    }

    if (elapsedSeconds <= 15) {
      return 50;
    }

    return 0;
  })();

  return baseBonus + fastClearBonus;
}

/** Calculates input accuracy as a percentage from 0 to 100. */
export function calculateAccuracy(correctInputs: number, wrongInputs: number): number {
  const totalInputs = correctInputs + wrongInputs;

  if (totalInputs <= 0) {
    return 0;
  }

  return Math.round((correctInputs / totalInputs) * 100);
}

/** Calculates the final challenge grade from score. */
export function calculateGrade(score: number): ChallengeGrade {
  if (score >= 5000) {
    return 'S';
  }

  if (score >= 4000) {
    return 'A';
  }

  if (score >= 3000) {
    return 'B';
  }

  if (score >= 2000) {
    return 'C';
  }

  return 'D';
}
