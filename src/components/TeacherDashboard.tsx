/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Copy,
  Check,
  Tv,
  Maximize2,
  X,
  GraduationCap,
  Loader2,
  Users,
  CheckCircle2,
  Sliders,
  UserCheck,
  XCircle,
  Trophy,
  Play,
  Clock,
  Zap,
  Crown,
  Sparkles,
  RotateCcw,
  Award,
  Medal,
  PartyPopper,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ref, set, update, onValue, off, serverTimestamp } from 'firebase/database';
import { ClassroomConfig } from '../types';
import { getFirebaseRtdb } from '../services/firebaseAuth';

interface TeacherDashboardProps {
  config: ClassroomConfig;
  currentSeed: number;
  onUpdateConfig: (newConfig: Partial<ClassroomConfig>) => void;
  onRegenerateSeed: () => void;
  onLaunchProjector: () => void;
  onLaunchStudentView: () => void;
  onBackToApp: () => void;
}

export interface PlayerRoundData {
  tiempo?: number;
  completada?: boolean;
  esCorrecto?: boolean | null;
  fecha?: number;
}

export interface ConnectedPlayer {
  id: string;
  name: string;
  status: string;
  currentRound: number;
  isFinished?: boolean;
  time?: number;
  isCorrect?: boolean | null;
  connected?: boolean;
  rondas?: Record<number, PlayerRoundData>;
  totalTime?: number;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  config,
  currentSeed,
  onUpdateConfig,
  onRegenerateSeed,
  onLaunchProjector,
  onLaunchStudentView,
  onBackToApp,
}) => {
  // Etapas del Flujo del Profesor:
  // 1 = Configuración previa (3x3, 4x4, 5x5, tiempo, modo)
  // 2 = Lobby QR y Participantes en Vivo
  // 3 = Monitor de Progreso en Tiempo Real por Rondas
  // 4 = ¡Gran Final y Premiación! (Podio de Ganadores)
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);

  // Parámetros de la sala
  const [selectedSize, setSelectedSize] = useState<number>(config.rows || 4);
  const [selectedMode, setSelectedMode] = useState<'reduccion' | 'tradicional' | 'libre'>(
    config.studentMode || 'reduccion'
  );
  const [selectedTimeLimit, setSelectedTimeLimit] = useState<number>(config.timeLimitSeconds || 0);
  const [selectedRounds, setSelectedRounds] = useState<number>(config.roundsCount || 5);

  // Código de sala (numérico de 4 dígitos, ej. 8520)
  const [roomCode, setRoomCode] = useState<string>(() => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  });

  // Lista en tiempo real de participantes
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // QR Code Data URI y copiado
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const mountedRef = useRef(true);

  // URL para el alumno al escanear el QR o unirse
  const studentUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname || '/';
    return `${origin}${pathname}?sala=${roomCode}&role=alumno`;
  }, [roomCode]);

  // Generar QR para el Lobby
  useEffect(() => {
    if (!studentUrl) return;
    let isCurrent = true;

    QRCode.toDataURL(studentUrl, {
      width: 400,
      margin: 1,
      color: {
        dark: '#0a0a0a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isCurrent) setQrDataUrl(url);
      })
      .catch((err) => {
        console.warn('Aviso generando QR:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [studentUrl]);

  // Sincronización en tiempo real con Firebase RTDB para Etapas 2 y 3
  useEffect(() => {
    mountedRef.current = true;
    if (stage === 1) return; // En la etapa 1 no sincronizamos hasta confirmar la configuración

    let isCurrent = true;
    setIsConnecting(true);

    let activeRoomRef: ReturnType<typeof ref> | null = null;
    let activePlayersRef: ReturnType<typeof ref> | null = null;

    try {
      const rtdb = getFirebaseRtdb();
      if (!rtdb || !roomCode) {
        if (isCurrent) setIsConnecting(false);
        return;
      }

      activeRoomRef = ref(rtdb, `salas/${roomCode}`);
      activePlayersRef = ref(rtdb, `salas/${roomCode}/jugadores`);

      // Registrar o sincronizar la sala en Firebase RTDB
      const roomPayload = {
        codigo: roomCode,
        config: {
          filas: selectedSize,
          columnas: selectedSize,
          rows: selectedSize,
          cols: selectedSize,
          modo: selectedMode,
          mode: selectedMode,
          limiteTiempo: selectedTimeLimit,
          limit: selectedTimeLimit,
          rondas: selectedRounds,
          rounds: selectedRounds,
          semilla: currentSeed,
          seed: currentSeed,
        },
        estado: stage === 4 ? 'podio' : stage === 3 ? 'jugando' : 'esperando',
        status: stage === 4 ? 'podium' : stage === 3 ? 'playing' : 'waiting',
        rondaActual: 1,
        actualizadoEn: serverTimestamp(),
      };

      update(activeRoomRef, roomPayload)
        .then(() => {
          if (isCurrent) setIsConnecting(false);
        })
        .catch((err) => {
          console.warn('Aviso registrando sala en Firebase RTDB:', err);
          if (isCurrent) setIsConnecting(false);
        });

      // Escuchar participantes conectados en tiempo real en salas/{idSala}/jugadores
      onValue(
        activePlayersRef,
        (snapshot) => {
          if (!isCurrent) return;
          if (snapshot.exists()) {
            const data = snapshot.val();
            const playersList: ConnectedPlayer[] = Object.entries(data).map(
              ([id, val]: [string, any]) => {
                // Normalizar rondas registradas por el alumno
                const rawRondas = val?.rondas || {};
                const parsedRondas: Record<number, PlayerRoundData> = {};
                let totalTime = 0;

                if (typeof rawRondas === 'object' && rawRondas !== null) {
                  Object.entries(rawRondas).forEach(([rNum, rData]: [string, any]) => {
                    const roundIndex = parseInt(rNum, 10);
                    if (!isNaN(roundIndex) && rData) {
                      const roundTime =
                        typeof rData.tiempo === 'number'
                          ? rData.tiempo
                          : typeof rData.time === 'number'
                          ? rData.time
                          : undefined;
                      if (roundTime !== undefined) totalTime += roundTime;
                      parsedRondas[roundIndex] = {
                        tiempo: roundTime,
                        completada:
                          rData.completada === true ||
                          rData.completed === true ||
                          rData.esCorrecto === true,
                        esCorrecto: rData.esCorrecto !== undefined ? rData.esCorrecto : true,
                        fecha: rData.fecha,
                      };
                    }
                  });
                }

                // Si aún no tenía mapa de rondas pero tenía tiempo registrado para la ronda 1
                if (Object.keys(parsedRondas).length === 0 && val?.tiempo !== undefined) {
                  parsedRondas[1] = {
                    tiempo: val.tiempo,
                    completada: val?.estado === 'terminado' || val?.isFinished === true,
                    esCorrecto: val?.esCorrecto,
                  };
                  totalTime += val.tiempo;
                }

                const currentRound = val?.rondaActual || val?.ronda || val?.currentRound || 1;
                const isFinished =
                  val?.estado === 'terminado' ||
                  val?.isFinished === true ||
                  val?.status === 'finished' ||
                  (selectedRounds > 0 && currentRound > selectedRounds);

                // Nombre real ingresado por el alumno al registrarse
                const realName =
                  (typeof val?.nombre === 'string' && val.nombre.trim()) ||
                  (typeof val?.name === 'string' && val.name.trim()) ||
                  (typeof val?.alias === 'string' && val.alias.trim()) ||
                  'Participante';

                return {
                  id,
                  name: realName,
                  status: isFinished ? 'terminado' : val?.estado || val?.status || 'jugando',
                  currentRound,
                  isFinished,
                  time: val?.tiempo,
                  isCorrect: val?.esCorrecto,
                  connected: val?.conectado !== false,
                  rondas: parsedRondas,
                  totalTime: totalTime > 0 ? +totalTime.toFixed(1) : undefined,
                };
              }
            );
            setConnectedPlayers(playersList);
          } else {
            setConnectedPlayers([]);
          }
        },
        (error) => {
          console.warn('Aviso escuchando jugadores en tiempo real:', error);
        }
      );
    } catch (e) {
      console.warn('Error en RTDB:', e);
      if (isCurrent) setIsConnecting(false);
    }

    return () => {
      isCurrent = false;
      mountedRef.current = false;
      if (activePlayersRef) {
        try {
          off(activePlayersRef);
        } catch {
          // silent cleanup
        }
      }
    };
  }, [stage, roomCode, selectedSize, selectedMode, selectedTimeLimit, selectedRounds, currentSeed]);

  // Acción: Confirmar configuración y pasar al Lobby QR (Etapa 1 -> Etapa 2)
  const handleConfirmConfigAndCreateRoom = () => {
    onUpdateConfig({
      rows: selectedSize,
      cols: selectedSize,
      studentMode: selectedMode,
      timeLimitSeconds: selectedTimeLimit,
      roundsCount: selectedRounds,
    });
    onRegenerateSeed();
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomCode(newCode);
    setConnectedPlayers([]);
    setStage(2);
  };

  // Copiar enlace al portapapeles
  const handleCopyLink = () => {
    if (!studentUrl) return;
    try {
      navigator.clipboard.writeText(studentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback manual
      const ta = document.createElement('textarea');
      ta.value = studentUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  // Acción: Iniciar Dinámica (Etapa 2 -> Etapa 3)
  const handleStartDynamic = () => {
    setStage(3);

    try {
      const rtdb = getFirebaseRtdb();
      if (rtdb && roomCode) {
        // Actualizar estado de la sala a 'jugando' para desbloquear a los alumnos
        update(ref(rtdb, `salas/${roomCode}`), {
          estado: 'jugando',
          status: 'playing',
          rondaActual: 1,
          iniciadoEn: serverTimestamp(),
        }).catch((err) => console.warn('Error iniciando sala:', err));

        // Poner a todos los jugadores en estado 'jugando' en ronda 1
        if (connectedPlayers.length > 0) {
          connectedPlayers.forEach((p) => {
            update(ref(rtdb, `salas/${roomCode}/jugadores/${p.id}`), {
              estado: 'jugando',
              status: 'playing',
              isFinished: false,
              rondaActual: 1,
            }).catch(() => {});
          });
        }
      }
    } catch (e) {
      console.warn('Error al iniciar dinámica en RTDB:', e);
    }
  };

  // Acción: Finalizar Dinámica -> Transición al Podio de Ganadores (Etapa 4)
  const handleEndDynamic = async () => {
    try {
      const rtdb = getFirebaseRtdb();
      if (rtdb && roomCode) {
        await update(ref(rtdb, `salas/${roomCode}`), {
          estado: 'podio',
          status: 'podium',
          finalizadoEn: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn('Aviso notificando estado de podio en Firebase:', err);
    }

    // Cambiar a la pantalla de Podio y Premiación
    setStage(4);
  };

  // Acción: Reiniciar con misma sala (vuelve al lobby manteniendo a los alumnos)
  const handleRestartSameRoom = async () => {
    try {
      const rtdb = getFirebaseRtdb();
      if (rtdb && roomCode) {
        // Actualizar estado de la sala a 'esperando'
        await update(ref(rtdb, `salas/${roomCode}`), {
          estado: 'esperando',
          status: 'waiting',
          rondaActual: 1,
          reiniciadoEn: serverTimestamp(),
        });

        // Restablecer el estado de cada participante
        if (connectedPlayers.length > 0) {
          const updates: Record<string, any> = {};
          connectedPlayers.forEach((p) => {
            updates[`salas/${roomCode}/jugadores/${p.id}/estado`] = 'esperando';
            updates[`salas/${roomCode}/jugadores/${p.id}/status`] = 'waiting';
            updates[`salas/${roomCode}/jugadores/${p.id}/rondaActual`] = 1;
            updates[`salas/${roomCode}/jugadores/${p.id}/rondas`] = null;
            updates[`salas/${roomCode}/jugadores/${p.id}/tiempo`] = null;
            updates[`salas/${roomCode}/jugadores/${p.id}/isFinished`] = false;
          });
          await update(ref(rtdb), updates);
        }
      }
    } catch (err) {
      console.warn('Aviso reiniciando con misma sala:', err);
    }

    setStage(2);
  };

  // Acción: Salir a Configuración (cierra la sala actual y regresa a la pantalla de configuración inicial)
  const handleExitToConfig = async () => {
    try {
      const rtdb = getFirebaseRtdb();
      if (rtdb && roomCode) {
        await update(ref(rtdb, `salas/${roomCode}`), {
          estado: 'finalizada',
          status: 'finished',
          finalizadoEn: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn('Aviso finalizando dinámica en Firebase:', err);
    }

    setStage(1);
    setConnectedPlayers([]);
    setRoomCode(Math.floor(1000 + Math.random() * 9000).toString());
  };

  // Lanzamiento manual de confeti para el podio
  const handleLaunchManualConfetti = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#fef08a', '#10b981', '#3b82f6', '#ec4899', '#ffffff'],
        zIndex: 9999,
      });
    } catch {}
  };

  // Animación continua de fuegos artificiales y confeti en el Podio (Etapa 4)
  useEffect(() => {
    if (stage !== 4) return;

    // Disparo inicial explosivo de confeti dorado y multicolor
    try {
      const count = 220;
      const defaults = { origin: { y: 0.7 }, zIndex: 9999 };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    } catch {}

    // Ráfagas continuas de fuegos artificiales desde los laterales
    const interval = setInterval(() => {
      try {
        // Ráfaga izquierda
        confetti({
          particleCount: 28,
          angle: 60,
          spread: 55,
          origin: { x: 0.05, y: 0.7 },
          colors: ['#f59e0b', '#fbbf24', '#fef08a', '#10b981', '#3b82f6', '#ec4899'],
          zIndex: 9999,
        });
        // Ráfaga derecha
        confetti({
          particleCount: 28,
          angle: 120,
          spread: 55,
          origin: { x: 0.95, y: 0.7 },
          colors: ['#f59e0b', '#fbbf24', '#fef08a', '#10b981', '#3b82f6', '#ec4899'],
          zIndex: 9999,
        });
      } catch {}
    }, 2200);

    return () => {
      clearInterval(interval);
      try {
        confetti.reset();
      } catch {}
    };
  }, [stage]);

  // Cálculo del Podio (Top 3):
  // Ordena según rondas completadas descendente y tiempo total acumulado ascendente
  const rankedPlayers = useMemo(() => {
    if (!connectedPlayers || connectedPlayers.length === 0) return [];

    return [...connectedPlayers]
      .map((p) => {
        let sumTime = 0;
        let completedCount = 0;

        if (p.rondas && typeof p.rondas === 'object') {
          Object.values(p.rondas).forEach((r) => {
            if (r && typeof r.tiempo === 'number' && r.tiempo > 0 && r.completada) {
              sumTime += r.tiempo;
              completedCount++;
            }
          });
        } else if (typeof p.time === 'number' && p.time > 0) {
          sumTime = p.time;
          completedCount = 1;
        } else if (typeof p.totalTime === 'number' && p.totalTime > 0) {
          sumTime = p.totalTime;
          completedCount = 1;
        }

        return {
          id: p.id,
          name: p.name || 'Participante',
          totalTime: sumTime > 0 ? +sumTime.toFixed(1) : 0,
          completedRounds: completedCount,
          hasTime: sumTime > 0,
        };
      })
      .sort((a, b) => {
        // Prioridad 1: Más rondas completadas
        if (b.completedRounds !== a.completedRounds) {
          return b.completedRounds - a.completedRounds;
        }
        // Prioridad 2: Menor tiempo total acumulado (más rápido)
        if (a.hasTime && b.hasTime) {
          return a.totalTime - b.totalTime;
        }
        if (a.hasTime) return -1;
        if (b.hasTime) return 1;
        return 0;
      });
  }, [connectedPlayers]);

  const firstPlace = rankedPlayers[0] || null;
  const secondPlace = rankedPlayers[1] || null;
  const thirdPlace = rankedPlayers[2] || null;
  const otherPlaces = rankedPlayers.slice(3);

  // Acción de Pantalla Completa segura por clic del usuario
  const handleToggleFullscreenDirect = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.warn('Aviso pantalla completa:', err);
          });
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch((err) => {
            console.warn('Aviso saliendo de pantalla completa:', err);
          });
        }
      }
    } catch (err) {
      console.warn('Excepción de pantalla completa:', err);
    }
  };

  // Números de rondas para columnas del monitor
  const roundNumbers = useMemo(() => {
    const count = selectedRounds > 0 ? selectedRounds : 5;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selectedRounds]);

  return (
    <div
      id="teacher-dashboard"
      className="h-full w-full overflow-y-auto bg-stone-950 text-stone-100 p-3 sm:p-6 select-none"
    >
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header con Controles Superiores */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {stage === 1 && 'Paso 1: Configuración de la Sala'}
                  {stage === 2 && 'Paso 2: Lobby QR y Participantes'}
                  {stage === 3 && 'Paso 3: Monitor de Ronda Activa'}
                  {stage === 4 && 'Paso 4: ¡Gran Final y Premiación!'}
                </span>
                {isConnecting && stage !== 1 && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Sincronizando...
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white font-cinzel tracking-tight">
                Panel del Instructor
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggleFullscreenDirect}
              className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white text-xs font-semibold cursor-pointer border border-stone-700/80 flex items-center gap-1.5 transition-colors"
              title="Alternar Pantalla Completa"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Pantalla Completa</span>
            </button>

            <button
              onClick={onBackToApp}
              className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold cursor-pointer border border-stone-700 flex items-center gap-1.5 transition-colors"
              title="Volver a la pantalla principal"
            >
              <X className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* =======================================================
            ETAPA 1: CONFIGURACIÓN INICIAL DE LA SALA
            Elegir tamaño (3x3, 4x4, 5x5), tiempo, modo y rondas.
            ======================================================= */}
        {stage === 1 && (
          <section
            id="teacher-stage-config"
            className="space-y-6 animate-in fade-in duration-200"
          >
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 font-cinzel">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <span>Configuración de la Dinámica</span>
                </h2>
                <p className="text-xs sm:text-sm text-stone-400 mt-1">
                  Personaliza los parámetros del ejercicio antes de abrir la sala para tus alumnos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* 1. Tamaño de Cuadrícula */}
                <div className="space-y-3">
                  <label className="text-xs uppercase font-extrabold tracking-wider text-stone-300 flex items-center gap-1.5">
                    <span>Tamaño de Cuadrícula</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { size: 3, label: '3×3', desc: '9 casillas' },
                      { size: 4, label: '4×4', desc: '16 casillas' },
                      { size: 5, label: '5×5', desc: '25 casillas' },
                    ].map((item) => (
                      <button
                        key={item.size}
                        type="button"
                        onClick={() => setSelectedSize(item.size)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          selectedSize === item.size
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                        }`}
                      >
                        <span className="text-lg font-black font-mono">{item.label}</span>
                        <span className="text-[10px] mt-0.5 opacity-80">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Modo de Juego */}
                <div className="space-y-3">
                  <label className="text-xs uppercase font-extrabold tracking-wider text-stone-300">
                    Modo del Alumno
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'reduccion', name: 'Descarte 9s', desc: 'Regla del 9' },
                      { id: 'tradicional', name: 'Tradicional', desc: 'Suma mental' },
                      { id: 'libre', name: 'Libre', desc: 'Elige modo' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMode(m.id as any)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          selectedMode === m.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-bold">{m.name}</span>
                        <span className="text-[10px] mt-0.5 opacity-80">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Número de Rondas */}
                <div className="space-y-3">
                  <label className="text-xs uppercase font-extrabold tracking-wider text-stone-300">
                    Número de Rondas Asignadas
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { rounds: 1, label: '1 ronda' },
                      { rounds: 3, label: '3 rondas' },
                      { rounds: 5, label: '5 rondas' },
                      { rounds: 10, label: '10 rondas' },
                    ].map((r) => (
                      <button
                        key={r.rounds}
                        type="button"
                        onClick={() => setSelectedRounds(r.rounds)}
                        className={`py-2.5 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          selectedRounds === r.rounds
                            ? 'bg-amber-500 text-stone-950 border-amber-400 font-extrabold shadow-sm'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Tiempo Límite por Ronda */}
                <div className="space-y-3">
                  <label className="text-xs uppercase font-extrabold tracking-wider text-stone-300">
                    Tiempo Límite por Ronda
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { sec: 0, label: 'Sin límite' },
                      { sec: 30, label: '30 seg' },
                      { sec: 60, label: '60 seg' },
                      { sec: 120, label: '2 min' },
                    ].map((t) => (
                      <button
                        key={t.sec}
                        type="button"
                        onClick={() => setSelectedTimeLimit(t.sec)}
                        className={`py-2.5 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          selectedTimeLimit === t.sec
                            ? 'bg-amber-500 text-stone-950 border-amber-400 font-extrabold shadow-sm'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botón de Confirmación para pasar a Etapa 2 */}
              <div className="pt-4 border-t border-stone-800 flex justify-end">
                <button
                  id="btn-confirm-config"
                  type="button"
                  onClick={handleConfirmConfigAndCreateRoom}
                  className="w-full sm:w-auto px-7 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-95"
                >
                  <span>Crear Sala y Generar QR</span>
                  <Play className="w-4 h-4 fill-stone-950" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =======================================================
            ETAPA 2: LOBBY QR Y PARTICIPANTES EN VIVO
            Código numérico (ej. 8520), QR proyectable,
            lista de participantes y botón "Iniciar Dinámica".
            ======================================================= */}
        {stage === 2 && (
          <section
            id="teacher-stage-lobby"
            className="space-y-6 animate-in fade-in duration-200"
          >
            {/* Tarjeta de Código de Sala y QR */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              {/* Bloque Izquierdo: Datos de la sala */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-400 uppercase tracking-widest">
                    <span>Sala de Aula Activa</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-4xl sm:text-6xl font-black text-white font-mono tracking-wider">
                      {roomCode}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-stone-400">
                      ({selectedSize}×{selectedSize} • {selectedMode})
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-300 mt-2">
                    Comparte este código numérico o proyecta el código QR para que los alumnos ingresen desde su dispositivo.
                  </p>
                </div>

                {/* Enlace directo para compartir */}
                <div className="space-y-2">
                  <label className="text-[11px] uppercase font-bold text-stone-400">
                    Enlace de Acceso Directo:
                  </label>
                  <div className="flex items-center gap-2 bg-stone-950 p-2 rounded-2xl border border-stone-800">
                    <input
                      type="text"
                      readOnly
                      value={studentUrl}
                      className="bg-transparent text-xs text-stone-300 font-mono flex-1 outline-none px-2 select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-stone-700 transition-colors"
                      title="Copiar enlace al portapapeles"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-stone-400" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Acciones de Pizarra y Ajustes */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setStage(1)}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold cursor-pointer border border-stone-700 transition-colors"
                  >
                    Modificar Configuración
                  </button>
                  <button
                    onClick={onLaunchStudentView}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-xl text-xs font-semibold cursor-pointer border border-stone-700 transition-colors"
                  >
                    Probar como Alumno
                  </button>
                </div>
              </div>

              {/* Bloque Derecho: QR Interactivo */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-stone-950 rounded-2xl border border-stone-800 text-center space-y-3">
                <div
                  onClick={() => setIsQrModalOpen(true)}
                  className="bg-white p-3 rounded-2xl shadow-xl cursor-pointer hover:scale-105 transition-transform w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center"
                  title="Haz clic para agrandar el código QR"
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR de Acceso Sala ${roomCode}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
                  )}
                </div>
                <button
                  onClick={() => setIsQrModalOpen(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Agrandar QR para Proyector</span>
                </button>
              </div>
            </div>

            {/* Panel de Participantes en Vivo */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    PARTICIPANTES CONECTADOS ({connectedPlayers.length})
                  </h3>
                </div>
                <div className="text-xs text-stone-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Escuchando en tiempo real</span>
                </div>
              </div>

              {connectedPlayers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {connectedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="bg-stone-950 border border-stone-800/90 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-stone-200 truncate">
                        {player.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-stone-400 space-y-2">
                  <UserCheck className="w-8 h-8 text-stone-600 mx-auto" />
                  <p className="text-xs sm:text-sm">
                    Aún no hay participantes conectados en la sala <strong className="text-amber-400">{roomCode}</strong>.
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Pide a los alumnos escanear el QR o abrir el enlace con su dispositivo móvil.
                  </p>
                </div>
              )}

              {/* Botón Principal: "Iniciar Dinámica" */}
              <div className="pt-3 border-t border-stone-800 flex justify-end">
                <button
                  id="btn-start-dynamic"
                  onClick={handleStartDynamic}
                  disabled={connectedPlayers.length === 0}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                    connectedPlayers.length > 0
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-emerald-500/20 transform active:scale-95'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                  }`}
                  title={
                    connectedPlayers.length === 0
                      ? 'Esperando a que al menos un participante ingrese a la sala'
                      : 'Comenzar la dinámica para todos los alumnos'
                  }
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {connectedPlayers.length === 0
                      ? 'Esperando Participantes...'
                      : `Iniciar Dinámica (${connectedPlayers.length} alumnos)`}
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =======================================================
            ETAPA 3: MONITOR DE RONDA ACTIVA
            Muestra el progreso de cada alumno en columnas claras por ronda.
            Avance autónomo de cada participante.
            Botón "Finalizar Dinámica" para cerrar la sala y volver a etapa 1.
            ======================================================= */}
        {stage === 3 && (
          <section
            id="teacher-stage-live"
            className="space-y-6 animate-in fade-in duration-200"
          >
            {/* Barra superior de control del Monitor */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                  SALA {roomCode}
                </span>
                <span className="text-xs font-bold text-sky-400 uppercase">
                  Cuadrícula {selectedSize}×{selectedSize} • {selectedMode} • {selectedRounds} Rondas
                </span>
              </div>

              {/* Botones de Acción: Pizarra Gigante y Finalizar Dinámica */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onLaunchProjector}
                  className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl border border-stone-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Abrir la Pizarra Gigante para proyectar"
                >
                  <Tv className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pizarra Gigante</span>
                </button>

                <button
                  id="btn-finish-dynamic"
                  onClick={handleEndDynamic}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg hover:shadow-rose-600/30 cursor-pointer transition-all flex items-center gap-2"
                  title="Finalizar la dinámica y regresar a la configuración inicial"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Finalizar Dinámica</span>
                </button>
              </div>
            </div>

            {/* Panel de Progreso de Participantes Estructurado en Columnas */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm sm:text-base font-bold text-stone-100">
                    Progreso en Tiempo Real ({connectedPlayers.length} Participantes)
                  </h3>
                </div>
                <div className="text-xs text-stone-400 flex items-center gap-3">
                  <span>
                    Completados:{' '}
                    <strong className="text-emerald-400">
                      {connectedPlayers.filter((p) => p.isFinished).length}
                    </strong>{' '}
                    / {connectedPlayers.length}
                  </span>
                </div>
              </div>

              {connectedPlayers.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[650px] space-y-2">
                    {/* Encabezado de la Tabla */}
                    <div className="flex items-center px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800/80">
                      <div className="w-48 sm:w-56 shrink-0">Participante</div>
                      <div
                        className="flex-1 grid gap-2"
                        style={{
                          gridTemplateColumns: `repeat(${roundNumbers.length}, minmax(0, 1fr))`,
                        }}
                      >
                        {roundNumbers.map((rNum) => (
                          <div key={rNum} className="text-center font-mono">
                            Ronda {rNum}
                          </div>
                        ))}
                      </div>
                      <div className="w-28 shrink-0 text-right">Estado</div>
                    </div>

                    {/* Filas por Participante */}
                    {connectedPlayers.map((player) => {
                      const isFinishedAll =
                        player.isFinished ||
                        (selectedRounds > 0 && player.currentRound > selectedRounds);

                      return (
                        <div
                          key={player.id}
                          className={`px-4 py-3 rounded-2xl border transition-all flex items-center gap-3 ${
                            isFinishedAll
                              ? 'bg-emerald-950/20 border-emerald-500/30'
                              : 'bg-stone-950/80 border-stone-800'
                          }`}
                        >
                          {/* Columna 1: Identidad (Nombre Real) */}
                          <div className="w-48 sm:w-56 shrink-0 flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                                isFinishedAll
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <div
                                className="font-bold text-sm text-white truncate"
                                title={player.name}
                              >
                                {player.name}
                              </div>
                              <div className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                                {isFinishedAll ? (
                                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Completado
                                  </span>
                                ) : (
                                  <span className="text-amber-400 font-medium">
                                    En ronda {Math.min(player.currentRound, selectedRounds)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Columnas de Rondas (una sección por cada ronda) */}
                          <div
                            className="flex-1 grid gap-2"
                            style={{
                              gridTemplateColumns: `repeat(${roundNumbers.length}, minmax(0, 1fr))`,
                            }}
                          >
                            {roundNumbers.map((rNum) => {
                              const rData = player.rondas?.[rNum];
                              const isCompleted =
                                rData?.completada || rData?.tiempo !== undefined;
                              const isCurrent = player.currentRound === rNum && !isFinishedAll;

                              // Estado 1: Completado con tiempo registrado
                              if (isCompleted) {
                                return (
                                  <div
                                    key={rNum}
                                    className="bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 rounded-xl py-2 px-1.5 flex flex-col items-center justify-center gap-0.5 shadow-sm"
                                    title={`Ronda ${rNum} completada en ${rData?.tiempo ?? 0}s`}
                                  >
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="font-mono font-bold text-xs sm:text-sm text-emerald-200">
                                        {rData?.tiempo !== undefined
                                          ? `${rData.tiempo.toFixed(1)}s`
                                          : '✓'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }

                              // Estado 2: En juego activo
                              if (isCurrent) {
                                return (
                                  <div
                                    key={rNum}
                                    className="bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-xl py-2 px-1.5 flex flex-col items-center justify-center gap-1 shadow-sm"
                                    title={`Ronda ${rNum} en progreso`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                                      <span className="text-[11px] font-bold text-amber-300 tracking-tight">
                                        En juego...
                                      </span>
                                    </div>
                                  </div>
                                );
                              }

                              // Estado 3: Pendiente / Bloqueada
                              return (
                                <div
                                  key={rNum}
                                  className="bg-stone-950/40 border border-stone-800 text-stone-600 rounded-xl py-2 px-1.5 flex flex-col items-center justify-center gap-0.5"
                                  title={`Ronda ${rNum} pendiente`}
                                >
                                  <span className="font-mono text-xs text-stone-600">—</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Columna Final: Resumen */}
                          <div className="w-28 shrink-0 text-right">
                            {isFinishedAll ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                                <Trophy className="w-3 h-3 text-amber-400" />
                                {player.totalTime ? `${player.totalTime}s` : 'Listo'}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 rounded-lg bg-stone-950 text-stone-400 border border-stone-800 text-[11px] font-medium">
                                {Object.keys(player.rondas || {}).length}/{selectedRounds} rds
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-stone-400 space-y-2">
                  <Clock className="w-8 h-8 text-stone-600 mx-auto" />
                  <div className="text-amber-400 font-bold text-sm">
                    Ronda activa: Cuadrícula {selectedSize}×{selectedSize} en juego
                  </div>
                  <p className="text-xs text-stone-400 max-w-md mx-auto">
                    Los alumnos avanzan ronda a ronda de forma autónoma. Conforme envíen sus respuestas correctas, verás sus tiempos actualizados de inmediato en cada casilla.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 4: ¡GRAN FINAL Y PREMIACIÓN! (PODIO DE GANADORES)                   */}
        {/* ========================================================================= */}
        {stage === 4 && (
          <section
            id="teacher-stage-podium"
            className="space-y-8 animate-in fade-in zoom-in-95 duration-500"
          >
            {/* Cabecera Triunfal de Premiación */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-500/15 via-stone-900/90 to-stone-950 border border-amber-500/30 p-6 sm:p-10 text-center shadow-2xl">
              {/* Resplandor de fondo */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />

              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-extrabold uppercase tracking-widest shadow-lg shadow-amber-500/20">
                  <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>¡Gran Final y Premiación!</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>

                <h2 className="text-3xl sm:text-5xl font-black text-white font-cinzel tracking-tight drop-shadow-md">
                  Podio de Campeones
                </h2>

                <p className="text-sm sm:text-base text-stone-300 max-w-xl mx-auto">
                  Clasificación final calculada por tiempo total acumulado en las rondas de la cuadrícula {selectedSize}×{selectedSize}.
                </p>

                <div className="flex items-center justify-center gap-4 text-xs font-mono text-amber-400/80 pt-1">
                  <span>Sala: {roomCode}</span>
                  <span>•</span>
                  <span>{selectedRounds} Rondas</span>
                  <span>•</span>
                  <span>{connectedPlayers.length} Participantes</span>
                </div>
              </div>
            </div>

            {/* Estructura del Podio Olímpico (Top 3) */}
            {rankedPlayers.length === 0 ? (
              <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-12 text-center text-stone-400 space-y-3">
                <Trophy className="w-12 h-12 text-stone-600 mx-auto" />
                <h3 className="text-lg font-bold text-white">Sin registros de tiempo</h3>
                <p className="text-xs max-w-md mx-auto text-stone-400">
                  Los participantes aún no completaron rondas registradas en esta dinámica.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Visualización del Podio 3D / Escalones */}
                <div className="bg-stone-900/40 border border-stone-800/80 rounded-3xl p-4 sm:p-8 pt-8 sm:pt-14 shadow-2xl overflow-hidden relative">
                  {/* Luz ambiental dorada central */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-500/10 blur-3xl pointer-events-none" />

                  <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-3xl mx-auto min-h-[360px] sm:min-h-[440px] px-2 sm:px-4">
                    {/* 2.º Lugar - Plata 🥈 (Lado Izquierdo, escalón medio) */}
                    {secondPlace ? (
                      <div className="flex-1 max-w-[200px] sm:max-w-[220px] flex flex-col items-center">
                        {/* Avatar y Datos del 2.º Lugar */}
                        <div className="flex flex-col items-center text-center mb-3 w-full animate-in fade-in slide-in-from-bottom-6 duration-700">
                          <div className="relative mb-2">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border-2 border-slate-300 flex items-center justify-center text-slate-200 font-black text-lg sm:text-xl shadow-[0_0_20px_rgba(203,213,225,0.3)]">
                              {secondPlace.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -top-2.5 -right-2 w-6 h-6 rounded-full bg-slate-200 text-stone-950 font-black text-xs flex items-center justify-center shadow-md">
                              🥈
                            </div>
                          </div>

                          <h4
                            className="font-bold text-sm sm:text-base text-stone-100 truncate w-full px-1"
                            title={secondPlace.name}
                          >
                            {secondPlace.name}
                          </h4>

                          <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-300 text-stone-950 font-black font-mono text-xs sm:text-sm shadow-sm flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{secondPlace.totalTime > 0 ? `${secondPlace.totalTime}s` : 'Completado'}</span>
                          </div>

                          <span className="text-[11px] text-stone-400 font-medium mt-0.5">
                            {secondPlace.completedRounds} {secondPlace.completedRounds === 1 ? 'ronda' : 'rondas'}
                          </span>
                        </div>

                        {/* Pedestal de Plata */}
                        <div className="w-full h-44 sm:h-56 rounded-t-2xl sm:rounded-t-3xl border-t-2 border-x-2 border-slate-400/80 bg-gradient-to-b from-slate-400/30 via-slate-900/80 to-stone-950 flex flex-col items-center justify-start pt-4 sm:pt-6 shadow-[0_0_25px_rgba(203,213,225,0.15)] relative">
                          <span className="text-4xl sm:text-6xl font-black font-cinzel text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.4)]">
                            2
                          </span>
                          <span className="text-[10px] sm:text-xs font-black tracking-widest text-slate-300 uppercase px-2.5 py-0.5 rounded-full bg-slate-400/20 border border-slate-300/30 mt-1 sm:mt-2">
                            Plata
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 max-w-[200px] hidden sm:block opacity-0" />
                    )}

                    {/* 1.er Lugar - Oro 🥇 (Posición Central, escalón más alto) */}
                    {firstPlace && (
                      <div className="flex-1 max-w-[220px] sm:max-w-[260px] flex flex-col items-center z-10">
                        {/* Avatar y Datos del 1.er Lugar */}
                        <div className="flex flex-col items-center text-center mb-3 w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
                          <Crown className="w-7 h-7 text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] mb-1 animate-pulse" />

                          <div className="relative mb-2">
                            <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-amber-500/20 border-3 border-amber-400 flex items-center justify-center text-amber-300 font-black text-2xl sm:text-3xl shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                              {firstPlace.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -top-2.5 -right-2 w-7 h-7 rounded-full bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center shadow-lg">
                              🥇
                            </div>
                          </div>

                          <h4
                            className="font-black text-base sm:text-lg text-white truncate w-full px-1 tracking-tight"
                            title={firstPlace.name}
                          >
                            {firstPlace.name}
                          </h4>

                          <div className="mt-1 px-3.5 py-1 rounded-full bg-amber-400 text-stone-950 font-black font-mono text-sm sm:text-base shadow-lg shadow-amber-500/40 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 stroke-[2.5]" />
                            <span>{firstPlace.totalTime > 0 ? `${firstPlace.totalTime}s` : 'Completado'}</span>
                          </div>

                          <span className="text-xs text-amber-300 font-semibold mt-0.5">
                            {firstPlace.completedRounds} {firstPlace.completedRounds === 1 ? 'ronda' : 'rondas'} completadas
                          </span>
                        </div>

                        {/* Pedestal de Oro */}
                        <div className="w-full h-60 sm:h-76 rounded-t-2xl sm:rounded-t-3xl border-t-2 border-x-2 border-amber-400 bg-gradient-to-b from-amber-500/40 via-amber-950/80 to-stone-950 flex flex-col items-center justify-start pt-5 sm:pt-7 shadow-[0_0_35px_rgba(245,158,11,0.3)] relative">
                          <span className="text-6xl sm:text-8xl font-black font-cinzel text-amber-400 drop-shadow-[0_0_25px_rgba(245,158,11,0.6)]">
                            1
                          </span>
                          <span className="text-xs sm:text-sm font-black tracking-widest text-amber-300 uppercase px-3 py-1 rounded-full bg-amber-500/25 border border-amber-400/50 mt-1 sm:mt-2 shadow-sm">
                            Campeón Oro
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 3.er Lugar - Bronce 🥉 (Lado Derecho, escalón bajo) */}
                    {thirdPlace ? (
                      <div className="flex-1 max-w-[200px] sm:max-w-[220px] flex flex-col items-center">
                        {/* Avatar y Datos del 3.er Lugar */}
                        <div className="flex flex-col items-center text-center mb-3 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                          <div className="relative mb-2">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-950/60 border-2 border-amber-700 flex items-center justify-center text-amber-400 font-black text-lg sm:text-xl shadow-[0_0_15px_rgba(180,83,9,0.3)]">
                              {thirdPlace.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -top-2.5 -right-2 w-6 h-6 rounded-full bg-amber-700 text-stone-100 font-black text-xs flex items-center justify-center shadow-md">
                              🥉
                            </div>
                          </div>

                          <h4
                            className="font-bold text-sm sm:text-base text-stone-200 truncate w-full px-1"
                            title={thirdPlace.name}
                          >
                            {thirdPlace.name}
                          </h4>

                          <div className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-800 text-amber-100 font-black font-mono text-xs sm:text-sm shadow-sm flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{thirdPlace.totalTime > 0 ? `${thirdPlace.totalTime}s` : 'Completado'}</span>
                          </div>

                          <span className="text-[11px] text-stone-400 font-medium mt-0.5">
                            {thirdPlace.completedRounds} {thirdPlace.completedRounds === 1 ? 'ronda' : 'rondas'}
                          </span>
                        </div>

                        {/* Pedestal de Bronce */}
                        <div className="w-full h-32 sm:h-40 rounded-t-2xl sm:rounded-t-3xl border-t-2 border-x-2 border-amber-700/80 bg-gradient-to-b from-amber-800/30 via-amber-950/80 to-stone-950 flex flex-col items-center justify-start pt-3 sm:pt-5 shadow-[0_0_20px_rgba(180,83,9,0.15)] relative">
                          <span className="text-4xl sm:text-5xl font-black font-cinzel text-amber-600 drop-shadow-[0_0_15px_rgba(217,119,6,0.3)]">
                            3
                          </span>
                          <span className="text-[10px] sm:text-xs font-black tracking-widest text-amber-400 uppercase px-2.5 py-0.5 rounded-full bg-amber-800/30 border border-amber-700/40 mt-1 sm:mt-2">
                            Bronce
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 max-w-[200px] hidden sm:block opacity-0" />
                    )}
                  </div>
                </div>

                {/* Tabla de Clasificación General (4.º en adelante si existen) */}
                {otherPlaces.length > 0 && (
                  <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span>Tabla General de Posiciones</span>
                      </h3>
                      <span className="text-xs text-stone-400">
                        {otherPlaces.length} participantes adicionales
                      </span>
                    </div>

                    <div className="divide-y divide-stone-800/80">
                      {otherPlaces.map((player, idx) => {
                        const rankNum = idx + 4;
                        return (
                          <div
                            key={player.id}
                            className="py-3 flex items-center justify-between gap-3 text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-xl bg-stone-800 text-stone-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                #{rankNum}
                              </span>
                              <div className="w-8 h-8 rounded-xl bg-stone-800 text-stone-200 font-bold text-xs flex items-center justify-center shrink-0">
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-stone-200">{player.name}</span>
                            </div>

                            <div className="flex items-center gap-4 text-right">
                              <span className="text-xs text-stone-400 hidden sm:inline">
                                {player.completedRounds} {player.completedRounds === 1 ? 'ronda' : 'rondas'}
                              </span>
                              <span className="font-mono font-bold text-xs sm:text-sm text-stone-200 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700/60">
                                {player.totalTime > 0 ? `${player.totalTime}s` : '—'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Barra de Controles de la Dinámica para el Instructor */}
            <div className="bg-stone-900/90 border border-stone-800/90 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Controles de Dinámica</h4>
                  <p className="text-xs text-stone-400">
                    Sala {roomCode} • {connectedPlayers.length} alumnos registrados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap justify-end">
                <button
                  id="btn-podium-more-confetti"
                  onClick={handleLaunchManualConfetti}
                  className="px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold rounded-xl text-xs sm:text-sm border border-stone-700 cursor-pointer flex items-center gap-2 transition-colors"
                  title="Lanzar ráfaga extra de confeti"
                >
                  <PartyPopper className="w-4 h-4 text-amber-400" />
                  <span>¡Más Confeti!</span>
                </button>

                <button
                  id="btn-podium-restart-room"
                  onClick={handleRestartSameRoom}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/25 cursor-pointer flex items-center gap-2 transition-all"
                  title="Reiniciar dinámica manteniendo el código y a los alumnos en el lobby"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  <span>Reiniciar con misma sala</span>
                </button>

                <button
                  id="btn-podium-exit-config"
                  onClick={handleExitToConfig}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold rounded-xl text-xs sm:text-sm border border-stone-700 cursor-pointer flex items-center gap-2 transition-colors"
                  title="Cerrar esta sala y regresar al menú de configuración inicial"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Salir a Configuración</span>
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Modal QR Gigante para Proyector / Pizarra */}
      {isQrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none animate-in fade-in duration-150"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-stone-900 border border-stone-700 rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <div className="text-left">
                <h3 className="font-bold text-lg text-white font-cinzel">Escanear para Unirse</h3>
                <p className="text-xs text-amber-400">
                  Sala {roomCode} • {selectedSize}×{selectedSize}
                </p>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-xl w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`QR Alumnos Sala ${roomCode}`}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <p className="text-xs sm:text-sm text-stone-300">
              Apunta con la cámara de tu móvil para ingresar directo sin registros.
            </p>

            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer border border-stone-700"
            >
              {copiedUrl ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-stone-400" />
              )}
              <span>{copiedUrl ? '¡Enlace copiado al portapapeles!' : 'Copiar enlace directo'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
