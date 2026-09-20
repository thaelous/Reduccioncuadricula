import React from 'react';
import { Trophy, CheckCircle, Clock, Zap, RotateCcw, Sparkles } from 'lucide-react';
import { StudentProgress, ClassroomConfig } from '../types';

interface StudentFinishedModalProps {
  isOpen: boolean;
  progress: StudentProgress;
  config: ClassroomConfig;
  onRestartSession: () => void;
}

export const StudentFinishedModal: React.FC<StudentFinishedModalProps> = ({
  isOpen,
  progress,
  config,
  onRestartSession,
}) => {
  if (!isOpen) return null;

  const totalAttempts = progress.attempts.length;
  const correctAttempts = progress.attempts.filter((a) => a.isCorrect).length;
  const accuracyPct = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const totalSeconds = progress.attempts.reduce((acc, a) => acc + a.time, 0);
  const avgSeconds = totalAttempts > 0 ? (totalSeconds / totalAttempts).toFixed(1) : '0.0';

  return (
    <div
      id="student-finished-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-5 text-stone-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Trophy className="w-9 h-9" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-white font-cinzel">
            ¡Sesión Completada!
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Has completado las {config.roundsCount} rondas asignadas en la cuadrícula {config.rows}×{config.cols}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 flex flex-col items-center">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
              Aciertos
            </span>
            <span className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
              {correctAttempts} / {totalAttempts}
            </span>
            <span className="text-[11px] text-stone-500 mt-0.5">{accuracyPct}% precisión</span>
          </div>

          <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 flex flex-col items-center">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
              Tiempo Promedio
            </span>
            <span className="text-2xl font-bold font-mono text-amber-300 mt-0.5">
              {avgSeconds}s
            </span>
            <span className="text-[11px] text-stone-500 mt-0.5">por cuadrícula</span>
          </div>
        </div>

        {/* Encouraging message */}
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 text-xs text-amber-200 leading-relaxed">
          {accuracyPct >= 80 ? (
            <span>
              🎉 <strong>¡Excelente agilidad mental!</strong> Has dominado el cálculo del número reducido con rapidez y precisión.
            </span>
          ) : (
            <span>
              💪 <strong>¡Buen entrenamiento!</strong> La práctica repetida del descarte de 9s y suma rápida consolidará tu velocidad.
            </span>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={onRestartSession}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-amber-500/20"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Comenzar Nueva Sesión</span>
        </button>
      </div>
    </div>
  );
};
