import React from 'react';
import { Sparkles, GraduationCap, Users, Play, ArrowRight } from 'lucide-react';

interface SplashIntroProps {
  onStartTeacher: () => void;
  onStartStudent: () => void;
  onStartIndividual?: () => void;
}

export const SplashIntro: React.FC<SplashIntroProps> = ({
  onStartTeacher,
  onStartStudent,
  onStartIndividual,
}) => {
  return (
    <div
      id="splash-screen"
      className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-8 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 25%, #1e3a8a 0%, #0f172a 45%, #030712 90%)',
      }}
    >
      {/* Floating ambient background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blue-500/15 blur-2xl animate-float-1"
          style={{ willChange: 'transform' }}
        />
        <div
          className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl animate-float-2"
          style={{ willChange: 'transform' }}
        />
        <div
          className="absolute -bottom-24 left-1/4 w-88 h-88 rounded-full bg-amber-500/10 blur-2xl animate-float-3"
          style={{ willChange: 'transform' }}
        />

        {/* Ambient floating particles */}
        <div className="absolute top-[18%] left-[15%] w-2 h-2 rounded-full bg-amber-400/50 blur-[0.5px] animate-particle-1" />
        <div className="absolute top-[32%] right-[22%] w-2.5 h-2.5 rounded-full bg-blue-400/60 blur-[0.5px] animate-particle-2" />
        <div className="absolute top-[55%] left-[10%] w-1.5 h-1.5 rounded-full bg-indigo-300/50 animate-particle-3" />
        <div className="absolute top-[70%] right-[15%] w-2 h-2 rounded-full bg-amber-300/60 blur-[0.5px] animate-particle-1" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[25%] right-[35%] w-1.5 h-1.5 rounded-full bg-amber-200/50 animate-particle-2" style={{ animationDelay: '2.5s' }} />
        <div className="absolute top-[45%] left-[28%] w-2 h-2 rounded-full bg-blue-300/50 blur-[0.5px] animate-particle-3" style={{ animationDelay: '3.5s' }} />
        <div className="absolute top-[80%] left-[30%] w-2.5 h-2.5 rounded-full bg-indigo-400/50 blur-[0.5px] animate-particle-1" style={{ animationDelay: '0.8s' }} />
      </div>

      {/* Top Badge */}
      <div className="relative z-10 flex justify-center pt-2 sm:pt-4">
        <div
          id="badge-intro"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 backdrop-blur-sm text-amber-300 text-xs sm:text-sm font-semibold tracking-widest uppercase shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>✦ REDUCCIÓN CUADRÍCULA FIREBASE ✦ MULTIJUGADOR EN VIVO</span>
        </div>
      </div>

      {/* Main centered hero title and role selector */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto max-w-xl mx-auto w-full px-3">
        <div className="space-y-1 sm:space-y-2 mb-4 sm:mb-6">
          <h1
            id="title-line-1"
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white font-cinzel leading-none drop-shadow-md"
          >
            REDUCCIÓN
          </h1>
          <h2
            id="title-line-2"
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-amber-400 font-cinzel leading-none drop-shadow-md"
          >
            CUADRÍCULA
          </h2>
        </div>

        <p
          id="intro-description"
          className="text-stone-300 text-sm sm:text-base md:text-lg font-normal max-w-md leading-relaxed mb-6 sm:mb-8 text-center text-balance"
        >
          &ldquo;Entrena el descarte y cálculo del número reducido para comprobar sumas al instante en dinámicas grupales o individuales.&rdquo;
        </p>

        {/* Action Buttons: Principal "Entrar como Profesor", Secundario "Unirse a una sala como Alumno" */}
        <div className="w-full max-w-md mx-auto flex flex-col gap-3 sm:gap-3.5">
          {/* Botón Principal Destacado: Entrar como Profesor / Instructor */}
          <button
            id="btn-role-teacher"
            onClick={onStartTeacher}
            className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-3 transition-all cursor-pointer border border-amber-300/60 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <GraduationCap className="w-6 h-6 text-stone-950 stroke-[2.2]" />
            <span>Entrar como Profesor / Instructor</span>
            <ArrowRight className="w-5 h-5 text-stone-950 stroke-[2.5]" />
          </button>

          {/* Botón Secundario: Unirse a una sala como Alumno */}
          <button
            id="btn-role-student"
            onClick={onStartStudent}
            className="w-full py-3.5 px-6 bg-stone-900/90 hover:bg-stone-800 text-stone-100 hover:text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg border border-stone-700/80 hover:border-amber-500/50 flex items-center justify-center gap-2.5 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-md"
          >
            <Users className="w-5 h-5 text-sky-400" />
            <span>Unirse a una sala como Alumno</span>
          </button>

          {/* Enlace sutil: Practicar en Solitario */}
          {onStartIndividual && (
            <button
              id="btn-role-individual"
              onClick={onStartIndividual}
              className="mt-1 text-xs text-stone-400 hover:text-stone-200 py-1 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-stone-400" />
              <span>O practicar en solitario (Modo Individual)</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer with author signature at bottom right */}
      <div className="relative z-10 flex justify-between items-end pb-2 sm:pb-3 px-2">
        <div className="text-[11px] text-stone-500">
          Firebase Realtime v2.0
        </div>
        <div
          id="author-signature"
          className="font-handwriting text-xl sm:text-2xl text-amber-300/90 select-none tracking-wide"
          style={{
            transform: 'rotate(-5deg)',
            textShadow: '0 2px 8px rgba(251, 191, 36, 0.35)',
          }}
        >
          por Robert Pacheco
        </div>
      </div>
    </div>
  );
};
