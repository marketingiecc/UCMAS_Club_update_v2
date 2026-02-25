import React, { useRef, useState } from 'react';
import { cancelBrowserSpeechSynthesis, playStableTts } from '../services/googleTts';

const FIXED_LANG = 'vi-VN';
const FIXED_VOICE = 'vi-VN-Standard-A';
const FIXED_RATE = 1.0;

const NgheTinhTestPage: React.FC = () => {
  const [text, setText] = useState('Một, hai, ba, bốn, năm, sáu, bảy, tám, chín.');
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('Sẵn sàng');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasGoogleCloudKey = !!((import.meta as any)?.env?.VITE_GOOGLE_TTS_API_KEY as string | undefined);

  const stopPlayback = () => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch { /* ignore */ }
      audioRef.current = null;
    }
    cancelBrowserSpeechSynthesis();
    setIsPlaying(false);
    setStatus('Đã dừng');
  };

  const handlePlay = async () => {
    const safeText = text.trim();
    if (!safeText) {
      alert('Vui lòng nhập nội dung để nghe thử.');
      return;
    }
    if (!hasGoogleCloudKey) {
      setStatus('Thiếu VITE_GOOGLE_TTS_API_KEY trong .env.local');
      return;
    }

    stopPlayback();
    setIsPlaying(true);
    setStatus('Đang phát...');

    try {
      await playStableTts(safeText, FIXED_LANG, FIXED_RATE, {
        onAudio: (audio) => {
          audioRef.current = audio;
        },
      });
      setStatus('Phát xong');
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      setStatus(`Lỗi phát âm: ${detail}`);
    } finally {
      setIsPlaying(false);
      audioRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-heading font-black text-gray-800 mb-2">Test Giọng Nghe Tính</h1>
          <p className="text-sm text-gray-600 mb-2">
            Chế độ cố định để đồng nhất âm sắc toàn hệ thống.
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Engine: Google Cloud TTS | Ngôn ngữ: {FIXED_LANG} | Voice: {FIXED_VOICE} | Rate: {FIXED_RATE}x
          </p>

          <div>
            <label className="block text-xs font-heading font-bold text-gray-500 mb-1 uppercase">Nội dung nghe thử</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-ucmas-blue text-sm"
              placeholder="Nhập nội dung muốn nghe..."
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setText('Một, hai, ba, bốn, năm, sáu, bảy, tám, chín.')}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Nạp mẫu 1-9
              </button>
              <span className="text-xs text-gray-500">Độ dài: {text.length} ký tự</span>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
            <button
              onClick={handlePlay}
              disabled={isPlaying}
              className="px-5 py-2.5 rounded-xl bg-ucmas-red text-white font-heading font-bold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPlaying ? 'Đang phát...' : 'Phát thử'}
            </button>
            <button
              onClick={stopPlayback}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-heading font-bold hover:bg-gray-100"
            >
              Dừng
            </button>
            <span className="text-sm text-gray-600">Trạng thái: {status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NgheTinhTestPage;
