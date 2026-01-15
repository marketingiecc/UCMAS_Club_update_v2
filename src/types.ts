
export enum Mode {
  VISUAL = 'nhin_tinh',
  LISTENING = 'nghe_tinh',
  FLASH = 'flash',
  MIXED = 'hon_hop',
}

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  student_code?: string;
  role: UserRole;
  created_at: string;
  license_expiry?: string; 
  allowed_modes: Mode[];
}

export interface Question {
  id: string;
  operands: number[];
  correctAnswer: number;
  mode?: Mode; // Optional for mixed exams
}

export interface Contest {
  id: string;
  name: string;
  start_at: string; 
  duration_minutes: number;
  lobby_open_minutes: number;
  enable_nhin_tinh: boolean;
  enable_nghe_tinh: boolean;
  enable_flash: boolean;
  status: 'draft' | 'published' | 'archived'; // Updated based on DB constraints
  created_by?: string;
  created_at?: string;
}

export interface ContestRegistration {
  id: string;
  contest_id: string;
  user_id: string;
  full_name: string;
  email: string;
  registered_at: string;
  is_approved: boolean;
}

export interface ContestSession {
  id: string;
  contest_id: string;
  user_id: string;
  status: 'joined' | 'in_lobby' | 'in_progress' | 'submitted' | 'expired';
  joined_at: string;
  total_score?: number;
}

export interface ContestExam {
  contest_id: string;
  mode: Mode;
  exam_name: string;
  time_limit_seconds?: number | null;
  questions: Question[];
  // New specific speed columns from DB
  read_seconds_per_number?: number;
  display_seconds_per_number?: number;
  
  config?: {
      speed?: number; // Legacy generic speed
      display_speed?: number; // Seconds per item (Flash)
      read_speed?: number;    // Seconds per item (Listening)
      [key: string]: any;
  };
}

export interface ContestAccessCode {
  id: string;
  contest_id: string;
  code: string;
  code_type: 'single_use' | 'shared';
  max_uses: number;
  uses_count: number;
  status: 'active' | 'disabled' | 'used';
  created_at: string;
}

export interface ContestSectionAttempt {
  session_id: string;
  mode: Mode;
  score_correct: number;
  score_total: number;
  score_wrong: number;
  score_skipped: number;
  duration_seconds: number;
  finished_at: string;
}

export interface CustomExam {
  id: string;
  name: string;
  description?: string;
  mode: Mode;
  level: number;
  time_limit: number;
  questions: Question[];
  is_public: boolean;
  status: 'active' | 'disabled' | 'draft';
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface AttemptResult {
  id: string;
  user_id: string;
  mode: Mode;
  level: number;
  settings: any;
  exam_data: any;
  started_at: string;
  finished_at?: string;
  score_correct: number;
  score_total: number;
  score_wrong: number;
  score_skipped: number;
  duration_seconds: number;
  created_at: string;
}

export interface DBExamRule {
  id: string;
  mode: Mode;
  version_name: string;
  rules_json: any;
  created_by: string;
  created_at: string;
}

export interface DBEntitlement {
  id: string;
  user_id: string;
  scope: Record<string, boolean>;
  starts_at: string;
  expires_at: string;
  created_at: string;
}

export interface DBAnswer {
  id?: string;
  attempt_id: string;
  question_no: number;
  user_answer: string | null;
  is_correct: boolean | null;
  answered_at: string;
}

export interface ExamConfig {
  mode: Mode;
  level: number;
  numQuestions: number;
  timeLimit: number;
  flashSpeed?: number;
  numOperandsRange: [number, number];
  digitRange: [number, number];
}
