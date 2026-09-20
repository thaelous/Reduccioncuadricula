import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Loader2,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Sparkles,
  Grid,
  Clock,
  AlertCircle,
  Hash,
  User,
} from 'lucide-react';
import { ref, set, get, update, onValue, off, onDisconnect, serverTimestamp } from 'firebase/database';
import { getFirebaseRtdb } from '../services/firebaseAuth';

export interface RoomSyncConfig {
  roomCode: string;
  playerId: string;
  playerName: string;
  rows: number;
  cols: number;
  modo: 'reduccion' | 'tradicional' | 'libre';
  limiteTiempo: number;
  rondas: number;
  semilla: number;
  currentRound: number;
}

interface StudentWaitingRoomProps {
  initialRoomCode?: string;
  onGameReady: (syncConfig: RoomSyncConfig) => void;
  onExit: () => void;
}

export const StudentWaitingRoom: React.FC<StudentWaitingRoomProps> = ({
  initialRoomCode = '',
  onGameReady,
  onExit,
}) => {
  const [roomCodeInput, setRoomCodeInput] = useState<string>(initialRoomCode);
  const [playerNameInput, setPlayerNameInput] = useState<string>(() => {
    try {
      return localStorage.getItem('student_alias') || '';
    } catch {
      return '';
    }
  });

  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [playerId, setPlayerId] = useState<string>(() => {
    try {
      const stored = sessionStorage.getItem('student_player_id');
      if (stored) return stored;
      const newId = 'alumno_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('student_player_id', newId);
      return newId;
    } catch {
      return 'alumno_' + Math.floor(Math.random() * 10000);
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);

  const mountedRef = useRef(true);

  // Escuchar estado de la sala en tiempo real cuando ya se ha unido
  useEffect(() => {
    mountedRef.current = true;
    if (!isJoined || !roomCodeInput) return;

    let activeRoomRef: ReturnType<typeof ref> | null = null;
    let playerRef: ReturnType<typeof ref> | null = null;

    try {
      const rtdb = getFirebaseRtdb();
      if (!rtdb) return;

      const code = roomCodeInput.trim();
      activeRoomRef = ref(rtdb, `salas/${code}`);
      playerRef = ref(rtdb, `salas/${code}/jugadores/${playerId}`);

      // Registrar/actualizar jugador en la lista con su nombre real
      const cleanName = playerNameInput.trim();
      if (cleanName) {
        update(playerRef, {
          id: playerId,
          nombre: cleanName,
          name: cleanName,
          alias: cleanName,
          conectado: true,
          estado: 'esperando',
          rondaActual: 1,
        }).catch((e) => console.warn('Aviso sincronizando jugador:', e));
      }

      // Configurar desconexión segura
      try {
        onDisconnect(ref(rtdb, `salas/${code}/jugadores/${playerId}/conectado`)).set(false);
      } catch {
        // silent
      }

      // Escuchar cambios de estado de la sala
      onValue(
        activeRoomRef,
        (snapshot) => {
          if (!mountedRef.current) return;
          if (snapshot.exists()) {
            const data = snapshot.val();
            setRoomData(data);

            const estado = data?.estado || data?.status;
            // Si el profesor inicia la dinámica ("jugando" o "playing"), pasamos al juego
            if (estado === 'jugando' || estado === 'playing') {
              const cfg = data.config || {};
              const syncConfig: RoomSyncConfig = {
                roomCode: code,
                playerId: playerId,
                playerName: playerNameInput.trim(),
                rows: cfg.filas || cfg.rows || 4,
                cols: cfg.columnas || cfg.cols || 4,
                modo: cfg.modo || cfg.mode || 'reduccion',
                limiteTiempo: cfg.limiteTiempo || cfg.limit || 0,
                rondas: cfg.rondas || cfg.rounds || 5,
                semilla: cfg.semilla || cfg.seed || Math.floor(Math.random() * 900000),
                currentRound: data.rondaActual || data.currentRound || 1,
              };
              onGameReady(syncConfig);
            }
          }
        },
        (err) => {
          console.warn('Aviso escuchando sala:', err);
        }
      );
    } catch (e) {
      console.warn('Error en listener de sala:', e);
    }

    return () => {
      mountedRef.current = false;
      if (activeRoomRef) {
        try {
          off(activeRoomRef);
        } catch {
          // silent
        }
      }
    };
  }, [isJoined, roomCodeInput, playerId, playerNameInput, onGameReady]);

  // Manejar unión a la sala
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCodeInput.trim();
    const name = playerNameInput.trim();

    if (!code) {
      setErrorMessage('Por favor, ingresa el código de 4 dígitos de la sala.');
      return;
    }
    if (!name) {
      setErrorMessage('Por favor, ingresa tu nombre o apodo.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rtdb = getFirebaseRtdb();
      if (!rtdb) {
        setErrorMessage('No fue posible conectar con el servidor en tiempo real. Intenta de nuevo.');
        setIsLoading(false);
        return;
      }

      // Verificar si la sala existe
      const roomSnap = await get(ref(rtdb, `salas/${code}`));
      if (!roomSnap.exists()) {
        // También intentar en `rooms/${code}` por retrocompatibilidad
        const altSnap = await get(ref(rtdb, `rooms/${code}`));
        if (!altSnap.exists()) {
          setErrorMessage(`La sala #${code} no existe o aún no ha sido creada por el instructor.`);
          setIsLoading(false);
          return;
        }
      }

      // Guardar alias en localStorage para futuros accesos
      try {
        localStorage.setItem('student_alias', name);
      } catch {
        // silent
      }

      // Registro explícito y prioritario en Firebase:
      // salas/{idSala}/jugadores/{idJugador}/nombre = nombreIngresado.trim()
      const playerRef = ref(rtdb, `salas/${code}/jugadores/${playerId}`);
      await set(playerRef, {
        id: playerId,
        nombre: name,
        name: name,
        alias: name,
        conectado: true,
        estado: 'esperando',
        rondaActual: 1,
        rondas: {},
        fechaUnion: serverTimestamp(),
      });

      try {
        onDisconnect(ref(rtdb, `salas/${code}/jugadores/${playerId}/conectado`)).set(false);
      } catch {
        // silent
      }

      setIsJoined(true);
      setIsLoading(false);
    } catch (err: any) {
      console.warn('Error validando sala:', err);
      // Permitir continuar incluso si hay fallo de red puntual para no frustrar al alumno
      setIsJoined(true);
      setIsLoading(false);
    }
  };

  // Salir de la sala y volver al selector de rol
  const handleLeaveRoom = () => {
    try {
      const rtdb = getFirebaseRtdb();
      if (rtdb && roomCodeInput && playerId) {
        set(ref(rtdb, `salas/${roomCodeInput}/jugadores/${playerId}/conectado`), false).catch(() => {});
      }
    } catch {
      // silent
    }
    setIsJoined(false);
    onExit();
  };

  return (
    <div
      id="student-waiting-room"
      className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto bg-stone-950 text-stone-100 select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #172554 0%, #090d16 50%, #030712 90%)',
      }}
    >
      {/* Glows de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-md mx-auto pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-300">
            Modo Alumno
          </span>
        </div>

        <button
          onClick={handleLeaveRoom}
          className="px-3 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs font-semibold flex items-center gap-1.5 border border-stone-800 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Salir</span>
        </button>
      </div>

      {/* Contenido Central */}
      <div className="relative z-10 w-full max-w-md mx-auto my-auto py-6">
        {!isJoined ? (
          /* =======================================================
             PASO 1: FORMULARIO DE INGRESO (CÓDIGO Y NOMBRE)
             ======================================================= */
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-white font-cinzel tracking-tight">
                Unirse a una Sala
              </h2>
              <p className="text-xs sm:text-sm text-stone-400">
                Ingresa el código que muestra tu profesor y tu nombre para participar en la dinámica en vivo.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-2xl flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleJoinRoom} className="space-y-4">
              {/* Código de sala */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  <span>Código de la Sala</span>
                </label>
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.replace(/\s+/g, ''))}
                  placeholder="Ej. 8520"
                  maxLength={6}
                  required
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-center text-2xl font-mono font-black tracking-widest text-amber-300 placeholder:text-stone-700 outline-none transition-colors"
                />
              </div>

              {/* Nombre / Alias */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Tu Nombre o Alias</span>
                </label>
                <input
                  type="text"
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  placeholder="Ej. Sofía, Carlos, etc."
                  maxLength={24}
                  required
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 rounded-2xl px-4 py-3 text-sm text-stone-100 placeholder:text-stone-600 outline-none transition-colors font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-stone-950 font-black text-base rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Conectando con la sala...</span>
                  </>
                ) : (
                  <>
                    <span>Unirme a la Sala</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* =======================================================
             PASO 2: SALA DE ESPERA OBLIGATORIA
             "¡Conectado! Esperando a que el instructor inicie la dinámica..."
             NO muestra la cuadrícula hasta que el profesor pulse Iniciar.
             ======================================================= */
          <div className="bg-stone-900/90 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center space-y-6 animate-in zoom-in-95 duration-200">
            {/* Animación de espera circular con anillos pulsantes */}
            <div className="relative flex items-center justify-center w-24 h-24 mx-auto my-2">
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-blue-500/20 animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-stone-950 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              </div>
            </div>

            {/* Mensaje obligatorio solicitado */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Conectado a la Sala #{roomCodeInput}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight font-cinzel">
                ¡Conectado! Esperando a que el instructor inicie la dinámica...
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-sm mx-auto">
                No cierres esta pestaña. En cuanto el profesor comience la ronda desde su panel, la cuadrícula aparecerá en tu pantalla automáticamente.
              </p>
            </div>

            {/* Ficha de datos del alumno y de la sala */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Participando como:</span>
                <span className="font-bold text-amber-300 text-sm">{playerNameInput}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-stone-800/80 pt-2">
                <span className="text-stone-400">Código de Sala:</span>
                <span className="font-mono font-bold text-stone-200">#{roomCodeInput}</span>
              </div>
              {roomData?.config && (
                <div className="flex items-center justify-between text-xs border-t border-stone-800/80 pt-2">
                  <span className="text-stone-400">Cuadrícula configurada:</span>
                  <span className="font-semibold text-stone-300">
                    {roomData.config.filas || roomData.config.rows}×
                    {roomData.config.columnas || roomData.config.cols} •{' '}
                    {roomData.config.modo || roomData.config.mode || 'Reducción'}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsJoined(false)}
              className="text-xs text-stone-400 hover:text-stone-200 underline cursor-pointer transition-colors"
            >
              Cambiar de nombre o corregir código de sala
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center text-[11px] text-stone-500 pb-2">
        Reducción Cuadrícula • Multijugador Firebase
      </div>
    </div>
  );
};
