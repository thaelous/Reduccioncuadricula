import React from 'react';
import { GridCell, GridConfig } from '../types';
import { Check } from 'lucide-react';

interface TradicionalBoardProps {
  cells: GridCell[];
  gridConfig: GridConfig;
  markedIds: Set<number>;
  onToggleCell: (id: number) => void;
}

export const TradicionalBoard: React.FC<TradicionalBoardProps> = ({
  cells,
  gridConfig,
  markedIds,
  onToggleCell,
}) => {
  const { rows, cols } = gridConfig;

  // Responsive font size based on dimension
  const getFontSize = () => {
    if (rows <= 3) return 'text-3xl sm:text-4xl';
    if (rows <= 4) return 'text-2xl sm:text-3xl';
    if (rows <= 5) return 'text-xl sm:text-2xl';
    return 'text-lg sm:text-xl';
  };

  return (
    <div className="flex-1 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Board container with dark theme #1c1917 */}
      <div
        id="board-tradicional"
        className="w-full max-w-[min(92vw,calc(100dvh-190px))] aspect-square p-2 sm:p-3 rounded-2xl border border-stone-800 shadow-2xl flex items-center justify-center"
        style={{ backgroundColor: '#1c1917' }}
      >
        <div
          className="w-full h-full grid gap-1.5 sm:gap-2"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((cell) => {
            const isMarked = markedIds.has(cell.id);

            return (
              <button
                key={cell.id}
                id={`cell-trad-${cell.id}`}
                onClick={() => onToggleCell(cell.id)}
                className={`relative rounded-xl flex items-center justify-center font-bold transition-colors cursor-pointer border ${
                  isMarked
                    ? 'border-amber-300 shadow-sm'
                    : 'hover:bg-stone-700/80 border-stone-700/80'
                }`}
                style={{
                  backgroundColor: isMarked ? '#eab308' : '#292524',
                  color: isMarked ? '#0c0a09' : '#ffffff',
                }}
              >
                {/* Small checkmark in corner when marked */}
                {isMarked && (
                  <span
                    id={`check-icon-${cell.id}`}
                    className="absolute top-1 right-1 bg-stone-950 text-amber-400 rounded-full p-0.5"
                  >
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                  </span>
                )}

                {/* Big number */}
                <span className={`${getFontSize()} select-none font-mono tracking-tighter`}>
                  {cell.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
