import { createBattleRoomService } from './battleRoomServiceFactory';
import { firebaseBattleRoomService } from './firebaseBattleRoomService';
import { localBattleRoomService } from './localBattleRoomService';

// Default battle room service. Components import this single instance while the
// factory chooses Firebase or localStorage mock based on Vite env settings.
export const battleRoomService = createBattleRoomService();

export { firebaseBattleRoomService };
export { localBattleRoomService };
