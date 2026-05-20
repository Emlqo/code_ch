import type { Direction } from '../types/game';
import { directionArrow, directionLabel } from '../utils/direction';

interface ControlGuideProps {
  onDirectionClick: (direction: Direction) => void;
  isDisabled?: boolean;
}

const directions: Direction[] = ['up', 'left', 'down', 'right'];

export function ControlGuide({ onDirectionClick, isDisabled = false }: ControlGuideProps) {
  return (
    <section className="pixel-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">조작 안내</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">키보드 방향키, WASD, 아래 버튼을 모두 사용할 수 있어요.</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {directions.map((direction) => (
            <button
              key={direction}
              type="button"
              onClick={() => onDirectionClick(direction)}
              disabled={isDisabled}
              className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-slate-800 bg-white text-xl font-black text-slate-800 shadow-[0_4px_0_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-sky-50 active:translate-y-1 active:shadow-[0_1px_0_rgba(15,23,42,0.18)] focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label={`${directionLabel[direction]}으로 이동`}
              title={`${directionLabel[direction]}으로 이동`}
            >
              {directionArrow[direction]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
