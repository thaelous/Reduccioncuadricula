import React from 'react';
import { GridCell, GridConfig } from '../types';

interface ReduccionBoardProps {
  cells: GridCell[];
  gridConfig: GridConfig;
  eliminatedIds: Set<number>;
  selectedIds: number[];
  onCellClick: (cell: GridCell) => void;
  selectionErrorMsg?: string | null;
  onClearSelection?: () => void;
}

export const ReduccionBoard: React.FC<ReduccionBoardProps> = ({
  cells,
  gridConfig,
  eliminatedIds,
  selectedIds,
  onCellClick,
  selectionErrorMsg,
  onClearSelection,
}) => {
  const { rows, cols } = gridConfig;

  // Responsive font size
  const getFontSize = () => {
    if (rows <= 3) return 'text-3xl sm:text-4xl';
    if (rows <= 4) return 'text-2xl sm:text-3xl';
    if (rows <= 5) return 'text-xl sm:text-2xl';
    return 'text-lg sm:text-xl';
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center p-1.5 sm:p-3 overflow-hidden relative min-h-0">
      {/* Visual helper badge if feedback */}
      {selectionErrorMsg && (
        <div
          id="selection-feedback-msg"
          className="absolute top-1 z-20 px-3 py-1 bg-stone-900/95 border border-amber-500/60 text-amber-300 text-xs font-semibold rounded-full shadow-lg pointer-events-none"
        >
          {selectionErrorMsg}
        </div>
      )}

      {/* Board and quick action wrapper */}
      <div className="w-full max-w-[min(94vw,calc(100dvh-190px))] flex flex-col items-center gap-1.5">
        {onClearSelection && (
          <div className="w-full flex items-center justify-between px-1 text-[11px] text-stone-400">
            <span>
              {selectedIds.length > 0
                ? `Seleccionadas: ${selectedIds.length}`
                : 'Toca 0, 9 o agrupa casillas'}
            </span>
            {selectedIds.length > 0 && (
              <button
                id="btn-clear-selection"
                onClick={onClearSelection}
                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold border border-stone-700 cursor-pointer"
              >
                Limpiar selección
              </button>
            )}
          </div>
        )}

        <div
          id="board-reduccion"
          className="w-full aspect-square p-2 sm:p-3 rounded-2xl border border-stone-800 shadow-2xl flex items-center justify-center"
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
            const isEliminated = eliminatedIds.has(cell.id);
            const isSelected = selectedIds.includes(cell.id);

            return (
              <button
                key={cell.id}
                id={`cell-red-${cell.id}`}
                disabled={isEliminated}
                onClick={() => onCellClick(cell)}
                className={`relative rounded-xl flex items-center justify-center font-bold transition-colors border ${
                  isEliminated
                    ? 'bg-stone-900/60 text-stone-600 border-stone-800/40 cursor-not-allowed diagonal-strike'
                    : isSelected
                    ? 'bg-cyan-950/90 text-cyan-200 border-cyan-400 shadow-md ring-2 ring-cyan-400/40 cursor-pointer'
                    : 'bg-stone-800/90 hover:bg-stone-700/80 text-white border-stone-700/80 cursor-pointer'
                }`}
                style={{
                  backgroundColor: isEliminated
                    ? '#171412'
                    : isSelected
                    ? '#082f49'
                    : '#292524',
                }}
              >
                {/* Selection order tag */}
                {isSelected && (
                  <span className="absolute top-1 left-1 text-[10px] font-mono text-cyan-400 leading-none">
                    ●
                  </span>
                )}

                {/* Big number */}
                <span
                  className={`${getFontSize()} select-none font-mono tracking-tighter ${
                    isEliminated ? 'opacity-30' : ''
                  }`}
                >
                  {cell.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </div>
  );
};
