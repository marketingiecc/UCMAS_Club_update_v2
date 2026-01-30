/**
 * Cấu hình cấp độ và độ khó — nguồn thống nhất cho toàn bộ ứng dụng.
 * Các thiết lập (luyện tập, admin, đề thi) dùng file này làm nền tảng.
 */

/** Ký hiệu cấp độ UCMAS: Z, A, C, D, E, F, G, H, I, K (thứ tự tăng dần) */
export const LEVEL_SYMBOLS_ORDER: readonly string[] = ['Z', 'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K'];

export type LevelSymbol = (typeof LEVEL_SYMBOLS_ORDER)[number];

/** Nhãn hiển thị tiếng Việt cho cấp độ */
export function getLevelLabel(symbol: string | undefined | null): string {
  if (symbol == null || symbol === '') return 'Chưa chọn cấp độ';
  const map: Record<string, string> = {
    Z: 'Cơ bản mở rộng',
    A: 'Cơ bản',
    C: 'Sơ cấp A',
    D: 'Sơ cấp B',
    E: 'Trung cấp A',
    F: 'Trung cấp B',
    G: 'Cao cấp A',
    H: 'Cao cấp B',
    I: 'Nâng cao',
    K: 'Xuất sắc',
  };
  return map[symbol] ?? 'Cấp độ (không xác định)';
}

/** Chuyển ký hiệu cấp độ → chỉ số 1–10 (dùng cho API/rule cũ) */
export function getLevelIndex(symbol: string | undefined | null): number {
  if (symbol == null || symbol === '') return 1;
  const i = LEVEL_SYMBOLS_ORDER.indexOf(symbol);
  return i >= 0 ? Math.min(10, i + 1) : 1;
}

/** Chuyển chỉ số 1–10 → ký hiệu cấp độ */
export function getLevelSymbol(index: number): LevelSymbol {
  const i = Math.max(1, Math.min(10, Math.round(index))) - 1;
  return LEVEL_SYMBOLS_ORDER[i] as LevelSymbol;
}

/** Độ khó luyện tập */
export type DifficultyKey = 'basic' | 'advanced' | 'elite';

export const DIFFICULTIES: ReadonlyArray<{ id: DifficultyKey; label: string }> = [
  { id: 'basic', label: 'Cơ bản' },
  { id: 'advanced', label: 'Nâng cao' },
  { id: 'elite', label: 'Vượt trội' },
];

export function getDifficultyLabel(id: DifficultyKey | string): string {
  return DIFFICULTIES.find(d => d.id === id)?.label ?? id;
}
