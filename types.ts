export enum Mode {
  VISUAL = 'nhin_tinh',
  LISTENING = 'nghe_tinh',
  FLASH = 'flash',
}

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  student_code?: string;
  role: UserRole;
  created_at: string;
  license_expiry?: string; // ISO Date
  allowed_modes: Mode[];
}

export interface Question {
  id: string;
  operands: number[];
  correctAnswer: number;
}

export interface ExamConfig {
  mode: Mode;
  level: number;
  numQuestions: number;
  timeLimit: number; // seconds
  flashSpeed?: number; // ms
  numOperandsRange: [number, number];
  digitRange: [number, number];
}

export interface AttemptResult {
  id: string;
  user_id: string;
  mode: Mode;
  level: number;
  score_correct: number;
  score_wrong: number;
  score_skipped: number;
  score_total: number;
  duration_seconds: number;
  created_at: string;
  details: {
    question_no: number;
    user_answer: string | null;
    correct_answer: number;
    is_correct: boolean;
  }[];
}

export interface ActivationCode {
  code: string;
  duration_days: number;
  modes: Mode[];
  is_active: boolean;
}