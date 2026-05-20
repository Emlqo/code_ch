import type { Direction, GameStatus } from '../types/game';
import { directionArrow, directionLabel } from '../utils/direction';

interface VirtualDPadProps {
  onDirectionInput: (direction: Direction) => void;
  status: GameStatus;
}

interface DPadButtonProps {
  direction: Direction;
  className: string;
  disabled: boolean;
  onDirectionInput: (direction: Direction) => void;
}

function DPadButton({ direction, className, disabled, onDirectionInput }: DPadButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onDirectionInput(direction)}
      disabled={disabled}
      aria-label={`${directionLabel[direction]} 방향 입력`}
      className={[
        'flex h-20 w-20 items-center justify-center rounded-xl border-2 border-slate-800 bg-white text-4xl font-black text-slate-900 shadow-[0_6px_0_rgba(15,23,42,0.16)] transition',
        'hover:-translate-y-0.5 hover:bg-sky-50 active:translate-y-1 active:scale-95 active:shadow-[0_2px_0_rgba(15,23,42,0.18)]',
        'focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 disabled:active:scale-100',
        'lg:h-16 lg:w-16 lg:text-3xl',
        className,
      ].join(' ')}
    >
      {directionArrow[direction]}
    </button>
  );
}

export function VirtualDPad({ onDirectionInput, status }: VirtualDPadProps) {
  const disabled = status === 'success' || status === 'failed';

  return (
    <section className="pixel-card p-4 sm:p-5 lg:p-4">
      <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-between">
        <div className="w-full text-left lg:w-auto">
          <h2 className="text-lg font-black text-slate-950">가상 방향키</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">모바일에서도 키보드 없이 모든 스테이지를 플레이할 수 있어요.</p>
        </div>

        <div className="grid grid-cols-3 grid-rows-3 gap-3 sm:gap-4 lg:gap-3" aria-label="가상 방향키">
          <DPadButton direction="up" className="col-start-2 row-start-1" disabled={disabled} onDirectionInput={onDirectionInput} />
          <DPadButton direction="left" className="col-start-1 row-start-2" disabled={disabled} onDirectionInput={onDirectionInput} />
          <div className="col-start-2 row-start-2 flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 lg:h-16 lg:w-16">
            <span className="h-3 w-3 rounded-full bg-slate-300" aria-hidden="true" />
          </div>
          <DPadButton direction="right" className="col-start-3 row-start-2" disabled={disabled} onDirectionInput={onDirectionInput} />
          <DPadButton direction="down" className="col-start-2 row-start-3" disabled={disabled} onDirectionInput={onDirectionInput} />
        </div>
      </div>
    </section>
  );
}
