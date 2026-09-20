export type GameMode = 'tradicional' | 'reduccion' | 'comparativa';

export type UserRole = 'teacher' | 'student' | 'projector';

export type StudentModeConfig = 'tradicional' | 'reduccion' | 'libre';

export interface GridCell {
  id: number;
  row: number;
  col: number;
  value: number;
}

export interface GameScore {
  timestamp: number;
  dimensions: string; // e.g., "4x4"
  traditionalTime: number | null;
  reductionTime: number | null;
  digitalRoot: number;
  sumTotal: number;
}

export interface GridConfig {
  rows: number;
  cols: number;
}

export interface ClassroomConfig {
  rows: number;
  cols: number;
  studentMode: StudentModeConfig;
  roundsCount: number; // 0 = sin límite (libre), 1, 3, 5, 10
  timeLimitSeconds: number; // 0 = sin límite
  allowModeSwitch: boolean; // Si el alumno puede cambiar de modo o queda fijo
  showAssistance: boolean; // Mostrar pistas / desglose
}

export interface StudentProgress {
  currentRound: number;
  totalRounds: number;
  completedRounds: number;
  correctCount: number;
  attempts: {
    round: number;
    mode: 'tradicional' | 'reduccion';
    time: number;
    isCorrect: boolean;
    userDigit: number;
    correctRoot: number;
  }[];
}
