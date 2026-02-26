-- Cho phép upload âm Nghe tính lên bucket nghe-tinh-audio
-- Khi TTS bổ sung âm thiếu, app sẽ tự động upload lên Storage
--
-- Chạy trong Supabase Dashboard > SQL Editor
-- Yêu cầu: Bucket nghe-tinh-audio đã tạo (Storage > New bucket) và đặt Public

-- Policy: Cho phép mọi người upload để bổ sung âm mới (upsert)
DROP POLICY IF EXISTS "nghe_tinh_audio_upload" ON storage.objects;
CREATE POLICY "nghe_tinh_audio_upload"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'nghe-tinh-audio');

DROP POLICY IF EXISTS "nghe_tinh_audio_update" ON storage.objects;
CREATE POLICY "nghe_tinh_audio_update"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'nghe-tinh-audio')
WITH CHECK (bucket_id = 'nghe-tinh-audio');
