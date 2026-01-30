import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  practiceModeSettings,
  type PracticeModeSettings,
  type ModeKey,
  type DifficultyKey,
  type ModeDifficultyLimits,
} from '../services/practiceModeSettings';
import { getLevelLabel, LEVEL_SYMBOLS_ORDER, DIFFICULTIES, type LevelSymbol } from '../config/levelsAndDifficulty';

const MODE_LABELS: Record<ModeKey, string> = { visual: 'Nhìn tính', audio: 'Nghe tính', flash: 'Flash' };
const DIFF_LABELS: Record<DifficultyKey, string> = { basic: 'Cơ bản', advanced: 'Nâng cao', elite: 'Vượt trội' };

type TabId = 'settings' | 'levels' | 'links';

const AdminTrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('settings');
  const [selectedLevel, setSelectedLevel] = useState<LevelSymbol>('A');
  const [modeSettings, setModeSettings] = useState<PracticeModeSettings>(() => practiceModeSettings.getSettings());

  useEffect(() => {
    if (activeTab === 'settings') setModeSettings(practiceModeSettings.getSettings());
  }, [activeTab]);

  const updateModeSetting = (mode: ModeKey, diff: DifficultyKey, field: keyof ModeDifficultyLimits, value: number) => {
    setModeSettings(prev => ({
      ...prev,
      by_level: {
        ...prev.by_level,
        [selectedLevel]: {
          ...prev.by_level[selectedLevel],
          [mode]: {
            ...prev.by_level[selectedLevel][mode],
            [diff]: { ...prev.by_level[selectedLevel][mode][diff], [field]: value },
          },
        },
      },
    }));
  };

  const handleSaveModeSettings = () => {
    practiceModeSettings.setSettings(modeSettings);
    setStatus('Đã lưu thiết lập chế độ.');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleResetModeSettings = () => {
    setModeSettings(practiceModeSettings.resetToDefaults());
    setStatus('Đã khôi phục mặc định.');
    setTimeout(() => setStatus(''), 2000);
  };

  const tabClass = (tab: TabId) =>
    `px-5 py-2 rounded-xl text-xs font-heading-bold uppercase transition ${activeTab === tab ? 'bg-ucmas-blue text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🛠️</div>
        <h1 className="text-3xl font-heading-extrabold text-ucmas-blue">Quản Trị Tính Năng Luyện Tập</h1>
        <p className="text-gray-600">Thiết lập chế độ luyện tập, cấp độ và liên kết quản trị</p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center mb-8">
        <button className={tabClass('settings')} onClick={() => setActiveTab('settings')}>Thiết lập chế độ</button>
        <button className={tabClass('levels')} onClick={() => setActiveTab('levels')}>Cấp độ & độ khó</button>
        <button className={tabClass('links')} onClick={() => setActiveTab('links')}>Liên kết quản trị</button>
      </div>

      {status && <div className="mb-6 text-center text-sm text-ucmas-blue">{status}</div>}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-heading-bold text-ucmas-blue mb-2">Thiết lập chế độ luyện tập</h2>
          <p className="text-gray-600 text-sm mb-6">
            Thiết lập theo <strong>từng cấp độ</strong>. Các cấu hình này sẽ được dùng để ra bài trong mục <strong>Luyện theo chế độ</strong> (Nhìn tính/Nghe tính/Flash).
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 bg-gray-50 border border-gray-100 rounded-2xl p-4">
              <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-500 mb-3">Danh sách cấp độ</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-2 gap-2">
                {LEVEL_SYMBOLS_ORDER.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setSelectedLevel(lv)}
                    className={`px-3 py-2 rounded-xl border text-sm font-heading font-black transition ${
                      selectedLevel === lv
                        ? 'bg-ucmas-blue text-white border-ucmas-blue shadow'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-ucmas-blue/40 hover:bg-ucmas-blue/5'
                    }`}
                    title={getLevelLabel(lv)}
                  >
                    {getLevelLabel(lv)}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-xs text-gray-500">
                Đang chỉnh: <strong className="text-gray-800">{getLevelLabel(selectedLevel)}</strong>
              </div>
            </div>

            <div className="lg:col-span-9 space-y-8">
              {(['visual', 'audio', 'flash'] as ModeKey[]).map(mode => {
                const cur = modeSettings.by_level[selectedLevel]?.[mode];
                if (!cur) return null;
                return (
                  <div key={mode} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className={`px-4 py-3 font-heading-bold text-white ${mode === 'visual' ? 'bg-ucmas-blue' : mode === 'audio' ? 'bg-ucmas-red' : 'bg-ucmas-green'}`}>
                      {MODE_LABELS[mode]} — <span className="opacity-90">{getLevelLabel(selectedLevel)}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left p-3 font-heading-bold text-gray-700">Độ khó</th>
                            <th className="p-2">Chữ số (min–max)</th>
                            <th className="p-2">Dòng (min–max)</th>
                            <th className="p-2">Số câu (min–max)</th>
                            {(mode === 'audio' || mode === 'flash') && (
                              <th className="p-2">Tốc độ (s) min–max</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(['basic', 'advanced', 'elite'] as DifficultyKey[]).map(diff => {
                            const row = cur[diff];
                            return (
                              <tr key={diff} className="border-b border-gray-100 hover:bg-gray-50/50">
                                <td className="p-3 font-medium text-gray-800">{DIFF_LABELS[diff]}</td>
                                <td className="p-2">
                                  <input type="number" min={1} max={10} className="w-14 border rounded px-2 py-1 mr-1" value={row.digits_min} onChange={e => updateModeSetting(mode, diff, 'digits_min', Number(e.target.value) || 1)} />
                                  –
                                  <input type="number" min={1} max={10} className="w-14 border rounded px-2 py-1 ml-1" value={row.digits_max} onChange={e => updateModeSetting(mode, diff, 'digits_max', Number(e.target.value) || 1)} />
                                </td>
                                <td className="p-2">
                                  <input type="number" min={1} max={100} className="w-14 border rounded px-2 py-1 mr-1" value={row.rows_min} onChange={e => updateModeSetting(mode, diff, 'rows_min', Number(e.target.value) || 1)} />
                                  –
                                  <input type="number" min={1} max={100} className="w-14 border rounded px-2 py-1 ml-1" value={row.rows_max} onChange={e => updateModeSetting(mode, diff, 'rows_max', Number(e.target.value) || 1)} />
                                </td>
                                <td className="p-2">
                                  <input type="number" min={5} max={200} className="w-14 border rounded px-2 py-1 mr-1" value={row.question_count_min} onChange={e => updateModeSetting(mode, diff, 'question_count_min', Number(e.target.value) || 5)} />
                                  –
                                  <input type="number" min={5} max={200} className="w-14 border rounded px-2 py-1 ml-1" value={row.question_count_max} onChange={e => updateModeSetting(mode, diff, 'question_count_max', Number(e.target.value) || 5)} />
                                </td>
                                {(mode === 'audio' || mode === 'flash') && (
                                  <td className="p-2">
                                    <input type="number" min={0.1} max={1.5} step={0.1} className="w-14 border rounded px-2 py-1 mr-1" value={row.speed_seconds_min ?? 0.1} onChange={e => updateModeSetting(mode, diff, 'speed_seconds_min', Number(e.target.value) || 0.1)} />
                                    –
                                    <input type="number" min={0.1} max={1.5} step={0.1} className="w-14 border rounded px-2 py-1 ml-1" value={row.speed_seconds_max ?? 1.5} onChange={e => updateModeSetting(mode, diff, 'speed_seconds_max', Number(e.target.value) || 1.5)} />
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button className="px-6 py-2 bg-ucmas-blue text-white rounded-lg font-heading-bold" onClick={handleSaveModeSettings}>Lưu thiết lập</button>
            <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-heading-bold hover:bg-gray-50" onClick={handleResetModeSettings}>Khôi phục mặc định</button>
          </div>
        </div>
      )}

      {activeTab === 'levels' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-heading-bold text-ucmas-blue mb-2">Cấp độ & độ khó</h2>
          <p className="text-gray-600 text-sm mb-6">Cấu hình từ file <code className="bg-gray-100 px-1 rounded">config/levelsAndDifficulty.ts</code>. Toàn bộ form luyện tập và thiết lập dùng nguồn này.</p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 font-heading-bold text-white bg-ucmas-blue">Cấp độ (level_symbol)</div>
              <div className="p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Thứ tự tăng dần</p>
                <div className="flex flex-wrap gap-2">
                  {LEVEL_SYMBOLS_ORDER.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-ucmas-blue/10 text-ucmas-blue font-bold text-sm"
                      title={getLevelLabel(s)}
                    >
                      {getLevelLabel(s)}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">Chỉ số nội bộ 1–10 tương ứng với cấp 1–10 (API/rule).</p>
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 font-heading-bold text-white bg-ucmas-green">Độ khó (difficulty)</div>
              <div className="p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Dùng cho Luyện theo chế độ & Thiết lập chế độ</p>
                <ul className="space-y-2">
                  {DIFFICULTIES.map(d => (
                    <li key={d.id} className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{d.id}</span>
                      <span className="text-gray-800">{d.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'links' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-heading-bold text-ucmas-blue mb-2">Liên kết quản trị</h2>
          <p className="text-gray-600 text-sm mb-6">Các trang quản trị liên quan đến luyện tập và đề thi.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/admin', { state: { openTab: 'trackDesign' } })}
              className="text-left p-5 rounded-xl border-2 border-gray-100 hover:border-ucmas-blue hover:bg-ucmas-blue/5 transition flex items-center gap-4"
            >
              <span className="text-3xl">📋</span>
              <div>
                <div className="font-heading-bold text-gray-800">Thiết kế lộ trình luyện tập</div>
                <div className="text-xs text-gray-500 mt-0.5">Tạo bài luyện tập theo cấp độ, ngày 1–120, chế độ, upload JSON</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/admin/practice')}
              className="text-left p-5 rounded-xl border-2 border-gray-100 hover:border-ucmas-blue hover:bg-ucmas-blue/5 transition flex items-center gap-4"
            >
              <span className="text-3xl">📚</span>
              <div>
                <div className="font-heading-bold text-gray-800">Quản lý đề thi / Kho bài</div>
                <div className="text-xs text-gray-500 mt-0.5">Tạo và quản lý đề luyện thi, đề giao học sinh</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTrainingPage;
