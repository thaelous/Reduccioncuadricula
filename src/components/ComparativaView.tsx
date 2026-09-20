import React from 'react';
import { Trophy, Zap, Clock, ArrowRight, Sparkles, CheckCircle, BarChart3 } from 'lucide-react';
import { GameScore } from '../types';

interface ComparativaViewProps {
  lastScore: GameScore | null;
  onGoToMode: (mode: 'tradicional' | 'reduccion') => void;
  onNewChallenge: () => void;
}

export const ComparativaView: React.FC<ComparativaViewProps> = ({
  lastScore,
  onGoToMode,
  onNewChallenge,
}) => {
  const tradTime = lastScore?.traditionalTime;
  const redTime = lastScore?.reductionTime;

  const hasBoth = tradTime !== null && tradTime !== undefined && redTime !== null && redTime !== undefined;
  const timeSaved = hasBoth ? Math.max(0, tradTime - redTime) : null;
  const speedImprovement = hasBoth && tradTime > 0 ? Math.round(((tradTime - redTime) / tradTime) * 100) : null;

  return (
    <div
      id="comparativa-view"
      className="flex-1 w-full max-w-xl mx-auto p-4 flex flex-col justify-between overflow-y-auto"
    >
      <div className="space-y-4">
        {/* Header summary */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            <span>Métricas de Rendimiento</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-cinzel">
            Tradicional vs. Reducción
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            Cuadrícula actual: {lastScore?.dimensions || '4×4'}
          </p>
        </div>

        {/* Side by side comparison cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Tradicional Card */}
          <div
            id="card-score-tradicional"
            className="bg-stone-900 border border-stone-800 rounded-xl p-3.5 flex flex-col justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 text-xs font-medium">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Suma Tradicional</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-stone-100 font-mono">
                {tradTime !== null && tradTime !== undefined ? `${tradTime.toFixed(1)}s` : '—'}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
              <span>Estado:</span>
              <span className={tradTime !== null && tradTime !== undefined ? 'text-emerald-400 font-semibold' : 'text-stone-500'}>
                {tradTime !== null && tradTime !== undefined ? 'Completado' : 'Pendiente'}
              </span>
            </div>
          </div>

          {/* Reducción Card */}
          <div
            id="card-score-reduccion"
            className="bg-stone-900 border border-amber-500/40 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full pointer-events-none" />
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Modo Reducción</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono">
                {redTime !== null && redTime !== undefined ? `${redTime.toFixed(1)}s` : '—'}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
              <span>Estado:</span>
              <span className={redTime !== null && redTime !== undefined ? 'text-emerald-400 font-semibold' : 'text-stone-500'}>
                {redTime !== null && redTime !== undefined ? 'Completado' : 'Pendiente'}
              </span>
            </div>
          </div>
        </div>

        {/* Results Banner */}
        {hasBoth ? (
          <div
            id="comparison-analysis-card"
            className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-200">
                  {speedImprovement && speedImprovement > 0
                    ? `¡${speedImprovement}% más rápido con Reducción!`
                    : 'Comparativa completada'}
                </h3>
              </div>
              {timeSaved !== null && timeSaved > 0 && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                  -{timeSaved.toFixed(1)}s ahorrados
                </span>
              )}
            </div>

            <p className="text-xs text-emerald-300/80 leading-relaxed">
              Al descartar 0, 9 y combinaciones que suman 9, el cerebro evita acumular números grandes y arrastres mentales, llegando a la reducción casi al instante.
            </p>

            {/* Visual ratio bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                <span>Reducción ({redTime?.toFixed(1)}s)</span>
                <span>Tradicional ({tradTime?.toFixed(1)}s)</span>
              </div>
              <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-amber-400"
                  style={{
                    width: `${Math.min(100, Math.max(15, (redTime / (tradTime + redTime)) * 100))}%`,
                  }}
                />
                <div
                  className="h-full bg-stone-600"
                  style={{
                    width: `${Math.min(100, Math.max(15, (tradTime / (tradTime + redTime)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            id="comparison-pending-card"
            className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 text-center space-y-2"
          >
            <BarChart3 className="w-6 h-6 text-stone-500 mx-auto" />
            <p className="text-xs sm:text-sm text-stone-300 font-medium">
              Completa la misma cuadrícula en ambos modos para calcular tus segundos ahorrados y porcentaje de mejora.
            </p>
            <div className="flex justify-center gap-2 pt-1">
              {tradTime === null && (
                <button
                  onClick={() => onGoToMode('tradicional')}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer border border-stone-700"
                >
                  Jugar Tradicional
                </button>
              )}
              {redTime === null && (
                <button
                  onClick={() => onGoToMode('reduccion')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer"
                >
                  Jugar Reducción
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer challenge actions */}
      <div className="pt-4 border-t border-stone-800 flex flex-col sm:flex-row gap-2">
        <button
          id="btn-comparativa-new-challenge"
          onClick={onNewChallenge}
          className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>Nuevo Desafío de Velocidad</span>
        </button>
      </div>
    </div>
  );
};
