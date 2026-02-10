import { supabase } from './mockBackend';
import type { Question } from '../types';
import { getLevelLabel, getLevelSymbolFromName, LEVEL_SYMBOLS_ORDER } from '../config/levelsAndDifficulty';

export type TrackModeKey = 'visual' | 'audio' | 'flash';

export type TrackDayTemplateExercise = {
  question_count?: number;
  difficulty?: string;
  digits?: number;
  rows?: number;
  speed_seconds?: number;
  questions: Array<Partial<Question> & { operands: number[]; correctAnswer: number }>;
};

export type TrackDayTemplatePayloadV1 = {
  version: 'track_day_v1';
  name: string;
  description?: string | null;
  /** Tên cấp độ (khuyến nghị dùng thay vì ký hiệu) */
  level_name?: string | null;
  /** Backward compatible: ký hiệu cấp độ (Z/A/C/...) */
  level_symbol?: string | null;
  exercises: Record<TrackModeKey, TrackDayTemplateExercise>;
};

export type TrackDayLibraryRow = {
  id: string;
  name: string;
  description: string | null;
  /** Tên cấp độ để hiển thị/lọc */
  level_name: string | null;
  level_symbol: string | null;
  payload: TrackDayTemplatePayloadV1;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function clampInt(n: unknown, min: number, max: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.floor(x)));
}

function clampSpeedSeconds(n: unknown) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 1.2;
  return Math.max(0.1, Math.min(1.5, x));
}

function computeDigitsAndRows(questions: Array<{ operands: number[] }>) {
  let maxDigits = 1;
  let maxRows = 1;
  questions.forEach((q) => {
    const ops = Array.isArray(q.operands) ? q.operands : [];
    maxRows = Math.max(maxRows, ops.length || 1);
    ops.forEach((v) => {
      const abs = Math.abs(Number(v) || 0);
      const digits = abs.toString().length;
      maxDigits = Math.max(maxDigits, digits);
    });
  });
  return { digits: maxDigits, rows: maxRows };
}

function normalizeQuestions(mode: TrackModeKey, questions: any[]): Question[] {
  const out: Question[] = [];
  questions.forEach((q, idx) => {
    const operands = Array.isArray(q?.operands) ? q.operands.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n)) : null;
    const correctAnswer = Number(q?.correctAnswer);
    if (!operands || operands.length === 0 || !Number.isFinite(correctAnswer)) {
      throw new Error(`Câu hỏi không hợp lệ ở mode ${mode} (index ${idx + 1}).`);
    }
    const idRaw = (q?.id != null ? String(q.id) : '').trim();
    const id = idRaw || `${mode}-q-${idx + 1}`;
    out.push({ id, operands, correctAnswer });
  });
  if (out.length === 0) throw new Error(`Mode ${mode} phải có ít nhất 1 câu hỏi.`);
  return out;
}

function normalizeExercise(mode: TrackModeKey, raw: any): TrackDayTemplateExercise {
  if (!raw || typeof raw !== 'object') throw new Error(`Thiếu cấu hình cho mode ${mode}.`);
  const rawQuestions = Array.isArray(raw.questions) ? raw.questions : null;
  if (!rawQuestions) throw new Error(`Mode ${mode} bắt buộc có trường questions (mảng câu hỏi).`);

  const questions = normalizeQuestions(mode, rawQuestions);
  const derived = computeDigitsAndRows(questions);

  const difficulty = typeof raw.difficulty === 'string' ? raw.difficulty : 'basic';
  const speed_seconds = clampSpeedSeconds(raw.speed_seconds ?? 1.2);
  const digits = clampInt(raw.digits ?? derived.digits, 1, 10);
  const rows = clampInt(raw.rows ?? derived.rows, 1, 100);
  const question_count = clampInt(raw.question_count ?? questions.length, 1, 200);

  // Always keep question_count consistent with actual questions length
  const finalQuestionCount = Math.max(1, Math.min(200, questions.length));

  return {
    difficulty,
    speed_seconds,
    digits,
    rows,
    question_count: finalQuestionCount,
    questions,
  };
}

export function validateAndNormalizeTrackDayTemplatePayload(input: any): TrackDayTemplatePayloadV1 {
  if (!input || typeof input !== 'object') throw new Error('JSON không hợp lệ (không phải object).');
  const version = String(input.version || '').trim();
  if (version !== 'track_day_v1') throw new Error('Sai version. Cần version="track_day_v1".');

  const name = String(input.name || '').trim();
  if (!name) throw new Error('Thiếu name (tên bài/ngày).');

  const exercisesRaw = input.exercises;
  if (!exercisesRaw || typeof exercisesRaw !== 'object') throw new Error('Thiếu exercises.');

  // Requirement: 1 file = đủ 3 mode
  const visual = normalizeExercise('visual', exercisesRaw.visual);
  const audio = normalizeExercise('audio', exercisesRaw.audio);
  const flash = normalizeExercise('flash', exercisesRaw.flash);

  const description = input.description != null ? String(input.description) : null;

  // Prefer level_name (by requirement), still accept level_symbol for backward compatibility.
  const level_name_raw = input.level_name != null ? String(input.level_name) : null;
  const level_symbol_raw = input.level_symbol != null ? String(input.level_symbol) : null;

  if (level_symbol_raw && !LEVEL_SYMBOLS_ORDER.includes(level_symbol_raw)) {
    throw new Error(`level_symbol không hợp lệ: "${level_symbol_raw}".`);
  }

  const symbolFromName = level_name_raw ? getLevelSymbolFromName(level_name_raw) : null;
  if (level_name_raw && !symbolFromName) {
    const allowed = LEVEL_SYMBOLS_ORDER.map(getLevelLabel).join(', ');
    throw new Error(`level_name không hợp lệ: "${level_name_raw}". Hãy dùng một trong: ${allowed}`);
  }

  // Canonicalize: luôn chuẩn hoá về tên chuẩn từ config
  const derivedName = symbolFromName ? getLevelLabel(symbolFromName) : (level_symbol_raw ? getLevelLabel(level_symbol_raw) : null);

  return {
    version: 'track_day_v1',
    name,
    description,
    level_name: derivedName,
    // Do NOT auto-fill symbol into JSON payload; keep only if input explicitly had it.
    level_symbol: level_symbol_raw || null,
    exercises: { visual, audio, flash },
  };
}

export function downloadTrackDayTemplateSampleJson() {
  const sample: TrackDayTemplatePayloadV1 = validateAndNormalizeTrackDayTemplatePayload({
    version: 'track_day_v1',
    name: 'Ngày 1 - Cơ bản mở rộng',
    description: 'File mẫu: đủ 3 mode, có câu hỏi cụ thể để học sinh luyện giống nhau.',
    level_name: 'Cơ bản mở rộng',
    exercises: {
      visual: {
        difficulty: 'basic',
        speed_seconds: 1.2,
        questions: [
          { id: 'v1', operands: [12, -5, 8], correctAnswer: 15 },
          { id: 'v2', operands: [7, 3, -2], correctAnswer: 8 },
        ],
      },
      audio: {
        difficulty: 'basic',
        speed_seconds: 1.2,
        questions: [
          { id: 'a1', operands: [5, 6, 4], correctAnswer: 15 },
          { id: 'a2', operands: [9, -3, 2], correctAnswer: 8 },
        ],
      },
      flash: {
        difficulty: 'basic',
        speed_seconds: 0.8,
        questions: [
          { id: 'f1', operands: [10, 20, 5], correctAnswer: 35 },
          { id: 'f2', operands: [50, -10, 2], correctAnswer: 42 },
        ],
      },
    },
  });

  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mau_kho_bai_luyen_tap_track_day_v1.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export const trackDayLibraryService = {
  async list(params?: { levelName?: string | null; levelSymbol?: string | null }): Promise<TrackDayLibraryRow[]> {
    let q = supabase
      .from('track_day_library' as any)
      .select('*')
      .order('updated_at', { ascending: false });

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data || []) as TrackDayLibraryRow[];

    const levelSymbol = params?.levelSymbol ? String(params.levelSymbol) : null;
    const levelName = params?.levelName ? String(params.levelName) : null;
    const desiredName = levelName || (levelSymbol ? getLevelLabel(levelSymbol) : null);

    if (!desiredName) return rows;
    return rows.filter((it) => {
      const name = (it as any).level_name || (it.level_symbol ? getLevelLabel(it.level_symbol) : null);
      return name === desiredName;
    });
  },

  async getById(id: string): Promise<TrackDayLibraryRow> {
    const { data, error } = await supabase
      .from('track_day_library' as any)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data as TrackDayLibraryRow;
  },

  async createFromJsonText(input: { text: string; fallbackName?: string; description?: string | null; level_symbol?: string | null }) {
    const parsed = JSON.parse(input.text);
    const payload = validateAndNormalizeTrackDayTemplatePayload(parsed);

    const name = payload.name || input.fallbackName || 'Không tên';
    const description = (payload.description ?? input.description ?? null) as string | null;
    const level_symbol = (payload.level_symbol ?? input.level_symbol ?? getLevelSymbolFromName(payload.level_name) ?? null) as string | null;
    const level_name = (payload.level_name ?? (level_symbol ? getLevelLabel(level_symbol) : null) ?? null) as string | null;

    const { data: userData, error: uErr } = await supabase.auth.getUser();
    if (uErr) throw new Error(uErr.message);
    if (!userData.user) throw new Error('Phiên đăng nhập hết hạn.');

    const rowBase = {
      name,
      description,
      level_symbol,
      payload,
      created_by: userData.user.id,
    };

    // Backward compatible with DBs chưa chạy migration thêm cột `level_name`
    const tryInsert = async (row: any) => {
      const { data, error } = await supabase
        .from('track_day_library' as any)
        .insert(row)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as TrackDayLibraryRow;
    };

    try {
      return await tryInsert({ ...rowBase, level_name });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('level_name') && msg.toLowerCase().includes('does not exist')) {
        return await tryInsert(rowBase);
      }
      throw e;
    }
  },

  async delete(id: string) {
    const { error } = await supabase.from('track_day_library' as any).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true as const };
  },

  downloadJson(item: Pick<TrackDayLibraryRow, 'payload' | 'name' | 'level_name' | 'level_symbol'>) {
    // Export JSON theo chuẩn mới: ưu tiên `level_name` và không xuất `level_symbol` (để người dùng không phải dùng ký hiệu).
    const payload: any = { ...(item.payload as any) };
    const lvlName = payload.level_name ?? item.level_name ?? (item.level_symbol ? getLevelLabel(item.level_symbol) : null);
    if (lvlName) payload.level_name = lvlName;
    if ('level_symbol' in payload) delete payload.level_symbol;

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(item.name || 'track-day').replace(/[\\\\/:*?\"<>|]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

