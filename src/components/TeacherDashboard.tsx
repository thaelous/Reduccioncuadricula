import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Settings,
  Grid,
  QrCode,
  Tv,
  Play,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  Clock,
  Maximize2,
  X,
  ExternalLink,
  HelpCircle,
  GraduationCap,
  Hash,
  Loader2,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { ref, set, onValue, off, serverTimestamp } from 'firebase/database';
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

interface ConnectedPlayer {
  id: string;
  name: string;
  status: 'thinking' | 'finished' | 'joined';
  currentRound?: number;
  isFinished?: boolean;
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
  const [stage, setStage] = useState<2 | 3>(2);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([]);
  const [roomCode, setRoomCode] = useState<string>(() =>
    Math.floor(1000 + Math.random() * 9000).toString()
  );

  const mountedRef = useRef(false);

  // Compute the direct student URL
  const studentUrl = React.useMemo(() => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' ? (window.location.pathname || '/') : '/';
      const params = new URLSearchParams();
      params.set('role', 'alumno');
      params.set('sala', roomCode);
      if (config) {
        params.set('m', config.studentMode || 'reduccion');
        params.set('r', String(config.rows || 4));
        params.set('c', String(config.cols || 4));
        if (config.roundsCount > 0) {
          params.set('rounds', String(config.roundsCount));
        }
        if (config.timeLimitSeconds > 0) {
          params.set('limit', String(config.timeLimitSeconds));
        }
      }
      params.set('seed', String(currentSeed || 100000));
      return `${origin}${pathname}?${params.toString()}`;
    } catch {
      return '';
    }
  }, [config, currentSeed, roomCode]);

  // Generar código QR de forma asíncrona y segura cuando el componente está montado
  useEffect(() => {
    let isCurrent = true;
    if (!studentUrl) return;

    QRCode.toDataURL(studentUrl, {
      width: 400,
      margin: 1.5,
      color: {
        dark: '#000000',
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

  // Conexión y sincronización con Firebase Realtime Database
  // Se ejecuta estricta y únicamente cuando el componente está montado
  useEffect(() => {
    mountedRef.current = true;
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

      activeRoomRef = ref(rtdb, `rooms/${roomCode}`);
      activePlayersRef = ref(rtdb, `rooms/${roomCode}/players`);

      // Registrar o sincronizar la sala en Firebase RTDB
      set(activeRoomRef, {
        config: {
          mode: config?.studentMode || 'reduccion',
          rows: config?.rows || 4,
          cols: config?.cols || 4,
          rounds: config?.roundsCount || 5,
          limit: config?.timeLimitSeconds || 0,
          seed: currentSeed,
        },
        status: stage === 3 ? 'playing' : 'waiting',
        currentRound: currentRound,
        updatedAt: serverTimestamp(),
      })
        .then(() => {
          if (isCurrent) {
            setIsConnecting(false);
          }
        })
        .catch((err) => {
          console.warn('Aviso conectando sala en Firebase RTDB:', err);
          if (isCurrent) {
            setIsConnecting(false);
          }
        });

      // Escuchar participantes en tiempo real
      onValue(
        activePlayersRef,
        (snapshot) => {
          if (!isCurrent) return;
          if (snapshot.exists()) {
            const data = snapshot.val();
            const playersList: ConnectedPlayer[] = Object.entries(data).map(
              ([id, val]: [string, any]) => ({
                id,
                name: val?.name || `Alumno ${id.slice(-4)}`,
                status: val?.isFinished ? 'finished' : (val?.status || 'thinking'),
                currentRound: val?.currentRound || 1,
                isFinished: !!val?.isFinished,
              })
            );
            setConnectedPlayers(playersList);
          } else {
            setConnectedPlayers([]);
          }
        },
        (error) => {
          console.warn('Aviso escuchando jugadores:', error);
        }
      );
    } catch (e) {
      console.warn('Error en inicialización RTDB:', e);
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
  }, [roomCode, currentSeed, config, stage, currentRound]);

  const handleCopyLink = async () => {
    try {
      if (!studentUrl) return;
      await navigator.clipboard.writeText(studentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2200);
    } catch (e) {
      console.warn('Clipboard error:', e);
    }
  };

  const handleCreateRoom = () => {
    onRegenerateSeed();
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomCode(newCode);
    setConnectedPlayers([]);
    setStage(2);
  };

  const handleStartGame = () => {
    setCurrentRound(1);
    setStage(3);
    try {
      const rtdb = getFirebaseRtdb();
      if (rtdb && roomCode) {
        set(ref(rtdb, `rooms/${roomCode}/status`), 'playing').catch(() => {});
        set(ref(rtdb, `rooms/${roomCode}/currentRound`), 1).catch(() => {});
      }
    } catch (e) {
      console.warn('Error actualizando estado a playing:', e);
    }
  };

  const handleNextRound = () => {
    const total = (config?.roundsCount && config.roundsCount > 0) ? config.roundsCount : 5;
    if (currentRound < total) {
      const nextRoundNum = currentRound + 1;
      setCurrentRound(nextRoundNum);
      onRegenerateSeed();
      try {
        const rtdb = getFirebaseRtdb();
        if (rtdb && roomCode) {
          set(ref(rtdb, `rooms/${roomCode}/currentRound`), nextRoundNum).catch(() => {});
        }
      } catch (e) {
        console.warn('Error actualizando ronda en RTDB:', e);
      }
    } else {
      setStage(2);
    }
  };

  // Botón directo y seguro para pantalla completa
  const handleToggleFullscreenDirect = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.warn('Aviso de pantalla completa:', err);
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

  return (
    <div
      id="teacher-dashboard"
      className="h-full w-full overflow-y-auto bg-stone-950 text-stone-100 p-3 sm:p-6"
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {stage === 2 ? 'Etapa 2: Lobby QR Multijugador' : 'Etapa 3: Monitor de Ronda Activa'}
                </span>
                {isConnecting && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Sincronizando...
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white font-cinzel">
                Panel Multijugador del Docente
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFullscreenDirect}
              className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white text-xs font-semibold cursor-pointer border border-stone-700 flex items-center gap-1.5 transition-colors"
              title="Alternar Pantalla Completa"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Pantalla Completa</span>
            </button>
            <a
              href="/reduccion_cuadricula_taller.html"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 transition-colors"
              title="Abrir versión en pestaña independiente"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Taller Completo</span>
            </a>
            <button
              onClick={onBackToApp}
              className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold cursor-pointer border border-stone-700 flex items-center gap-1.5 transition-colors"
              title="Cerrar panel y volver al tablero individual"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cerrar</span>
            </button>
          </div>
        </header>

        {/* =======================================================
            LOBBY DE ESPERA MULTIJUGADOR
            Izquierda: QR grande, código de sala, enlace.
            Derecha: Participantes Conectados en tiempo real.
            Botón inferior: Iniciar Ronda 1.
            ======================================================= */}
        <section
          id="teacher-stage-lobby"
          className={`space-y-6 ${stage !== 2 ? 'hidden' : ''}`}
        >
          <div className="flex items-center justify-between bg-stone-900 border border-stone-800 p-3 sm:p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Sala Creada:</span>
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 bg-stone-950 px-3 py-1 rounded-xl border border-stone-800">
                {roomCode}
              </span>
            </div>
            <button
              onClick={handleCreateRoom}
              className="text-xs bg-stone-800 hover:bg-stone-700 text-amber-300 px-3 py-1.5 rounded-xl border border-stone-700 cursor-pointer flex items-center gap-1.5 font-medium transition-colors"
              title="Generar nueva sala con otro código"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Nuevo Código</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* QR Grande y enlace */}
            <div className="bg-stone-900 border border-amber-500/30 rounded-3xl p-6 flex flex-col items-center text-center gap-4 shadow-2xl justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Escanea con tu teléfono para unirte</h3>
                <p className="text-xs text-stone-400 mt-1">
                  Cuadrícula {config?.rows || 4}×{config?.cols || 4} • Modo {config?.studentMode === 'tradicional' ? 'Tradicional' : 'Reducción'}
                </p>
              </div>

              <div
                className="bg-white p-3 rounded-2xl shadow-xl cursor-pointer group relative"
                onClick={() => setIsQrModalOpen(true)}
                title="Hacer clic para ampliar QR"
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Alumnos"
                    className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
                  />
                ) : (
                  <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center bg-stone-100 text-stone-600">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center text-white transition-opacity font-bold text-xs gap-1.5 backdrop-blur-[1px]">
                  <Maximize2 className="w-5 h-5 text-amber-300" />
                  <span>Ampliar QR</span>
                </div>
              </div>

              <div className="w-full space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={studentUrl}
                    className="flex-1 bg-stone-950 border border-stone-800 text-stone-400 text-xs px-3 py-2 rounded-xl font-mono truncate select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Participantes Conectados */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-3">
                  <h4 className="font-extrabold text-amber-400 uppercase text-sm tracking-wide flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Participantes Conectados ({connectedPlayers.length})</span>
                  </h4>
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    En línea
                  </span>
                </div>

                {connectedPlayers.length === 0 ? (
                  <div className="flex flex-col justify-center items-center text-center py-8 text-stone-400 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-stone-500">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed max-w-xs">
                      Proyecta este código QR en la pizarra o comparte el enlace. A medida que tus alumnos ingresen, sus nombres aparecerán aquí en vivo.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {connectedPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between bg-stone-950 px-3 py-2 rounded-xl border border-stone-800/80"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-stone-200">
                            {player.name}
                          </span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-stone-800 text-stone-300">
                          Listo
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-stone-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={onLaunchStudentView}
                  className="flex-1 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-xl border border-stone-700 cursor-pointer text-center transition-colors"
                >
                  Abrir vista previa de alumno
                </button>
                <button
                  onClick={onLaunchProjector}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs rounded-xl border border-stone-700 cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Proyector</span>
                </button>
              </div>
            </div>
          </div>

          {/* Botón inferior: Iniciar Ronda 1 */}
          <div className="pt-2 text-center">
            <button
              id="btn-start-round-react"
              onClick={handleStartGame}
              className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5"
            >
              <Play className="w-5 h-5 text-stone-950 fill-current" />
              <span>▶ Iniciar Ronda 1</span>
            </button>
          </div>
        </section>

        {/* =======================================================
            ETAPA 3: Monitor de Ronda Activa
            ======================================================= */}
        <section
          id="teacher-stage-live"
          className={`space-y-6 ${stage !== 3 ? 'hidden' : ''}`}
        >
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                RONDA {currentRound} / {(config?.roundsCount && config.roundsCount > 0) ? config.roundsCount : 'Libre'}
              </span>
              <span className="text-xs font-bold text-sky-400 uppercase">
                {config?.studentMode === 'tradicional'
                  ? 'Modo Tradicional'
                  : 'Modo Reducción'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onLaunchProjector}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl border border-stone-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5 text-amber-400" />
                <span>Pizarra Gigante</span>
              </button>
              <button
                id="btn-next-round-react"
                onClick={handleNextRound}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-extrabold rounded-xl shadow-md cursor-pointer transition-colors"
              >
                {currentRound < ((config?.roundsCount && config.roundsCount > 0) ? config.roundsCount : 5)
                  ? 'Siguiente Ronda →'
                  : 'Finalizar Partida'}
              </button>
            </div>
          </div>

          {/* Progreso en Vivo */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-200">Progreso de Alumnos en Vivo</h3>
              <span className="text-xs text-stone-400">
                Privacidad estricta: Respuestas protegidas
              </span>
            </div>

            {connectedPlayers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {connectedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      player.isFinished
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-stone-950 border-stone-800 text-stone-300'
                    }`}
                  >
                    <span className="text-xs font-semibold truncate max-w-[120px]">
                      {player.name}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        player.isFinished
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {player.isFinished ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Terminado</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          <span>Pensando...</span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-stone-400 space-y-2">
                <div className="text-amber-400 font-bold text-sm">
                  Ronda en curso: Cuadrícula {config?.rows || 4}×{config?.cols || 4} activa
                </div>
                <p className="text-xs text-stone-400 max-w-md mx-auto">
                  Los alumnos ven la cuadrícula en sus dispositivos. Su estatus cambiará de &quot;Pensando...&quot; a &quot;✓ Terminado&quot; en tiempo real.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Fullscreen QR Modal for Projector projection */}
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
                <h3 className="font-bold text-lg text-white font-cinzel">
                  Escanear para Unirse
                </h3>
                <p className="text-xs text-amber-400">
                  Sala {roomCode} • {config?.rows || 4}×{config?.cols || 4}
                </p>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Giant QR Canvas */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xl w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR Code Alumnos"
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
              {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedUrl ? '¡Enlace copiado al portapapeles!' : 'Copiar enlace directo'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
