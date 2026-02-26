-- Bảng cấu hình khoảng chờ Ghép âm Nghe tính (UCMAS)
-- Áp dụng cho toàn bộ người dùng khi làm bài Nghe tính
--
-- Chạy: Mở Supabase Dashboard > SQL Editor > New query > dán toàn bộ file > Run
-- Hoặc: supabase db push (nếu dùng Supabase CLI)

CREATE TABLE IF NOT EXISTS public.nghe_tinh_gap_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  gap_within_number_ms integer NOT NULL DEFAULT 0,
  gap_between_operands_ms integer NOT NULL DEFAULT 80,
  gap_after_operator_ms integer NOT NULL DEFAULT 40,
  gap_after_chuan_bi_ms integer NOT NULL DEFAULT 1000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Chỉ có 1 dòng config toàn hệ thống
INSERT INTO public.nghe_tinh_gap_config (id, gap_within_number_ms, gap_between_operands_ms, gap_after_operator_ms, gap_after_chuan_bi_ms)
VALUES (1, 0, 80, 40, 1000)
ON CONFLICT (id) DO NOTHING;

-- RLS: Mọi người đọc được, chỉ admin ghi được
ALTER TABLE public.nghe_tinh_gap_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nghe_tinh_config_select" ON public.nghe_tinh_gap_config
  FOR SELECT USING (true);

CREATE POLICY "nghe_tinh_config_update_admin" ON public.nghe_tinh_gap_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "nghe_tinh_config_insert_admin" ON public.nghe_tinh_gap_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE public.nghe_tinh_gap_config IS 'Cấu hình khoảng chờ Ghép âm Nghe tính (ms) - áp dụng toàn hệ thống';
