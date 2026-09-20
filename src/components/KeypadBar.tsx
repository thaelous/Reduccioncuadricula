import React from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface KeypadBarProps {
  selectedDigit: number | null;
  onSelectDigit: (digit: number) => void;
  onClearDigit: () => void;
  onCheck: () => void;
  isCheckingDisabled?: boolean;
  activeMode: 'tradicional' | 'reduccion';
}

export const KeypadBar: React.FC<KeypadBarProps> = ({
  selectedDigit,
  onSelectDigit,
  onClearDigit,
  onCheck,
  isCheckingDisabled = false,
  activeMode,
}) => {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div
      id="keypad-bar"
      className="w-full bg-stone-900/95 border-t border-stone-800 px-2 pt-2 flex flex-col gap-1.5 shrink-0 select-none z-20 backdrop-blur-md"
      style={{ paddingBottom: 'max(0.85rem, env(safe-area-inset-bottom))' }}
    >
      {/* Top row of keypad: Current selection label and "Comprobar" button */}
      <div className="flex items-center justify-between gap-2 max-w-lg mx-auto w-full px-1">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-300">
          <span className="text-stone-400 font-medium">
            Número reducido:
          </span>
          <div
            id="digit-display"
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base transition-colors ${
              selectedDigit !== null
                ? 'bg-amber-500 text-stone-950 shadow-sm shadow-amber-500/30'
                : 'bg-stone-800 text-stone-500 border border-stone-700'
            }`}
          >
            {selectedDigit !== null ? selectedDigit : '—'}
          </div>
          {selectedDigit !== null && (
            <button
              id="btn-clear-digit"
              onClick={onClearDigit}
              className="text-stone-400 hover:text-stone-200 p-1 text-xs underline cursor-pointer"
              title="Borrar selección"
            >
              Borrar
            </button>
          )}
        </div>

        <button
          id="btn-comprobar"
          disabled={selectedDigit === null || isCheckingDisabled}
          onClick={onCheck}
          className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer border ${
            selectedDigit !== null && !isCheckingDisabled
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/30 shadow-sm shadow-emerald-700/20'
              : 'bg-stone-800 text-stone-500 border-stone-700/60 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Comprobar</span>
        </button>
      </div>

      {/* Row of direct tactile digit buttons 0 to 9 */}
      <div
        id="keypad-digits-row"
        className="grid grid-cols-10 gap-1 sm:gap-1.5 max-w-lg mx-auto w-full"
      >
        {digits.map((d) => {
          const isSelected = selectedDigit === d;
          return (
            <button
              key={d}
              id={`btn-digit-${d}`}
              onClick={() => onSelectDigit(d)}
              className={`h-11 sm:h-12 rounded-lg flex items-center justify-center font-bold text-base sm:text-lg transition-colors cursor-pointer border ${
                isSelected
                  ? 'bg-amber-500 text-stone-955 border-amber-300 font-extrabold shadow-sm'
                  : 'bg-stone-800/90 text-stone-100 hover:bg-stone-700 border-stone-700/70'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
};
