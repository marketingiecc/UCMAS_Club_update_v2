/**
 * Thiết lập mặc định theo chế độ luyện tập và độ khó.
 * Lưu trong localStorage; sau có thể chuyển sang Supabase.
 */

import { LEVEL_SYMBOLS_ORDER, type LevelSymbol } from '../config/levelsAndDifficulty';

export type ModeKey = 'visual' | 'audio' | 'flash';
export type DifficultyKey = 'basic' | 'advanced' | 'elite';

export interface ModeDifficultyLimits {
  digits_min: number;
  digits_max: number;
  rows_min: number;
  rows_max: number;
  question_count_min: number;
  question_count_max: number;
  /** Chỉ dùng cho Nghe tính & Flash */
  speed_seconds_min?: number;
  speed_seconds_max?: number;
}

export type PracticeModeLevelSettings = Record<ModeKey, Record<DifficultyKey, ModeDifficultyLimits>>;

/**
 * V2: lưu theo cấp độ (level_symbol) để có thể thiết lập độ khó cho toàn bộ cấp độ.
 * - `by_level[level][mode][difficulty]`
 */
export type PracticeModeSettings = {
  version: 2;
  by_level: Record<LevelSymbol, PracticeModeLevelSettings>;
};

const STORAGE_KEY = 'ucmas_practice_mode_settings';
const SPEED_MIN = 0.1;
const SPEED_MAX = 1.5;

function clampSpeed(v: number | undefined, fallback: number): number {
  const n = typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, n));
}

function defaultLevelSettings(): PracticeModeLevelSettings {
  return {
    visual: {
      basic:   { digits_min: 1, digits_max: 2, rows_min: 3, rows_max: 8,  question_count_min: 20, question_count_max: 50 },
      advanced: { digits_min: 2, digits_max: 4, rows_min: 6, rows_max: 15, question_count_min: 30, question_count_max: 80 },
      elite:   { digits_min: 3, digits_max: 6, rows_min: 8, rows_max: 25, question_count_min: 50, question_count_max: 120 },
    },
    audio: {
      basic:   { digits_min: 1, digits_max: 2, rows_min: 3, rows_max: 10, question_count_min: 20, question_count_max: 50, speed_seconds_min: 0.1, speed_seconds_max: 1.5 },
      advanced: { digits_min: 2, digits_max: 4, rows_min: 5, rows_max: 18, question_count_min: 30, question_count_max: 80, speed_seconds_min: 0.8, speed_seconds_max: 1.5 },
      elite:   { digits_min: 3, digits_max: 6, rows_min: 8, rows_max: 30, question_count_min: 50, question_count_max: 120, speed_seconds_min: 0.1, speed_seconds_max: 0.8 },
    },
    flash: {
      basic:   { digits_min: 1, digits_max: 2, rows_min: 3, rows_max: 10, question_count_min: 20, question_count_max: 50, speed_seconds_min: 0.1, speed_seconds_max: 1.5 },
      advanced: { digits_min: 2, digits_max: 4, rows_min: 5, rows_max: 18, question_count_min: 30, question_count_max: 80, speed_seconds_min: 0.8, speed_seconds_max: 1.5 },
      elite:   { digits_min: 3, digits_max: 6, rows_min: 8, rows_max: 30, question_count_min: 50, question_count_max: 120, speed_seconds_min: 0.1, speed_seconds_max: 0.8 },
    },
  };
}

function defaultSettings(): PracticeModeSettings {
  const base = defaultLevelSettings();
  const by_level = {} as Record<LevelSymbol, PracticeModeLevelSettings>;
  LEVEL_SYMBOLS_ORDER.forEach((lv) => {
    // Deep copy to avoid shared refs
    by_level[lv] = JSON.parse(JSON.stringify(base)) as PracticeModeLevelSettings;
  });
  return { version: 2, by_level };
}

function sanitizeLevelSettings(levelSettings: PracticeModeLevelSettings): PracticeModeLevelSettings {
  const parsed = levelSettings as PracticeModeLevelSettings;
  const defaults = defaultLevelSettings();

  for (const mode of ['visual', 'audio', 'flash'] as ModeKey[]) {
    for (const diff of ['basic', 'advanced', 'elite'] as DifficultyKey[]) {
      if (!parsed[mode]?.[diff]) {
        (parsed as any)[mode] = (parsed as any)[mode] || {};
        (parsed as any)[mode][diff] = defaults[mode][diff];
      }

      const row = (parsed[mode] as any)[diff] as ModeDifficultyLimits;

      // Ensure sane ordering for integer ranges
      if (row.digits_min > row.digits_max) [row.digits_min, row.digits_max] = [row.digits_max, row.digits_min];
      if (row.rows_min > row.rows_max) [row.rows_min, row.rows_max] = [row.rows_max, row.rows_min];
      if (row.question_count_min > row.question_count_max) [row.question_count_min, row.question_count_max] = [row.question_count_max, row.question_count_min];

      // Enforce global speed range for Audio/Flash
      if (mode === 'audio' || mode === 'flash') {
        row.speed_seconds_min = clampSpeed(row.speed_seconds_min, defaults[mode][diff].speed_seconds_min ?? SPEED_MIN);
        row.speed_seconds_max = clampSpeed(row.speed_seconds_max, defaults[mode][diff].speed_seconds_max ?? SPEED_MAX);
        if ((row.speed_seconds_min ?? SPEED_MIN) > (row.speed_seconds_max ?? SPEED_MAX)) {
          row.speed_seconds_min = SPEED_MIN;
          row.speed_seconds_max = SPEED_MAX;
        }
      } else {
        // Visual does not use speed
        delete (row as any).speed_seconds_min;
        delete (row as any).speed_seconds_max;
      }
    }
  }

  return parsed;
}

export const practiceModeSettings = {
  getDefaults(): PracticeModeSettings {
    return defaultSettings();
  },

  /**
   * Lấy toàn bộ settings (V2). Tự migrate từ V1 nếu phát hiện dữ liệu cũ.
   */
  getSettings(): PracticeModeSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSettings();

      const parsedUnknown = JSON.parse(raw) as any;

      // V2
      if (parsedUnknown?.version === 2 && parsedUnknown?.by_level) {
        const v2 = parsedUnknown as PracticeModeSettings;
        const defaults = defaultSettings();
        const by_level = { ...defaults.by_level, ...(v2.by_level as any) } as PracticeModeSettings['by_level'];

        for (const lv of LEVEL_SYMBOLS_ORDER) {
          by_level[lv] = sanitizeLevelSettings(by_level[lv] || defaults.by_level[lv]);
        }

        const normalized: PracticeModeSettings = { version: 2, by_level };
        // Persist normalization (safe self-heal)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }

      // V1 (legacy): Record<ModeKey, Record<DifficultyKey, Limits>>
      const legacy = parsedUnknown as PracticeModeLevelSettings;
      const migrated = defaultSettings();
      LEVEL_SYMBOLS_ORDER.forEach((lv) => {
        migrated.by_level[lv] = sanitizeLevelSettings(JSON.parse(JSON.stringify(legacy || defaultLevelSettings())));
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {
      return defaultSettings();
    }
  },

  setSettings(settings: PracticeModeSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  },

  getLevelSettings(level: LevelSymbol): PracticeModeLevelSettings {
    const all = this.getSettings();
    return all.by_level[level] || defaultLevelSettings();
  },

  setLevelSettings(level: LevelSymbol, levelSettings: PracticeModeLevelSettings): PracticeModeSettings {
    const all = this.getSettings();
    const next: PracticeModeSettings = {
      version: 2,
      by_level: {
        ...all.by_level,
        [level]: sanitizeLevelSettings(JSON.parse(JSON.stringify(levelSettings))),
      },
    };
    this.setSettings(next);
    return next;
  },

  getLimits(level: LevelSymbol, mode: ModeKey, diff: DifficultyKey): ModeDifficultyLimits {
    const lvl = this.getLevelSettings(level);
    return lvl[mode][diff];
  },

  resetToDefaults(): PracticeModeSettings {
    const def = defaultSettings();
    this.setSettings(def);
    return def;
  },
};
