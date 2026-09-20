/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  GameMode,
  GridCell,
  GridConfig,
  GameScore,
  UserRole,
  ClassroomConfig,
  StudentProgress,
} from './types';
import { generateReductionGrid, calculateDigitalRoot } from './utils/mathUtils';
import { SplashIntro } from './components/SplashIntro';
import { TopNav } from './components/TopNav';
import { SubBar } from './components/SubBar';
import { TradicionalBoard } from './components/TradicionalBoard';
import { ReduccionBoard } from './components/ReduccionBoard';
import { KeypadBar } from './components/KeypadBar';
import { ComparativaView } from './components/ComparativaView';
import { TutorialModal } from './components/TutorialModal';
import { DimensionModal } from './components/DimensionModal';
import { ResultModal } from './components/ResultModal';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ProjectorView } from './components/ProjectorView';
import { StudentHeader } from './components/StudentHeader';
import { StudentHelpModal } from './components/StudentHelpModal';
import { StudentFinishedModal } from './components/StudentFinishedModal';
import { StudentWaitingRoom, RoomSyncConfig } from './components/StudentWaitingRoom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ActiveSessionBar } from './components/ActiveSessionBar';
import {
  getStoredSession,
  logoutSession,
  subscribeToAuthState,
  AuthSessionData,
  getFirebaseRtdb,
} from './services/firebaseAuth';
import { ref, set, update, onValue, off, serverTimestamp } from 'firebase/database';
import { GraduationCap, X, Maximize, Minimize } from 'lucide-react';

const DEFAULT_CLASSROOM_CONFIG: ClassroomConfig = {
  rows: 4,
  cols: 4,
  studentMode: 'reduccion',
  roundsCount: 5,
  timeLimitSeconds: 0,
  allowModeSwitch: false,
  showAssistance: true,
};

export default function App() {
  // 1. URL Parameter Parsing on Mount
  const initialUrlParams = useMemo(() => {
    return new URLSearchParams(window.location.search);
  }, []);

  // EXCEPCIÓN DE ALUMNOS: Si la URL contiene parámetro de sala o acceso de participante
  const isStudentFromUrl = useMemo(() => {
    return (
      initialUrlParams.has('sala') ||
      initialUrlParams.has('room') ||
      initialUrlParams.get('role') === 'alumno' ||
      initialUrlParams.get('role') === 'student' ||
      initialUrlParams.has('alumno') ||
      initialUrlParams.has('student')
    );
  }, [initialUrlParams]);

  // Sesión de autenticación del docente
  const [sessionData, setSessionData] = useState<AuthSessionData | null>(() => {
    if (isStudentFromUrl) return null;
    return getStoredSession();
  });

  // Escuchar cambios de sesión en Firebase
  useEffect(() => {
    if (isStudentFromUrl) return;
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (firebaseUser) {
        setSessionData(getStoredSession());
      }
    });
    return () => unsubscribe();
  }, [isStudentFromUrl]);

  const handleLogout = async () => {
    await logoutSession();
    setSessionData(null);
  };

  // 2. User Role State: 'teacher' | 'student' | 'projector'
  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (isStudentFromUrl) return 'student';
    return 'teacher';
  });

  // Control de la vista del alumno: si está en sala de espera o ya en partida activa
  const [isStudentInGame, setIsStudentInGame] = useState(false);
  const [activeStudentRoom, setActiveStudentRoom] = useState<RoomSyncConfig | null>(null);

  // Track if current student session was launched from teacher preview
  const [isTeacherPreviewingStudent, setIsTeacherPreviewingStudent] = useState(false);

  // Teacher dashboard overlay inside teacher role
  const [isTeacherDashboardOpen, setIsTeacherDashboardOpen] = useState(false);

  // 3. Classroom Config State
  const [classroomConfig, setClassroomConfig] = useState<ClassroomConfig>(() => {
    const saved = localStorage.getItem('aula_teacher_config');
    if (saved) {
      try {
        return { ...DEFAULT_CLASSROOM_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Error parsing aula_teacher_config', e);
      }
    }
    return DEFAULT_CLASSROOM_CONFIG;
  });

  // 4. Session Seed for Deterministic Sync
  const [sessionSeed, setSessionSeed] = useState<number>(() => {
    const seedParam = initialUrlParams.get('seed');
    return seedParam ? parseInt(seedParam, 10) : Math.floor(Math.random() * 900000) + 100000;
  });

  // 5. Student Progress State
  const [studentProgress, setStudentProgress] = useState<StudentProgress>(() => {
    return {
      currentRound: 1,
      totalRounds: classroomConfig.roundsCount,
      completedRounds: 0,
      correctCount: 0,
      attempts: [],
    };
  });

  // 6. Splash screen state: Se muestra al inicio a menos que se acceda directamente con enlace de sala
  const [showSplash, setShowSplash] = useState<boolean>(() => !isStudentFromUrl);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle Fullscreen helper (exclusivo para acción directa del usuario)
  const handleToggleFullscreen = () => {
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
      console.warn('Excepción al alternar pantalla completa:', err);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Update classroom config and save to local storage
  const handleUpdateClassroomConfig = (newConfig: Partial<ClassroomConfig>) => {
    setClassroomConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem('aula_teacher_config', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving aula_teacher_config', e);
      }
      return updated;
    });
  };

  // 7. Core Interactive State
  const [currentMode, setCurrentMode] = useState<GameMode>(() => {
    const m = initialUrlParams.get('m') || initialUrlParams.get('mode');
    if (m === 'tradicional') return 'tradicional';
    if (m === 'comparativa') return 'comparativa';
    return 'reduccion';
  });

  const [gridConfig, setGridConfig] = useState<GridConfig>(() => {
    const r = initialUrlParams.get('r') || initialUrlParams.get('rows');
    const c = initialUrlParams.get('c') || initialUrlParams.get('cols');
    const rows = r ? parseInt(r, 10) : classroomConfig.rows;
    const cols = c ? parseInt(c, 10) : classroomConfig.cols;
    return { rows: rows || 4, cols: cols || 4 };
  });

  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [currentScore, setCurrentScore] = useState<GameScore | null>(null);

  // Tradicional Mode State
  const [tradMarkedIds, setTradMarkedIds] = useState<Set<number>>(new Set());
  const [tradSelectedDigit, setTradSelectedDigit] = useState<number | null>(null);
  const [tradTime, setTradTime] = useState<number>(0);
  const [tradTimerActive, setTradTimerActive] = useState<boolean>(false);
  const tradTimerRef = useRef<any>(null);

  // Reduccion Mode State
  const [redEliminatedIds, setRedEliminatedIds] = useState<Set<number>>(new Set());
  const [redSelectedIds, setRedSelectedIds] = useState<number[]>([]);
  const [redSelectedDigit, setRedSelectedDigit] = useState<number | null>(null);
  const [redTime, setRedTime] = useState<number>(0);
  const [redTimerActive, setRedTimerActive] = useState<boolean>(false);
  const [selectionFeedback, setSelectionFeedback] = useState<string | null>(null);
  const redTimerRef = useRef<any>(null);

  // Modals state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isDimensionOpen, setIsDimensionOpen] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isStudentHelpOpen, setIsStudentHelpOpen] = useState(false);
  const [isStudentFinishedOpen, setIsStudentFinishedOpen] = useState(false);
  const [isPodiumActiveForStudent, setIsPodiumActiveForStudent] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Escuchar si el profesor pasa la sala a 'podio' para notificar al alumno
  useEffect(() => {
    if (!activeStudentRoom?.roomCode) {
      setIsPodiumActiveForStudent(false);
      return;
    }

    try {
      const rtdb = getFirebaseRtdb();
      if (!rtdb) return;

      const roomRef = ref(rtdb, `salas/${activeStudentRoom.roomCode}`);
      const unsub = onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const st = val?.estado || val?.status;
          if (st === 'podio' || st === 'podium') {
            setIsPodiumActiveForStudent(true);
          } else {
            setIsPodiumActiveForStudent(false);
          }
        }
      });

      return () => {
        off(roomRef);
      };
    } catch (e) {
      console.warn('Aviso escuchando estado de podio para el alumno:', e);
    }
  }, [activeStudentRoom?.roomCode]);

  const [resultEvaluation, setResultEvaluation] = useState<{
    isCorrect: boolean;
    userDigit: number;
    correctRoot: number;
    totalSum: number;
    elapsedSeconds: number;
    mode: GameMode;
  } | null>(null);

  // Generar QR para proyector si es necesario
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? (window.location.pathname || '/') : '/';
    const params = new URLSearchParams();
    params.set('role', 'alumno');
    params.set('m', currentMode);
    params.set('r', String(gridConfig.rows));
    params.set('c', String(gridConfig.cols));
    params.set('seed', String(sessionSeed));
    const url = `${origin}${pathname}?${params.toString()}`;

    QRCode.toDataURL(url, { width: 350, margin: 1 })
      .then((dataUri) => setQrDataUrl(dataUri))
      .catch((err) => console.warn('QR error:', err));
  }, [currentMode, gridConfig, sessionSeed]);

  // Generate grid deterministically using sessionSeed
  const initializeGrid = (rows: number, cols: number, seed?: number) => {
    const s = seed !== undefined ? seed : sessionSeed;
    const cells = generateReductionGrid(rows, cols, s);
    setGridCells(cells);
    setTradMarkedIds(new Set());
    setTradSelectedDigit(null);
    setTradTime(0);
    setTradTimerActive(false);

    setRedEliminatedIds(new Set());
    setRedSelectedIds([]);
    setRedSelectedDigit(null);
    setRedTime(0);
    setRedTimerActive(false);
    setSelectionFeedback(null);

    const sum = cells.reduce((acc, c) => acc + c.value, 0);
    setCurrentScore({
      timestamp: Date.now(),
      dimensions: `${rows}x${cols}`,
      traditionalTime: null,
      reductionTime: null,
      digitalRoot: calculateDigitalRoot(sum),
      sumTotal: sum,
    });
  };

  // On initial mount, create the first grid
  useEffect(() => {
    initializeGrid(gridConfig.rows, gridConfig.cols, sessionSeed);
  }, []);

  // Timer runner for Tradicional mode
  useEffect(() => {
    if (tradTimerActive) {
      tradTimerRef.current = setInterval(() => {
        setTradTime((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } else {
      if (tradTimerRef.current) clearInterval(tradTimerRef.current);
    }
    return () => {
      if (tradTimerRef.current) clearInterval(tradTimerRef.current);
    };
  }, [tradTimerActive]);

  // Timer runner for Reduccion mode
  useEffect(() => {
    if (redTimerActive) {
      redTimerRef.current = setInterval(() => {
        setRedTime((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } else {
      if (redTimerRef.current) clearInterval(redTimerRef.current);
    }
    return () => {
      if (redTimerRef.current) clearInterval(redTimerRef.current);
    };
  }, [redTimerActive]);

  // Total sum and correct digital root
  const totalSum = useMemo(() => {
    return gridCells.reduce((acc, c) => acc + c.value, 0);
  }, [gridCells]);

  const correctDigitalRoot = useMemo(() => {
    return calculateDigitalRoot(totalSum);
  }, [totalSum]);

  // Sincronización en tiempo real para el Alumno cuando el profesor finaliza la dinámica
  useEffect(() => {
    if (!activeStudentRoom || !isStudentInGame) return;
    const rtdb = getFirebaseRtdb();
    if (!rtdb) return;

    const roomRef = ref(rtdb, `salas/${activeStudentRoom.roomCode}`);
    const unsub = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Si el profesor finalizó la dinámica para toda la sala
        if (
          data?.estado === 'finalizada' ||
          data?.estado === 'finalizado' ||
          data?.status === 'finished'
        ) {
          setIsResultOpen(false);
          setIsStudentFinishedOpen(true);
        }
      }
    });

    return () => {
      off(roomRef);
    };
  }, [activeStudentRoom, isStudentInGame]);

  // Switch modes
  const handleSelectMode = (newMode: GameMode) => {
    setTradTimerActive(false);
    setRedTimerActive(false);
    setCurrentMode(newMode);
  };

  // Start from splash screen
  const handleStartGame = () => {
    setShowSplash(false);
  };

  // Close tutorial modal
  const handleCloseTutorial = (dontShowAgain: boolean) => {
    setIsTutorialOpen(false);
    if (dontShowAgain) {
      try {
        localStorage.setItem(`reduccion_hide_tutorial_${currentMode}`, 'true');
      } catch {
        // silent
      }
    }
  };

  // Change dimensions
  const handleSelectDimension = (rows: number, cols: number) => {
    setGridConfig({ rows, cols });
    handleUpdateClassroomConfig({ rows, cols });
    initializeGrid(rows, cols);
  };

  // Reset attempt for the active mode
  const handleResetAttempt = () => {
    if (currentMode === 'tradicional') {
      setTradTimerActive(false);
      setTradTime(0);
      setTradMarkedIds(new Set());
      setTradSelectedDigit(null);
    } else if (currentMode === 'reduccion') {
      setRedTimerActive(false);
      setRedTime(0);
      setRedEliminatedIds(new Set());
      setRedSelectedIds([]);
      setRedSelectedDigit(null);
      setSelectionFeedback(null);
    }
  };

  // Reintentar cuadrícula actual tras error (cierra el modal, limpia el dígito ingresado y permite seguir operando sobre la misma cuadrícula)
  const handleRetryCurrentGrid = () => {
    setIsResultOpen(false);
    if (currentMode === 'tradicional') {
      setTradSelectedDigit(null);
      setTradTimerActive(true);
    } else {
      setRedSelectedDigit(null);
      setRedTimerActive(true);
    }
  };

  // Generate completely new grid
  const handleNewGrid = () => {
    const nextSeed = Math.floor(Math.random() * 900000) + 100000;
    setSessionSeed(nextSeed);
    initializeGrid(gridConfig.rows, gridConfig.cols, nextSeed);
  };

  // Tradicional: Toggle cell
  const handleToggleTradCell = (id: number) => {
    if (!tradTimerActive && tradMarkedIds.size === 0) {
      setTradTimerActive(true);
    }
    setTradMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reduccion: Handle cell click
  const handleReduccionCellClick = (cell: GridCell) => {
    const id = cell.id;
    if (redEliminatedIds.has(id)) return;
    if (!redTimerActive && redEliminatedIds.size === 0 && redSelectedIds.length === 0) {
      setRedTimerActive(true);
    }

    if (cell.value === 9 || cell.value === 0) {
      setRedEliminatedIds((prev) => new Set([...prev, id]));
      setRedSelectedIds((prev) => prev.filter((i) => i !== id));
      setSelectionFeedback(
        cell.value === 9 ? '¡Nueve descartado directo!' : '¡Cero descartado!'
      );
      setTimeout(() => setSelectionFeedback(null), 1500);
      return;
    }

    if (redSelectedIds.includes(id)) {
      setRedSelectedIds((prev) => prev.filter((i) => i !== id));
      setSelectionFeedback(null);
      return;
    }

    const newSelection = [...redSelectedIds, id];
    const sum = newSelection.reduce((acc, cellId) => {
      const c = gridCells.find((item) => item.id === cellId);
      return acc + (c ? c.value : 0);
    }, 0);

    if (sum === 9) {
      setRedEliminatedIds((prev) => new Set([...prev, ...newSelection]));
      setRedSelectedIds([]);
      setSelectionFeedback('¡Suma 9 descartada con éxito!');
      setTimeout(() => setSelectionFeedback(null), 1500);
    } else if (sum > 9) {
      setRedSelectedIds([id]);
      setSelectionFeedback('La suma superó 9. Selección reiniciada.');
      setTimeout(() => setSelectionFeedback(null), 1500);
    } else {
      setRedSelectedIds(newSelection);
      setSelectionFeedback(`Suma actual: ${sum} (faltan ${9 - sum} para 9)`);
    }
  };

  const selectedSumInReduccion = useMemo(() => {
    return redSelectedIds.reduce((acc, id) => {
      const cell = gridCells.find((c) => c.id === id);
      return acc + (cell ? cell.value : 0);
    }, 0);
  }, [redSelectedIds, gridCells]);

  // Check result
  const handleCheckResult = () => {
    const isTrad = currentMode === 'tradicional';
    const userDigit = isTrad ? tradSelectedDigit : redSelectedDigit;

    if (userDigit === null) {
      alert('Por favor selecciona primero un dígito del 0 al 9 en el teclado inferior.');
      return;
    }

    if (isTrad) setTradTimerActive(false);
    else setRedTimerActive(false);

    const time = isTrad ? tradTime : redTime;
    const isCorrect =
      userDigit === correctDigitalRoot ||
      (correctDigitalRoot === 9 && userDigit === 0);

    if (isCorrect) {
      setCurrentScore((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          traditionalTime: isTrad ? time : prev.traditionalTime,
          reductionTime: !isTrad ? time : prev.reductionTime,
        };
      });
    }

    // Sincronizar respuesta en Firebase RTDB si el alumno está conectado a una sala
    if (activeStudentRoom && isCorrect) {
      try {
        const rtdb = getFirebaseRtdb();
        if (rtdb) {
          const currentR = studentProgress.currentRound;
          const isLast =
            classroomConfig.roundsCount > 0 && currentR >= classroomConfig.roundsCount;

          // 1. Guardar tiempo de la ronda en salas/{idSala}/jugadores/{idJugador}/rondas/{numRonda}
          set(
            ref(
              rtdb,
              `salas/${activeStudentRoom.roomCode}/jugadores/${activeStudentRoom.playerId}/rondas/${currentR}`
            ),
            {
              numRonda: currentR,
              tiempo: time,
              completada: true,
              esCorrecto: true,
              digitoUsuario: userDigit,
              fecha: serverTimestamp(),
            }
          ).catch((err) => console.warn('Aviso guardando ronda en RTDB:', err));

          // 2. Actualizar estado del jugador en tiempo real (preservando su nombre real)
          update(
            ref(
              rtdb,
              `salas/${activeStudentRoom.roomCode}/jugadores/${activeStudentRoom.playerId}`
            ),
            {
              nombre: activeStudentRoom.playerName,
              name: activeStudentRoom.playerName,
              rondaActual: currentR,
              estado: isLast ? 'terminado' : 'esperando_siguiente',
              status: isLast ? 'finished' : 'round_finished',
              isFinished: isLast,
              tiempo: time,
              esCorrecto: true,
              digitoUsuario: userDigit,
              ultimaActualizacion: serverTimestamp(),
            }
          ).catch((err) => console.warn('Aviso sincronizando en RTDB:', err));
        }
      } catch (err) {
        console.warn('Error en sincronización de respuesta:', err);
      }
    }

    // Record student progress attempt
    if (userRole === 'student') {
      setStudentProgress((prev) => {
        const nextAttempts = [
          ...prev.attempts,
          {
            round: prev.currentRound,
            mode: (currentMode === 'tradicional' ? 'tradicional' : 'reduccion') as
              | 'tradicional'
              | 'reduccion',
            time,
            isCorrect,
            userDigit,
            correctRoot: correctDigitalRoot,
          },
        ];
        return {
          ...prev,
          completedRounds: prev.completedRounds + 1,
          correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
          attempts: nextAttempts,
        };
      });
    }

    // Open Result Modal
    setResultEvaluation({
      isCorrect,
      userDigit,
      correctRoot: correctDigitalRoot,
      totalSum,
      elapsedSeconds: time,
      mode: currentMode,
    });
    setIsResultOpen(true);
  };

  // Siguiente ronda de alumno (avance autónomo e individual)
  const handleNextStudentRound = () => {
    setIsResultOpen(false);
    const currentRoundNum = studentProgress.currentRound;
    if (classroomConfig.roundsCount > 0 && currentRoundNum >= classroomConfig.roundsCount) {
      setIsStudentFinishedOpen(true);
      return;
    }

    const nextRoundNum = currentRoundNum + 1;
    setStudentProgress((prev) => ({
      ...prev,
      currentRound: nextRoundNum,
    }));

    // Notificar a Firebase que el alumno comenzó la siguiente ronda
    if (activeStudentRoom) {
      try {
        const rtdb = getFirebaseRtdb();
        if (rtdb) {
          update(
            ref(
              rtdb,
              `salas/${activeStudentRoom.roomCode}/jugadores/${activeStudentRoom.playerId}`
            ),
            {
              nombre: activeStudentRoom.playerName,
              name: activeStudentRoom.playerName,
              rondaActual: nextRoundNum,
              ronda: nextRoundNum,
              estado: 'jugando',
              status: 'playing',
              isFinished: false,
            }
          ).catch(() => {});
        }
      } catch {}
    }

    const nextSeed = sessionSeed + nextRoundNum * 1007;
    initializeGrid(gridConfig.rows, gridConfig.cols, nextSeed);
    handleResetAttempt();
  };

  // Reiniciar sesión de alumno
  const handleRestartStudentSession = () => {
    setIsStudentFinishedOpen(false);
    setStudentProgress({
      currentRound: 1,
      totalRounds: classroomConfig.roundsCount,
      completedRounds: 0,
      correctCount: 0,
      attempts: [],
    });
    const newSeed = Math.floor(Math.random() * 900000) + 100000;
    setSessionSeed(newSeed);
    initializeGrid(gridConfig.rows, gridConfig.cols, newSeed);
  };

  // Preview as student from teacher panel
  const handlePreviewAsStudent = () => {
    setUserRole('student');
    setIsTeacherPreviewingStudent(true);
    setIsTeacherDashboardOpen(false);
    setIsStudentInGame(true);
    setCurrentMode(classroomConfig.studentMode === 'tradicional' ? 'tradicional' : 'reduccion');
    initializeGrid(classroomConfig.rows, classroomConfig.cols, sessionSeed);
  };

  // Launch Projector mode
  const handleLaunchProjector = () => {
    setUserRole('projector');
    setIsTeacherDashboardOpen(false);
  };

  // Transición cuando el alumno se conecta a una sala y el profesor inicia la dinámica
  const handleStudentGameReady = (syncConfig: RoomSyncConfig) => {
    setActiveStudentRoom(syncConfig);
    setGridConfig({ rows: syncConfig.rows, cols: syncConfig.cols });
    setClassroomConfig({
      rows: syncConfig.rows,
      cols: syncConfig.cols,
      studentMode: syncConfig.modo,
      timeLimitSeconds: syncConfig.limiteTiempo,
      roundsCount: syncConfig.rondas,
      allowModeSwitch: syncConfig.modo === 'libre',
      showAssistance: true,
    });
    setCurrentMode(syncConfig.modo === 'tradicional' ? 'tradicional' : 'reduccion');
    setSessionSeed(syncConfig.semilla);
    initializeGrid(syncConfig.rows, syncConfig.cols, syncConfig.semilla);
    setStudentProgress({
      currentRound: syncConfig.currentRound || 1,
      totalRounds: syncConfig.rondas,
      completedRounds: 0,
      correctCount: 0,
      attempts: [],
    });
    setIsStudentInGame(true);
  };

  // Salir de la sala del alumno
  const handleExitStudentRoom = () => {
    setActiveStudentRoom(null);
    setIsStudentInGame(false);
    setUserRole('teacher');
    setShowSplash(true);
  };

  const isStudentView = userRole === 'student';

  // RENDERIZADO DE VISTAS SEGÚN ESTADO
  const renderCurrentView = () => {
    // VISTA 1: Pantalla de Bienvenida con Selector de Rol (Profesor vs Alumno)
    if (showSplash) {
      return (
        <SplashIntro
          onStartTeacher={() => {
            setShowSplash(false);
            setUserRole('teacher');
            setIsTeacherDashboardOpen(true);
          }}
          onStartStudent={() => {
            setShowSplash(false);
            setUserRole('student');
            setIsStudentInGame(false);
          }}
          onStartIndividual={() => {
            setShowSplash(false);
            setUserRole('teacher');
            setIsTeacherDashboardOpen(false);
          }}
        />
      );
    }

    // VISTA 2: Panel del Docente (Configuración -> Lobby QR -> Monitor)
    if (userRole === 'teacher' && isTeacherDashboardOpen) {
      return (
        <ErrorBoundary
          fallbackTitle="Error al cargar el modo multijugador"
          onReset={() => {
            setIsTeacherDashboardOpen(false);
            setUserRole('teacher');
          }}
        >
          <TeacherDashboard
            config={classroomConfig}
            currentSeed={sessionSeed}
            onUpdateConfig={handleUpdateClassroomConfig}
            onRegenerateSeed={() => {
              const nextSeed = Math.floor(Math.random() * 900000) + 100000;
              setSessionSeed(nextSeed);
              initializeGrid(classroomConfig.rows, classroomConfig.cols, nextSeed);
            }}
            onLaunchProjector={handleLaunchProjector}
            onLaunchStudentView={handlePreviewAsStudent}
            onBackToApp={() => {
              setIsTeacherDashboardOpen(false);
              setShowSplash(true);
            }}
          />
        </ErrorBoundary>
      );
    }

    // VISTA 3: Modo Proyector (Pizarra Gigante de Aula)
    if (userRole === 'projector') {
      return (
        <ProjectorView
          cells={gridCells}
          gridConfig={gridConfig}
          activeMode={currentMode === 'comparativa' ? 'reduccion' : currentMode}
          onToggleMode={(mode) => setCurrentMode(mode)}
          onNewGrid={handleNewGrid}
          onExitProjector={() => {
            setUserRole('teacher');
            setIsTeacherDashboardOpen(true);
          }}
          qrDataUrl={qrDataUrl}
          onOpenQrModal={() => setIsQrModalOpen(true)}
        />
      );
    }

    // VISTA 4: Modo Alumno en Sala de Espera Obligatoria (antes de que el profesor inicie)
    if (isStudentView && !isStudentInGame) {
      return (
        <StudentWaitingRoom
          initialRoomCode={
            initialUrlParams.get('sala') || initialUrlParams.get('room') || ''
          }
          onGameReady={handleStudentGameReady}
          onExit={handleExitStudentRoom}
        />
      );
    }

    // VISTA 5: Tablero Interactivo (Alumno en Partida o Docente en Modo Tablero)
    return (
      <main className="h-full w-full max-h-[100dvh] flex flex-col justify-between overflow-hidden bg-stone-950 text-stone-100 select-none relative">
        {/* Barra de Navegación Superior */}
        {isStudentView ? (
          <StudentHeader
            currentMode={currentMode}
            onSelectMode={
              classroomConfig.studentMode === 'libre'
                ? (mode) => handleSelectMode(mode)
                : undefined
            }
            config={classroomConfig}
            progress={studentProgress}
            onOpenHelp={() => setIsStudentHelpOpen(true)}
            onResetRound={handleResetAttempt}
            isTimerRunning={
              currentMode === 'tradicional' ? tradTimerActive : redTimerActive
            }
            elapsedSeconds={currentMode === 'tradicional' ? tradTime : redTime}
          />
        ) : (
          <TopNav
            currentMode={currentMode}
            onSelectMode={handleSelectMode}
            gridConfig={gridConfig}
            onOpenDimensions={() => setIsDimensionOpen(true)}
            onOpenTutorial={() => setIsTutorialOpen(true)}
            onOpenSplash={() => setShowSplash(true)}
            onOpenTeacherDashboard={() => {
              setShowSplash(false);
              setUserRole('teacher');
              setIsTeacherDashboardOpen(true);
            }}
            onOpenProjector={handleLaunchProjector}
          />
        )}

        {/* Banner discreto si el docente está en vista previa de alumno */}
        {isStudentView && isTeacherPreviewingStudent && (
          <div className="bg-amber-500 text-stone-950 text-xs px-3 py-1 font-bold flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Vista Previa del Alumno (Modo Docente)</span>
            </span>
            <button
              onClick={() => {
                setUserRole('teacher');
                setIsTeacherDashboardOpen(true);
                setIsStudentInGame(false);
              }}
              className="px-2 py-0.5 bg-stone-900 text-white rounded text-[11px] hover:bg-stone-800 cursor-pointer"
            >
              Volver al Panel
            </button>
          </div>
        )}

        {/* SubBar con Temporizador y Contadores para Modo Individual/Docente */}
        {currentMode !== 'comparativa' && !isStudentView && (
          <SubBar
            mode={currentMode}
            elapsedSeconds={currentMode === 'tradicional' ? tradTime : redTime}
            totalCells={gridCells.length}
            activeCount={
              currentMode === 'tradicional'
                ? tradMarkedIds.size
                : redEliminatedIds.size
            }
            selectedSum={selectedSumInReduccion}
            selectedCount={redSelectedIds.length}
            onResetAttempt={handleResetAttempt}
            onNewGrid={handleNewGrid}
            isTimerRunning={
              currentMode === 'tradicional' ? tradTimerActive : redTimerActive
            }
          />
        )}

        {/* Tablero Principal Centrado (0 scroll vertical) */}
        <div className="flex-1 w-full flex flex-col items-center justify-center overflow-hidden min-h-0">
          {currentMode === 'tradicional' && (
            <TradicionalBoard
              cells={gridCells}
              gridConfig={gridConfig}
              markedIds={tradMarkedIds}
              onToggleCell={handleToggleTradCell}
            />
          )}

          {currentMode === 'reduccion' && (
            <ReduccionBoard
              cells={gridCells}
              gridConfig={gridConfig}
              eliminatedIds={redEliminatedIds}
              selectedIds={redSelectedIds}
              onCellClick={handleReduccionCellClick}
              selectionErrorMsg={selectionFeedback}
              onClearSelection={() => setRedSelectedIds([])}
            />
          )}

          {currentMode === 'comparativa' && (
            <ComparativaView
              lastScore={currentScore}
              onGoToMode={handleSelectMode}
              onNewChallenge={handleNewGrid}
            />
          )}
        </div>

        {/* Teclado Táctil Inferior (0-9) */}
        {currentMode !== 'comparativa' && (
          <KeypadBar
            selectedDigit={
              currentMode === 'tradicional'
                ? tradSelectedDigit
                : redSelectedDigit
            }
            onSelectDigit={(digit) => {
              if (currentMode === 'tradicional') {
                setTradSelectedDigit(digit);
              } else {
                setRedSelectedDigit(digit);
              }
            }}
            onClearDigit={() => {
              if (currentMode === 'tradicional') {
                setTradSelectedDigit(null);
              } else {
                setRedSelectedDigit(null);
              }
            }}
            onCheck={handleCheckResult}
            activeMode={currentMode === 'tradicional' ? 'tradicional' : 'reduccion'}
          />
        )}

        {/* Modales Interactivos */}
        <TutorialModal
          isOpen={isTutorialOpen}
          mode={currentMode}
          onClose={handleCloseTutorial}
        />

        <DimensionModal
          isOpen={isDimensionOpen}
          currentConfig={gridConfig}
          onSelectDimension={handleSelectDimension}
          onClose={() => setIsDimensionOpen(false)}
        />

        <StudentHelpModal
          isOpen={isStudentHelpOpen}
          activeMode={currentMode === 'tradicional' ? 'tradicional' : 'reduccion'}
          onClose={() => setIsStudentHelpOpen(false)}
        />

        {resultEvaluation && (
          <ResultModal
            isOpen={isResultOpen}
            isCorrect={resultEvaluation.isCorrect}
            userDigit={resultEvaluation.userDigit}
            correctRoot={resultEvaluation.correctRoot}
            totalSum={resultEvaluation.totalSum}
            elapsedSeconds={resultEvaluation.elapsedSeconds}
            mode={resultEvaluation.mode}
            onClose={() => setIsResultOpen(false)}
            onRetryAttempt={handleRetryCurrentGrid}
            onGoToOtherMode={() =>
              handleSelectMode(currentMode === 'tradicional' ? 'reduccion' : 'tradicional')
            }
            onGoToComparativa={() => handleSelectMode('comparativa')}
            onNewGrid={handleNewGrid}
            roundInfo={
              isStudentView
                ? {
                    current: studentProgress.currentRound,
                    total: classroomConfig.roundsCount,
                    isLastRound:
                      studentProgress.currentRound >= classroomConfig.roundsCount,
                    onNextRound: handleNextStudentRound,
                  }
                : null
            }
          />
        )}

        {/* Modal de Alumno Finalizado */}
        <StudentFinishedModal
          isOpen={isStudentFinishedOpen}
          progress={studentProgress}
          config={classroomConfig}
          onRestartSession={
            activeStudentRoom
              ? () => {
                  setIsStudentFinishedOpen(false);
                  handleExitStudentRoom();
                }
              : handleRestartStudentSession
          }
        />

        {/* Modal de Podio y Premiación en Pantalla del Participante */}
        {isPodiumActiveForStudent && (
          <div
            id="student-podium-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none animate-in fade-in duration-200"
          >
            <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl shadow-amber-500/20 relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/30 animate-bounce">
                🏆
              </div>

              <div className="space-y-1">
                <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
                  ¡Fin de la Dinámica!
                </span>
                <h3 className="text-2xl font-black text-white font-cinzel">
                  ¡Gran Final y Premiación!
                </h3>
                <p className="text-xs sm:text-sm text-stone-300">
                  El profesor ha finalizado la competencia. Observa la pantalla principal o el proyector del aula para conocer el podio de campeones.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-left space-y-2">
                <div className="flex justify-between text-xs text-stone-400">
                  <span>Participante:</span>
                  <span className="text-stone-200 font-bold">{activeStudentRoom?.playerName}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-400">
                  <span>Rondas completadas:</span>
                  <span className="text-amber-400 font-bold font-mono">
                    {studentProgress.completedRounds} de {classroomConfig.roundsCount}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-stone-400">
                  ¡Gran esfuerzo en esta dinámica de reducción numérica!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal QR para Proyección rápida */}
        {isQrModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none"
            onClick={() => setIsQrModalOpen(false)}
          >
            <div
              className="w-full max-w-sm bg-stone-900 border border-stone-700 rounded-3xl p-6 flex flex-col items-center gap-4 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-base text-white">
                  Código QR para el Aula
                </span>
                <button
                  onClick={() => setIsQrModalOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-xl w-60 h-60 flex items-center justify-center">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR Alumnos"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <p className="text-xs text-stone-300">
                Escanea con tu teléfono para comenzar de inmediato
              </p>
            </div>
          </div>
        )}
      </main>
    );
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-950 text-slate-100">
      {/* Botón flotante universal de Pantalla Completa (fijo en todas las vistas) */}
      <button
        id="btn-universal-fullscreen"
        onClick={handleToggleFullscreen}
        aria-label="Alternar Pantalla Completa"
        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        style={{ position: 'fixed', top: '14px', right: '14px', zIndex: 99999 }}
        className="w-10 h-10 rounded-xl bg-stone-900/85 hover:bg-stone-800/95 text-stone-300 hover:text-white border border-stone-700/60 shadow-2xl backdrop-blur-md transition-all flex items-center justify-center cursor-pointer select-none"
      >
        {isFullscreen ? (
          <Minimize className="w-5 h-5 text-amber-400" />
        ) : (
          <Maximize className="w-5 h-5 text-stone-200" />
        )}
      </button>

      {/* CONTENEDOR PRINCIPAL: Siempre visible */}
      <div
        id="app-main-content-wrapper"
        className="h-full w-full flex flex-col overflow-hidden"
      >
        {/* Barra superior si hay sesión activa de docente */}
        {sessionData && (
          <ActiveSessionBar session={sessionData} onLogout={handleLogout} />
        )}

        {/* Contenedor de la vista actual */}
        <div className="flex-1 w-full overflow-hidden relative">
          <ErrorBoundary fallbackTitle="Error al mostrar la vista solicitada">
            {renderCurrentView()}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
