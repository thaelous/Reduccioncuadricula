import React from 'react';
import { GameMode, GridConfig } from '../types';
import { HelpCircle, Grid, Sparkles, Trophy, Tv, Users } from 'lucide-react';

interface TopNavProps {
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  gridConfig: GridConfig;
  onOpenDimensions: () => void;
  onOpenTutorial: () => void;
  onOpenSplash: () => void;
  onOpenTeacherDashboard?: () => void;
  onOpenProjector?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentMode,
  onSelectMode,
  gridConfig,
  onOpenDimensions,
  onOpenTutorial,
  onOpenSplash,
  onOpenTeacherDashboard,
  onOpenProjector,
}) => {
  return (
    <header
      id="top-nav"
      className="w-full bg-stone-900 border-b border-stone-800 px-1.5 sm:px-4 py-1.5 sm:py-2 shrink-0 select-none z-30 min-h-[44px]"
    >
      <div className="flex items-center justify-between gap-1 sm:gap-2 max-w-4xl mx-auto w-full">
        {/* Left tools: Teacher & Proyector quick buttons */}
        <div className="flex items-center gap-1">
          {onOpenTeacherDashboard && (
            <button
              id="btn-nav-teacher"
              onClick={onOpenTeacherDashboard}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold cursor-pointer border border-amber-500/30 shrink-0"
              title="Abrir Sala Multijugador y QR"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Multijugador</span>
            </button>
          )}

          {onOpenProjector && (
            <button
              id="btn-nav-projector"
              onClick={onOpenProjector}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer border border-stone-700 shrink-0"
              title="Modo Proyector de Aula"
            >
              <Tv className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden md:inline">Proyector</span>
            </button>
          )}

          <button
            id="btn-nav-splash"
            onClick={onOpenSplash}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700/80 text-stone-300 text-xs font-semibold cursor-pointer border border-stone-700/50 shrink-0"
            title="Ver portada de bienvenida"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Inicio</span>
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <nav id="mode-tabs" className="flex items-center bg-stone-950 p-0.5 sm:p-1 rounded-xl border border-stone-800 shrink-0">
          <button
            id="tab-tradicional"
            onClick={() => onSelectMode('tradicional')}
            className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-sm font-semibold transition-colors cursor-pointer ${
              currentMode === 'tradicional'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Tradicional
          </button>

          <button
            id="tab-reduccion"
            onClick={() => onSelectMode('reduccion')}
            className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-sm font-semibold transition-colors cursor-pointer ${
              currentMode === 'reduccion'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Reducción
          </button>

          <button
            id="tab-comparativa"
            onClick={() => onSelectMode('comparativa')}
            className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              currentMode === 'comparativa'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Trophy className="w-3 h-3 hidden sm:inline" />
            <span>Comparativa</span>
          </button>
        </nav>

        {/* Right action tools: Grid dimensions & Help */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            id="btn-grid-dimensions"
            onClick={onOpenDimensions}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer border border-stone-700"
            title="Cambiar dimensiones de la cuadrícula"
          >
            <Grid className="w-3.5 h-3.5 text-stone-400" />
            <span>{gridConfig.rows}×{gridConfig.cols}</span>
          </button>

          <button
            id="btn-help-tutorial"
            onClick={onOpenTutorial}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 text-xs cursor-pointer border border-stone-700"
            title="Tutorial y ayuda del modo activo"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

