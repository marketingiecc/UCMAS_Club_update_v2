/**
 * Upload âm Nghe tính lên Supabase Storage khi TTS bổ sung âm thiếu.
 * Yêu cầu bucket `nghe-tinh-audio` public và có policy cho phép upload.
 */

import { supabase } from './mockBackend';

const BUCKET = 'nghe-tinh-audio';

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

/**
 * Upload file MP3 lên Supabase Storage. Trả về true nếu thành công.
 */
export async function uploadNgheTinhAudio(fileName: string, base64: string): Promise<boolean> {
  try {
    const safeName = String(fileName).replace(/[^a-zA-Z0-9_-]/g, '') || 'unknown';
    const path = `${safeName}.mp3`;
    const blob = base64ToBlob(base64, 'audio/mpeg');

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: true, contentType: 'audio/mpeg' });

    if (error) {
      console.warn('NgheTinhStorage: Upload thất bại:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('NgheTinhStorage: Lỗi:', e);
    return false;
  }
}
