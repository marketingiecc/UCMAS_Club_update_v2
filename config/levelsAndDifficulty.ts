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

function normalizeComparableText(input: string): string {
  // Lowercase + trim + remove accents for tolerant matching
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Danh sách cấp độ (kí hiệu + tên) để dùng cho dropdown/filter */
export const LEVEL_OPTIONS: ReadonlyArray<{ symbol: LevelSymbol; name: string }> = LEVEL_SYMBOLS_ORDER.map((symbol) => ({
  symbol: symbol as LevelSymbol,
  name: getLevelLabel(symbol),
}));

/** Tìm ký hiệu theo tên cấp độ (tolerant: bỏ dấu, không phân biệt hoa thường) */
export function getLevelSymbolFromName(name: string | undefined | null): LevelSymbol | null {
  if (!name) return null;
  const raw = String(name).trim();
  if (!raw) return null;

  // Accept symbol directly (backward compatible)
  if ((LEVEL_SYMBOLS_ORDER as readonly string[]).includes(raw)) return raw as LevelSymbol;

  const key = normalizeComparableText(raw);
  const found = LEVEL_OPTIONS.find((o) => normalizeComparableText(o.name) === key);
  return found?.symbol ?? null;
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
