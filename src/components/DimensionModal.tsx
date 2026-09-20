import React from 'react';
import { X, Grid, Check } from 'lucide-react';
import { GridConfig } from '../types';

interface DimensionModalProps {
  isOpen: boolean;
  currentConfig: GridConfig;
  onSelectDimension: (rows: number, cols: number) => void;
  onClose: () => void;
}

export const DimensionModal: React.FC<DimensionModalProps> = ({
  isOpen,
  currentConfig,
  onSelectDimension,
  onClose,
}) => {
  if (!isOpen) return null;

  const presets = [
    { rows: 3, cols: 3, label: '3 × 3', difficulty: 'Rápido', total: 9 },
    { rows: 4, cols: 4, label: '4 × 4', difficulty: 'Estándar', total: 16 },
    { rows: 5, cols: 5, label: '5 × 5', difficulty: 'Avanzado', total: 25 },
    { rows: 6, cols: 6, label: '6 × 6', difficulty: 'Experto', total: 36 },
  ];

  return (
    <div
      id="dimensions-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
    >
      <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-stone-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white font-cinzel">
                Tamaño de Cuadrícula
              </h3>
              <p className="text-xs text-stone-400">Presets rápidos de juego</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {presets.map((preset) => {
            const isSelected =
              currentConfig.rows === preset.rows && currentConfig.cols === preset.cols;

            return (
              <button
                key={preset.label}
                id={`preset-${preset.rows}x${preset.cols}`}
                onClick={() => {
                  onSelectDimension(preset.rows, preset.cols);
                  onClose();
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer relative ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 text-white'
                    : 'bg-stone-800/80 hover:bg-stone-700/80 border-stone-700/70 text-stone-300'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 text-amber-400">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
                <span className="text-lg font-bold font-mono text-amber-300">
                  {preset.label}
                </span>
                <span className="text-xs text-stone-400">
                  {preset.total} casillas • {preset.difficulty}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-stone-400 text-center">
          Al cambiar de tamaño se generará una nueva cuadrícula equilibrada para ambos modos.
        </p>
      </div>
    </div>
  );
};
