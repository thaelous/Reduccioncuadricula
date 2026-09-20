import React from 'react';
import { Timer, RotateCcw, Sparkles } from 'lucide-react';
import { GameMode } from '../types';

interface SubBarProps {
  mode: GameMode;
  elapsedSeconds: number;
  totalCells: number;
  activeCount: number; // marked in traditional, struck out in reduction
  selectedSum?: number; // current sum of selected cells in reduction mode
  selectedCount?: number;
  onResetAttempt: () => void;
  onNewGrid: () => void;
  isTimerRunning: boolean;
}

export const SubBar: React.FC<SubBarProps> = ({
  mode,
  elapsedSeconds,
  totalCells,
  activeCount,
  selectedSum = 0,
  selectedCount = 0,
  onResetAttempt,
  onNewGrid,
  isTimerRunning,
}) => {
  return (
    <div
      id="sub-bar"
      className="w-full bg-stone-900/80 border-b border-stone-800/80 px-2 sm:px-4 py-1.5 shrink-0 select-none z-20"
    >
      <div className="flex items-center justify-between gap-2 max-w-4xl mx-auto text-xs sm:text-sm">
        {/* Stopwatch display */}
        <div className="flex items-center gap-1.5 font-mono">
          <Timer className={`w-4 h-4 ${isTimerRunning ? 'text-amber-400' : 'text-stone-400'}`} />
          <span
            id="stopwatch-display"
            className={`font-bold ${isTimerRunning ? 'text-amber-300' : 'text-stone-300'}`}
          >
            {elapsedSeconds.toFixed(1)}s
          </span>
        </div>

        {/* Counter of cells status */}
        <div id="cells-counter" className="text-center font-medium text-stone-300 truncate">
          {mode === 'tradicional' ? (
            <span>
              Sumadas: <strong className="text-amber-400">{activeCount}</strong> / {totalCells}
            </span>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <span>
                Tachadas: <strong className="text-emerald-400">{activeCount}</strong> / {totalCells}
              </span>
              {selectedCount > 0 && (
                <span className="bg-blue-950/80 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800 text-[11px] sm:text-xs">
                  Suma: <strong className="text-amber-300">{selectedSum}</strong>/9 ({selectedCount} casillas)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Controls: Reset attempt / New grid */}
        <div className="flex items-center gap-1">
          <button
            id="btn-reset-attempt"
            onClick={onResetAttempt}
            className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs cursor-pointer border border-stone-700 transition-colors"
            title="Reiniciar este intento con los mismos números"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>

          <button
            id="btn-new-grid"
            onClick={onNewGrid}
            className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 hover:text-amber-200 text-xs font-medium cursor-pointer border border-stone-700 transition-colors"
            title="Generar nueva matriz con nuevos números"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Nueva</span>
          </button>
        </div>
      </div>
    </div>
  );
};
