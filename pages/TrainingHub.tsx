import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfile, Mode } from '../types';
import CustomSlider from '../components/CustomSlider';
import { practiceModeSettings, type DifficultyKey } from '../services/practiceModeSettings';
import { getLevelLabel, LEVEL_SYMBOLS_ORDER, DIFFICULTIES } from '../config/levelsAndDifficulty';
import { canUseTrial } from '../services/trialUsage';

// Ngôn ngữ: cố định tiếng Việt (không cho chọn)

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

const PATH_TOTAL_DAYS = 96;
const PATH_DAYS_PER_WEEK = 6;
const PATH_TOTAL_WEEKS = 16;

function loadPathExercises(): PathExerciseEntry[] {
  try {
    const raw = localStorage.getItem(PATH_STORAGE_KEY);
    const all: PathExerciseEntry[] = raw ? JSON.parse(raw) : [];
    // Keep only days within the new roadmap (1–96)
    return all.filter(e => e?.day_no >= 1 && e?.day_no <= PATH_TOTAL_DAYS);
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
  const [pathWeekIndex, setPathWeekIndex] = useState(0);
  const [selectedPathDay, setSelectedPathDay] = useState<number | null>(null);
  const pathExercises = useMemo(() => loadPathExercises(), []);

  // Tab 1: Luyện theo chế độ — chọn chế độ trước, sau đó hiện form
  const [selectedModePractice, setSelectedModePractice] = useState<SelectedMode | null>(null);
  const [modeLevel, setModeLevel] = useState<string>(user.level_symbol || 'A');
  const [modeDifficulty, setModeDifficulty] = useState<string>('basic');
  const [modeQuestionCount, setModeQuestionCount] = useState(20);
  const [modeSpeedRead, setModeSpeedRead] = useState(1.2);   // Tốc độ đọc (chỉ Nghe tính)
  const [modeSpeedDisplay, setModeSpeedDisplay] = useState(1.2); // Tốc độ hiển thị (chỉ Flash)
  const modeLang = 'vi-VN';

  // Tab 3: Luyện thi HSG — chọn chế độ trước, sau đó hiện form
  const [selectedModeElite, setSelectedModeElite] = useState<SelectedMode | null>(null);
  const [eliteLevel, setEliteLevel] = useState<string>(user.level_symbol || 'A');
  const [eliteSource, setEliteSource] = useState<'auto' | 'bank'>('auto');
  const [eliteDigits, setEliteDigits] = useState(2);
  const [eliteRows, setEliteRows] = useState(5);
  const [eliteQuestionCount, setEliteQuestionCount] = useState(30);
  const [eliteSpeedRead, setEliteSpeedRead] = useState(1.0);   // Tốc độ đọc (chỉ Nghe tính)
  const [eliteSpeedDisplay, setEliteSpeedDisplay] = useState(1.0); // Tốc độ hiển thị (chỉ Flash)
  const eliteLang = 'vi-VN';

  const clampSpeedSeconds = (v: number) => Math.min(1.5, Math.max(0.1, v));

  const settings = useMemo(() => practiceModeSettings.getSettings(), []);

  const hasActiveLicense = () => {
    if (user.role === 'admin') return true;
    if (!user.license_expiry) return false;
    return new Date(user.license_expiry) > new Date();
  };

  const hasAccess = (mode: Mode) => {
    if (user.role === 'admin') return true;
    if (!user.license_expiry || new Date(user.license_expiry) < new Date()) return false;
    return user.allowed_modes.includes(mode);
  };

  const modeLimits = selectedModePractice ? settings[selectedModePractice][modeDifficulty as DifficultyKey] : null;

  const startPractice = (mode: Mode) => {
    // Trial policy (no activation):
    // - Practice by mode: 3 attempts per mode
    // - Practice by path: not allowed
    const licensed = hasAccess(mode);
    const allowTrial = !hasActiveLicense() && canUseTrial(user.id, 'mode', mode, 3);
    if (!licensed && !allowTrial) {
      navigate('/activate');
      return;
    }
    const raw = mode === Mode.LISTENING ? modeSpeedRead : mode === Mode.FLASH ? modeSpeedDisplay : undefined;
    const speed = typeof raw === 'number' ? clampSpeedSeconds(raw) : undefined;
    const config = {
      level_symbol: modeLevel,
      difficulty: modeDifficulty,
      question_count: modeQuestionCount,
      speed_seconds: speed,
      language: 'vi-VN',
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
    const mode = Mode.VISUAL;
    const licensed = hasAccess(mode);
    const allowTrial = !hasActiveLicense() && canUseTrial(user.id, 'elite', mode, 1);
    if (!licensed && !allowTrial) {
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
    const mode = Mode.LISTENING;
    const licensed = hasAccess(mode);
    const allowTrial = !hasActiveLicense() && canUseTrial(user.id, 'elite', mode, 1);
    if (!licensed && !allowTrial) {
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
          speed_seconds: clampSpeedSeconds(eliteSpeedRead),
          language: 'vi-VN',
        },
      },
    });
  };

  const startEliteFlash = () => {
    const mode = Mode.FLASH;
    const licensed = hasAccess(mode);
    const allowTrial = !hasActiveLicense() && canUseTrial(user.id, 'elite', mode, 1);
    if (!licensed && !allowTrial) {
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
          speed_seconds: clampSpeedSeconds(eliteSpeedDisplay),
          language: 'vi-VN',
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
    // Practice by path: NOT allowed without activation
    if (!hasActiveLicense() || !hasAccess(mode)) {
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

  const ROAD_POINTS: Array<{ x: string; y: string }> = [
    { x: '8%', y: '72%' },
    { x: '22%', y: '38%' },
    { x: '40%', y: '62%' },
    { x: '58%', y: '34%' },
    { x: '76%', y: '58%' },
    { x: '92%', y: '28%' },
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
                  <p className="text-sm text-gray-600 text-center">Cấp độ, độ khó, số câu, tốc độ đọc</p>
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
                          {LEVEL_SYMBOLS_ORDER.map((s) => <option key={s} value={s}>{getLevelLabel(s)}</option>)}
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
                          {LEVEL_SYMBOLS_ORDER.map((s) => <option key={s} value={s}>{getLevelLabel(s)}</option>)}
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
                      <div className="text-xs font-heading-bold text-ucmas-red uppercase tracking-wider">Ngôn ngữ: Tiếng Việt</div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Tốc độ đọc (s): {modeSpeedRead.toFixed(1)}</label>
                        <div className="mt-1">
                          <CustomSlider min={0.1} max={1.5} step={0.1} value={modeSpeedRead} onChange={(v) => setModeSpeedRead(clampSpeedSeconds(v))} />
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
                          {LEVEL_SYMBOLS_ORDER.map((s) => <option key={s} value={s}>{getLevelLabel(s)}</option>)}
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
                          <CustomSlider min={0.1} max={1.5} step={0.1} value={modeSpeedDisplay} onChange={(v) => setModeSpeedDisplay(clampSpeedSeconds(v))} />
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
              Lộ trình theo <strong>{getLevelLabel(userLevel)}</strong> (cài đặt tại Profile). Click vào từng ngày để xem bài và luyện tập.
            </p>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-5 text-indigo-900 text-sm">
              Lộ trình mới gồm <strong>{PATH_TOTAL_DAYS} ngày</strong>, chia thành <strong>{PATH_TOTAL_WEEKS} tuần</strong> (mỗi tuần <strong>{PATH_DAYS_PER_WEEK} ngày</strong>). Mỗi ngày có thể có nhiều bài luyện tập (Nhìn tính, Nghe tính, Flash).
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
                  <h3 className="text-xl font-heading-bold text-ucmas-blue mb-1">
                    Tuần {Math.ceil(selectedPathDay / PATH_DAYS_PER_WEEK)} • Ngày {((selectedPathDay - 1) % PATH_DAYS_PER_WEEK) + 1}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">Tổng ngày {selectedPathDay} – {getLevelLabel(userLevel)}</p>
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
                {/* Week selector */}
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-500 mr-2">
                    Chọn tuần
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {Array.from({ length: PATH_TOTAL_WEEKS }, (_, i) => i).map((wIdx) => (
                      <button
                        key={wIdx}
                        type="button"
                        onClick={() => setPathWeekIndex(wIdx)}
                        className={`px-4 py-2 rounded-xl font-heading font-semibold text-sm transition-colors whitespace-nowrap ${
                          pathWeekIndex === wIdx
                            ? 'bg-ucmas-blue text-white shadow'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Tuần {wIdx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Road infographic */}
                {(() => {
                  const weekNo = pathWeekIndex + 1;
                  const startDay = pathWeekIndex * PATH_DAYS_PER_WEEK + 1;
                  const days = Array.from({ length: PATH_DAYS_PER_WEEK }, (_, i) => startDay + i).filter(d => d <= PATH_TOTAL_DAYS);

                  return (
                    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-white rounded-[2.5rem] border border-indigo-100 shadow-sm p-6 overflow-hidden">
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div>
                          <div className="text-[10px] font-heading font-black uppercase tracking-widest text-indigo-600">
                            Roadmap lộ trình
                          </div>
                          <h3 className="text-2xl font-heading-extrabold text-ucmas-blue mt-1">
                            Tuần {weekNo}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Chọn 1 ngày để xem bài và luyện tập.
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-500">
                            {getLevelLabel(userLevel)}
                          </div>
                          <div className="text-sm font-heading font-bold text-gray-700">
                            Ngày {startDay}–{Math.min(startDay + PATH_DAYS_PER_WEEK - 1, PATH_TOTAL_DAYS)}
                          </div>
                        </div>
                      </div>

                      <div className="relative w-full h-[360px] sm:h-[420px] rounded-[2rem] bg-white/60 border border-white shadow-inner overflow-hidden">
                        {/* Road */}
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 420" preserveAspectRatio="none">
                          <path
                            d="M70,310 C180,140 340,380 450,250 C560,120 700,340 920,170"
                            fill="none"
                            stroke="rgba(99,102,241,0.55)"
                            strokeWidth="70"
                            strokeLinecap="round"
                          />
                          <path
                            d="M70,310 C180,140 340,380 450,250 C560,120 700,340 920,170"
                            fill="none"
                            stroke="rgba(255,255,255,0.85)"
                            strokeWidth="6"
                            strokeDasharray="16 14"
                            strokeLinecap="round"
                          />
                        </svg>

                        {/* Nodes */}
                        {days.map((day, idx) => {
                          const dayExs = exercisesForLevel.filter((e) => e.day_no === day);
                          const hasExercises = dayExs.length > 0;
                          const hasCompleted = pathDaysCompleted[userLevel]?.[day] === true;
                          const modeSummary = hasExercises ? Array.from(new Set(dayExs.map(e => PATH_MODE_LABELS[e.mode]))).join(' · ') : 'Chưa có bài';

                          const point = ROAD_POINTS[idx] || { x: `${10 + idx * 15}%`, y: '50%' };
                          const ringCls = hasCompleted
                            ? 'border-emerald-400 bg-emerald-100 text-emerald-800'
                            : hasExercises
                              ? 'border-ucmas-blue bg-blue-50 text-ucmas-blue'
                              : 'border-gray-300 bg-gray-100 text-gray-600';

                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => setSelectedPathDay(day)}
                              className="absolute group"
                              style={{ left: point.x, top: point.y, transform: 'translate(-50%, -50%)' }}
                              title={`Ngày ${day}: ${modeSummary}`}
                            >
                              <div className={`w-16 h-16 rounded-full border-4 shadow-lg flex items-center justify-center font-heading font-black text-lg ${ringCls} transition-transform group-hover:scale-105`}>
                                {((day - 1) % PATH_DAYS_PER_WEEK) + 1}
                              </div>
                              <div className="mt-2 bg-white/95 border border-gray-100 shadow-md rounded-2xl px-3 py-2 min-w-[160px] opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                                <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400">
                                  Ngày {day}
                                </div>
                                <div className="text-sm font-heading font-bold text-gray-800 mt-0.5">
                                  {hasExercises ? `${dayExs.length} bài` : 'Chưa có bài'}
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5 truncate">
                                  {modeSummary}
                                </div>
                              </div>
                              {hasCompleted && (
                                <div className="absolute -right-1 -top-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow">
                                  ✓
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
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
                  <p className="text-sm text-gray-600 text-center">Số chữ số, số dòng, số câu, tốc độ đọc.</p>
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
                          {LEVEL_SYMBOLS_ORDER.map((s) => <option key={s} value={s}>{getLevelLabel(s)}</option>)}
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
                      <div className="text-xs font-heading-bold text-ucmas-red uppercase tracking-wider">Ngôn ngữ: Tiếng Việt</div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Tốc độ đọc (s): {eliteSpeedRead.toFixed(1)}</label>
                        <div className="mt-1"><CustomSlider min={0.1} max={1.5} step={0.1} value={eliteSpeedRead} onChange={(v) => setEliteSpeedRead(clampSpeedSeconds(v))} /></div>
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
                        <div className="mt-1"><CustomSlider min={0.1} max={1.5} step={0.1} value={eliteSpeedDisplay} onChange={(v) => setEliteSpeedDisplay(clampSpeedSeconds(v))} /></div>
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
