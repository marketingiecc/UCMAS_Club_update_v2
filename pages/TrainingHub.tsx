import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfile, Mode } from '../types';
import CustomSlider from '../components/CustomSlider';
import { practiceModeSettings, type DifficultyKey, type ModeKey } from '../services/practiceModeSettings';
import { getLevelLabel, LEVEL_SYMBOLS_ORDER, DIFFICULTIES, type LevelSymbol } from '../config/levelsAndDifficulty';
import { canUseTrial, getTrialCount } from '../services/trialUsage';
import { trainingTrackService, type TrackSnapshot } from '../services/trainingTrackService';

// Ngôn ngữ: cố định tiếng Việt (không cho chọn)

/** Bài luyện tập trong lộ trình (cùng cấu trúc Admin lưu localStorage) */
interface PathExerciseEntry {
  id: string;
  track_id?: string;
  day_id?: string;
  order_no?: number;
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
    if (state?.pathDay != null) {
      setSelectedPathDay(state.pathDay);
      // Ensure the current week aligns with the selected day (for progress fetch + UI consistency)
      const w = Math.floor((state.pathDay - 1) / PATH_DAYS_PER_WEEK);
      if (Number.isFinite(w) && w >= 0) setPathWeekIndex(w);
    }
  }, [location.state]);

  // Lộ trình: tab con (0-3 = 1-30, 31-60, 61-90, 91-120), ngày đang xem chi tiết
  const [pathWeekIndex, setPathWeekIndex] = useState(0);
  const [selectedPathDay, setSelectedPathDay] = useState<number | null>(null);
  const [pathSnapshot, setPathSnapshot] = useState<TrackSnapshot | null>(null);
  const [pathExercises, setPathExercises] = useState<PathExerciseEntry[]>(() => loadPathExercises());
  const [attemptsByExerciseId, setAttemptsByExerciseId] = useState<Record<string, { correct_count: number; score: number; completed_at: string }>>({});
  const [completedDayIds, setCompletedDayIds] = useState<Set<string>>(new Set());
  const [claimedWeeks, setClaimedWeeks] = useState<Set<number>>(new Set());

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
  const [eliteQuestionCount, setEliteQuestionCount] = useState(20);
  const [eliteSpeedRead, setEliteSpeedRead] = useState(1.0);   // Tốc độ đọc (chỉ Nghe tính)
  const [eliteSpeedDisplay, setEliteSpeedDisplay] = useState(1.0); // Tốc độ hiển thị (chỉ Flash)
  const eliteLang = 'vi-VN';

  const clampSpeedSeconds = (v: number) => Math.min(1.5, Math.max(0.1, v));

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

  const activeLicense = hasActiveLicense();
  const isTrialUser = user.role !== 'admin' && !activeLicense;
  const isPathLocked = isTrialUser;

  const getTrialRemaining = (area: 'mode' | 'elite', mode: Mode, limit: number) => {
    if (!isTrialUser) return null;
    const used = getTrialCount(user.id, area, mode);
    return Math.max(0, limit - used);
  };

  const modeTrialRemaining = (mode: Mode) => getTrialRemaining('mode', mode, 3);
  const eliteTrialRemaining = (mode: Mode) => getTrialRemaining('elite', mode, 1);

  const modeKey = selectedModePractice as ModeKey | null;
  const modeLimits = (
    modeKey
      ? practiceModeSettings.getLimits(modeLevel as LevelSymbol, modeKey, modeDifficulty as DifficultyKey)
      : null
  );

  const clampInt = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(n)));
  const randInt = (min: number, max: number) => {
    const a = Math.min(min, max);
    const b = Math.max(min, max);
    return a + Math.floor(Math.random() * (b - a + 1));
  };

  // Keep inputs within the configured ranges for current selection
  useEffect(() => {
    if (!modeLimits) return;
    // "Luyện theo chế độ" — chỉ chỉnh UI số câu theo yêu cầu:
    // - Nhìn tính / Nghe tính: 5, 10, 20
    // - Flash: 1–20
    setModeQuestionCount((prev) => {
      if (selectedModePractice === 'flash') return clampInt(prev, 1, 20);
      const allowed = [5, 10, 20];
      return allowed.includes(prev) ? prev : 20;
    });

    const min = modeLimits.speed_seconds_min ?? 0.1;
    const max = modeLimits.speed_seconds_max ?? 1.5;
    setModeSpeedRead((prev) => Math.min(max, Math.max(min, prev)));
    setModeSpeedDisplay((prev) => Math.min(max, Math.max(min, prev)));
  }, [modeLimits, selectedModePractice]);

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
    const rawSpeed = mode === Mode.LISTENING ? modeSpeedRead : mode === Mode.FLASH ? modeSpeedDisplay : undefined;
    const speed = typeof rawSpeed === 'number' ? clampSpeedSeconds(rawSpeed) : undefined;

    // Apply admin-configured ranges for the selected level + difficulty.
    const levelSym = (modeLevel || (user.level_symbol || 'A')) as LevelSymbol;
    const key: ModeKey =
      mode === Mode.VISUAL ? 'visual' :
        mode === Mode.LISTENING ? 'audio' :
          'flash';

    const limits = practiceModeSettings.getLimits(levelSym, key, modeDifficulty as DifficultyKey);
    const digits = randInt(clampInt(limits.digits_min, 1, 10), clampInt(limits.digits_max, 1, 10));
    const rows = randInt(clampInt(limits.rows_min, 1, 100), clampInt(limits.rows_max, 1, 100));
    const qCount =
      mode === Mode.FLASH
        ? clampInt(modeQuestionCount, 1, 20)
        : ([5, 10, 20].includes(modeQuestionCount) ? modeQuestionCount : 20);

    const speedMin = limits.speed_seconds_min ?? 0.1;
    const speedMax = limits.speed_seconds_max ?? 1.5;
    const clampedSpeed = typeof speed === 'number' ? Math.min(speedMax, Math.max(speedMin, speed)) : undefined;
    const config = {
      level_symbol: modeLevel,
      difficulty: modeDifficulty,
      question_count: qCount,
      digits,
      rows,
      speed_seconds: clampedSpeed,
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
          question_count: clampInt(eliteQuestionCount, 1, 20),
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
          question_count: clampInt(eliteQuestionCount, 1, 20),
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

  // Prefer Supabase roadmap (fallback: localStorage)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await trainingTrackService.getPublishedTrackSnapshot(userLevel, PATH_TOTAL_DAYS);
        if (!mounted) return;
        if (snap) {
          setPathSnapshot(snap);
          setPathExercises(
            snap.exercises.map((ex) => ({
              id: ex.id,
              track_id: snap.track_id,
              day_id: ex.day_id,
              order_no: ex.order_no,
              level_symbol: ex.level_symbol,
              day_no: ex.day_no,
              mode: ex.mode,
              question_count: ex.question_count,
              difficulty: ex.difficulty,
              digits: ex.digits,
              rows: ex.rows,
              speed_seconds: ex.speed_seconds,
              source: ex.source,
              questions: ex.questions,
            }))
          );
        } else {
          setPathSnapshot(null);
          setPathExercises(loadPathExercises());
        }
      } catch (e) {
        console.warn('Load roadmap from Supabase failed, fallback localStorage.', e);
        if (!mounted) return;
        setPathSnapshot(null);
        setPathExercises(loadPathExercises());
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userLevel]);

  // Load progress for visible week (checkmarks + score notes)
  useEffect(() => {
    if (!pathSnapshot) return;
    const startDay = pathWeekIndex * PATH_DAYS_PER_WEEK + 1;
    const days = Array.from({ length: PATH_DAYS_PER_WEEK }, (_, i) => startDay + i).filter(d => d <= PATH_TOTAL_DAYS);
    const dayIdsSet = new Set<string>();
    days.forEach((d) => {
      const id = pathSnapshot.dayIdByNo[d];
      if (id) dayIdsSet.add(id);
    });
    if (selectedPathDay != null) {
      const selectedId = pathSnapshot.dayIdByNo[selectedPathDay];
      if (selectedId) dayIdsSet.add(selectedId);
    }
    const dayIds = Array.from(dayIdsSet);
    if (dayIds.length === 0) return;

    let mounted = true;
    (async () => {
      try {
        const res = await trainingTrackService.getUserExerciseAttempts({ userId: user.id, dayIds });
        if (!mounted) return;
        setAttemptsByExerciseId(res.attemptsByExerciseId as any);
        setCompletedDayIds(new Set(res.completedDayIds));
      } catch (e) {
        console.warn('Load path progress failed:', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pathSnapshot, pathWeekIndex, selectedPathDay, user.id]);

  useEffect(() => {
    let mounted = true;
    const fetchCups = async () => {
      try {
        const set = await trainingTrackService.getCollectedCups(user.id);
        if (mounted) setClaimedWeeks(set);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCups();
    return () => { mounted = false; };
  }, [user.id]);

  // Popup logic
  const [showClaimPopup, setShowClaimPopup] = useState<{ visible: boolean; success: boolean; message: string; subMessage?: string }>({ visible: false, success: false, message: '' });

  const handleClaimCup = async () => {
    const weekIdx = pathWeekIndex;

    // Check if this week is actually the *current path* week or completed.
    // If user is looking at a future week that is locked/empty, they shouldn't even see the cup active.
    // Logic: check completion of ALL 6 days.

    const startDay = weekIdx * PATH_DAYS_PER_WEEK + 1;
    const days = Array.from({ length: PATH_DAYS_PER_WEEK }, (_, i) => startDay + i).filter(d => d <= PATH_TOTAL_DAYS);

    // Calculate ACTUAL days that have exercises. Empty days are ignored/auto-completed in this logic?
    // "Hoàn thành toàn bộ bài tập của 6 ngày". 
    // If a day has NO exercises, it is technically "complete" (nothing to do).
    // So we check if there are ANY incomplete days among the days that HAVE exercises.

    const daysWithExercises = days.filter(d => pathExercises.some(e => e.day_no === d && e.level_symbol === userLevel));
    // If a week has 0 exercises total, can they claim? Probably yes or just N/A. Let's assume yes if they visited.

    const incompleteDays = daysWithExercises.filter(d => {
      const id = pathSnapshot?.dayIdByNo[d];
      return !id || !completedDayIds.has(id);
    });

    const isWeekCompleted = incompleteDays.length === 0;

    if (!isWeekCompleted) {
      setShowClaimPopup({
        visible: true,
        success: false,
        message: "Con chưa hoàn thành hết bài tập trong tuần!",
        subMessage: "Con hãy cố gắng hoàn thành bài hàng ngày để nhận Cup nhé."
      });
      return;
    }

    if (claimedWeeks.has(weekIdx)) return;

    // Optimistic UI update or just wait for clean result?
    // User requested NO reload.
    const res = await trainingTrackService.claimCup(user.id, weekIdx);

    if (res.success) {
      setClaimedWeeks(prev => new Set(prev).add(weekIdx));

      // Update global user object if possible to reflect new count immediately without reload
      // But we don't have setUser here. Layout will re-fetch on navigation, but not immediately.
      // We can try to force a fetch if we shared context, but given the constraints:
      // We will rely on the Popup to show success.

      // Calculate new total
      const newTotal = (user.cups_count || 0) + 1;
      // Note: We can't easily validly update `user` prop here as it's from parent.

      setShowClaimPopup({
        visible: true,
        success: true,
        message: "CHÚC MỪNG CON!",
        subMessage: `Con đã nhận được Cup tuần ${weekIdx + 1}. Tổng số Cup: ${newTotal}`
      });

    } else {
      setShowClaimPopup({
        visible: true,
        success: false,
        message: "Có lỗi xảy ra",
        subMessage: res.error
      });
    }
  };

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
      questions: ex.questions,
    };
    navigate(`/practice/${modeSlug}`, {
      state: {
        fromHub: true,
        config,
        returnTo: { tab: 'path' as const, pathDay: ex.day_no },
        pathContext: (ex.track_id && ex.day_id)
          ? {
            trackId: ex.track_id,
            dayId: ex.day_id,
            exerciseId: ex.id,
            levelSymbol: ex.level_symbol,
            dayNo: ex.day_no,
          }
          : undefined,
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col lg:flex-row gap-4 lg:gap-8">
      {/* Tabs: ngang trên mobile/tablet, dọc trên desktop */}
      <div className="w-full lg:w-56 flex-shrink-0">
        <h1 className="text-lg sm:text-xl font-heading-bold text-ucmas-blue mb-3 lg:mb-6">Trung tâm luyện tập</h1>
        <nav className="flex flex-row lg:flex-col gap-2 lg:gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
          {[
            { id: 'mode' as TabId, label: 'Luyện theo chế độ', icon: '📋' },
            { id: 'path' as TabId, label: 'Luyện theo lộ trình', icon: '🏁' },
            { id: 'elite' as TabId, label: 'Luyện thi HSG', icon: '🏆' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`flex-shrink-0 lg:w-full text-left px-4 py-2.5 lg:py-3 rounded-xl font-heading font-semibold flex items-center gap-2 transition-colors whitespace-nowrap text-sm lg:text-base ${tab.id === 'path' && isPathLocked
                ? (activeTab === tab.id ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200')
                : (activeTab === tab.id ? 'bg-ucmas-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                }`}
            >
              <span>{tab.icon}</span>
              <span className="min-w-0 truncate">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeTab === 'mode' && (
          <div className="space-y-4 sm:space-y-8">
            <h2 className="text-xl sm:text-2xl font-heading-bold text-ucmas-blue">Luyện theo chế độ</h2>
            <p className="text-gray-600 text-sm sm:text-base">Chọn cấp độ, độ khó và số câu. Kết quả lưu vào Lịch sử luyện tập.</p>
            {isTrialUser && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-amber-900 text-xs sm:text-sm">
                Bạn chưa kích hoạt. Mỗi chế độ được luyện <strong>tối đa 3 lượt</strong>. Hãy xem số lượt còn lại trên từng chế độ.
              </div>
            )}

            {selectedModePractice === null ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                <button
                  onClick={() => setSelectedModePractice('visual')}
                  className="bg-white rounded-xl sm:rounded-2xl border-2 border-ucmas-blue p-5 sm:p-8 shadow-sm hover:shadow-lg hover:border-ucmas-red transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-blue text-white flex items-center justify-center text-4xl mb-4">👁️</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-blue mb-2">Nhìn tính</h3>
                  <p className="text-sm text-gray-600 text-center">Cấp độ, độ khó, số câu</p>
                  {isTrialUser && (
                    <div className="mt-3 text-[10px] font-heading font-black uppercase tracking-widest text-gray-500">
                      Còn {modeTrialRemaining(Mode.VISUAL) ?? 0}/3 lượt
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setSelectedModePractice('audio')}
                  className="bg-white rounded-2xl border-2 border-ucmas-red p-8 shadow-sm hover:shadow-lg hover:border-ucmas-blue transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-red text-white flex items-center justify-center text-4xl mb-4">🎧</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-red mb-2">Nghe tính</h3>
                  <p className="text-sm text-gray-600 text-center">Cấp độ, độ khó, số câu, tốc độ đọc</p>
                  {isTrialUser && (
                    <div className="mt-3 text-[10px] font-heading font-black uppercase tracking-widest text-gray-500">
                      Còn {modeTrialRemaining(Mode.LISTENING) ?? 0}/3 lượt
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setSelectedModePractice('flash')}
                  className="bg-white rounded-2xl border-2 border-ucmas-green p-8 shadow-sm hover:shadow-lg hover:border-ucmas-blue transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-green text-white flex items-center justify-center text-4xl mb-4">⚡</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-green mb-2">Flash</h3>
                  <p className="text-sm text-gray-600 text-center">Cấp độ, độ khó, số câu, tốc độ hiển thị</p>
                  {isTrialUser && (
                    <div className="mt-3 text-[10px] font-heading font-black uppercase tracking-widest text-gray-500">
                      Còn {modeTrialRemaining(Mode.FLASH) ?? 0}/3 lượt
                    </div>
                  )}
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
                {isTrialUser && (
                  <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-700">
                    {selectedModePractice === 'visual' && <>Nhìn tính: còn <strong>{modeTrialRemaining(Mode.VISUAL) ?? 0}/3</strong> lượt.</>}
                    {selectedModePractice === 'audio' && <>Nghe tính: còn <strong>{modeTrialRemaining(Mode.LISTENING) ?? 0}/3</strong> lượt.</>}
                    {selectedModePractice === 'flash' && <>Flash: còn <strong>{modeTrialRemaining(Mode.FLASH) ?? 0}/3</strong> lượt.</>}
                    <button
                      type="button"
                      onClick={() => navigate('/activate')}
                      className="ml-3 text-ucmas-blue font-heading font-bold hover:underline"
                    >
                      Kích hoạt
                    </button>
                  </div>
                )}
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
                        <div className="grid grid-cols-3 gap-2">
                          {[5, 10, 20].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setModeQuestionCount(n)}
                              className={`py-3 rounded-xl border-2 font-heading font-black transition ${modeQuestionCount === n
                                ? 'bg-ucmas-blue text-white border-ucmas-blue shadow-md'
                                : 'bg-white text-ucmas-blue border-gray-200 hover:border-ucmas-blue'
                                }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <button
                        onClick={() => startPractice(Mode.VISUAL)}
                        disabled={isTrialUser && (modeTrialRemaining(Mode.VISUAL) ?? 0) <= 0}
                        className={`w-full py-3.5 font-heading-bold rounded-xl transition-colors shadow-lg ${isTrialUser && (modeTrialRemaining(Mode.VISUAL) ?? 0) <= 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-ucmas-blue text-white hover:bg-ucmas-red'
                          }`}
                      >
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
                        <div className="grid grid-cols-3 gap-2">
                          {[5, 10, 20].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setModeQuestionCount(n)}
                              className={`py-3 rounded-xl border-2 font-heading font-black transition ${modeQuestionCount === n
                                ? 'bg-ucmas-red text-white border-ucmas-red shadow-md'
                                : 'bg-white text-ucmas-red border-gray-200 hover:border-ucmas-red'
                                }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs font-heading-bold text-ucmas-red uppercase tracking-wider">Ngôn ngữ: Tiếng Việt</div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Tốc độ đọc (s): {modeSpeedRead.toFixed(1)}</label>
                        <div className="mt-1">
                          <CustomSlider
                            min={modeLimits?.speed_seconds_min ?? 0.1}
                            max={modeLimits?.speed_seconds_max ?? 1.5}
                            step={0.1}
                            value={modeSpeedRead}
                            onChange={(v) => setModeSpeedRead(clampSpeedSeconds(v))}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <button
                        onClick={() => startPractice(Mode.LISTENING)}
                        disabled={isTrialUser && (modeTrialRemaining(Mode.LISTENING) ?? 0) <= 0}
                        className={`w-full py-3.5 font-heading-bold rounded-xl transition-colors shadow-lg ${isTrialUser && (modeTrialRemaining(Mode.LISTENING) ?? 0) <= 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-ucmas-red text-white hover:bg-ucmas-blue'
                          }`}
                      >
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
                        <select
                          value={clampInt(modeQuestionCount, 1, 20)}
                          onChange={(e) => setModeQuestionCount(clampInt(Number(e.target.value) || 1, 1, 20))}
                          className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-green focus:outline-none transition font-medium"
                        >
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n} câu</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-green uppercase tracking-wider mb-1.5">Tốc độ hiển thị (s): {modeSpeedDisplay.toFixed(1)}</label>
                        <div className="mt-1">
                          <CustomSlider
                            min={modeLimits?.speed_seconds_min ?? 0.1}
                            max={modeLimits?.speed_seconds_max ?? 1.5}
                            step={0.1}
                            value={modeSpeedDisplay}
                            onChange={(v) => setModeSpeedDisplay(clampSpeedSeconds(v))}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <button
                        onClick={() => startPractice(Mode.FLASH)}
                        disabled={isTrialUser && (modeTrialRemaining(Mode.FLASH) ?? 0) <= 0}
                        className={`w-full py-3.5 font-heading-bold rounded-xl transition-colors shadow-lg ${isTrialUser && (modeTrialRemaining(Mode.FLASH) ?? 0) <= 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-ucmas-green text-white hover:bg-ucmas-blue'
                          }`}
                      >
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

            <div className="relative">
              <div className={isPathLocked ? 'opacity-40 grayscale pointer-events-none select-none' : ''}>
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
                                    {(() => {
                                      const attempt = attemptsByExerciseId[ex.id];
                                      if (!attempt) return null;
                                      return (
                                        <div className="mt-1">
                                          <div className="text-xs text-emerald-700 font-heading font-bold">
                                            ✓ Điểm: {attempt.correct_count}/{ex.question_count}
                                          </div>
                                          <div className="text-[10px] text-gray-500 font-mono">
                                            {new Date(attempt.completed_at).toLocaleString('vi-VN')}
                                          </div>
                                        </div>
                                      );
                                    })()}
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
                            className={`px-4 py-2 rounded-xl font-heading font-semibold text-sm transition-colors whitespace-nowrap ${pathWeekIndex === wIdx
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

                      const currentWeekNeededDays = days.filter(d => pathExercises.some(e => e.day_no === d && e.level_symbol === userLevel));
                      const isWeekCompleted = currentWeekNeededDays.length > 0 && currentWeekNeededDays.every(d => {
                        const id = pathSnapshot?.dayIdByNo[d];
                        return id && completedDayIds.has(id);
                      });
                      const isClaimed = claimedWeeks.has(pathWeekIndex);

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

                          <div className="relative w-full h-[300px] sm:h-[360px] md:h-[420px] rounded-xl sm:rounded-[2rem] bg-white/60 border border-white shadow-inner overflow-hidden">
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
                              const hasCompleted = pathSnapshot
                                ? completedDayIds.has(pathSnapshot.dayIdByNo[day] || '')
                                : (pathDaysCompleted[userLevel]?.[day] === true);
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

                            {/* CUP at the end */}
                            <button
                              type="button"
                              onClick={handleClaimCup}
                              disabled={isClaimed && true} // Only disable if claimed (to avoid re-claiming). If incomplete, we want click to show popup.
                              className={`absolute flex flex-col items-center justify-center transition-all transform 
                                    ${isClaimed
                                  ? 'opacity-100 scale-110 grayscale-0'
                                  : (isWeekCompleted
                                    ? 'hover:scale-110 cursor-pointer animate-pulse' // Changed from bounce to pulse
                                    : 'opacity-40 grayscale cursor-pointer hover:scale-105') // Show as gray if incomplete
                                }`}
                              style={{ right: '5%', top: '40%', transform: 'translate(0, -50%)' }}
                              title={isClaimed ? "Đã nhận Cup!" : (isWeekCompleted ? "Click để nhận Cup!" : "Hoàn thành tuần để nhận Cup")}
                            >
                              <div className={`w-20 h-20 sm:w-24 sm:h-24 filter drop-shadow-xl transition-all ${isWeekCompleted && !isClaimed ? 'drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' : ''}`}>
                                <img src="/svg/Cup.svg" alt="Cup" className="w-full h-full object-contain" />
                              </div>
                              {!isClaimed && isWeekCompleted && (
                                <div className="mt-2 bg-gradient-to-r from-ucmas-yellow to-orange-400 text-white text-xs sm:text-sm font-heading-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse whitespace-nowrap">
                                  NHẬN CUP 🏆
                                </div>
                              )}
                              {isClaimed && (
                                <div className="mt-2 bg-green-100 text-green-700 border border-green-200 text-[10px] font-heading-bold px-2 py-0.5 rounded-md shadow-sm">
                                  ĐÃ NHẬN
                                </div>
                              )}
                            </button>

                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Claim Popup */}
              {showClaimPopup.visible && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                  <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center relative border-[3px] border-white ring-4 ring-ucmas-blue/10 transform transition-all scale-100">
                    <button
                      onClick={() => setShowClaimPopup({ ...showClaimPopup, visible: false })}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 bg-gray-50 rounded-full transition-colors"
                    >
                      ✕
                    </button>

                    <div className={`mx-auto w-24 h-24 mb-6 rounded-full flex items-center justify-center shadow-inner ${showClaimPopup.success ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className="text-5xl">
                        {showClaimPopup.success ? '🏆' : '💪'}
                      </div>
                    </div>

                    <h3 className={`text-2xl font-heading-extrabold mb-3 ${showClaimPopup.success ? 'text-ucmas-blue' : 'text-gray-700'}`}>
                      {showClaimPopup.message}
                    </h3>

                    {showClaimPopup.subMessage && (
                      <p className="text-gray-600 mb-8 font-medium px-4 leading-relaxed">
                        {showClaimPopup.subMessage}
                      </p>
                    )}

                    <button
                      onClick={() => setShowClaimPopup({ ...showClaimPopup, visible: false })}
                      className={`w-full py-3.5 rounded-xl font-heading-bold text-white shadow-lg transform transition hover:scale-[1.02] active:scale-95 ${showClaimPopup.success ? 'bg-ucmas-blue hover:bg-ucmas-blue/90' : 'bg-gray-800 hover:bg-gray-700'}`}
                    >
                      {showClaimPopup.success ? 'TUYỆT VỜI!' : 'ĐÓNG LẠI'}
                    </button>
                  </div>
                </div>
              )}

              {isPathLocked && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 shadow-xl p-8 text-center">
                    <div className="text-5xl mb-3">🔒</div>
                    <h3 className="text-xl font-heading-bold text-gray-800 mb-2">Cần kích hoạt để luyện theo lộ trình</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Tài khoản chưa có mã kích hoạt <strong>không thể tham gia</strong> luyện theo lộ trình.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/activate')}
                      className="w-full py-3 bg-ucmas-blue text-white font-heading-bold rounded-2xl hover:bg-ucmas-red transition-colors shadow"
                    >
                      Kích hoạt ngay
                    </button>
                    <div className="mt-3 text-[10px] font-heading font-black uppercase tracking-widest text-gray-400">
                      Mở khóa lộ trình • Theo dõi tiến độ
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'elite' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-heading-bold text-ucmas-blue">Luyện thi học sinh giỏi</h2>
            {isTrialUser && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-sm">
                Bạn chưa kích hoạt. Mỗi chế độ được luyện <strong>tối đa 1 lượt</strong>. Hãy xem số lượt còn lại trên từng chế độ.
              </div>
            )}

            {selectedModeElite === null ? (
              <div className="grid md:grid-cols-3 gap-6">
                <button
                  onClick={() => setSelectedModeElite('visual')}
                  className="bg-white rounded-2xl border-2 border-ucmas-blue p-8 shadow-sm hover:shadow-lg hover:border-ucmas-red transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-blue text-white flex items-center justify-center text-4xl mb-4">👁️</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-blue mb-2">Nhìn tính</h3>
                  <p className="text-sm text-gray-600 text-center">200 câu / 8 phút. Cấp độ, đề nguồn.</p>
                  {isTrialUser && (
                    <div className="mt-3 text-[10px] font-heading font-black uppercase tracking-widest text-gray-500">
                      Còn {eliteTrialRemaining(Mode.VISUAL) ?? 0}/1 lượt
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setSelectedModeElite('audio')}
                  className="bg-white rounded-2xl border-2 border-ucmas-red p-8 shadow-sm hover:shadow-lg hover:border-ucmas-blue transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-red text-white flex items-center justify-center text-4xl mb-4">🎧</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-red mb-2">Nghe tính</h3>
                  <p className="text-sm text-gray-600 text-center">Số chữ số, số dòng, số câu, tốc độ đọc.</p>
                  {isTrialUser && (
                    <div className="mt-3 text-[10px] font-heading font-black uppercase tracking-widest text-gray-500">
                      Còn {eliteTrialRemaining(Mode.LISTENING) ?? 0}/1 lượt
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setSelectedModeElite('flash')}
                  className="bg-white rounded-2xl border-2 border-ucmas-green p-8 shadow-sm hover:shadow-lg hover:border-ucmas-blue transition-all text-left flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-ucmas-green text-white flex items-center justify-center text-4xl mb-4">⚡</div>
                  <h3 className="text-lg font-heading-bold text-ucmas-green mb-2">Flash</h3>
                  <p className="text-sm text-gray-600 text-center">Số chữ số, số dòng, số câu, tốc độ hiển thị.</p>
                  {isTrialUser && (
                    <div className="mt-3 text-[10px] font-heading font-black uppercase tracking-widest text-gray-500">
                      Còn {eliteTrialRemaining(Mode.FLASH) ?? 0}/1 lượt
                    </div>
                  )}
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
                {isTrialUser && (
                  <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-700">
                    {selectedModeElite === 'visual' && <>Nhìn tính: còn <strong>{eliteTrialRemaining(Mode.VISUAL) ?? 0}/1</strong> lượt.</>}
                    {selectedModeElite === 'audio' && <>Nghe tính: còn <strong>{eliteTrialRemaining(Mode.LISTENING) ?? 0}/1</strong> lượt.</>}
                    {selectedModeElite === 'flash' && <>Flash: còn <strong>{eliteTrialRemaining(Mode.FLASH) ?? 0}/1</strong> lượt.</>}
                    <button
                      type="button"
                      onClick={() => navigate('/activate')}
                      className="ml-3 text-ucmas-blue font-heading font-bold hover:underline"
                    >
                      Kích hoạt
                    </button>
                  </div>
                )}
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
                      <button
                        onClick={startEliteVisual}
                        disabled={isTrialUser && (eliteTrialRemaining(Mode.VISUAL) ?? 0) <= 0}
                        className={`w-full py-3.5 font-heading-bold rounded-xl transition-colors shadow-lg ${isTrialUser && (eliteTrialRemaining(Mode.VISUAL) ?? 0) <= 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-ucmas-blue text-white hover:bg-ucmas-red'
                          }`}
                      >
                        BẮT ĐẦU → Làm bài
                      </button>
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
                        <select
                          value={clampInt(eliteQuestionCount, 1, 20)}
                          onChange={(e) => setEliteQuestionCount(clampInt(Number(e.target.value) || 1, 1, 20))}
                          className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-red focus:outline-none transition font-medium"
                        >
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n} câu</option>
                          ))}
                        </select>
                      </div>
                      <div className="text-xs font-heading-bold text-ucmas-red uppercase tracking-wider">Ngôn ngữ: Tiếng Việt</div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-red uppercase tracking-wider mb-1.5">Tốc độ đọc (s): {eliteSpeedRead.toFixed(1)}</label>
                        <div className="mt-1"><CustomSlider min={0.1} max={1.5} step={0.1} value={eliteSpeedRead} onChange={(v) => setEliteSpeedRead(clampSpeedSeconds(v))} /></div>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <button
                        onClick={startEliteAudio}
                        disabled={isTrialUser && (eliteTrialRemaining(Mode.LISTENING) ?? 0) <= 0}
                        className={`w-full py-3.5 font-heading-bold rounded-xl transition-colors shadow-lg ${isTrialUser && (eliteTrialRemaining(Mode.LISTENING) ?? 0) <= 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-ucmas-red text-white hover:bg-ucmas-blue'
                          }`}
                      >
                        BẮT ĐẦU → Làm bài
                      </button>
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
                        <select
                          value={clampInt(eliteQuestionCount, 1, 20)}
                          onChange={(e) => setEliteQuestionCount(clampInt(Number(e.target.value) || 1, 1, 20))}
                          className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-green focus:outline-none transition font-medium"
                        >
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n} câu</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading-bold text-ucmas-green uppercase tracking-wider mb-1.5">Tốc độ hiển thị (s): {eliteSpeedDisplay.toFixed(1)}</label>
                        <div className="mt-1"><CustomSlider min={0.1} max={1.5} step={0.1} value={eliteSpeedDisplay} onChange={(v) => setEliteSpeedDisplay(clampSpeedSeconds(v))} /></div>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <button
                        onClick={startEliteFlash}
                        disabled={isTrialUser && (eliteTrialRemaining(Mode.FLASH) ?? 0) <= 0}
                        className={`w-full py-3.5 font-heading-bold rounded-xl transition-colors shadow-lg ${isTrialUser && (eliteTrialRemaining(Mode.FLASH) ?? 0) <= 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-ucmas-green text-white hover:bg-ucmas-blue'
                          }`}
                      >
                        BẮT ĐẦU → Làm bài
                      </button>
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
