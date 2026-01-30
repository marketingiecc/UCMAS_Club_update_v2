import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfile, Mode } from '../types';
import CustomSlider from '../components/CustomSlider';
import { practiceModeSettings, type DifficultyKey } from '../services/practiceModeSettings';
import { LEVEL_SYMBOLS_ORDER, DIFFICULTIES } from '../config/levelsAndDifficulty';

const LANGUAGES = [
  { code: 'vi-VN', label: 'Tiếng Việt' },
  { code: 'en-US', label: 'Tiếng Anh' },
];

/** Bài luyện tập trong lộ trình (cùng cấu trúc Admin lưu localStorage) */
interface PathExerciseEntry {
  id: string;
  level_symbol: string;
  day_no: number;
  mode: 'visual' | 'audio' | 'flash';
  question_count: number;
  difficulty: string;
  digits: number;
  rows: number;
  speed_seconds: number;
  source: 'generated' | 'json_upload';
  questions?: { id: string; operands: number[]; correctAnswer: number }[];
}

const PATH_STORAGE_KEY = 'ucmas_track_exercises';
const PATH_COMPLETED_KEY = 'ucmas_path_day_completed';
const PATH_MODE_LABELS: Record<'visual' | 'audio' | 'flash', string> = { visual: 'Nhìn tính', audio: 'Nghe tính', flash: 'Flash' };

function loadPathExercises(): PathExerciseEntry[] {
  try {
    const raw = localStorage.getItem(PATH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Trạng thái "đã làm bài" theo ngày (học sinh). Cấu trúc: { [userId]: { [level]: { [dayNo]: true } } } */
function getPathDaysCompleted(userId: string): Record<string, Record<number, boolean>> {
  try {
    const raw = localStorage.getItem(PATH_COMPLETED_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[userId] || {};
  } catch { return {}; }
}

interface TrainingHubProps {
  user: UserProfile;
}

type TabId = 'mode' | 'path' | 'elite';
type SelectedMode = 'visual' | 'audio' | 'flash';

const TrainingHub: React.FC<TrainingHubProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>('mode');
  useEffect(() => {
    const state = location.state as { openTab?: TabId; openMode?: SelectedMode; pathDay?: number } | null;
    if (state?.openTab) setActiveTab(state.openTab);
    if (state?.openMode) {
      if (state.openTab === 'elite') setSelectedModeElite(state.openMode);
      if (state.openTab === 'mode') setSelectedModePractice(state.openMode);
    }
    if (state?.pathDay != null) setSelectedPathDay(state.pathDay);
  }, [location.state]);

  // Lộ trình: tab con (0-3 = 1-30, 31-60, 61-90, 91-120), ngày đang xem chi tiết
  const [pathTabIndex, setPathTabIndex] = useState(0);
  const [selectedPathDay, setSelectedPathDay] = useState<number | null>(null);
  const pathExercises = useMemo(() => loadPathExercises(), []);

  // Tab 1: Luyện theo chế độ — chọn chế độ trước, sau đó hiện form
  const [selectedModePractice, setSelectedModePractice] = useState<SelectedMode | null>(null);
  const [modeLevel, setModeLevel] = useState<string>(user.level_symbol || 'A');
  const [modeDifficulty, setModeDifficulty] = useState<string>('basic');
  const [modeQuestionCount, setModeQuestionCount] = useState(20);
  const [modeSpeedRead, setModeSpeedRead] = useState(1.2);   // Tốc độ đọc (chỉ Nghe tính)
  const [modeSpeedDisplay, setModeSpeedDisplay] = useState(1.2); // Tốc độ hiển thị (chỉ Flash)
  const [modeLang, setModeLang] = useState('vi-VN');

  // Tab 3: Luyện thi HSG — chọn chế độ trước, sau đó hiện form
  const [selectedModeElite, setSelectedModeElite] = useState<SelectedMode | null>(null);
  const [eliteLevel, setEliteLevel] = useState<string>(user.level_symbol || 'A');
  const [eliteSource, setEliteSource] = useState<'auto' | 'bank'>('auto');
  const [eliteDigits, setEliteDigits] = useState(2);
  const [eliteRows, setEliteRows] = useState(5);
  const [eliteQuestionCount, setEliteQuestionCount] = useState(30);
  const [eliteSpeedRead, setEliteSpeedRead] = useState(1.0);   // Tốc độ đọc (chỉ Nghe tính)
  const [eliteSpeedDisplay, setEliteSpeedDisplay] = useState(1.0); // Tốc độ hiển thị (chỉ Flash)
  const [eliteLang, setEliteLang] = useState('vi-VN');

  const settings = useMemo(() => practiceModeSettings.getSettings(), []);

  const hasAccess = (mode: Mode) => {
    if (user.role === 'admin') return true;
    if (!user.license_expiry || new Date(user.license_expiry) < new Date()) return false;
    return user.allowed_modes.includes(mode);
  };

  const modeLimits = selectedModePractice ? settings[selectedModePractice][modeDifficulty as DifficultyKey] : null;

  const startPractice = (mode: Mode) => {
    if (!hasAccess(mode)) {
      navigate('/activate');
      return;
    }
    const speed = mode === Mode.LISTENING ? modeSpeedRead : mode === Mode.FLASH ? modeSpeedDisplay : undefined;
    const config = {
      level_symbol: modeLevel,
      difficulty: modeDifficulty,
      question_count: modeQuestionCount,
      speed_seconds: speed,
      language: modeLang,
    };
    navigate(`/practice/${mode}`, {
      state: {
        fromHub: true,
        config,
        returnTo: { tab: 'mode' as const, mode: selectedModePractice },
      },
    });
  };

  const startEliteVisual = () => {
    if (!hasAccess(Mode.VISUAL)) {
      navigate('/activate');
      return;
    }
    navigate('/practice-exam/nhin_tinh', {
      state: {
        customConfig: {
          numQuestions: 200,
          timeLimit: 480,
          level: eliteLevel,
          source: eliteSource,
        },
        returnTo: { tab: 'elite' as const, mode: 'visual' as const },
      },
    });
  };

  const startEliteAudio = () => {
    if (!hasAccess(Mode.LISTENING)) {
      navigate('/activate');
      return;
    }
    navigate('/practice/nghe_tinh', {
      state: {
        fromHub: true,
        elite: true,
        returnTo: { tab: 'elite' as const, mode: 'audio' as const },
        config: {
          digits: eliteDigits,
          rows: eliteRows,
          question_count: eliteQuestionCount,
          speed_seconds: eliteSpeedRead,
          language: eliteLang,
        },
      },
    });
  };

  const startEliteFlash = () => {
    if (!hasAccess(Mode.FLASH)) {
      navigate('/activate');
      return;
    }
    navigate('/practice/flash', {
      state: {
        fromHub: true,
        elite: true,
        returnTo: { tab: 'elite' as const, mode: 'flash' as const },
        config: {
          digits: eliteDigits,
          rows: eliteRows,
          question_count: eliteQuestionCount,
          speed_seconds: eliteSpeedDisplay,
          language: eliteLang,
        },
      },
    });
  };

  const userLevel = user.level_symbol || 'A';
  const exercisesForLevel = useMemo(
    () => pathExercises.filter(e => e.level_symbol === userLevel),
    [pathExercises, userLevel]
  );
  const pathDaysCompleted = useMemo(
    () => getPathDaysCompleted(user.id),
    [user.id, location.state]
  );

  const startPathExercise = (ex: PathExerciseEntry) => {
    const modeMap = { visual: Mode.VISUAL, audio: Mode.LISTENING, flash: Mode.FLASH } as const;
    const mode = modeMap[ex.mode];
    if (!hasAccess(mode)) {
      navigate('/activate');
      return;
    }
    const modeSlug = ex.mode === 'visual' ? 'nhin_tinh' : ex.mode === 'audio' ? 'nghe_tinh' : 'flash';
    const config: Record<string, unknown> = {
      level_symbol: userLevel,
      difficulty: ex.difficulty,
      question_count: ex.question_count,
      language: 'vi-VN',
      digits: ex.digits,
      rows: ex.rows,
      speed_seconds: ex.speed_seconds,
    };
    navigate(`/practice/${modeSlug}`, {
      state: {
        fromHub: true,
        config,
        returnTo: { tab: 'path' as const, pathDay: ex.day_no },
      },
    });
  };

  const PATH_TABS = [
    { label: 'Ngày 1–30', start: 1, end: 30 },
    { label: 'Ngày 31–60', start: 31, end: 60 },
    { label: 'Ngày 61–90', start: 61, end: 90 },
    { label: 'Ngày 91–120', start: 91, end: 120 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
      {/* Left: Tabs */}
      <div className="w-56 flex-shrink-0">
        <h1 className="text-xl font-heading-bold text-ucmas-blue mb-6">Trung tâm luyện tập</h1>
        <nav className="space-y-1">
          {[
            { id: 'mode' as TabId, label: 'Luyện theo chế độ', icon: '📋' },
            { id: 'path' as TabId, label: 'Luyện theo lộ trình', icon: '🏁' },
            { id: 'elite' as TabId, label: 'Luyện thi học sinh giỏi', icon: '🏆' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-xl font-heading font-semibold flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'bg-ucmas-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right: Content */}
      <div className="flex-1 min-w-0">
        {activeTab === 'mode' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-heading-bold text-ucmas-blue">Luyện theo chế độ</h2>
            <p className="text-gray-600">Chọn cấp độ, độ khó và số câu. Kết quả lưu vào Lịch sử luyện tập.</p>

            {selectedModePractice === null ? (
              <div className="grid md:grid-cols-3 gap-6">
                <button
                  onClick={() => setSelectedModePractice('visual')}
                  className="bg-white rounded-2xl border-2 border-ucmas-blue p-8 shadow-sm hover:shadow-lg hover:border-ucmas-red transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-blue text-white flex items-center justify-center text-4xl mb-4">👁️</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-blue mb-2">Nhìn tính</h3>
                  <p className="text-sm text-gray-600 text-center">Cấp độ, độ khó, số câu</p>
                </button>
                <button
                  onClick={() => setSelectedModePractice('audio')}
                  className="bg-white rounded-2xl border-2 border-ucmas-red p-8 shadow-sm hover:shadow-lg hover:border-ucmas-blue transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-red text-white flex items-center justify-center text-4xl mb-4">🎧</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-red mb-2">Nghe tính</h3>
                  <p className="text-sm text-gray-600 text-center">Cấp độ, độ khó, số câu, ngôn ngữ, tốc độ đọc</p>
                </button>
                <button
                  onClick={() => setSelectedModePractice('flash')}
                  className="bg-white rounded-2xl border-2 border-ucmas-green p-8 shadow-sm hover:shadow-lg hover:border-ucmas-blue transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-green text-white flex items-center justify-center text-4xl mb-4">⚡</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-green mb-2">Flash</h3>
                  <p className="text-sm text-gray-600 text-center">Cấp độ, độ khó, số câu, tốc độ hiển thị</p>
                </button>
              </div>
            ) : (
              <div className="max-w-lg">
                <button
                  onClick={() => setSelectedModePractice(null)}
                  className="text-ucmas-blue font-heading font-semibold mb-6 hover:underline flex items-center gap-1"
                >
                  ← Quay lại chọn chế độ
                </button>
                {selectedModePractice === 'visual' && (
                  <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
                    <div className="bg-ucmas-blue text-white px-6 py-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">👁️</div>
                      <div>
                        <h3 className="text-xl font-heading-bold">Nhìn tính</h3>
                        <p className="text-white/90 text-sm">Thiết lập</p>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-blue uppercase tracking-wider mb-1.5">Cấp độ</label>
                        <select value={modeLevel} onChange={(e) => setModeLevel(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue focus:outline-none transition font-medium">
                          {LEVEL_SYMBOLS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-blue uppercase tracking-wider mb-1.5">Độ khó</label>
                        <select value={modeDifficulty} onChange={(e) => setModeDifficulty(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-blue focus:outline-none transition font-medium">
                          {DIFFICULTIES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-blue uppercase tracking-wider mb-1.5">Số câu</label>
                        <input type="number" min={modeLimits?.question_count_min ?? 10} max={modeLimits?.question_count_max ?? 120} value={modeQuestionCount} onChange={(e) => setModeQuestionCount(Number(e.target.value) || 20)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-blue focus:outline-none transition font-medium" />
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <button onClick={() => startPractice(Mode.VISUAL)} className="w-full py-3.5 bg-ucmas-blue text-white font-heading-bold rounded-xl hover:bg-ucmas-red transition-colors shadow-lg">
                        Bắt đầu → Làm bài
                      </button>
                    </div>
                  </div>
                )}
                {selectedModePractice === 'audio' && (
                  <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
                    <div className="bg-ucmas-red text-white px-6 py-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">🎧</div>
                      <div>
                        <h3 className="text-xl font-heading-bold">Nghe tính</h3>
                        <p className="text-white/90 text-sm">Thiết lập</p>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Cấp độ</label>
                        <select value={modeLevel} onChange={(e) => setModeLevel(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-red focus:border-ucmas-red focus:outline-none transition font-medium">
                          {LEVEL_SYMBOLS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Độ khó</label>
                        <select value={modeDifficulty} onChange={(e) => setModeDifficulty(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-red focus:outline-none transition font-medium">
                          {DIFFICULTIES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Số câu</label>
                        <input type="number" min={modeLimits?.question_count_min ?? 10} max={modeLimits?.question_count_max ?? 120} value={modeQuestionCount} onChange={(e) => setModeQuestionCount(Number(e.target.value) || 20)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-red focus:outline-none transition font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Ngôn ngữ</label>
                        <select value={modeLang} onChange={(e) => setModeLang(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-red focus:outline-none transition font-medium">
                          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Tốc độ đọc (s): {modeSpeedRead.toFixed(1)}</label>
                        <div className="mt-1">
                          <CustomSlider min={modeLimits?.speed_seconds_min ?? 0.1} max={modeLimits?.speed_seconds_max ?? 2.5} step={0.1} value={modeSpeedRead} onChange={setModeSpeedRead} />
                        </div>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <button onClick={() => startPractice(Mode.LISTENING)} className="w-full py-3.5 bg-ucmas-red text-white font-heading-bold rounded-xl hover:bg-ucmas-blue transition-colors shadow-lg">
                        Bắt đầu → Làm bài
                      </button>
                    </div>
                  </div>
                )}
                {selectedModePractice === 'flash' && (
                  <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
                    <div className="bg-ucmas-green text-white px-6 py-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">⚡</div>
                      <div>
                        <h3 className="text-xl font-heading-bold">Flash</h3>
                        <p className="text-white/90 text-sm">Thiết lập</p>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-green uppercase tracking-wider mb-1.5">Cấp độ</label>
                        <select value={modeLevel} onChange={(e) => setModeLevel(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-green focus:border-ucmas-green focus:outline-none transition font-medium">
                          {LEVEL_SYMBOLS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-green uppercase tracking-wider mb-1.5">Độ khó</label>
                        <select value={modeDifficulty} onChange={(e) => setModeDifficulty(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-green focus:outline-none transition font-medium">
                          {DIFFICULTIES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-green uppercase tracking-wider mb-1.5">Số câu</label>
                        <input type="number" min={modeLimits?.question_count_min ?? 10} max={modeLimits?.question_count_max ?? 120} value={modeQuestionCount} onChange={(e) => setModeQuestionCount(Number(e.target.value) || 20)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-green focus:outline-none transition font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-green uppercase tracking-wider mb-1.5">Tốc độ hiển thị (s): {modeSpeedDisplay.toFixed(1)}</label>
                        <div className="mt-1">
                          <CustomSlider min={modeLimits?.speed_seconds_min ?? 0.1} max={modeLimits?.speed_seconds_max ?? 2.5} step={0.1} value={modeSpeedDisplay} onChange={setModeSpeedDisplay} />
                        </div>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <button onClick={() => startPractice(Mode.FLASH)} className="w-full py-3.5 bg-ucmas-green text-white font-heading-bold rounded-xl hover:bg-ucmas-blue transition-colors shadow-lg">
                        Bắt đầu → Làm bài
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'path' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-heading-bold text-ucmas-blue">Luyện theo lộ trình</h2>
            <p className="text-gray-600">
              Lộ trình theo cấp độ <strong>{userLevel}</strong> (cài đặt tại Profile). Click vào từng ngày để xem bài và luyện tập.
            </p>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
              Hiển thị dạng đường đua – ngày 1 đến 120. Mỗi ngày tối đa 3 bài (Nhìn tính, Nghe tính, Flash). Kết quả lưu theo ngày.
            </div>

            {selectedPathDay != null ? (
              /* Panel chi tiết ngày: danh sách bài + Làm bài */
              <div className="bg-white rounded-2xl border-2 border-ucmas-blue shadow-lg overflow-hidden">
                <div className="bg-ucmas-blue text-white px-6 py-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPathDay(null)}
                    className="text-white/90 hover:text-white font-heading font-semibold flex items-center gap-1"
                  >
                    ← Quay lại lộ trình
                  </button>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-heading-bold text-ucmas-blue mb-4">Ngày {selectedPathDay} – Cấp {userLevel}</h3>
                  {(() => {
                    const dayExercises = exercisesForLevel.filter((e) => e.day_no === selectedPathDay);
                    if (dayExercises.length === 0) {
                      return (
                        <p className="text-gray-500 py-4">Chưa có bài nào cho ngày này. Admin có thể thiết lập tại Thiết kế lộ trình.</p>
                      );
                    }
                    return (
                      <ul className="space-y-3">
                        {dayExercises.map((ex) => (
                          <li
                            key={ex.id}
                            className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-ucmas-blue/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">
                                {ex.mode === 'visual' ? '👁️' : ex.mode === 'audio' ? '🎧' : '⚡'}
                              </span>
                              <div>
                                <span className="font-heading font-bold text-gray-800">{PATH_MODE_LABELS[ex.mode]}</span>
                                <span className="text-gray-600 text-sm ml-2">
                                  {ex.question_count} câu · {ex.difficulty} · {ex.digits} chữ số, {ex.rows} dòng
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => startPathExercise(ex)}
                              className="px-5 py-2.5 bg-ucmas-blue text-white font-heading-bold rounded-xl hover:bg-ucmas-red transition-colors shadow"
                            >
                              Làm bài
                            </button>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <>
                {/* Tab con: 1–30, 31–60, 61–90, 91–120 */}
                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                  {PATH_TABS.map((tab, idx) => (
                    <button
                      key={tab.label}
                      type="button"
                      onClick={() => setPathTabIndex(idx)}
                      className={`px-4 py-2 rounded-xl font-heading font-semibold text-sm transition-colors ${
                        pathTabIndex === idx
                          ? 'bg-ucmas-blue text-white shadow'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {/* Lưới ngày theo tab hiện tại */}
                <div className="grid grid-cols-10 sm:grid-cols-12 gap-2">
                  {Array.from(
                    { length: PATH_TABS[pathTabIndex].end - PATH_TABS[pathTabIndex].start + 1 },
                    (_, i) => PATH_TABS[pathTabIndex].start + i
                  ).map((day) => {
                    const dayExs = exercisesForLevel.filter((e) => e.day_no === day);
                    const hasExercises = dayExs.length > 0;
                    const hasCompleted = pathDaysCompleted[userLevel]?.[day] === true;
                    const summary = hasExercises
                      ? dayExs.map((e) => PATH_MODE_LABELS[e.mode]).join(', ')
                      : '';
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedPathDay(day)}
                        className={`aspect-square rounded-xl font-heading font-bold text-sm transition-all flex flex-col items-center justify-center gap-0.5 ${
                          hasCompleted
                            ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-800 hover:bg-emerald-200 hover:border-ucmas-blue hover:shadow-md'
                            : hasExercises
                              ? 'bg-blue-50 border-2 border-ucmas-blue/60 text-ucmas-blue hover:bg-blue-100 hover:shadow-md'
                              : 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-ucmas-blue/20 hover:border-ucmas-blue hover:text-ucmas-blue'
                        }`}
                        title={hasExercises ? `Ngày ${day}: ${summary}` : `Ngày ${day}`}
                      >
                        <span>{day}</span>
                        {hasCompleted && <span className="text-xs text-emerald-600">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'elite' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-heading-bold text-ucmas-blue">Luyện thi học sinh giỏi</h2>

            {selectedModeElite === null ? (
              <div className="grid md:grid-cols-3 gap-6">
                <button
                  onClick={() => setSelectedModeElite('visual')}
                  className="bg-white rounded-2xl border-2 border-ucmas-blue p-8 shadow-sm hover:shadow-lg hover:border-ucmas-red transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-blue text-white flex items-center justify-center text-4xl mb-4">👁️</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-blue mb-2">Nhìn tính</h3>
                  <p className="text-sm text-gray-600 text-center">200 câu / 8 phút. Cấp độ, đề nguồn.</p>
                </button>
                <button
                  onClick={() => setSelectedModeElite('audio')}
                  className="bg-white rounded-2xl border-2 border-ucmas-red p-8 shadow-sm hover:shadow-lg hover:border-ucmas-blue transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-red text-white flex items-center justify-center text-4xl mb-4">🎧</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-red mb-2">Nghe tính</h3>
                  <p className="text-sm text-gray-600 text-center">Số chữ số, số dòng, số câu, ngôn ngữ, tốc độ đọc.</p>
                </button>
                <button
                  onClick={() => setSelectedModeElite('flash')}
                  className="bg-white rounded-2xl border-2 border-ucmas-green p-8 shadow-sm hover:shadow-lg hover:border-ucmas-blue transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-green text-white flex items-center justify-center text-4xl mb-4">⚡</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-green mb-2">Flash</h3>
                  <p className="text-sm text-gray-600 text-center">Số chữ số, số dòng, số câu, tốc độ hiển thị.</p>
                </button>
              </div>
            ) : (
              <div className="max-w-lg">
                <button
                  onClick={() => setSelectedModeElite(null)}
                  className="text-ucmas-blue font-heading font-semibold mb-6 hover:underline flex items-center gap-1"
                >
                  ← Quay lại chọn chế độ
                </button>
                {selectedModeElite === 'visual' && (
                  <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
                    <div className="bg-ucmas-blue text-white px-6 py-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">👁️</div>
                      <div>
                        <h3 className="text-xl font-heading-bold">Nhìn tính — Luyện thi HSG</h3>
                        <p className="text-white/90 text-sm">200 câu / 8 phút</p>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <p className="text-gray-600 text-sm">Đếm ngược, xem lại câu, nộp sớm.</p>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-blue uppercase tracking-wider mb-1.5">Cấp độ</label>
                        <select value={eliteLevel} onChange={(e) => setEliteLevel(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-blue focus:outline-none transition font-medium">
                          {LEVEL_SYMBOLS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-blue uppercase tracking-wider mb-1.5">Đề nguồn</label>
                        <select value={eliteSource} onChange={(e) => setEliteSource(e.target.value as 'auto' | 'bank')} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-blue focus:outline-none transition font-medium">
                          <option value="auto">Tự sinh đề</option>
                          <option value="bank">Kho bài tập</option>
                        </select>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <button onClick={startEliteVisual} className="w-full py-3.5 bg-ucmas-blue text-white font-heading-bold rounded-xl hover:bg-ucmas-red transition-colors shadow-lg">BẮT ĐẦU → Làm bài</button>
                    </div>
                  </div>
                )}
                {selectedModeElite === 'audio' && (
                  <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
                    <div className="bg-ucmas-red text-white px-6 py-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">🎧</div>
                      <div>
                        <h3 className="text-xl font-heading-bold">Nghe tính — Luyện thi HSG</h3>
                        <p className="text-white/90 text-sm">Thiết lập</p>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Số chữ số (1–10)</label>
                        <input type="number" min={1} max={10} value={eliteDigits} onChange={(e) => setEliteDigits(Number(e.target.value) || 1)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-red focus:outline-none transition font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Số dòng (3–{eliteDigits <= 2 ? 100 : 30})</label>
                        <input type="number" min={3} max={eliteDigits <= 2 ? 100 : 30} value={eliteRows} onChange={(e) => setEliteRows(Number(e.target.value) || 3)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-red focus:outline-none transition font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Số câu</label>
                        <input type="number" min={5} value={eliteQuestionCount} onChange={(e) => setEliteQuestionCount(Number(e.target.value) || 20)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-red focus:outline-none transition font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Ngôn ngữ</label>
                        <select value={eliteLang} onChange={(e) => setEliteLang(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-red focus:outline-none transition font-medium">
                          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Tốc độ đọc (s): {eliteSpeedRead.toFixed(1)}</label>
                        <div className="mt-1"><CustomSlider min={0.1} max={2.5} step={0.1} value={eliteSpeedRead} onChange={setEliteSpeedRead} /></div>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <button onClick={startEliteAudio} className="w-full py-3.5 bg-ucmas-red text-white font-heading-bold rounded-xl hover:bg-ucmas-blue transition-colors shadow-lg">BẮT ĐẦU → Làm bài</button>
                    </div>
                  </div>
                )}
                {selectedModeElite === 'flash' && (
                  <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
                    <div className="bg-ucmas-green text-white px-6 py-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">⚡</div>
                      <div>
                        <h3 className="text-xl font-heading-bold">Flash — Luyện thi HSG</h3>
                        <p className="text-white/90 text-sm">Thiết lập</p>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-green uppercase tracking-wider mb-1.5">Số chữ số (1–10)</label>
                        <input type="number" min={1} max={10} value={eliteDigits} onChange={(e) => setEliteDigits(Number(e.target.value) || 1)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-green focus:outline-none transition font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-green uppercase tracking-wider mb-1.5">Số dòng (3–{eliteDigits <= 2 ? 100 : 30})</label>
                        <input type="number" min={3} max={eliteDigits <= 2 ? 100 : 30} value={eliteRows} onChange={(e) => setEliteRows(Number(e.target.value) || 3)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-green focus:outline-none transition font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-green uppercase tracking-wider mb-1.5">Số câu</label>
                        <input type="number" min={5} value={eliteQuestionCount} onChange={(e) => setEliteQuestionCount(Number(e.target.value) || 20)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-green focus:outline-none transition font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-green uppercase tracking-wider mb-1.5">Tốc độ hiển thị (s): {eliteSpeedDisplay.toFixed(1)}</label>
                        <div className="mt-1"><CustomSlider min={0.1} max={2.5} step={0.1} value={eliteSpeedDisplay} onChange={setEliteSpeedDisplay} /></div>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <button onClick={startEliteFlash} className="w-full py-3.5 bg-ucmas-green text-white font-heading-bold rounded-xl hover:bg-ucmas-blue transition-colors shadow-lg">BẮT ĐẦU → Làm bài</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingHub;
