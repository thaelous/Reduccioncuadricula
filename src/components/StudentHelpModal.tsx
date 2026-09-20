import React from 'react';
import { X, Lightbulb, Zap, CheckCircle, Sparkles } from 'lucide-react';

interface StudentHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMode: 'tradicional' | 'reduccion';
}

export const StudentHelpModal: React.FC<StudentHelpModalProps> = ({
  isOpen,
  onClose,
  activeMode,
}) => {
  if (!isOpen) return null;

  const isTrad = activeMode === 'tradicional';

  return (
    <div
      id="student-help-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
    >
      <div className="w-full max-w-md bg-stone-900 border border-stone-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-stone-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-2xl ${
                isTrad
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              {isTrad ? <Lightbulb className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white font-cinzel">
                {isTrad ? 'Regla: Modo Tradicional' : 'Regla: Modo Reducción'}
              </h3>
              <p className="text-xs text-stone-400">Guía rápida para el alumno</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Rule Explanation */}
        <div className="space-y-3 text-xs sm:text-sm text-stone-300 leading-relaxed">
          {isTrad ? (
            <>
              <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-2xl space-y-2">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Suma Mental y Reducción Paso a Paso</span>
                </span>
                <p className="text-stone-300">
                  1. Suma mentalmente todos los números de la cuadrícula hasta obtener el total (por ejemplo: <strong>25</strong>).
                </p>
                <p className="text-stone-300">
                  2. Reduce el resultado sumando sus dígitos: <strong>2 + 5 = 7</strong>.
                </p>
                <p className="text-stone-300">
                  3. Marca en la botonera el <strong>7</strong> y pulsa <strong>Comprobar</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1">
                <p className="font-semibold">💡 Apoyo visual:</p>
                <p>
                  Toca las casillas que ya hayas sumado para sombrearlas en amarillo y no repetir ni saltarte números.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-2xl space-y-2.5">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Descarte Rápido por Regla del 9</span>
                </span>
                <ul className="space-y-2 text-stone-300 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="bg-stone-800 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                      1
                    </span>
                    <span>
                      <strong>Toca ceros (0) y nueves (9):</strong> Se tachan de inmediato porque no alteran el residuo.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-stone-800 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                      2
                    </span>
                    <span>
                      <strong>Agrupa sumas que den 9:</strong> Toca parejas como <code className="text-cyan-300">5+4</code>, <code className="text-cyan-300">6+3</code>, <code className="text-cyan-300">7+2</code> o <code className="text-cyan-300">8+1</code> para tacharlas juntas al instante.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-stone-800 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                      3
                    </span>
                    <span>
                      <strong>Suma solo lo que quede:</strong> Tras descartar, solo sumas los pocos números sobrantes para hallar el número reducido.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-200">
                <p>
                  ⚡ <strong>Ventaja:</strong> ¡No necesitas sumar números grandes ni arrastrar decenas mentales!
                </p>
              </div>
            </>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm cursor-pointer transition-colors"
        >
          Entendido, continuar ejercicio
        </button>
      </div>
    </div>
  );
};
