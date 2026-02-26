import React, { useRef, useState } from 'react';
import {
  cancelBrowserSpeechSynthesis,
  playStableTts,
  playConcatenatedListeningVi,
  operandsToTokenSequence,
} from '../services/googleTts';
import CustomSlider from '../components/CustomSlider';

const FIXED_LANG = 'vi-VN';
const FIXED_VOICE = 'vi-VN-Standard-A';
const FIXED_RATE = 1.0;

const clampSpeed = (v: number) => Math.min(1.5, Math.max(0.1, v));
const getSpeechRate = (speed: number) => Math.min(Math.max(0.9 / speed, 0.5), 2.5);

type TabId = 'tts' | 'concatenated';

function parseOperandsInput(input: string): number[] {
  return input
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

const NgheTinhTestPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('tts');
  const [text, setText] = useState('Một, hai, ba, bốn, năm, sáu, bảy, tám, chín.');
  const [operandsInput, setOperandsInput] = useState('8, 5, -3, 2, 7');
  const [speed, setSpeed] = useState(1.0);
  const [missingTokens, setMissingTokens] = useState<string[]>([]);
  const missingDuringPlayRef = useRef<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('Sẵn sàng');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const operands = parseOperandsInput(operandsInput);
  const tokenSequence = operands.length > 0 ? operandsToTokenSequence(operands, 'addsub') : [];

  const stopPlayback = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
    cancelBrowserSpeechSynthesis();
    setIsPlaying(false);
    setStatus('Đã dừng');
  };

  const handlePlayTts = async () => {
    const safeText = text.trim();
    if (!safeText) {
      alert('Vui lòng nhập nội dung để nghe thử.');
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

  const handlePlayConcatenated = async () => {
    if (operands.length === 0) {
      alert('Vui lòng nhập operands (VD: 8, 5, -3, 2, 7).');
      return;
    }

    stopPlayback();
    missingDuringPlayRef.current = [];
    setMissingTokens([]);
    setIsPlaying(true);
    setStatus('Đang phát (ghép âm)...');

    try {
      const rate = getSpeechRate(speed);
      await playConcatenatedListeningVi(operands, FIXED_LANG, rate, {
        onAudio: (audio) => {
          audioRef.current = audio;
        },
        onMissingTokens: (tokens) => {
          missingDuringPlayRef.current.push(...tokens);
          setMissingTokens(missingDuringPlayRef.current.slice());
        },
      });
      const count = missingDuringPlayRef.current.length;
      setStatus(count > 0 ? `Phát xong (đã bổ sung ${count} âm bằng TTS)` : 'Phát xong');
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      setStatus(`Lỗi: ${detail}`);
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
          <p className="text-sm text-gray-600 mb-4">
            Chế độ cố định để đồng nhất âm sắc toàn hệ thống.
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Engine: Google Cloud TTS | Ngôn ngữ: {FIXED_LANG} | Voice: {FIXED_VOICE} | Rate: {FIXED_RATE}x
          </p>

          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('tts')}
              className={`px-4 py-2 font-heading font-bold text-sm rounded-t-xl border-b-2 -mb-px transition ${
                activeTab === 'tts'
                  ? 'border-ucmas-red text-ucmas-red bg-red-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              TTS trực tiếp
            </button>
            <button
              onClick={() => setActiveTab('concatenated')}
              className={`px-4 py-2 font-heading font-bold text-sm rounded-t-xl border-b-2 -mb-px transition ${
                activeTab === 'concatenated'
                  ? 'border-ucmas-red text-ucmas-red bg-red-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ghép âm
            </button>
          </div>

          {activeTab === 'tts' && (
            <>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-500 mb-1 uppercase">
                  Nội dung nghe thử
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-ucmas-blue text-sm"
                  placeholder="Nhập nội dung muốn nghe..."
                />
                <div className="mt-2 flex items-center gap-2 flex-wrap">
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
                  onClick={handlePlayTts}
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
            </>
          )}

          {activeTab === 'concatenated' && (
            <>
              <div className="mb-4">
                <CustomSlider
                  label="Tốc độ đọc"
                  value={speed}
                  min={0.1}
                  max={1.5}
                  step={0.1}
                  onChange={(val) => setSpeed(clampSpeed(val))}
                  valueLabel={`${speed} giây/số`}
                  color="red"
                  unit="s"
                  minLabel="Nhanh (0.1s)"
                  maxLabel="Chậm (1.5s)"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-500 mb-1 uppercase">
                  Operands (số cách nhau bằng dấu phẩy, số âm có dấu -)
                </label>
                <input
                  type="text"
                  value={operandsInput}
                  onChange={(e) => setOperandsInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-ucmas-blue text-sm"
                  placeholder="8, 5, -3, 2, 7"
                />
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setOperandsInput('8, 5, -3, 2, 7')}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Mẫu cộng/trừ
                  </button>
                  <button
                    onClick={() => setOperandsInput('123, 456')}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Số lớn
                  </button>
                  <button
                    onClick={() => setOperandsInput('1000000')}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    1 triệu
                  </button>
                </div>
              </div>
              {tokenSequence.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs font-heading font-bold text-gray-500 mb-1 uppercase">Chuỗi token</div>
                  <div className="text-sm text-gray-700 font-mono break-words">
                    [{tokenSequence.join(', ')}]
                  </div>
                  {missingTokens.length > 0 && (
                    <div className="mt-2 text-xs text-amber-600">
                      Âm thiếu (đã bổ sung bằng TTS): {missingTokens.join(', ')}
                    </div>
                  )}
                </div>
              )}
              <div className="pt-4 mt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
                <button
                  onClick={handlePlayConcatenated}
                  disabled={isPlaying || operands.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-ucmas-red text-white font-heading font-bold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPlaying ? 'Đang phát...' : 'Phát (ghép âm)'}
                </button>
                <button
                  onClick={stopPlayback}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-heading font-bold hover:bg-gray-100"
                >
                  Dừng
                </button>
                <span className="text-sm text-gray-600">Trạng thái: {status}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NgheTinhTestPage;
