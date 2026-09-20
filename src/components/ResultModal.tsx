import React from 'react';
import { CheckCircle2, XCircle, Clock, Zap, ArrowRight, RotateCcw, Trophy } from 'lucide-react';
import { GameMode } from '../types';
import { getDigitalRootSteps } from '../utils/mathUtils';

interface ResultModalProps {
  isOpen: boolean;
  isCorrect: boolean;
  userDigit: number;
  correctRoot: number;
  totalSum: number;
  elapsedSeconds: number;
  mode: GameMode;
  onRetryAttempt: () => void;
  onGoToOtherMode: () => void;
  onGoToComparativa: () => void;
  onNewGrid: () => void;
  onClose: () => void;
  roundInfo?: {
    current: number;
    total: number;
    onNextRound: () => void;
    isLastRound: boolean;
  } | null;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  isCorrect,
  userDigit,
  correctRoot,
  totalSum,
  elapsedSeconds,
  mode,
  onRetryAttempt,
  onGoToOtherMode,
  onGoToComparativa,
  onNewGrid,
  onClose,
  roundInfo,
}) => {
  if (!isOpen) return null;

  const { steps } = getDigitalRootSteps(totalSum);

  return (
    <div
      id="result-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none"
    >
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-stone-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header with status badge */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-2xl ${
              isCorrect
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : (
              <XCircle className="w-7 h-7" />
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-xl text-white font-cinzel">
              {isCorrect ? '¡Reducción Correcta!' : 'Reducción Incorrecta'}
            </h3>
            <p className="text-xs text-stone-400">
              {mode === 'tradicional' ? 'Modo Tradicional' : 'Modo Reducción'}
            </p>
          </div>
        </div>

        {/* Timing and answer summary */}
        <div className="grid grid-cols-2 gap-2 bg-stone-950/70 p-3 rounded-xl border border-stone-800/80">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider">Tiempo</div>
              <div className="text-lg font-bold font-mono text-stone-100">
                {elapsedSeconds.toFixed(1)}s
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider">Tu Respuesta</div>
              <div className="text-lg font-bold font-mono">
                <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                  {userDigit}
                </span>{' '}
                <span className="text-xs text-stone-500 font-normal">
                  (Real: {correctRoot})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step by step mathematical verification */}
        <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="text-amber-400 font-semibold flex items-center justify-between">
            <span>Verificación Matemática:</span>
            <span className="font-mono text-stone-300">Suma Total = {totalSum}</span>
          </div>

          <div className="space-y-1 font-mono text-stone-300 bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-amber-500 font-bold">↳</span>
                <span>{step}</span>
              </div>
            ))}
            <div className="pt-1 text-emerald-300 font-bold flex items-center gap-1.5 border-t border-stone-800 mt-1">
              <span>★</span>
              <span>Número Reducido = {correctRoot} {correctRoot === 9 ? '(o 0 en mod 9)' : ''}</span>
            </div>
          </div>

          {mode === 'reduccion' && (
            <p className="text-[11px] text-stone-400 italic">
              Con el método de descarte, eliminar los 9s y grupos que sumen 9 deja únicamente los residuos cuya suma produce exactamente el mismo número reducido sin tener que sumar toda la cuadrícula.
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-1">
          {roundInfo && isCorrect ? (
            <button
              id="btn-result-next-round"
              onClick={roundInfo.onNextRound}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-amber-500/20"
            >
              <span>
                {roundInfo.isLastRound
                  ? 'Ver Resumen de la Sesión'
                  : `Avanzar a Ronda ${roundInfo.current + 1} de ${roundInfo.total}`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : isCorrect ? (
            <>
              {mode === 'reduccion' && (
                <button
                  id="btn-result-other-mode"
                  onClick={onGoToOtherMode}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <span>Comparar con Modo Tradicional</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                id="btn-result-comparativa"
                onClick={onGoToComparativa}
                className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer border border-stone-700 transition-colors"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Ver Tabla Comparativa</span>
              </button>
            </>
          ) : (
            <button
              id="btn-result-retry"
              onClick={onRetryAttempt}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reintentar esta cuadrícula</span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              id="btn-result-new-grid"
              onClick={onNewGrid}
              className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-stone-700"
            >
              <span>Nueva Cuadrícula</span>
            </button>
            <button
              id="btn-result-close"
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 font-medium rounded-xl text-xs cursor-pointer border border-stone-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
