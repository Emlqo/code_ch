import type { BattleRoomService } from '../../types/battleRoom';
import { getFirebaseApp, isFirebaseConfigured } from '../firebase/firebaseClient';
import { firebaseBattleRoomService } from './firebaseBattleRoomService';
import { localBattleRoomService } from './localBattleRoomService';

type BattleRoomServiceMode = 'firebase' | 'local mock';

function logServiceMode(mode: BattleRoomServiceMode): void {
  if (import.meta.env.DEV) {
    console.info(`[BattleRoomService] using ${mode}`);
  }
}

function wantsFirebase(): boolean {
  return import.meta.env.VITE_USE_FIREBASE === 'true' && isFirebaseConfigured();
}

export function createBattleRoomService(): BattleRoomService {
  if (!wantsFirebase()) {
    logServiceMode('local mock');
    return localBattleRoomService;
  }

  try {
    const app = getFirebaseApp();

    if (app) {
      logServiceMode('firebase');
      return firebaseBattleRoomService;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[BattleRoomService] Firebase initialization failed. Falling back to local mock.', error);
    }
  }

  logServiceMode('local mock');
  return localBattleRoomService;
}
