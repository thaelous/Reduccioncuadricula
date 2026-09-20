import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ClassroomConfig, StudentModeConfig } from '../types';

interface TeacherDashboardProps {
  config: ClassroomConfig;
  currentSeed: number;
  onUpdateConfig: (newConfig: Partial<ClassroomConfig>) => void;
  onRegenerateSeed: () => void;
  onLaunchProjector: () => void;
  onLaunchStudentView: () => void;
  onBackToApp: () => void;
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
  const [roomCode, setRoomCode] = useState<string>(() =>
    Math.floor(1000 + Math.random() * 9000).toString()
  );

  // Compute the direct student URL
  const studentUrl = React.useMemo(() => {
    const origin = window.location.origin;
    const pathname = window.location.pathname || '/';
    const params = new URLSearchParams();
    params.set('role', 'alumno');
    params.set('sala', roomCode);
    params.set('m', config.studentMode);
    params.set('r', String(config.rows));
    params.set('c', String(config.cols));
    if (config.roundsCount > 0) {
      params.set('rounds', String(config.roundsCount));
    }
    if (config.timeLimitSeconds > 0) {
      params.set('limit', String(config.timeLimitSeconds));
    }
    params.set('seed', String(currentSeed));

    return `${origin}${pathname}?${params.toString()}`;
  }, [config, currentSeed, roomCode]);

  // Generate QR code whenever the studentUrl changes
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(studentUrl, {
      width: 400,
      margin: 1.5,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR Code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [studentUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(studentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2200);
    } catch (e) {
      console.warn('Clipboard write failed', e);
    }
  };

  const handleCreateRoom = () => {
    onRegenerateSeed();
    setRoomCode(Math.floor(1000 + Math.random() * 9000).toString());
    setStage(2);
  };

  const handleStartGame = () => {
    setCurrentRound(1);
    setStage(3);
  };

  const handleNextRound = () => {
    const total = config.roundsCount > 0 ? config.roundsCount : 5;
    if (currentRound < total) {
      setCurrentRound((prev) => prev + 1);
      onRegenerateSeed();
    } else {
      setStage(1);
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
                  {stage === 1 ? 'Etapa 1: Configuración' : stage === 2 ? 'Etapa 2: Lobby QR' : 'Etapa 3: Monitor de Ronda'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white font-cinzel">
                Panel de Control del Docente
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/reduccion_cuadricula_taller.html"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5"
              title="Abrir versión en tiempo real sincronizada con Firebase RTDB"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Modo Multijugador Firebase</span>
            </a>
            <button
              onClick={onBackToApp}
              className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold cursor-pointer border border-stone-700 flex items-center gap-1.5"
              title="Cerrar panel y volver a la práctica"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cerrar Panel</span>
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
              Generar Nuevo Código
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* QR Grande y enlace */}
            <div className="bg-stone-900 border border-amber-500/30 rounded-3xl p-6 flex flex-col items-center text-center gap-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white">Escanea con tu teléfono para unirte</h3>
              <div
                className="bg-white p-3 rounded-2xl shadow-xl cursor-pointer group relative"
                onClick={() => setIsQrModalOpen(true)}
              >
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR Alumnos"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center text-white transition-opacity font-bold text-xs gap-1.5">
                  <Maximize2 className="w-5 h-5" />
                  <span>Pantalla Completa</span>
                </div>
              </div>

              <div className="w-full space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={studentUrl}
                    className="flex-1 bg-stone-950 border border-stone-800 text-stone-400 text-xs px-3 py-2 rounded-xl font-mono truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Participantes Conectados */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 flex flex-col h-full min-h-[340px]">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-3">
                <h4 className="font-extrabold text-amber-400 uppercase text-sm tracking-wide">
                  Participantes Conectados
                </h4>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Lobby Abierto
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center text-center p-4 text-stone-400 space-y-3">
                <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-stone-500">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <p className="text-xs text-stone-400 leading-relaxed max-w-xs">
                  Proyecta este código QR en la pizarra. A medida que tus alumnos escaneen, sus nombres aparecerán en la lista.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onLaunchStudentView}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg border border-stone-700 cursor-pointer"
                  >
                    Abrir pestaña alumno de prueba
                  </button>
                </div>
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
            ETAPA 3: Monitor de Ronda Activa (Al pulsar "Iniciar")
            Oculta el QR y la sala de espera.
            Muestra el Progreso en Vivo: "Pensando..." o "✓ Terminado"
            PROHIBIDO mostrar la respuesta que ingresaron.
            Botón para el profesor: "Siguiente Ronda".
            ======================================================= */}
        <section
          id="teacher-stage-live"
          className={`space-y-6 ${stage !== 3 ? 'hidden' : ''}`}
        >
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                RONDA {currentRound} / {config.roundsCount > 0 ? config.roundsCount : 'Libre'}
              </span>
              <span className="text-xs font-bold text-sky-400">
                {config.studentMode === 'reduccion'
                  ? 'MODO REDUCCIÓN'
                  : config.studentMode === 'tradicional'
                  ? 'MODO TRADICIONAL'
                  : 'MODO LIBRE'}
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
                {currentRound < (config.roundsCount > 0 ? config.roundsCount : 5)
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
                Privacidad estricta: Las respuestas numéricas jamás se muestran
              </span>
            </div>

            <div className="p-8 text-center text-stone-400 space-y-2">
              <div className="text-amber-400 font-bold text-sm">
                Ronda en curso: Cuadrícula {config.rows}×{config.cols} activa
              </div>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                Los alumnos ven la cuadrícula en sus dispositivos. Su estatus cambiará de &quot;Pensando...&quot; a &quot;✓ Terminado&quot; en cuanto completen la reducción.
              </p>
            </div>
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
                  Sala {roomCode} • {config.rows}×{config.cols}
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
