import React, { useState } from 'react';
import {
  Tv,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Eye,
  EyeOff,
  QrCode,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { GridCell, GridConfig } from '../types';
import { calculateDigitalRoot, getDigitalRootSteps } from '../utils/mathUtils';

interface ProjectorViewProps {
  cells: GridCell[];
  gridConfig: GridConfig;
  activeMode: 'tradicional' | 'reduccion';
  onToggleMode: (mode: 'tradicional' | 'reduccion') => void;
  onNewGrid: () => void;
  onExitProjector: () => void;
  qrDataUrl?: string;
  onOpenQrModal?: () => void;
}

export const ProjectorView: React.FC<ProjectorViewProps> = ({
  cells,
  gridConfig,
  activeMode,
  onToggleMode,
  onNewGrid,
  onExitProjector,
  qrDataUrl,
  onOpenQrModal,
}) => {
  const { rows, cols } = gridConfig;

  // Local interactive state on projector
  const [markedIds, setMarkedIds] = useState<Set<number>>(new Set());
  const [eliminatedIds, setEliminatedIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalSum = cells.reduce((acc, c) => acc + c.value, 0);
  const correctRoot = calculateDigitalRoot(totalSum);
  const { steps } = getDigitalRootSteps(totalSum);

  // Toggle fullscreen (exclusivo para clic directo del usuario)
  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Fullscreen error:', e);
    }
  };

  const handleCellClick = (cell: GridCell) => {
    if (activeMode === 'tradicional') {
      setMarkedIds((prev) => {
        const next = new Set(prev);
        if (next.has(cell.id)) next.delete(cell.id);
        else next.add(cell.id);
        return next;
      });
    } else {
      if (cell.value === 0 || cell.value === 9) {
        setEliminatedIds((prev) => new Set([...prev, cell.id]));
        setSelectedIds((prev) => prev.filter((id) => id !== cell.id));
        return;
      }

      if (selectedIds.includes(cell.id)) {
        setSelectedIds((prev) => prev.filter((id) => id !== cell.id));
        return;
      }

      const nextSelection = [...selectedIds, cell.id];
      const selectedCells = cells.filter((c) => nextSelection.includes(c.id));
      const currentSum = selectedCells.reduce((acc, c) => acc + c.value, 0);

      if (currentSum > 0 && currentSum % 9 === 0 && nextSelection.length >= 2) {
        setEliminatedIds((prev) => new Set([...prev, ...nextSelection]));
        setSelectedIds([]);
      } else {
        setSelectedIds(nextSelection);
      }
    }
  };

  const handleReset = () => {
    setMarkedIds(new Set());
    setEliminatedIds(new Set());
    setSelectedIds([]);
    setShowSolution(false);
  };

  // Font sizing for high-contrast projector display
  const getProjectorFontSize = () => {
    if (rows <= 3) return 'text-5xl sm:text-7xl md:text-8xl';
    if (rows <= 4) return 'text-4xl sm:text-6xl md:text-7xl';
    if (rows <= 5) return 'text-3xl sm:text-5xl md:text-6xl';
    return 'text-2xl sm:text-4xl md:text-5xl';
  };

  return (
    <div
      id="projector-view"
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-3 sm:p-6 select-none overflow-hidden"
    >
      {/* Top High-Contrast Control Bar */}
      <header className="flex items-center justify-between gap-3 border-b border-stone-800 pb-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <button
            id="btn-projector-exit"
            onClick={onExitProjector}
            className="flex items-center gap-2 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white rounded-xl border border-stone-700 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
            title="Volver al panel de control"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Panel Docente</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500 text-black font-extrabold text-xs">
              PROYECTOR
            </div>
            <span className="font-mono font-bold text-base sm:text-lg text-amber-400">
              {rows}×{cols}
            </span>
          </div>
        </div>

        {/* Mode switcher for teacher on projector */}
        <div className="flex items-center bg-stone-900 p-1 rounded-xl border border-stone-800">
          <button
            onClick={() => onToggleMode('reduccion')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
              activeMode === 'reduccion'
                ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Reducción (9s)
          </button>
          <button
            onClick={() => onToggleMode('tradicional')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
              activeMode === 'tradicional'
                ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Tradicional
          </button>
        </div>

        {/* Right tools: Reveal solution, QR code & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSolution(!showSolution)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm cursor-pointer border transition-colors ${
              showSolution
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-700'
            }`}
            title="Mostrar u ocultar la solución completa"
          >
            {showSolution ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden md:inline">
              {showSolution ? 'Ocultar Solución' : 'Revelar Solución'}
            </span>
          </button>

          {onOpenQrModal && (
            <button
              onClick={onOpenQrModal}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-700 cursor-pointer"
              title="Mostrar QR a los alumnos"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 cursor-pointer"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Giant High-Contrast Grid Display */}
      <main className="flex-1 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
        <div
          id="projector-board"
          className="w-full max-w-[min(94vw,calc(100dvh-170px))] aspect-square p-3 sm:p-5 rounded-3xl border-2 border-stone-700 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex items-center justify-center bg-stone-950"
        >
          <div
            className="w-full h-full grid gap-2 sm:gap-3"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {cells.map((cell) => {
              const isMarked = markedIds.has(cell.id);
              const isEliminated = eliminatedIds.has(cell.id);
              const isSelected = selectedIds.includes(cell.id);

              // If solution is revealed, highlight 0s/9s in light gray and pairs
              const isZeroOrNine = cell.value === 0 || cell.value === 9;

              let cellBg = '#1c1917'; // dark stone
              let cellColor = '#ffffff';
              let cellBorder = 'border-stone-700';

              if (activeMode === 'tradicional') {
                if (isMarked) {
                  cellBg = '#eab308'; // bright yellow
                  cellColor = '#0c0a09';
                  cellBorder = 'border-amber-300';
                }
              } else {
                if (isEliminated) {
                  cellBg = '#0c0a09';
                  cellColor = '#57534e';
                  cellBorder = 'border-stone-800';
                } else if (isSelected) {
                  cellBg = '#0369a1';
                  cellColor = '#f0f9ff';
                  cellBorder = 'border-sky-300 ring-4 ring-sky-400/40';
                } else if (showSolution && isZeroOrNine) {
                  cellBg = '#292524';
                  cellColor = '#a8a29e';
                  cellBorder = 'border-amber-400/40';
                }
              }

              return (
                <button
                  key={cell.id}
                  onClick={() => handleCellClick(cell)}
                  className={`relative rounded-2xl flex items-center justify-center font-bold transition-all cursor-pointer border-2 ${cellBorder} ${
                    isEliminated && activeMode === 'reduccion' ? 'diagonal-strike' : ''
                  }`}
                  style={{
                    backgroundColor: cellBg,
                    color: cellColor,
                  }}
                >
                  {isMarked && activeMode === 'tradicional' && (
                    <span className="absolute top-2 right-2 bg-stone-950 text-amber-400 rounded-full p-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}

                  {isSelected && (
                    <span className="absolute top-2 left-2 text-xs font-mono text-cyan-300">
                      ●
                    </span>
                  )}

                  <span
                    className={`${getProjectorFontSize()} font-mono font-extrabold tracking-tight select-none`}
                  >
                    {cell.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Bottom Information & Big Interactive Controls */}
      <footer className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-800 pt-2.5">
        {/* Solution Step Display when enabled */}
        {showSolution ? (
          <div className="flex items-center gap-3 bg-stone-900 border border-emerald-500/40 px-4 py-2 rounded-2xl">
            <span className="text-emerald-400 font-bold text-xs uppercase">Solución:</span>
            <span className="font-mono text-stone-200 text-sm">
              Suma Total = <strong>{totalSum}</strong>
            </span>
            <span className="text-stone-500">→</span>
            <span className="font-mono text-amber-300 font-extrabold text-base">
              {steps.length > 1 ? steps[steps.length - 1] : `Reducido = ${correctRoot}`}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
              Dígito = {correctRoot}
            </span>
          </div>
        ) : (
          <div className="text-stone-400 text-xs sm:text-sm">
            {activeMode === 'reduccion' ? (
              <span>
                Toca ceros, nueves o combinaciones para descartar. ¡Ideal para resolución grupal en la pizarra!
              </span>
            ) : (
              <span>
                Toca cada casilla para marcarla conforme sumas con la clase.
              </span>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl border border-stone-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar Pizarra</span>
          </button>

          <button
            id="btn-projector-new-grid"
            onClick={() => {
              handleReset();
              onNewGrid();
            }}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Nueva Cuadrícula</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
