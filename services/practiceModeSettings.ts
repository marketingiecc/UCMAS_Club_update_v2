/**
 * Thiết lập mặc định theo chế độ luyện tập và độ khó.
 * Lưu trong localStorage; sau có thể chuyển sang Supabase.
 */

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

export type PracticeModeSettings = Record<ModeKey, Record<DifficultyKey, ModeDifficultyLimits>>;

const STORAGE_KEY = 'ucmas_practice_mode_settings';

function defaultSettings(): PracticeModeSettings {
  return {
    visual: {
      basic:   { digits_min: 1, digits_max: 2, rows_min: 3, rows_max: 8,  question_count_min: 20, question_count_max: 50 },
      advanced: { digits_min: 2, digits_max: 4, rows_min: 6, rows_max: 15, question_count_min: 30, question_count_max: 80 },
      elite:   { digits_min: 3, digits_max: 6, rows_min: 8, rows_max: 25, question_count_min: 50, question_count_max: 120 },
    },
    audio: {
      basic:   { digits_min: 1, digits_max: 2, rows_min: 3, rows_max: 10, question_count_min: 20, question_count_max: 50, speed_seconds_min: 1.5, speed_seconds_max: 2.5 },
      advanced: { digits_min: 2, digits_max: 4, rows_min: 5, rows_max: 18, question_count_min: 30, question_count_max: 80, speed_seconds_min: 0.8, speed_seconds_max: 1.5 },
      elite:   { digits_min: 3, digits_max: 6, rows_min: 8, rows_max: 30, question_count_min: 50, question_count_max: 120, speed_seconds_min: 0.1, speed_seconds_max: 0.8 },
    },
    flash: {
      basic:   { digits_min: 1, digits_max: 2, rows_min: 3, rows_max: 10, question_count_min: 20, question_count_max: 50, speed_seconds_min: 1.5, speed_seconds_max: 2.5 },
      advanced: { digits_min: 2, digits_max: 4, rows_min: 5, rows_max: 18, question_count_min: 30, question_count_max: 80, speed_seconds_min: 0.8, speed_seconds_max: 1.5 },
      elite:   { digits_min: 3, digits_max: 6, rows_min: 8, rows_max: 30, question_count_min: 50, question_count_max: 120, speed_seconds_min: 0.1, speed_seconds_max: 0.8 },
    },
  };
}

export const practiceModeSettings = {
  getDefaults(): PracticeModeSettings {
    return defaultSettings();
  },

  getSettings(): PracticeModeSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSettings();
      const parsed = JSON.parse(raw) as PracticeModeSettings;
      const defaults = defaultSettings();
      for (const mode of ['visual', 'audio', 'flash'] as ModeKey[]) {
        for (const diff of ['basic', 'advanced', 'elite'] as DifficultyKey[]) {
          if (!parsed[mode]?.[diff]) parsed[mode] = parsed[mode] || {} as any; (parsed[mode] as any)[diff] = defaults[mode][diff];
        }
      }
      return parsed;
    } catch {
      return defaultSettings();
    }
  },

  setSettings(settings: PracticeModeSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  },

  resetToDefaults(): PracticeModeSettings {
    const def = defaultSettings();
    this.setSettings(def);
    return def;
  },
};
