
export enum Mode {
  VISUAL = 'nhin_tinh',
  LISTENING = 'nghe_tinh',
  FLASH = 'flash',
}

export type UserRole = 'user' | 'admin';

// Interface for UI logic (Aggregated data)
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  student_code?: string;
  role: UserRole;
  created_at: string;
  // Derived from Entitlements
  license_expiry?: string; // ISO Date of the latest expiry
  allowed_modes: Mode[];
}

// DB Entity: Profile
export interface DBProfile {
  id: string;
  full_name: string;
  student_code?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// DB Entity: Entitlement
export interface DBEntitlement {
  id: string;
  user_id: string;
  scope: Record<string, boolean>; // e.g. { nhin_tinh: true }
  starts_at: string;
  expires_at: string;
  created_at: string;
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

// DB Entity: Attempt
export interface DBAttempt {
  id: string;
  user_id: string;
  mode: Mode;
  level: number;
  settings: any; // JSONB: speed, config used
  exam_data: any; // JSONB: generated questions
  started_at: string;
  finished_at?: string;
  score_correct: number;
  score_total: number;
  score_wrong: number;
  score_skipped: number;
  duration_seconds: number;
  created_at: string;
}

// DB Entity: Answer
export interface DBAnswer {
  id?: string;
  attempt_id: string;
  question_no: number;
  user_answer: string | null;
  is_correct: boolean | null;
  answered_at: string;
}

// Legacy type for UI compatibility (history view)
export interface AttemptResult extends DBAttempt {
  details?: {
    question_no: number;
    user_answer: string | null;
    correct_answer: number;
    is_correct: boolean;
  }[];
}

export interface ActivationCode {
  code: string;
  duration_days: number;
  scope: Record<string, boolean>;
  status: 'active' | 'disabled';
  expires_at?: string;
}
