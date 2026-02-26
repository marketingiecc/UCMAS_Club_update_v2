# Lưu trữ Audio Nghe tính

## Nguồn âm (ưu tiên)

Khi `VITE_SUPABASE_URL` được cấu hình, ứng dụng **tự động** dùng Supabase Storage:
- **Bucket:** `nghe-tinh-audio` (public)
- **URL mẫu:** `https://<project>.supabase.co/storage/v1/object/public/nghe-tinh-audio/hai.mp3`

Nếu không có Supabase, dùng thư mục local: `public/audio/nghe-tinh/1.0/`.

**Định dạng:** MP3  
**Quy ước tên file:** Không dấu (VD: `hai.mp3`, `muoi.mp3`, `chuan_bi.mp3`, `cong.mp3`)

## Các token âm cần có

| Token        | File      | Mô tả              |
|--------------|-----------|--------------------|
| không–chín   | khong.mp3 … chin.mp3 | Số 0–9 |
| mười, mươi, mốt, lăm, linh | muoi.mp3, muoi2.mp3, mot2.mp3, lam.mp3, linh.mp3 | Đơn vị đặc biệt |
| trăm, nghìn, triệu, tỷ | tram.mp3, nghin.mp3, trieu.mp3, ty.mp3 | Đơn vị lớn |
| cộng, trừ, nhân, chia | cong.mp3, tru.mp3, nhan.mp3, chia.mp3 | Phép toán |
| Chuẩn_bị, Bằng | chuan_bi.mp3, bang.mp3 | Lệnh Nghe tính |

Âm thiếu sẽ được bổ sung bằng Google TTS khi phát.

## Tùy chọn lưu trữ nâng cao

### 1. Supabase Storage (đã tích hợp)

- Bucket `nghe-tinh-audio` (public)
- App tự động dùng Storage khi `VITE_SUPABASE_URL` có trong `.env.local`
- **Tự động lưu âm mới:** Khi TTS bổ sung âm thiếu → app upload MP3 lên Storage
- **Policy upload:** Chạy migration `20260226100000_storage_nghe_tinh_upload_policy.sql` trong Supabase SQL Editor
- **Biến môi trường:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (lấy từ Supabase Project Settings > API)

### 2. CDN (Cloudflare R2, Vercel Blob)

- Đặt bucket public, lấy base URL
- Cập nhật `getTokenAudioUrlAbsolute()` để dùng base URL CDN thay vì đường dẫn local

### 3. Giữ nguyên `public/`

- Ưu điểm: Đơn giản, không phụ thuộc thêm dịch vụ
- Nhược điểm: Tăng dung lượng bản build; mỗi lần thêm âm phải deploy lại
