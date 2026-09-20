import React from 'react';
import { HelpCircle, CheckCircle, Flame, RotateCcw, Sparkles } from 'lucide-react';
import { GameMode, ClassroomConfig, StudentProgress } from '../types';

interface StudentHeaderProps {
  currentMode: GameMode;
  onSelectMode?: (mode: GameMode) => void;
  config: ClassroomConfig;
  progress: StudentProgress;
  onOpenHelp: () => void;
  onResetRound: () => void;
  isTimerRunning: boolean;
  elapsedSeconds: number;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  currentMode,
  onSelectMode,
  config,
  progress,
  onOpenHelp,
  onResetRound,
  isTimerRunning,
  elapsedSeconds,
}) => {
  const isTrad = currentMode === 'tradicional';
  const showModeTabs = config.studentMode === 'libre' && onSelectMode;

  return (
    <header
      id="student-header"
      className="w-full bg-stone-900/95 border-b border-stone-800 px-2.5 sm:px-4 py-2 shrink-0 select-none z-30 min-h-[48px] backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 max-w-lg mx-auto w-full">
        {/* Left: Mode Title or Switcher */}
        <div className="flex items-center gap-1.5 min-w-0">
          {showModeTabs ? (
            <div className="flex bg-stone-950 p-0.5 rounded-xl border border-stone-800">
              <button
                onClick={() => onSelectMode('reduccion')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  currentMode === 'reduccion'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Reducción
              </button>
              <button
                onClick={() => onSelectMode('tradicional')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  currentMode === 'tradicional'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Tradicional
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  isTrad
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                {isTrad ? 'Modo Tradicional' : 'Modo Reducción (9s)'}
              </span>
            </div>
          )}
        </div>

        {/* Center: Round & Success Counter */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {config.roundsCount > 0 ? (
            <span className="bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800 text-stone-300">
              Ronda <strong className="text-amber-400">{progress.currentRound}</strong>/{config.roundsCount}
            </span>
          ) : (
            <span className="text-stone-400 font-sans text-[11px] hidden sm:inline">
              Práctica Libre
            </span>
          )}

          {progress.completedRounds > 0 && (
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{progress.correctCount}/{progress.completedRounds}</span>
            </span>
          )}
        </div>

        {/* Right: Reset and Quick Help Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onResetRound}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 cursor-pointer border border-stone-700"
            title="Reiniciar esta cuadrícula"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="btn-student-help"
            onClick={onOpenHelp}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 hover:text-amber-200 text-xs font-bold cursor-pointer border border-stone-700 transition-colors"
            title="Ver regla rápida del modo activo"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline">Regla</span>
          </button>
        </div>
      </div>
    </header>
  );
};
