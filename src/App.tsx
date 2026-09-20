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
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthModal } from './components/AuthModal';
import { ActiveSessionBar } from './components/ActiveSessionBar';
import {
  getStoredSession,
  logoutSession,
  subscribeToAuthState,
  AuthSessionData,
} from './services/firebaseAuth';
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
  const isStudentException = useMemo(() => {
    return (
      initialUrlParams.has('sala') ||
      initialUrlParams.has('room') ||
      initialUrlParams.get('role') === 'alumno' ||
      initialUrlParams.get('role') === 'student' ||
      initialUrlParams.has('alumno') ||
      initialUrlParams.has('student') ||
      initialUrlParams.has('seed')
    );
  }, [initialUrlParams]);

  // Sesión de autenticación del docente
  const [sessionData, setSessionData] = useState<AuthSessionData | null>(() => {
    if (isStudentException) return null;
    return getStoredSession();
  });

  // Estado de autorización: Alumnos entran directo; docentes requieren validar sesión
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    if (isStudentException) return true;
    return !!getStoredSession();
  });

  // Escuchar cambios de sesión en Firebase
  useEffect(() => {
    if (isStudentException) return;
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (!firebaseUser && !getStoredSession()) {
        setIsAuthorized(false);
        setSessionData(null);
      }
    });
    return () => unsubscribe();
  }, [isStudentException]);

  const handleAuthSuccess = (newSession: AuthSessionData) => {
    setSessionData(newSession);
    setIsAuthorized(true);
  };

  const handleLogout = async () => {
    await logoutSession();
    setSessionData(null);
    setIsAuthorized(false);
  };

  const isStudentFromUrl = useMemo(() => {
    const roleParam = initialUrlParams.get('role');
    return roleParam === 'alumno' || initialUrlParams.has('alumno') || isStudentException;
  }, [initialUrlParams, isStudentException]);

  // 2. User Role State: 'teacher' | 'student' | 'projector'
  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (isStudentFromUrl) return 'student';
    return 'teacher';
  });

  // Track if current student session was launched from teacher preview
  const [isTeacherPreviewingStudent, setIsTeacherPreviewingStudent] = useState(false);

  // Teacher dashboard overlay inside teacher role
  const [isTeacherDashboardOpen, setIsTeacherDashboardOpen] = useState(false);

  // 3. Classroom Config State (persisted in localStorage)
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

  // 6. Splash screen state (always true by default so Main Screen is the default landing screen)
  const [showSplash, setShowSplash] = useState(true);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle Fullscreen helper (exclusivo para acción directa del usuario)
  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.warn("Aviso de pantalla completa:", err);
          });
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch((err) => {
            console.warn("Aviso saliendo de pantalla completa:", err);
          });
        }
      }
    } catch (err) {
      console.warn("Excepción al alternar pantalla completa:", err);
    }
  };

  // Escuchar cambios de estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 7. Active game mode: 'tradicional' | 'reduccion' | 'comparativa'
  const [currentMode, setCurrentMode] = useState<GameMode>(() => {
    if (isStudentFromUrl) {
      const modeParam = initialUrlParams.get('m');
      if (modeParam === 'tradicional') return 'tradicional';
      if (modeParam === 'reduccion') return 'reduccion';
      if (modeParam === 'comparativa') return 'comparativa';
    }
    return classroomConfig.studentMode === 'tradicional' ? 'tradicional' : 'reduccion';
  });

  // 8. Grid dimensions
  const [gridConfig, setGridConfig] = useState<GridConfig>(() => {
    const rParam = initialUrlParams.get('r');
    const cParam = initialUrlParams.get('c');
    const r = rParam ? parseInt(rParam, 10) : classroomConfig.rows;
    const c = cParam ? parseInt(cParam, 10) : classroomConfig.cols;
    return {
      rows: r >= 3 && r <= 7 ? r : 4,
      cols: c >= 3 && c <= 7 ? c : 4,
    };
  });

  // Persistent grid cells across modes
  const [gridCells, setGridCells] = useState<GridCell[]>([]);

  // Tradicional mode state
  const [tradMarkedIds, setTradMarkedIds] = useState<Set<number>>(new Set());
  const [tradTime, setTradTime] = useState<number>(0);
  const [tradTimerActive, setTradTimerActive] = useState<boolean>(false);
  const [tradSelectedDigit, setTradSelectedDigit] = useState<number | null>(null);

  // Reduccion mode state
  const [redEliminatedIds, setRedEliminatedIds] = useState<Set<number>>(new Set());
  const [redSelectedIds, setRedSelectedIds] = useState<number[]>([]);
  const [redTime, setRedTime] = useState<number>(0);
  const [redTimerActive, setRedTimerActive] = useState<boolean>(false);
  const [redSelectedDigit, setRedSelectedDigit] = useState<number | null>(null);
  const [selectionFeedback, setSelectionFeedback] = useState<string | null>(null);

  // Score persistence for comparative mode
  const [currentScore, setCurrentScore] = useState<GameScore | null>(null);

  // Modals state
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isStudentHelpOpen, setIsStudentHelpOpen] = useState<boolean>(false);
  const [isDimensionOpen, setIsDimensionOpen] = useState<boolean>(false);
  const [isResultOpen, setIsResultOpen] = useState<boolean>(false);
  const [isStudentFinishedOpen, setIsStudentFinishedOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const [resultEvaluation, setResultEvaluation] = useState<{
    isCorrect: boolean;
    userDigit: number;
    correctRoot: number;
    totalSum: number;
    elapsedSeconds: number;
    mode: GameMode;
  } | null>(null);

  // References for timer intervals
  const tradTimerRef = useRef<NodeJS.Timeout | null>(null);
  const redTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save config changes to localStorage
  const handleUpdateClassroomConfig = (newConfig: Partial<ClassroomConfig>) => {
    setClassroomConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('aula_teacher_config', JSON.stringify(updated));

      // Synchronize grid dimensions if changed
      if (newConfig.rows !== undefined || newConfig.cols !== undefined) {
        setGridConfig({
          rows: updated.rows,
          cols: updated.cols,
        });
        initializeGrid(updated.rows, updated.cols, sessionSeed);
      }

      // Synchronize mode if changed
      if (newConfig.studentMode && newConfig.studentMode !== 'libre') {
        setCurrentMode(newConfig.studentMode);
      }

      return updated;
    });
  };

  // Generate QR code link calculation
  const studentUrl = useMemo(() => {
    const origin = window.location.origin;
    const pathname = window.location.pathname || '/';
    const params = new URLSearchParams();
    params.set('role', 'alumno');
    params.set('m', classroomConfig.studentMode);
    params.set('r', String(classroomConfig.rows));
    params.set('c', String(classroomConfig.cols));
    if (classroomConfig.roundsCount > 0) {
      params.set('rounds', String(classroomConfig.roundsCount));
    }
    if (classroomConfig.timeLimitSeconds > 0) {
      params.set('limit', String(classroomConfig.timeLimitSeconds));
    }
    params.set('seed', String(sessionSeed));
    return `${origin}${pathname}?${params.toString()}`;
  }, [classroomConfig, sessionSeed]);

  // Generate QR Data URL
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(studentUrl, {
      width: 450,
      margin: 1.5,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((e) => console.error('QR code generation error', e));

    return () => {
      active = false;
    };
  }, [studentUrl]);

  // Initialize or generate new grid
  const initializeGrid = (rows: number, cols: number, seedVal?: number) => {
    const effectiveSeed = seedVal !== undefined ? seedVal : sessionSeed;
    const cells = generateReductionGrid(rows, cols, effectiveSeed);
    setGridCells(cells);
    const sum = cells.reduce((acc, c) => acc + c.value, 0);
    const root = calculateDigitalRoot(sum);

    // Reset both modes state for this new grid
    setTradMarkedIds(new Set());
    setTradTime(0);
    setTradTimerActive(false);
    setTradSelectedDigit(null);

    setRedEliminatedIds(new Set());
    setRedSelectedIds([]);
    setRedTime(0);
    setRedTimerActive(false);
    setRedSelectedDigit(null);
    setSelectionFeedback(null);

    // Update comparative score record
    setCurrentScore({
      timestamp: Date.now(),
      dimensions: `${rows}x${cols}`,
      traditionalTime: null,
      reductionTime: null,
      digitalRoot: root,
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

  // Total sum and correct digital root of the current grid
  const totalSum = useMemo(() => {
    return gridCells.reduce((acc, c) => acc + c.value, 0);
  }, [gridCells]);

  const correctDigitalRoot = useMemo(() => {
    return calculateDigitalRoot(totalSum);
  }, [totalSum]);

  // Helper to check if tutorial was dismissed
  const isTutorialHidden = (mode: GameMode) => {
    return !!(
      localStorage.getItem(`reduccion_hide_tutorial_${mode}`) ||
      localStorage.getItem(`hide_tutorial_${mode}`)
    );
  };

  // Handle switching modes (keeps exact same matrix numbers)
  const handleSelectMode = (newMode: GameMode) => {
    setTradTimerActive(false);
    setRedTimerActive(false);
    setCurrentMode(newMode);

    if (userRole !== 'student' && (newMode === 'tradicional' || newMode === 'reduccion')) {
      if (!isTutorialHidden(newMode)) {
        setIsTutorialOpen(true);
      }
    }
  };

  // Start from splash screen
  const handleStartGame = () => {
    setShowSplash(false);
    if (!isTutorialHidden('tradicional')) {
      setIsTutorialOpen(true);
    }
  };

  // Close tutorial modal
  const handleCloseTutorial = (dontShowAgain: boolean) => {
    setIsTutorialOpen(false);
    if (dontShowAgain) {
      localStorage.setItem(`reduccion_hide_tutorial_${currentMode}`, 'true');
      localStorage.setItem(`hide_tutorial_${currentMode}`, 'true');
    }
  };

  // Change dimensions
  const handleSelectDimension = (rows: number, cols: number) => {
    setGridConfig({ rows, cols });
    handleUpdateClassroomConfig({ rows, cols });
    initializeGrid(rows, cols);
  };

  // Reset attempt for the active mode (keeps identical matrix numbers!)
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

  // Generate completely new grid
  const handleNewGrid = () => {
    const nextSeed = Math.floor(Math.random() * 900000) + 100000;
    setSessionSeed(nextSeed);
    initializeGrid(gridConfig.rows, gridConfig.cols, nextSeed);
  };

  // ================= TRADICIONAL MODE LOGIC =================
  const handleToggleTradCell = (id: number) => {
    if (userRole !== 'student' && !isTutorialHidden('tradicional')) {
      setIsTutorialOpen(true);
      return;
    }

    if (!tradTimerActive && currentScore?.traditionalTime === null) {
      setTradTimerActive(true);
    }

    setTradMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ================= REDUCCION MODE LOGIC =================
  const handleReduccionCellClick = (cell: GridCell) => {
    if (userRole !== 'student' && !isTutorialHidden('reduccion')) {
      setIsTutorialOpen(true);
      return;
    }

    if (!redTimerActive && currentScore?.reductionTime === null) {
      setRedTimerActive(true);
    }

    // Rule 1: Direct 0 or 9 elimination
    if (cell.value === 0 || cell.value === 9) {
      setRedEliminatedIds((prev) => new Set([...prev, cell.id]));
      setRedSelectedIds((prev) => prev.filter((id) => id !== cell.id));
      return;
    }

    // Rule 2: Unselect if already in current active selection
    if (redSelectedIds.includes(cell.id)) {
      setRedSelectedIds((prev) => prev.filter((id) => id !== cell.id));
      return;
    }

    // Rule 3: Add to selection
    const newSelection = [...redSelectedIds, cell.id];
    const selectedCells = gridCells.filter((c) => newSelection.includes(c.id));
    const currentSum = selectedCells.reduce((acc, c) => acc + c.value, 0);

    const reducesToNine = currentSum > 0 && currentSum % 9 === 0;

    if (reducesToNine && newSelection.length >= 2) {
      setRedEliminatedIds((prev) => new Set([...prev, ...newSelection]));
      setRedSelectedIds([]);
      showTemporaryFeedback(
        currentSum === 9
          ? '✓ ¡Suma 9 descartada!'
          : `✓ ¡Suma ${currentSum} reduce a 9 y queda descartada!`
      );
      return;
    }

    setRedSelectedIds(newSelection);
    const currentReduced = ((currentSum - 1) % 9) + 1;
    showTemporaryFeedback(`Suma acumulada: ${currentSum} (Reducción: ${currentReduced})...`);
  };

  const showTemporaryFeedback = (msg: string) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setSelectionFeedback(msg);
    feedbackTimeoutRef.current = setTimeout(() => {
      setSelectionFeedback(null);
    }, 1600);
  };

  // Active sum of selected cells in Reduccion
  const selectedSumInReduccion = useMemo(() => {
    return gridCells
      .filter((c) => redSelectedIds.includes(c.id))
      .reduce((acc, c) => acc + c.value, 0);
  }, [gridCells, redSelectedIds]);

  // ================= CHECK / COMPROBAR LOGIC =================
  const handleCheckAnswer = () => {
    const isTrad = currentMode === 'tradicional';
    const userDigit = isTrad ? tradSelectedDigit : redSelectedDigit;

    if (userDigit === null) return;

    const time = isTrad ? tradTime : redTime;

    if (isTrad) {
      setTradTimerActive(false);
    } else {
      setRedTimerActive(false);
    }

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

    // Record student progress attempt
    if (userRole === 'student') {
      setStudentProgress((prev) => {
        const nextAttempts = [
          ...prev.attempts,
          {
            round: prev.currentRound,
            mode: (currentMode === 'tradicional' ? 'tradicional' : 'reduccion') as 'tradicional' | 'reduccion',
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

  // Handle student progressing to the next round
  const handleNextStudentRound = () => {
    setIsResultOpen(false);

    if (classroomConfig.roundsCount > 0 && studentProgress.currentRound >= classroomConfig.roundsCount) {
      // Completed all rounds
      setIsStudentFinishedOpen(true);
      return;
    }

    // Next round
    setStudentProgress((prev) => ({
      ...prev,
      currentRound: prev.currentRound + 1,
    }));

    // Seed next round deterministically
    const nextSeed = sessionSeed + studentProgress.currentRound * 1007;
    initializeGrid(gridConfig.rows, gridConfig.cols, nextSeed);
  };

  // Restart student session from beginning
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
    setCurrentMode(classroomConfig.studentMode === 'tradicional' ? 'tradicional' : 'reduccion');
    initializeGrid(classroomConfig.rows, classroomConfig.cols, sessionSeed);
  };

  // Launch Projector mode
  const handleLaunchProjector = () => {
    setUserRole('projector');
    setIsTeacherDashboardOpen(false);
  };

  // -------------------------------------------------------------
  // VIEW RENDERER (Wrapped with Universal Fixed Fullscreen Button)
  // -------------------------------------------------------------
  const isStudentView = userRole === 'student';

  const renderCurrentView = () => {
    // VIEW 1: Teacher Dashboard (Control Panel & Multiplayer Lobby)
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
            onBackToApp={() => setIsTeacherDashboardOpen(false)}
          />
        </ErrorBoundary>
      );
    }

    // VIEW 3: Projector View (Classroom Whiteboard)
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

    // VIEW 4: Interactive Board (Student or Teacher In-Game View)
    return (
      <main className="h-full w-full max-h-[100dvh] flex flex-col justify-between overflow-hidden bg-stone-950 text-stone-100 select-none relative">
        {/* 1. Splash Screen Overlay (Teacher/Standard mode only) */}
        {!isStudentView && showSplash ? (
          <SplashIntro
            onStart={handleStartGame}
            onStartMultiplayer={() => {
              setShowSplash(false);
              setUserRole('teacher');
              setIsTeacherDashboardOpen(true);
            }}
          />
        ) : (
          <>
            {/* 2. Top Navigation Bar: Student Header vs Teacher TopNav */}
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

          {/* Discreet floating badge when teacher is previewing student view */}
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
                }}
                className="px-2 py-0.5 bg-stone-900 text-white rounded text-[11px] hover:bg-stone-800 cursor-pointer"
              >
                Volver al Panel
              </button>
            </div>
          )}

          {/* 3. Sub Bar with Stopwatch & Counters (Tradicional & Reduccion) */}
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

          {/* 4. Main View Area (Strictly zero vertical scroll, fits 100dvh) */}
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

          {/* 5. Mobile-Shielded Tactile Keypad Bar (0-9) - Only in game modes */}
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
              onCheck={handleCheckAnswer}
              isCheckingDisabled={
                (currentMode === 'tradicional' && tradSelectedDigit === null) ||
                (currentMode === 'reduccion' && redSelectedDigit === null)
              }
              activeMode={currentMode as 'tradicional' | 'reduccion'}
            />
          )}
        </>
      )}

      {/* 6. Modals */}
      <TutorialModal
        mode={currentMode}
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />

      {/* Student Quick Help Modal */}
      <StudentHelpModal
        isOpen={isStudentHelpOpen}
        onClose={() => setIsStudentHelpOpen(false)}
        activeMode={currentMode === 'tradicional' ? 'tradicional' : 'reduccion'}
      />

      {/* Student Finished Session Modal */}
      <StudentFinishedModal
        isOpen={isStudentFinishedOpen}
        progress={studentProgress}
        config={classroomConfig}
        onRestartSession={handleRestartStudentSession}
      />

      <DimensionModal
        isOpen={isDimensionOpen}
        currentConfig={gridConfig}
        onSelectDimension={handleSelectDimension}
        onClose={() => setIsDimensionOpen(false)}
      />

      {/* Result Modal with Classroom Round support */}
      {resultEvaluation && (
        <ResultModal
          isOpen={isResultOpen}
          isCorrect={resultEvaluation.isCorrect}
          userDigit={resultEvaluation.userDigit}
          correctRoot={resultEvaluation.correctRoot}
          totalSum={resultEvaluation.totalSum}
          elapsedSeconds={resultEvaluation.elapsedSeconds}
          mode={resultEvaluation.mode}
          onRetryAttempt={() => {
            setIsResultOpen(false);
            handleResetAttempt();
          }}
          onGoToOtherMode={() => {
            setIsResultOpen(false);
            const other =
              resultEvaluation.mode === 'tradicional'
                ? 'reduccion'
                : 'tradicional';
            handleSelectMode(other);
          }}
          onGoToComparativa={() => {
            setIsResultOpen(false);
            handleSelectMode('comparativa');
          }}
          onNewGrid={() => {
            setIsResultOpen(false);
            handleNewGrid();
          }}
          onClose={() => setIsResultOpen(false)}
          roundInfo={
            isStudentView && classroomConfig.roundsCount > 0
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

      {/* QR Modal for Projection */}
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
                className="p-1 rounded-lg text-stone-400 hover:text-white"
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
        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        style={{ position: 'fixed', top: '14px', right: '14px', zIndex: 99999 }}
        className="w-10 h-10 rounded-xl bg-stone-900/85 hover:bg-stone-800/95 text-stone-300 hover:text-white border border-stone-700/60 shadow-2xl backdrop-blur-md transition-all flex items-center justify-center cursor-pointer select-none"
      >
        {isFullscreen ? (
          <Minimize className="w-5 h-5 text-amber-400" />
        ) : (
          <Maximize className="w-5 h-5 text-stone-200" />
        )}
      </button>

      {/* PANTALLA MODAL DE VALIDACIÓN Y ACCESO (Oculta si es alumno o si ya está autorizado) */}
      {!isStudentException && !isAuthorized && (
        <AuthModal onSuccess={handleAuthSuccess} />
      )}

      {/* CONTENEDOR PRINCIPAL DEL JUEGO: Permanece completamente oculto hasta que se confirme la autorización */}
      <div
        id="app-main-content-wrapper"
        className={`h-full w-full flex flex-col overflow-hidden ${
          !isAuthorized && !isStudentException ? 'hidden' : 'flex'
        }`}
        style={{
          display: (!isAuthorized && !isStudentException) ? 'none' : undefined,
        }}
      >
        {/* Barra superior discreta en la vista autorizada con la sesión activa y botón Cerrar sesión */}
        {isAuthorized && !isStudentException && (
          <ActiveSessionBar session={sessionData} onLogout={handleLogout} />
        )}

        {/* Contenedor del juego */}
        <div className="flex-1 w-full overflow-hidden relative">
          <ErrorBoundary fallbackTitle="Error al mostrar la vista solicitada">
            {renderCurrentView()}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
