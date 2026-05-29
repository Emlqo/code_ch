import type { ChallengeGrade, ChallengeResultData } from '../types/challenge';

export interface ParsedResultCode {
  nicknameCode: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  grade: ChallengeGrade;
}

const fallbackNicknameCode = 'PLAYER';
const validGrades: readonly ChallengeGrade[] = ['S', 'A', 'B', 'C', 'D'];

function createNicknameCode(nickname: string): string {
  const compactNickname = nickname.replace(/\s+/g, '').replace(/-/g, '').trim();

  if (compactNickname.length === 0) {
    return fallbackNicknameCode;
  }

  return compactNickname.slice(0, 5).toUpperCase();
}

function isChallengeGrade(value: string): value is ChallengeGrade {
  return validGrades.includes(value as ChallengeGrade);
}

export function createResultCode(result: ChallengeResultData): string {
  return [
    createNicknameCode(result.nickname),
    Math.max(0, Math.round(result.score)),
    Math.max(0, Math.min(100, Math.round(result.accuracy))),
    Math.max(0, Math.round(result.maxCombo)),
    result.grade,
  ].join('-');
}

export function parseResultCode(code: string): ParsedResultCode | null {
  const parts = code.trim().split('-');

  if (parts.length !== 5) {
    return null;
  }

  const [nicknameCode, rawScore, rawAccuracy, rawMaxCombo, rawGrade] = parts;
  const score = Number(rawScore);
  const accuracy = Number(rawAccuracy);
  const maxCombo = Number(rawMaxCombo);

  if (
    nicknameCode.length === 0 ||
    !Number.isFinite(score) ||
    !Number.isFinite(accuracy) ||
    !Number.isFinite(maxCombo) ||
    !isChallengeGrade(rawGrade)
  ) {
    return null;
  }

  return {
    nicknameCode,
    score,
    accuracy,
    maxCombo,
    grade: rawGrade,
  };
}
