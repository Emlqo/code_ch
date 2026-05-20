import { useEffect } from 'react';
import { normalizeKeyToDirection } from '../engine/inputEngine';
import type { Direction } from '../types/game';

interface UseKeyboardInputOptions {
  disabled?: boolean;
  onDirectionInput: (direction: Direction) => void;
}

export function useKeyboardInput({ disabled = false, onDirectionInput }: UseKeyboardInputOptions): void {
  useEffect(() => {
    if (disabled) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = normalizeKeyToDirection(event.key);

      if (!direction) {
        return;
      }

      event.preventDefault();
      onDirectionInput(direction);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onDirectionInput]);
}
