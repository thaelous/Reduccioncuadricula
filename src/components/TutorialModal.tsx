import React, { useState, useEffect } from 'react';
import { X, Lightbulb, Zap, ArrowRight, RotateCcw, Check, Sparkles, ChevronLeft } from 'lucide-react';
import { GameMode } from '../types';

interface TutorialModalProps {
  mode: GameMode;
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  mode,
  isOpen,
  onClose,
}) => {
  const [dontShow, setDontShow] = useState(false);
  const [tutorialPhase, setTutorialPhase] = useState<1 | 2>(1);

  // Interactive Demo State for Tradicional
  const [tradDemoMarked, setTradDemoMarked] = useState<Set<number>>(new Set());
  const [tradDemoSelectedDigit, setTradDemoSelectedDigit] = useState<number | null>(null);

  // Interactive Demo State for Reduccion
  const [redDemoEliminated, setRedDemoEliminated] = useState<Set<number>>(new Set());
  const [redDemoSelected, setRedDemoSelected] = useState<number[]>([]);
  const [redDemoFeedback, setRedDemoFeedback] = useState<string | null>(null);

  // Reset demo state whenever modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setDontShow(false);
      setTutorialPhase(1);
      setTradDemoMarked(new Set());
      setTradDemoSelectedDigit(null);
      setRedDemoEliminated(new Set());
      setRedDemoSelected([]);
      setRedDemoFeedback(null);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const isTradicional = mode === 'tradicional';

  // Demo grid data
  const tradDemoCells = [
    { id: 0, val: 3 },
    { id: 1, val: 4 },
    { id: 2, val: 2 },
    { id: 3, val: 5 },
  ]; // Sum = 14 -> 1 + 4 = 5

  const redDemoCells = [
    { id: 0, val: 9 },
    { id: 1, val: 5 },
    { id: 2, val: 4 },
    { id: 3, val: 0 },
  ]; // 9 and 0 direct discard; 5 + 4 = 9 discard

  // Tradicional demo interaction
  const handleTradDemoClick = (id: number) => {
    setTradDemoMarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reduccion demo interaction
  const handleRedDemoClick = (id: number, val: number) => {
    if (redDemoEliminated.has(id)) return;

    // Rule 1: direct 0 or 9
    if (val === 0 || val === 9) {
      setRedDemoEliminated((prev) => new Set([...prev, id]));
      setRedDemoSelected((prev) => prev.filter((i) => i !== id));
      setRedDemoFeedback(`✓ ¡Dígito ${val} descartado de inmediato!`);
      return;
    }

    // Toggle unselect
    if (redDemoSelected.includes(id)) {
      setRedDemoSelected((prev) => prev.filter((i) => i !== id));
      return;
    }

    // Add to selection
    const nextSel = [...redDemoSelected, id];
    const sum = nextSel.reduce((acc, cellId) => acc + redDemoCells[cellId].val, 0);

    if (sum === 9) {
      setRedDemoEliminated((prev) => new Set([...prev, ...nextSel]));
      setRedDemoSelected([]);
      setRedDemoFeedback('✓ ¡Excelente! 5 + 4 = 9. Ambas celdas se tachan a la vez.');
    } else if (sum > 9) {
      setRedDemoSelected([]);
      setRedDemoFeedback(`La suma superó 9 (${sum}), selección reiniciada.`);
    } else {
      setRedDemoSelected(nextSel);
      setRedDemoFeedback(`Llevas ${sum}... falta ${9 - sum} para completar 9.`);
    }
  };

  const resetDemos = () => {
    setTradDemoMarked(new Set());
    setTradDemoSelectedDigit(null);
    setRedDemoEliminated(new Set());
    setRedDemoSelected([]);
    setRedDemoFeedback(null);
  };

  return (
    <div
      id="tutorial-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm select-none overflow-y-auto"
    >
      <div
        className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-3 sm:gap-4 text-stone-200 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[95dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
              {isTradicional ? <Lightbulb className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white font-cinzel">
                {isTradicional ? 'Tutorial: Modo Tradicional' : 'Tutorial: Modo Reducción'}
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-400">
                {isTradicional ? 'Suma mental y cálculo del número reducido' : 'Descarte rápido de 0s, 9s y sumas de 9'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onClose(dontShow)}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase Indicator Badge */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <span>Paso {tutorialPhase} de 2:</span>
            <span>{tutorialPhase === 1 ? 'Explicación Conceptual Previa' : 'Práctica Guiada Interactiva'}</span>
          </span>

          {tutorialPhase === 2 && (
            <button
              onClick={() => setTutorialPhase(1)}
              className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1 cursor-pointer underline"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Volver a explicación</span>
            </button>
          )}
        </div>

        {/* Dynamic Content depending on Phase */}
        <div className="text-xs sm:text-sm text-stone-300 leading-relaxed">
          {isTradicional ? (
            /* TRADICIONAL TUTORIAL */
            tutorialPhase === 1 ? (
              /* Fase 1 Tradicional: Explicación previa */
              <div className="space-y-3">
                <p>
                  En el <strong>Modo Tradicional</strong>, debes sumar mentalmente los números de la cuadrícula tal como aprendiste en la escuela:
                </p>
                <div className="bg-stone-950/90 border border-stone-800 p-3.5 rounded-xl space-y-2">
                  <div className="text-amber-400 font-semibold text-xs">
                    ¿Cómo funciona el cálculo del número reducido?
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-stone-300 text-xs">
                    <li>Sumas todos los dígitos de la cuadrícula para obtener el total (ejemplo: <strong>14</strong>).</li>
                    <li>Sumas los dígitos del resultado hasta que quede uno solo: 1 + 4 = <strong>5</strong>.</li>
                    <li>Ese único dígito final resultante es el <strong>número reducido</strong>.</li>
                  </ol>
                </div>
                <p className="text-stone-400 text-xs">
                  Para no perderte en matrices grandes, puedes ir tocando cada casilla para marcarla en <strong>amarillo mostaza</strong> con una tilde de verificación conforme sumes mentalmente.
                </p>
                <button
                  onClick={() => setTutorialPhase(2)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors mt-2"
                >
                  <span>Siguiente: Práctica Guiada</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Fase 2 Tradicional: Práctica Guiada Interactiva */
              <div className="space-y-3">
                <div className="bg-stone-950/80 border border-stone-800 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-semibold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Toca las celdas abajo para probar el sombreado:</span>
                    </span>
                    <button
                      onClick={resetDemos}
                      className="text-[10px] text-stone-400 hover:text-stone-200 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reiniciar</span>
                    </button>
                  </div>

                  {/* 2x2 Mini Board */}
                  <div className="grid grid-cols-2 gap-2 w-48 mx-auto p-2 bg-stone-900 rounded-xl border border-stone-800">
                    {tradDemoCells.map((c) => {
                      const marked = tradDemoMarked.has(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleTradDemoClick(c.id)}
                          className={`h-16 rounded-xl font-bold font-mono text-2xl flex items-center justify-center relative cursor-pointer border transition-colors ${
                            marked
                              ? 'bg-yellow-500 text-stone-950 border-yellow-300 shadow-sm'
                              : 'bg-stone-800 text-white hover:bg-stone-700 border-stone-700'
                          }`}
                        >
                          {marked && (
                            <span className="absolute top-1 right-1 bg-stone-950 text-amber-400 rounded-full p-0.5">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                          <span>{c.val}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-center text-xs">
                    {tradDemoMarked.size === 0 ? (
                      <p className="text-stone-400 italic">
                        Toca cualquier número para ver cómo se sombrea con verificación.
                      </p>
                    ) : (
                      <p className="text-amber-300 font-medium">
                        Llevas {tradDemoMarked.size} de 4 celdas sumadas. Total: 3 + 4 + 2 + 5 = <strong>14</strong>.
                      </p>
                    )}
                  </div>
                </div>

                {/* Number selection step */}
                <div className="bg-stone-800/60 border border-stone-700/60 p-3 rounded-xl space-y-2">
                  <p className="font-semibold text-amber-300 text-xs flex items-center gap-1.5">
                    <span>Calcula el número reducido (14 → 1 + 4 = ?):</span>
                  </p>
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <button
                        key={digit}
                        onClick={() => setTradDemoSelectedDigit(digit)}
                        className={`w-8 h-8 rounded-lg font-mono font-bold text-sm flex items-center justify-center border transition-colors cursor-pointer ${
                          tradDemoSelectedDigit === digit
                            ? digit === 5
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                              : 'bg-red-600 text-white border-red-400'
                            : 'bg-stone-900 hover:bg-stone-700 text-stone-200 border-stone-700'
                        }`}
                      >
                        {digit}
                      </button>
                    ))}
                  </div>
                  {tradDemoSelectedDigit !== null && (
                    <p className={`text-center text-xs font-semibold ${tradDemoSelectedDigit === 5 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tradDemoSelectedDigit === 5
                        ? '✓ ¡Exacto! 14 reduce a 5. En el juego real, marcarás el dígito en la botonera inferior y pulsarás "Comprobar".'
                        : '✗ 1 + 4 = 5. ¡Prueba pulsando el 5!'}
                    </p>
                  )}
                </div>
              </div>
            )
          ) : (
            /* REDUCCION TUTORIAL */
            tutorialPhase === 1 ? (
              /* Fase 1 Reducción: Explicación previa */
              <div className="space-y-3">
                <p>
                  El <strong>Modo Reducción</strong> es una técnica de agilidad mental para calcular el <strong>número reducido</strong> sin sumar números grandes ni arrastrar decenas.
                </p>
                <div className="bg-stone-950/90 border border-stone-800 p-3.5 rounded-xl space-y-2">
                  <div className="text-sky-400 font-semibold text-xs">
                    Reglas del 9 para el descarte veloz:
                  </div>
                  <ul className="space-y-1.5 text-stone-300 text-xs">
                    <li>
                      <strong>1. Ceros y Nueves:</strong> Se descartan de inmediato porque no alteran el número reducido final.
                    </li>
                    <li>
                      <strong>2. Agrupaciones libres:</strong> Toca cualquier cantidad de celdas (2, 3 o más). Si su suma directa o número reducido da 9 (ej. 5+4=9, o 6+6+6=18→9), se descartan juntas al instante.
                    </li>
                    <li>
                      <strong>3. Residuos finales:</strong> Tras descartar todos los 9s, solo sumas los pocos números sobrantes.
                    </li>
                  </ul>
                </div>
                <p className="text-stone-400 text-xs">
                  A continuación probarás en vivo el descarte directo y la agrupación guiada.
                </p>
                <button
                  onClick={() => setTutorialPhase(2)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors mt-2"
                >
                  <span>Siguiente: Práctica Guiada</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Fase 2 Reducción: Práctica Guiada Interactiva */
              <div className="space-y-3">
                <div className="bg-stone-950/80 border border-stone-800 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-semibold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Toca el 9, 0 o combina 5 y 4:</span>
                    </span>
                    <button
                      onClick={resetDemos}
                      className="text-[10px] text-stone-400 hover:text-stone-200 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reiniciar</span>
                    </button>
                  </div>

                  {/* 2x2 Mini Board for Reduccion */}
                  <div className="grid grid-cols-2 gap-2 w-48 mx-auto p-2 bg-stone-900 rounded-xl border border-stone-800">
                    {redDemoCells.map((c) => {
                      const isEliminated = redDemoEliminated.has(c.id);
                      const isSelected = redDemoSelected.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          disabled={isEliminated}
                          onClick={() => handleRedDemoClick(c.id, c.val)}
                          className={`h-16 rounded-xl font-bold font-mono text-2xl flex items-center justify-center relative transition-colors border ${
                            isEliminated
                              ? 'bg-stone-950 text-stone-600 border-stone-800/40 cursor-not-allowed diagonal-strike'
                              : isSelected
                              ? 'bg-cyan-950 text-cyan-200 border-cyan-400 ring-2 ring-cyan-400/40 cursor-pointer'
                              : 'bg-stone-800 text-white hover:bg-stone-700 border-stone-700 cursor-pointer'
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute top-1 left-1 text-[10px] font-mono text-cyan-400 leading-none">
                              ●
                            </span>
                          )}
                          <span className={isEliminated ? 'opacity-25' : ''}>{c.val}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback message */}
                  <div className="text-center text-xs min-h-[22px]">
                    {redDemoFeedback ? (
                      <p className="text-emerald-300 font-medium">{redDemoFeedback}</p>
                    ) : (
                      <p className="text-stone-400 italic">
                        Toca el <strong>9</strong> o el <strong>0</strong> para tacharlo directo. O toca <strong>5</strong> y luego <strong>4</strong> para tachar ambos.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Checkbox "No volver a mostrar" */}
        <label className="flex items-center gap-2.5 text-xs text-stone-300 cursor-pointer pt-2 border-t border-stone-800 bg-stone-950/40 p-2 rounded-xl">
          <input
            id="checkbox-dont-show-tutorial"
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="w-4 h-4 rounded border-stone-700 bg-stone-800 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-amber-500"
          />
          <span className="font-medium">No volver a mostrar este tutorial antes de realizar la actividad</span>
        </label>

        {/* Footer CTA button */}
        <button
          id="btn-close-tutorial"
          onClick={() => onClose(dontShow)}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md"
        >
          <span>Comenzar actividad</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
