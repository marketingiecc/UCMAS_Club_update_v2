import React, { useEffect, useMemo, useState } from 'react';
import { trackDayLibraryService, type TrackDayLibraryRow } from '../services/trackDayLibraryService';
import { getLevelLabel, LEVEL_OPTIONS } from '../config/levelsAndDifficulty';

type Props = {
  isOpen: boolean;
  /** Preset theo cấp độ đang thiết lập trong lộ trình (symbol), người dùng vẫn có thể đổi filter trong popup */
  presetLevelSymbol?: string | null;
  onClose: () => void;
  onSelect: (item: TrackDayLibraryRow) => void;
};

const TrackDayLibraryPickerModal: React.FC<Props> = ({ isOpen, presetLevelSymbol, onClose, onSelect }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TrackDayLibraryRow[]>([]);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<TrackDayLibraryRow | null>(null);
  const [levelNameFilter, setLevelNameFilter] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list = await trackDayLibraryService.list();
        if (!mounted) return;
        setItems(list);
      } catch (e: any) {
        console.warn(e);
        alert('Không tải được Kho bài luyện tập: ' + (e?.message || 'Unknown error'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setPreview(null);
      setLevelNameFilter('');
      return;
    }
    // preset filter theo cấp đang thiết lập (hiển thị theo tên)
    setLevelNameFilter(presetLevelSymbol ? getLevelLabel(presetLevelSymbol) : '');
  }, [isOpen, presetLevelSymbol]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const levelName = (levelNameFilter || '').trim();
    return items.filter((it) => {
      const itLevelName = (it as any).level_name || (it.level_symbol ? getLevelLabel(it.level_symbol) : '');
      const okLevel = !levelName || itLevelName === levelName;
      const okQuery = !q || (it.name || '').toLowerCase().includes(q);
      return okLevel && okQuery;
    });
  }, [items, levelNameFilter, query]);

  if (!isOpen) return null;

  const ModePill = ({ mode, count }: { mode: 'visual' | 'audio' | 'flash'; count: number }) => {
    const base = 'px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider';
    if (mode === 'visual') return <span className={`${base} bg-blue-100 text-blue-700`}>👁️ {count}</span>;
    if (mode === 'audio') return <span className={`${base} bg-red-100 text-red-700`}>🎧 {count}</span>;
    return <span className={`${base} bg-green-100 text-green-700`}>⚡ {count}</span>;
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-ucmas-blue to-ucmas-blue/90 p-4 sm:p-6 text-white flex justify-between items-center shrink-0 gap-2">
          <div className="min-w-0">
            <h3 className="text-base sm:text-xl font-heading-bold truncate">Chọn tệp từ Kho bài luyện tập</h3>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">
              {levelNameFilter ? <>Lọc theo cấp độ: <span className="font-heading-bold text-white">{levelNameFilter}</span></> : 'Tất cả cấp độ'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30 transition-all hover:scale-110 flex-shrink-0"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-gray-50 flex-grow">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4">
            <div className="flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên..."
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue focus:outline-none transition font-medium"
              />
            </div>
            <select
              value={levelNameFilter}
              onChange={(e) => setLevelNameFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue focus:outline-none transition min-w-[220px]"
              aria-label="Lọc theo cấp độ"
            >
              <option value="">Tất cả cấp độ</option>
              {LEVEL_OPTIONS.map((lv) => (
                <option key={lv.symbol} value={lv.name}>{lv.name}</option>
              ))}
            </select>
            <button
              onClick={() => { setQuery(''); setLevelNameFilter(''); }}
              className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-heading font-black text-xs uppercase hover:bg-white transition"
            >
              Xóa lọc
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ucmas-blue" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <div className="text-4xl mb-3">🧩</div>
              <div className="font-heading font-black uppercase text-sm tracking-widest">Chưa có file nào</div>
              <div className="text-xs mt-2">Hãy upload file vào tab “KHO BÀI LUYỆN TẬP” trong trang Kho bài tập.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {filtered.map((it) => {
                const v = it.payload?.exercises?.visual?.questions?.length || 0;
                const a = it.payload?.exercises?.audio?.questions?.length || 0;
                const f = it.payload?.exercises?.flash?.questions?.length || 0;
                return (
                  <div key={it.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-heading font-black text-gray-900 truncate">{it.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-1 truncate">{it.id}</div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <ModePill mode="visual" count={v} />
                          <ModePill mode="audio" count={a} />
                          <ModePill mode="flash" count={f} />
                          <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700">
                            {(it as any).level_name || (it.level_symbol ? getLevelLabel(it.level_symbol) : 'Chưa gán cấp độ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setPreview(it)}
                          className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 font-heading font-black text-[10px] uppercase hover:bg-gray-50 transition"
                        >
                          Xem
                        </button>
                        <button
                          onClick={() => onSelect(it)}
                          className="px-3 py-2 rounded-xl bg-ucmas-blue text-white font-heading font-black text-[10px] uppercase hover:bg-blue-700 transition shadow"
                        >
                          Chọn
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {preview && (
            <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-400 font-heading font-black uppercase tracking-widest">Xem nhanh</div>
                  <div className="text-lg font-heading font-black text-gray-900 truncate mt-1">{preview.name}</div>
                  {preview.description && <div className="text-sm text-gray-600 mt-2">{preview.description}</div>}
                </div>
                <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                {(['visual', 'audio', 'flash'] as const).map((m) => {
                  const ex = preview.payload.exercises[m];
                  return (
                    <div key={m} className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                      <div className="text-xs font-heading font-black uppercase tracking-widest text-gray-500">{m}</div>
                      <div className="text-sm font-bold text-gray-800 mt-1">{ex.questions.length} câu</div>
                      <div className="text-xs text-gray-600 mt-2">
                        {ex.digits} chữ số • {ex.rows} dòng • tốc độ {ex.speed_seconds}s
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Độ khó: {ex.difficulty}</div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setPreview(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-heading font-black text-xs uppercase hover:bg-gray-50 transition"
                >
                  Đóng
                </button>
                <button
                  onClick={() => onSelect(preview)}
                  className="px-5 py-2.5 rounded-xl bg-ucmas-blue text-white font-heading font-black text-xs uppercase hover:bg-blue-700 transition shadow"
                >
                  Chọn file này
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-ucmas-blue text-white font-heading-bold rounded-xl hover:bg-ucmas-red shadow-md transition-all transform hover:-translate-y-0.5 hover:shadow-lg"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackDayLibraryPickerModal;

