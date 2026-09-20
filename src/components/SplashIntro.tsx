import React from 'react';
import { ArrowRight, Sparkles, Users, Play } from 'lucide-react';

interface SplashIntroProps {
  onStart: () => void;
  onStartMultiplayer?: () => void;
}

export const SplashIntro: React.FC<SplashIntroProps> = ({
  onStart,
  onStartMultiplayer,
}) => {
  return (
    <div
      id="splash-screen"
      className="fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-8 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 25%, #1e3a8a 0%, #0f172a 45%, #030712 90%)',
      }}
    >
      {/* Floating semi-transparent ambient circles */}
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

        {/* Dynamic floating particles across the canvas */}
        <div className="absolute top-[18%] left-[15%] w-2 h-2 rounded-full bg-amber-400/50 blur-[0.5px] animate-particle-1" />
        <div className="absolute top-[32%] right-[22%] w-2.5 h-2.5 rounded-full bg-blue-400/60 blur-[0.5px] animate-particle-2" />
        <div className="absolute top-[55%] left-[10%] w-1.5 h-1.5 rounded-full bg-indigo-300/50 animate-particle-3" />
        <div className="absolute top-[70%] right-[15%] w-2 h-2 rounded-full bg-amber-300/60 blur-[0.5px] animate-particle-1" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[25%] right-[35%] w-1.5 h-1.5 rounded-full bg-amber-200/50 animate-particle-2" style={{ animationDelay: '2.5s' }} />
        <div className="absolute top-[45%] left-[28%] w-2 h-2 rounded-full bg-blue-300/50 blur-[0.5px] animate-particle-3" style={{ animationDelay: '3.5s' }} />
        <div className="absolute top-[80%] left-[30%] w-2.5 h-2.5 rounded-full bg-indigo-400/50 blur-[0.5px] animate-particle-1" style={{ animationDelay: '0.8s' }} />
        <div className="absolute top-[12%] right-[10%] w-1.5 h-1.5 rounded-full bg-blue-200/60 animate-particle-2" style={{ animationDelay: '4s' }} />
        <div className="absolute top-[62%] right-[32%] w-2 h-2 rounded-full bg-amber-400/40 animate-particle-3" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[38%] left-[8%] w-1 h-1 rounded-full bg-white/60 animate-particle-1" style={{ animationDelay: '5s' }} />
      </div>

      {/* Top section with subtle Badge */}
      <div className="relative z-10 flex justify-center pt-2 sm:pt-4">
        <div
          id="badge-intro"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 backdrop-blur-sm text-amber-300 text-xs sm:text-sm font-semibold tracking-widest uppercase shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>✦ AGILIDAD MENTAL & NÚMERO REDUCIDO</span>
        </div>
      </div>

      {/* Main centered hero title and description */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto max-w-xl mx-auto w-full px-2">
        <div className="space-y-1 sm:space-y-2 mb-6">
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
          className="text-stone-300 text-base sm:text-lg md:text-xl font-normal max-w-md leading-relaxed mb-8 sm:mb-10 text-center text-balance"
        >
          &ldquo;Entrena el descarte y cálculo del número reducido para comprobar sumas al instante.&rdquo;
        </p>

        {/* Direct access to Individual Mode and Multiplayer Mode - No password or credentials */}
        <div className="w-full max-w-lg mx-auto flex flex-col sm:flex-row items-stretch justify-center gap-3">
          <button
            id="btn-comenzar"
            onClick={onStart}
            className="flex-1 py-3.5 px-6 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base sm:text-lg rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-amber-300/40 transform hover:-translate-y-0.5"
          >
            <Play className="w-4 h-4 fill-current stroke-none" />
            <span>Modo Individual</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {onStartMultiplayer && (
            <button
              id="btn-multijugador-directo"
              onClick={onStartMultiplayer}
              className="flex-1 py-3.5 px-6 bg-stone-900/90 hover:bg-stone-800 text-amber-300 hover:text-white font-bold text-base sm:text-lg rounded-xl shadow-lg border border-amber-500/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <Users className="w-5 h-5 text-amber-400" />
              <span>Modo Multijugador</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer with author signature at bottom right */}
      <div className="relative z-10 flex justify-end items-end pb-2 sm:pb-4 pr-2 sm:pr-4">
        <div
          id="author-signature"
          className="font-handwriting text-2xl sm:text-3xl text-amber-300/90 select-none tracking-wide"
          style={{
            transform: 'rotate(-6deg)',
            textShadow: '0 2px 8px rgba(251, 191, 36, 0.35)',
          }}
        >
          por Robert Pacheco
        </div>
      </div>
    </div>
  );
};
