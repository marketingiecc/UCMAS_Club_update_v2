/**
 * Cấu hình cấp độ và độ khó — nguồn thống nhất cho toàn bộ ứng dụng.
 * Các thiết lập (luyện tập, admin, đề thi) dùng file này làm nền tảng.
 */

/** Ký hiệu cấp độ legacy UCMAS: Z, A, C, D, E, F, G, H, I, K (thứ tự tăng dần) */
export const LEVEL_SYMBOLS_ORDER: readonly string[] = ['Z', 'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K'];

export type LevelSymbol = (typeof LEVEL_SYMBOLS_ORDER)[number];

export const STUDY_LEVELS = [
  { id: 'study_kg1a', code: 'KG1A', name: 'KG1A', legacySymbol: 'Z' },
  { id: 'study_kg1b', code: 'KG1B', name: 'KG1B', legacySymbol: 'A' },
  { id: 'study_kg2', code: 'KG2', name: 'KG2', legacySymbol: 'C' },
  { id: 'study_kg3', code: 'KG3', name: 'KG3', legacySymbol: 'D' },
  { id: 'study_kg4', code: 'KG4', name: 'KG4', legacySymbol: 'E' },
  { id: 'study_advanced_a', code: 'ADV_A', name: 'Cao cấp A', legacySymbol: 'G' },
  { id: 'study_advanced_b', code: 'ADV_B', name: 'Cao cấp B', legacySymbol: 'H' },
  { id: 'study_basic', code: 'BASIC', name: 'Cơ bản', legacySymbol: 'A' },
  { id: 'study_basic_extended', code: 'BASIC_EXT', name: 'Cơ bản mở rộng', legacySymbol: 'Z' },
  { id: 'study_enhanced', code: 'ENHANCED', name: 'Nâng cao', legacySymbol: 'I' },
  { id: 'study_elementary_a', code: 'ELM_A', name: 'Sơ cấp A', legacySymbol: 'C' },
  { id: 'study_elementary_b', code: 'ELM_B', name: 'Sơ cấp B', legacySymbol: 'D' },
  { id: 'study_intermediate_a', code: 'INT_A', name: 'Trung cấp A', legacySymbol: 'E' },
  { id: 'study_intermediate_b', code: 'INT_B', name: 'Trung cấp B', legacySymbol: 'F' },
  { id: 'study_excellent_a', code: 'EXC_A', name: 'Xuất sắc A', legacySymbol: 'K' },
  { id: 'study_excellent_b', code: 'EXC_B', name: 'Xuất sắc B', legacySymbol: 'K' },
] as const satisfies ReadonlyArray<{ id: string; code: string; name: string; legacySymbol: LevelSymbol }>;

export type StudyLevelId = (typeof STUDY_LEVELS)[number]['id'];

export const EXAM_LEVELS = [
  { id: 'exam_advanced_a', symbol: 'G', name: 'Cao cấp A', englishName: 'Advanced A' },
  { id: 'exam_advanced_b', symbol: 'H', name: 'Cao cấp B', englishName: 'Advanced B' },
  { id: 'exam_basic', symbol: 'A', name: 'Cơ bản', englishName: 'Basic' },
  { id: 'exam_basic_extended', symbol: 'Z', name: 'Cơ bản mở rộng', englishName: 'Basic Extended' },
  { id: 'exam_enhanced', symbol: 'I', name: 'Nâng cao', englishName: 'Higher' },
  { id: 'exam_elementary_a', symbol: 'C', name: 'Sơ cấp A', englishName: 'Elementary A' },
  { id: 'exam_elementary_b', symbol: 'D', name: 'Sơ cấp B', englishName: 'Elementary B' },
  { id: 'exam_intermediate_a', symbol: 'E', name: 'Trung cấp A', englishName: 'Intermediate A' },
  { id: 'exam_intermediate_b', symbol: 'F', name: 'Trung cấp B', englishName: 'Intermediate B' },
  { id: 'exam_excellent', symbol: 'K', name: 'Xuất sắc', englishName: 'Excellent' },
] as const satisfies ReadonlyArray<{ id: string; symbol: LevelSymbol; name: string; englishName: string }>;

export type ExamLevelId = (typeof EXAM_LEVELS)[number]['id'];

const LEGACY_LABEL_MAP: Record<LevelSymbol, string> = {
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

/** Nhãn hiển thị tiếng Việt cho cấp độ legacy (level_symbol) */
export function getLevelLabel(symbol: string | undefined | null): string {
  if (symbol == null || symbol === '') return 'Chưa chọn cấp độ';
  return LEGACY_LABEL_MAP[symbol as LevelSymbol] ?? 'Cấp độ (không xác định)';
}

export function getStudyLevelLabel(studyLevelId: string | undefined | null): string {
  if (!studyLevelId) return 'Chưa chọn cấp độ học';
  return STUDY_LEVELS.find((x) => x.id === studyLevelId)?.name ?? 'Cấp độ học (không xác định)';
}

export function getExamLevelLabel(examLevelId: string | undefined | null): string {
  if (!examLevelId) return 'Chưa chọn cấp độ thi';
  return EXAM_LEVELS.find((x) => x.id === examLevelId)?.name ?? 'Cấp độ thi (không xác định)';
}

export function getExamLevelEnglishName(examLevelId: string | undefined | null): string {
  if (!examLevelId) return 'Unassigned';
  return EXAM_LEVELS.find((x) => x.id === examLevelId)?.englishName ?? 'Unknown';
}

export function getLegacySymbolFromStudyLevelId(studyLevelId: string | undefined | null): LevelSymbol {
  if (!studyLevelId) return 'A';
  return STUDY_LEVELS.find((x) => x.id === studyLevelId)?.legacySymbol ?? 'A';
}

export function getLegacySymbolFromExamLevelId(examLevelId: string | undefined | null): LevelSymbol {
  if (!examLevelId) return 'A';
  return EXAM_LEVELS.find((x) => x.id === examLevelId)?.symbol ?? 'A';
}

export function getExamLevelIdFromLegacySymbol(symbol: string | undefined | null): ExamLevelId {
  const safe = (symbol && LEVEL_SYMBOLS_ORDER.includes(symbol) ? symbol : 'A') as LevelSymbol;
  return EXAM_LEVELS.find((x) => x.symbol === safe)?.id ?? 'exam_basic';
}

export function getStudyLevelIdFromLegacySymbol(symbol: string | undefined | null): StudyLevelId {
  const safe = (symbol && LEVEL_SYMBOLS_ORDER.includes(symbol) ? symbol : 'A') as LevelSymbol;
  return STUDY_LEVELS.find((x) => x.legacySymbol === safe)?.id ?? 'study_basic';
}

export function getDefaultStudyLevelId(): StudyLevelId {
  return 'study_basic';
}

export function getDefaultExamLevelId(): ExamLevelId {
  return 'exam_basic';
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
