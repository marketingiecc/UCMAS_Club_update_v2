/**
 * Dịch vụ đồng bộ cấu hình Nghe tính (khoảng chờ Ghép âm) với Supabase.
 * Lưu vào localStorage (tức thì) và Supabase (chia sẻ toàn hệ thống).
 */

import { supabase } from './mockBackend';
import {
  setNgheTinhGapConfig,
  type NgheTinhGapConfig,
} from './googleTts';

/** Lấy cấu hình từ Supabase và cập nhật localStorage. Gọi khi khởi động app. */
export async function fetchNgheTinhGapConfig(): Promise<NgheTinhGapConfig | null> {
  try {
    const { data, error } = await supabase
      .from('nghe_tinh_gap_config')
      .select('gap_within_number_ms, gap_between_operands_ms, gap_after_operator_ms, gap_after_chuan_bi_ms')
      .eq('id', 1)
      .single();

    if (error || !data) return null;

    const cfg: NgheTinhGapConfig = {
      gapWithinNumberMs: Number(data.gap_within_number_ms) ?? 0,
      gapBetweenOperandsMs: Number(data.gap_between_operands_ms) ?? 80,
      gapAfterOperatorMs: Number(data.gap_after_operator_ms) ?? 40,
      gapAfterChuanBiMs: Number(data.gap_after_chuan_bi_ms) ?? 1000,
    };
    setNgheTinhGapConfig(cfg);
    return cfg;
  } catch {
    return null;
  }
}

/**
 * Lưu cấu hình lên Supabase (và localStorage).
 * Yêu cầu đăng nhập với quyền admin để ghi lên Supabase.
 * Luôn lưu localStorage trước để dùng ngay trên thiết bị này.
 */
export async function saveNgheTinhGapConfig(cfg: NgheTinhGapConfig): Promise<void> {
  setNgheTinhGapConfig(cfg);

  try {
    const { error } = await supabase
      .from('nghe_tinh_gap_config')
      .upsert(
        {
          id: 1,
          gap_within_number_ms: cfg.gapWithinNumberMs,
          gap_between_operands_ms: cfg.gapBetweenOperandsMs,
          gap_after_operator_ms: cfg.gapAfterOperatorMs,
          gap_after_chuan_bi_ms: cfg.gapAfterChuanBiMs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) throw error;
  } catch (e) {
    console.warn('NgheTinhConfig: Lưu Supabase thất bại, đã lưu trên thiết bị:', e);
    throw e;
  }
}
