import React, { useEffect, useState } from 'react';
import { backend } from '../services/mockBackend';
import { UserProfile, AttemptResult, Question } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DIFFICULTIES,
  LEVEL_SYMBOLS_ORDER,
  STUDY_LEVELS,
  getLegacySymbolFromStudyLevelId,
  getLevelLabel,
  getStudyLevelLabel,
  type StudyLevelId,
} from '../config/levelsAndDifficulty';
import { trainingTrackService, type TrackExercise as DbTrackExercise } from '../services/trainingTrackService';
import TrackDayLibraryPickerModal from '../components/TrackDayLibraryPickerModal';
import { downloadTrackDayTemplateSampleJson, trackDayLibraryService, type TrackDayTemplatePayloadV1 } from '../services/trackDayLibraryService';

const MODES = [
  { id: 'visual', label: 'Nhìn tính' },
  { id: 'audio', label: 'Nghe tính' },
  { id: 'flash', label: 'Flash' },
] as const;

const TRACK_TOTAL_DAYS = 96;
const TRACK_DAYS_PER_WEEK = 6;
const TRACK_TOTAL_WEEKS = 16;
const ALL_TRACK_LEVEL_SYMBOLS = Array.from(new Set(STUDY_LEVELS.map((lv) => getLegacySymbolFromStudyLevelId(lv.id))));

/** Bài luyện tập trong lộ trình (1 bài = 1 ngày, 1 chế độ, có thể kèm JSON) */
export interface TrackExerciseEntry {
  id: string;
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
  template_id?: string | null;
  template_name?: string | null;
  template_level_name?: string | null;
  questions?: Question[];
  created_at: string;
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'attempts' | 'rules' | 'exams' | 'trackDesign'>('reports');

  useEffect(() => {
    const state = location.state as { openTab?: 'trackDesign' } | null;
    if (state?.openTab === 'trackDesign') setActiveTab('trackDesign');
  }, [location.state]);
  const [resultSubTab, setResultSubTab] = useState<'free' | 'assigned'>('free'); // 'free' = Luyện tập, 'assigned' = Luyện thi

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [activatingIds, setActivatingIds] = useState<string[]>([]);
  const [reportRange, setReportRange] = useState<'day' | 'week' | 'month'>('week');
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Thiết kế lộ trình: cache local, nhưng source of truth là Supabase
  const [trackExercises, setTrackExercises] = useState<TrackExerciseEntry[]>(() => {
    try {
      const raw = localStorage.getItem('ucmas_track_exercises');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [trackSyncStatus, setTrackSyncStatus] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPresetLevel, setModalPresetLevel] = useState<string | null>(null);
  /** Khi set: hiển thị danh sách 120 ngày để thiết lập cho cấp này */
  const [selectedLevelForDays, setSelectedLevelForDays] = useState<StudyLevelId | null>(null);
  const [selectedTrackWeekIndex, setSelectedTrackWeekIndex] = useState(0);
  const [trackTemplatePickerOpen, setTrackTemplatePickerOpen] = useState(false);
  const [dayQuickTemplatePicker, setDayQuickTemplatePicker] = useState<{ study_level_id: StudyLevelId; level_symbol: string; day_no: number } | null>(null);
  const [templateViewer, setTemplateViewer] = useState<{ open: boolean; loading: boolean; item: any | null; error: string | null }>({
    open: false,
    loading: false,
    item: null,
    error: null,
  });
  const [trackForm, setTrackForm] = useState({
    level_symbol: 'A',
    day_no: 1,
    mode: 'visual' as 'visual' | 'audio' | 'flash',
    question_count: 20,
    difficulty: 'basic',
    digits: 2,
    rows: 5,
    speed_seconds: 1.2,
    template_id: null as string | null,
    template_name: null as string | null,
    template_payload: null as TrackDayTemplatePayloadV1 | null,
    editingId: null as string | null,
  });

  const saveTrackExercises = (list: TrackExerciseEntry[]) => {
    setTrackExercises(list);
    localStorage.setItem('ucmas_track_exercises', JSON.stringify(list));
  };

  const mergeLevelExercises = (levelSymbol: string, nextForLevel: TrackExerciseEntry[]) => {
    const others = trackExercises.filter((e) => e.level_symbol !== levelSymbol);
    const merged = [...others, ...nextForLevel];
    saveTrackExercises(merged);
  };

  const refreshTrackFromSupabase = async (levelSymbol?: string) => {
    try {
      setTrackSyncStatus('⏳ Đang tải lộ trình từ Supabase...');

      const levels = levelSymbol ? [levelSymbol] : ALL_TRACK_LEVEL_SYMBOLS;
      const snaps = await Promise.all(levels.map((lv) => trainingTrackService.getPublishedTrackSnapshot(lv, TRACK_TOTAL_DAYS)));
      const all: TrackExerciseEntry[] = [];
      snaps.forEach((snap) => {
        if (!snap) return;
        snap.exercises.forEach((ex: DbTrackExercise) => {
          all.push({
            id: ex.id,
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
            template_id: ex.template_id ?? null,
            template_name: ex.template_name ?? null,
            template_level_name: ex.template_level_name ?? null,
            questions: ex.questions,
            created_at: ex.created_at,
          });
        });
      });

      if (levelSymbol) {
        // Only replace a single level
        mergeLevelExercises(levelSymbol, all.filter((e) => e.level_symbol === levelSymbol));
      } else {
        saveTrackExercises(all);
      }

      setTrackSyncStatus('✅ Đã đồng bộ từ Supabase');
      setTimeout(() => setTrackSyncStatus(''), 2000);
    } catch (e: any) {
      console.warn('refreshTrackFromSupabase error:', e);
      setTrackSyncStatus(`❌ Không tải được từ Supabase: ${e?.message || 'Unknown error'}`);
    }
  };

  const openCreateModal = (levelSymbol: string, dayNo?: number, editId?: string) => {
    setModalPresetLevel(levelSymbol);
    const day = dayNo ?? 1;
    const byDay = trackExercises.filter(e => e.level_symbol === levelSymbol && e.day_no === day);
    const existing = editId ? byDay.find(e => e.id === editId) : null;
    const defaultsFrom = existing ?? byDay[byDay.length - 1] ?? null;
    const existingTemplate = byDay.find((e) => e.source === 'json_upload' && e.template_id && e.template_name) ?? null;
    setTrackForm({
      level_symbol: levelSymbol,
      day_no: day,
      mode: (defaultsFrom?.mode as 'visual' | 'audio' | 'flash') ?? 'visual',
      question_count: defaultsFrom?.question_count ?? 20,
      difficulty: defaultsFrom?.difficulty ?? 'basic',
      digits: defaultsFrom?.digits ?? 2,
      rows: defaultsFrom?.rows ?? 5,
      speed_seconds: defaultsFrom?.speed_seconds ?? 1.2,
      template_id: existingTemplate?.template_id ?? null,
      template_name: existingTemplate?.template_name ?? null,
      template_payload: null, // payload sẽ được load khi bấm Xem hoặc khi chọn tệp mới
      editingId: editId ?? null,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalPresetLevel(null);
  };

  const handleTrackFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // If a day template is selected: apply full 3-mode payload; ignore other fields (except level/day).
    if (trackForm.template_payload) {
      setTrackSyncStatus('⏳ Đang lưu theo tệp (3 chế độ) lên Supabase...');
      const res = await trainingTrackService.adminUpsertDayFromTemplate({
        level_symbol: trackForm.level_symbol,
        day_no: trackForm.day_no,
        templatePayload: trackForm.template_payload,
        templateMeta: trackForm.template_id && trackForm.template_name
          ? { id: trackForm.template_id, name: trackForm.template_name, level_name: trackForm.template_payload.level_name ?? null }
          : null,
      });
      if (!res.success) {
        setTrackSyncStatus(`❌ Lưu thất bại: ${res.error || 'Unknown error'}`);
        return;
      }
      await refreshTrackFromSupabase(trackForm.level_symbol);
      closeModal();
      return;
    }

    // Default behavior: create/update a single exercise (generated)
    setTrackSyncStatus('⏳ Đang lưu bài lên Supabase...');
    const res = await trainingTrackService.adminUpsertExercise({
      id: trackForm.editingId,
      level_symbol: trackForm.level_symbol,
      day_no: trackForm.day_no,
      mode: trackForm.mode,
      question_count: trackForm.question_count,
      difficulty: trackForm.difficulty,
      digits: trackForm.digits,
      rows: trackForm.rows,
      speed_seconds: trackForm.speed_seconds,
      source: 'generated',
      questions: undefined,
    });
    if (!res.success) {
      setTrackSyncStatus(`❌ Lưu thất bại: ${res.error || 'Unknown error'}`);
      return;
    }

    await refreshTrackFromSupabase(trackForm.level_symbol);
    closeModal();
  };

  const deleteTrackExercise = async (id: string) => {
    if (!window.confirm('Xóa bài luyện tập này?')) return;
    const ex = trackExercises.find((e) => e.id === id);
    setTrackSyncStatus('⏳ Đang xóa trên Supabase...');
    const res = await trainingTrackService.adminDeleteExercise(id);
    if (!res.success) {
      setTrackSyncStatus(`❌ Xóa thất bại: ${res.error || 'Unknown error'}`);
      return;
    }
    if (ex?.level_symbol) {
      await refreshTrackFromSupabase(ex.level_symbol);
    } else {
      // fallback: remove from local cache
      saveTrackExercises(trackExercises.filter(e => e.id !== id));
    }
  };

  const deleteJsonTemplateForDay = async (levelSymbol: string, dayNo: number) => {
    const list = trackExercises.filter((e) => e.level_symbol === levelSymbol && e.day_no === dayNo && e.source === 'json_upload');
    if (list.length === 0) return;
    if (!window.confirm(`Xóa toàn bộ bài JSON của ngày ${dayNo} (${list.length} bài)?`)) return;
    setTrackSyncStatus('⏳ Đang xóa tệp JSON khỏi ngày...');
    for (const ex of list) {
      await trainingTrackService.adminDeleteExercise(ex.id);
    }
    await refreshTrackFromSupabase(levelSymbol);
    setTrackSyncStatus('✅ Đã xóa tệp khỏi ngày');
    setTimeout(() => setTrackSyncStatus(''), 1500);
  };

  const openTemplateViewer = async (templateId: string) => {
    setTemplateViewer({ open: true, loading: true, item: null, error: null });
    try {
      const item = await trackDayLibraryService.getById(templateId);
      setTemplateViewer({ open: true, loading: false, item, error: null });
    } catch (e: any) {
      setTemplateViewer({ open: true, loading: false, item: null, error: e?.message || 'Không tải được tệp.' });
    }
  };
  const usingTemplate = !!trackForm.template_payload;

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Load roadmap data from Supabase whenever admin opens Track Design
  useEffect(() => {
    if (activeTab !== 'trackDesign') return;
    refreshTrackFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'reports') loadReport();
  }, [reportRange, activeTab]);

  const loadData = async () => {
    if (activeTab === 'users') setUsers(await backend.getAllUsers());
    else if (activeTab === 'attempts') setAttempts(await backend.getAllAttempts());
  };

  const loadReport = async () => {
    setLoadingReport(true);
    const data = await backend.getReportData(reportRange);
    setReportData(data);
    setLoadingReport(false);
  };

  const formatDuration = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}g ${m}p`;
    return `${m}p`;
  };

  const handleActivateUser = async (user: UserProfile) => {
    if (window.confirm(`Kích hoạt tài khoản cho ${user.full_name}?`)) {
      setActivatingIds(prev => [...prev, user.id]);
      const result = await backend.adminActivateUser(user.id, 6);
      setActivatingIds(prev => prev.filter(id => id !== user.id));
      if (result.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, license_expiry: result.expiresAt } : u));
        alert("Kích hoạt thành công!");
      }
    }
  };

  // Filter logic for Attempts
  const filteredAttempts = attempts.filter(a => {
    // Check if attempt is linked to an exam_id (assigned) or not (free practice)
    // Note: Backend 'getAllAttempts' maps raw DB fields. 
    // If `exam_id` or `settings.examId` exists, it's assigned.
    const isAssigned = (a as any).exam_id || (a.settings && a.settings.examId);

    if (resultSubTab === 'assigned') return isAssigned;
    return !isAssigned;
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 bg-gray-50 min-h-screen">
      <div className="w-full md:w-72 bg-white rounded-3xl shadow-sm p-6 h-fit border border-gray-100">
        <h2 className="font-black text-ucmas-red mb-10 px-2 tracking-tight uppercase text-lg">Hệ thống Admin</h2>
        <nav className="space-y-3">
          <button onClick={() => navigate('/admin/contests')} className="w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition border border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 shadow-sm flex items-center justify-between">
            <span>Quản lý Cuộc Thi</span>
            <span>🏆</span>
          </button>
          <button onClick={() => navigate('/admin/repository')} className="w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition border border-blue-200 bg-blue-50 text-ucmas-blue hover:bg-blue-100 shadow-sm flex items-center justify-between">
            <span>Kho Bài Tập</span>
            <span>📚</span>
          </button>
          <button onClick={() => navigate('/admin/training')} className="w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition border border-red-200 bg-red-50 text-ucmas-red hover:bg-red-100 shadow-sm flex items-center justify-between">
            <span>Quản lý Luyện Tập</span>
            <span>🛠️</span>
          </button>
          <button onClick={() => navigate('/admin/progress')} className="w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 shadow-sm flex items-center justify-between">
            <span>Tiến trình Học sinh</span>
            <span>📌</span>
          </button>
          <button onClick={() => navigate('/admin/info')} className="w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 shadow-sm flex items-center justify-between">
            <span>Quản lý Thông tin</span>
            <span>🗂️</span>
          </button>
          <button onClick={() => navigate('/admin/seo')} className="w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 shadow-sm flex items-center justify-between">
            <span>Setup SEO</span>
            <span>🔎</span>
          </button>
          <button onClick={() => navigate('/test/nghetinh')} className="w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 hover:bg-fuchsia-100 shadow-sm flex items-center justify-between">
            <span>Test Giọng Nghe Tính</span>
            <span>🎧</span>
          </button>
          <div className="h-px bg-gray-100 my-6"></div>
          <button onClick={() => setActiveTab('reports')} className={`w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition ${activeTab === 'reports' ? 'bg-gray-800 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>📈 Báo Cáo</button>
          <button onClick={() => setActiveTab('users')} className={`w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition ${activeTab === 'users' ? 'bg-gray-800 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>👥 Học Viên</button>
          <button onClick={() => setActiveTab('attempts')} className={`w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition ${activeTab === 'attempts' ? 'bg-gray-800 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>📊 Kết quả</button>
          <button onClick={() => setActiveTab('trackDesign')} className={`w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition ${activeTab === 'trackDesign' ? 'bg-gray-800 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>📋 Thiết kế lộ trình luyện tập</button>
        </nav>
      </div>

      <div className="flex-grow bg-white rounded-3xl shadow-sm p-8 border border-gray-100 min-h-[600px] animate-fade-in">
        {activeTab === 'reports' && (
          <div>
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-heading font-black text-gray-800 uppercase tracking-tight">Báo cáo Tổng quan</h3>
              <div className="bg-gray-100 p-1.5 rounded-2xl flex text-[10px] font-heading font-black uppercase">
                {['day', 'week', 'month'].map(r => (
                  <button key={r} onClick={() => setReportRange(r as any)} className={`px-6 py-2 rounded-xl transition ${reportRange === r ? 'bg-white shadow text-ucmas-blue' : 'text-gray-400'}`}>{r === 'day' ? 'Ngày' : r === 'week' ? 'Tuần' : 'Tháng'}</button>
                ))}
              </div>
            </div>
            {loadingReport && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-sm animate-pulse">
                    <div className="h-3 w-28 bg-gray-200 rounded mb-4"></div>
                    <div className="h-10 w-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            )}

            {reportData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  {[
                    { label: 'Tổng học viên', val: reportData?.totals?.total_students ?? 0, bg: 'bg-slate-50', text: 'text-slate-700' },
                    { label: `Học viên mới (${reportRange === 'day' ? '24h' : reportRange === 'week' ? '7 ngày' : '30 ngày'})`, val: reportData?.totals?.new_students ?? 0, bg: 'bg-blue-50', text: 'text-ucmas-blue' },
                    { label: 'Kích hoạt còn hiệu lực', val: reportData?.totals?.activated_students ?? 0, bg: 'bg-green-50', text: 'text-green-700' },
                    { label: 'Học viên hoạt động', val: reportData?.totals?.active_students ?? 0, bg: 'bg-orange-50', text: 'text-orange-700' },
                    { label: 'Tổng lượt làm bài', val: reportData?.totals?.total_attempts ?? 0, bg: 'bg-purple-50', text: 'text-purple-700' },
                    { label: 'Điểm trung bình', val: `${reportData?.totals?.avg_accuracy_pct ?? 0}%`, bg: 'bg-indigo-50', text: 'text-indigo-700' },
                    { label: 'Tổng thời lượng', val: formatDuration(reportData?.totals?.total_time_seconds ?? 0), bg: 'bg-emerald-50', text: 'text-emerald-700' },
                    { label: 'Kích hoạt mới', val: reportData?.totals?.new_activations ?? 0, bg: 'bg-lime-50', text: 'text-lime-800' },
                  ].map((card, i) => (
                    <div key={i} className={`${card.bg} p-7 rounded-[2.25rem] border border-gray-100 shadow-sm`}>
                      <div className={`${card.text} text-[10px] font-heading font-black uppercase mb-2 tracking-widest`}>{card.label}</div>
                      <div className="text-4xl font-heading font-black text-gray-800">{card.val}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400">Hoạt động theo chế độ</div>
                        <div className="text-xl font-heading font-black text-gray-800 mt-1">Thống kê nhanh</div>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {reportData?.meta?.attempts_rows_capped ? `Giới hạn ${reportData?.meta?.attempts_rows_used} lượt gần nhất` : `Dữ liệu: ${reportData?.meta?.attempts_rows_used ?? 0} lượt`}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { key: 'nhin_tinh', label: 'Nhìn tính', color: 'text-ucmas-blue', bg: 'bg-blue-50 border-blue-100' },
                        { key: 'nghe_tinh', label: 'Nghe tính', color: 'text-ucmas-red', bg: 'bg-red-50 border-red-100' },
                        { key: 'flash', label: 'Flash', color: 'text-ucmas-green', bg: 'bg-green-50 border-green-100' },
                        { key: 'hon_hop', label: 'Hỗn hợp', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
                      ].map((m: any) => {
                        const row = reportData?.by_mode?.[m.key] || {};
                        return (
                          <div key={m.key} className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${m.bg}`}>
                            <div className="min-w-0">
                              <div className={`font-heading font-black ${m.color}`}>{m.label}</div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                {row.active_students ?? 0} học viên • {row.attempts ?? 0} lượt • {row.accuracy_pct ?? 0}% đúng
                              </div>
                            </div>
                            <div className="text-[11px] text-gray-600 font-heading font-black">
                              {formatDuration(row.total_time_seconds ?? 0)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-5">
                      <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400">Top học viên hoạt động</div>
                      <div className="text-xl font-heading font-black text-gray-800 mt-1">Theo lượt làm bài</div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-400 font-heading font-black uppercase text-[10px] tracking-widest">
                          <tr>
                            <th className="p-4">Học viên</th>
                            <th className="p-4 text-center">Lượt</th>
                            <th className="p-4 text-center">Đúng</th>
                            <th className="p-4 text-center">Thời lượng</th>
                            <th className="p-4">Lần cuối</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(reportData?.top_students || []).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-gray-400 font-medium italic">
                                Chưa có dữ liệu trong khoảng thời gian này.
                              </td>
                            </tr>
                          ) : (
                            (reportData?.top_students || []).map((s: any) => (
                              <tr key={s.user_id} className="hover:bg-gray-50 transition">
                                <td className="p-4">
                                  <div className="font-black text-gray-800">{s.full_name || 'Unknown'}</div>
                                  <div className="text-[10px] text-gray-400 font-mono mt-1">
                                    {s.student_code ? `Mã: ${s.student_code}` : (s.email || `${String(s.user_id).slice(0, 8)}...`)}
                                  </div>
                                </td>
                                <td className="p-4 text-center font-heading font-black text-gray-800">{s.attempts_count}</td>
                                <td className="p-4 text-center">
                                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-50 text-ucmas-blue border border-blue-100 text-[10px] font-heading font-black">
                                    {s.accuracy_pct}%
                                  </span>
                                </td>
                                <td className="p-4 text-center text-[11px] text-gray-700 font-heading font-black">
                                  {formatDuration(s.total_time_seconds)}
                                </td>
                                <td className="p-4 text-[11px] text-gray-500 font-mono">
                                  {s.last_attempt_at ? new Date(s.last_attempt_at).toLocaleString('vi-VN') : '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <h3 className="text-2xl font-heading font-black text-gray-800 uppercase tracking-tight mb-8 px-2">Danh sách Học viên</h3>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 font-heading font-black uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="p-6">Học viên</th>
                  <th className="p-6">Trạng thái</th>
                  <th className="p-6 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition group">
                    <td className="p-6">
                      <div className="font-black text-gray-800">{u.full_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-1">{u.email}</div>
                    </td>
                    <td className="p-6">
                      <span className={`text-[10px] font-heading font-black uppercase px-4 py-1.5 rounded-full border ${u.license_expiry && new Date(u.license_expiry) > new Date() ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                        {u.license_expiry ? new Date(u.license_expiry).toLocaleDateString() : 'Chưa kích hoạt'}
                      </span>
                    </td>
                    <td className="p-6 text-center">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleActivateUser(u)}
                          disabled={activatingIds.includes(u.id)}
                          className="bg-ucmas-blue text-white px-6 py-2 rounded-xl text-[10px] font-heading font-black uppercase shadow-md hover:bg-blue-800 transition disabled:opacity-50"
                        >
                          {activatingIds.includes(u.id) ? 'Đang kích hoạt...' : 'Kích hoạt'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'attempts' && (
          <div>
            <div className="flex justify-between items-center mb-8 px-2">
              <h3 className="text-2xl font-heading font-black text-gray-800 uppercase tracking-tight">Kết quả học viên</h3>
              <div className="bg-gray-100 p-1.5 rounded-xl flex text-[10px] font-heading font-black uppercase">
                <button
                  onClick={() => setResultSubTab('free')}
                  className={`px-6 py-2.5 rounded-lg transition-all ${resultSubTab === 'free' ? 'bg-white shadow text-ucmas-blue' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Kết quả luyện tập
                </button>
                <button
                  onClick={() => setResultSubTab('assigned')}
                  className={`px-6 py-2.5 rounded-lg transition-all ${resultSubTab === 'assigned' ? 'bg-white shadow text-ucmas-blue' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Kết quả luyện thi
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-400 font-heading font-black uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="p-6">Thời gian</th>
                    <th className="p-6">Học viên</th>
                    <th className="p-6">Bài thi</th>
                    <th className="p-6 text-center">Điểm số</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-gray-400 font-medium italic">
                        Chưa có kết quả nào cho mục này.
                      </td>
                    </tr>
                  ) : (
                    filteredAttempts.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 transition">
                        <td className="p-6 text-xs text-gray-500 font-mono">
                          {new Date(a.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-6">
                          <div className="font-bold text-gray-800">{users.find(u => u.id === a.user_id)?.full_name || 'Unknown User'}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{a.user_id.slice(0, 8)}...</div>
                        </td>
                        <td className="p-6">
                          <span className={`bg-blue-50 text-ucmas-blue px-3 py-1 rounded-full font-heading font-bold text-[10px] uppercase border border-blue-100`}>
                            {a.mode}
                          </span>
                          {resultSubTab === 'assigned' && (
                            <div className="mt-1 text-[10px] text-gray-500 italic">
                              {(a as any).exam_id ? 'Đề Giao' : 'Sáng tạo'}
                            </div>
                          )}
                        </td>
                        <td className="p-6 text-center">
                          <span className="font-black text-xl text-gray-800">{a.score_correct}</span>
                          <span className="text-gray-400 text-xs font-bold">/{a.score_total}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'trackDesign' && (
          <div>
            {trackSyncStatus && (
              <div className="mb-4 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700">
                {trackSyncStatus}
              </div>
            )}
            {selectedLevelForDays == null ? (
              <>
                <h3 className="text-2xl font-heading font-black text-gray-800 uppercase tracking-tight mb-2 px-2">Thiết kế lộ trình luyện tập</h3>
                <p className="text-gray-500 text-sm mb-8 px-2">Chọn cấp độ và bấm Thiết lập để cấu hình bài luyện tập cho lộ trình mới (1–96), chia 16 tuần (mỗi tuần 6 ngày). Có thể thêm nhiều bài trong 1 ngày.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 px-2">
                  {STUDY_LEVELS.map((studyLevel) => {
                    const symbol = getLegacySymbolFromStudyLevelId(studyLevel.id);
                    const daysConfigured = new Set(
                      trackExercises
                        .filter(e => e.level_symbol === symbol && e.day_no >= 1 && e.day_no <= TRACK_TOTAL_DAYS)
                        .map(e => e.day_no)
                    ).size;
                    const totalExercises = trackExercises.filter(e => e.level_symbol === symbol && e.day_no >= 1 && e.day_no <= TRACK_TOTAL_DAYS).length;
                    return (
                      <div key={studyLevel.id} className="bg-gray-50 rounded-2xl border-2 border-gray-100 p-6 flex flex-col items-center justify-center min-h-[140px] hover:border-ucmas-blue/30 transition-colors">
                        <div className="text-2xl font-heading font-black text-ucmas-blue mb-2">{studyLevel.name}</div>
                        {daysConfigured > 0 && <div className="text-xs text-gray-500 mb-1">{daysConfigured} ngày đã thiết lập</div>}
                        {totalExercises > 0 && <div className="text-[10px] text-gray-400 mb-3">{totalExercises} bài</div>}
                        <button
                          type="button"
                          onClick={() => setSelectedLevelForDays(studyLevel.id)}
                          className="px-4 py-2.5 bg-ucmas-blue text-white rounded-xl text-xs font-heading font-black uppercase shadow-md hover:bg-blue-700 transition"
                        >
                          Thiết lập
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedLevelForDays(null)}
                  className="mb-6 px-4 py-2 text-ucmas-blue font-heading-bold hover:underline flex items-center gap-1"
                >
                  ← Quay lại chọn cấp độ
                </button>
                <h3 className="text-2xl font-heading font-black text-gray-800 uppercase tracking-tight mb-2 px-2">{getStudyLevelLabel(selectedLevelForDays)} — 16 tuần (96 ngày)</h3>
                <p className="text-gray-500 text-sm mb-6 px-2">Chọn tuần, sau đó bấm vào ngày để thêm bài. Mỗi ngày có thể có nhiều bài (nhấn “+ Thêm bài”).</p>

                <div className="flex gap-2 flex-wrap items-center px-2 mb-5">
                  <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-500 mr-2">Chọn tuần</div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {Array.from({ length: TRACK_TOTAL_WEEKS }, (_, i) => i).map((wIdx) => (
                      <button
                        key={wIdx}
                        type="button"
                        onClick={() => setSelectedTrackWeekIndex(wIdx)}
                        className={`px-4 py-2 rounded-xl font-heading font-semibold text-sm transition-colors whitespace-nowrap ${selectedTrackWeekIndex === wIdx
                            ? 'bg-ucmas-blue text-white shadow'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        Tuần {wIdx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const startDay = selectedTrackWeekIndex * TRACK_DAYS_PER_WEEK + 1;
                  const days = Array.from({ length: TRACK_DAYS_PER_WEEK }, (_, i) => startDay + i).filter(d => d <= TRACK_TOTAL_DAYS);
                  const selectedLevelSymbol = getLegacySymbolFromStudyLevelId(selectedLevelForDays);
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
                      {days.map((day) => {
                        const dayList = trackExercises.filter(e => e.level_symbol === selectedLevelSymbol && e.day_no === day);
                        const dayTemplate = dayList.find((e) => e.source === 'json_upload' && e.template_id && e.template_name) ?? null;
                        const summary = dayList.length
                          ? dayList
                            .map(ex => `${MODES.find(m => m.id === ex.mode)?.label ?? ex.mode} • ${ex.question_count} câu`)
                            .slice(0, 2)
                            .join(' · ')
                          : 'Chưa có bài';
                        return (
                          <div
                            key={day}
                            className={`rounded-2xl border-2 p-5 bg-white shadow-sm ${dayList.length ? 'border-ucmas-blue/30' : 'border-gray-100'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400">
                                  Tuần {selectedTrackWeekIndex + 1} • Ngày {((day - 1) % TRACK_DAYS_PER_WEEK) + 1}
                                </div>
                                <div className="text-lg font-heading font-black text-gray-800 mt-1">Tổng ngày {day}</div>
                                <div className="text-xs text-gray-600 mt-1 truncate" title={summary}>{summary}</div>
                                {dayTemplate && (
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-heading font-black uppercase tracking-wider">
                                      JSON: {dayTemplate.template_name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => openTemplateViewer(dayTemplate.template_id as string)}
                                      className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 text-[10px] font-heading font-black uppercase hover:bg-gray-50"
                                    >
                                      Xem
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDayQuickTemplatePicker({ study_level_id: selectedLevelForDays, level_symbol: selectedLevelSymbol, day_no: day })}
                                      className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 text-[10px] font-heading font-black uppercase hover:bg-gray-50"
                                    >
                                      Đổi tệp
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteJsonTemplateForDay(selectedLevelSymbol, day)}
                                      className="px-3 py-1 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10px] font-heading font-black uppercase hover:bg-red-100"
                                    >
                                      Xóa tệp
                                    </button>
                                  </div>
                                )}
                                {dayList.length > 2 && <div className="text-[10px] text-gray-400 mt-1">+{dayList.length - 2} bài khác</div>}
                              </div>
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => openCreateModal(selectedLevelSymbol, day)}
                                  className="px-4 py-2 bg-ucmas-blue text-white rounded-xl text-[10px] font-heading font-black uppercase shadow hover:bg-blue-700 transition"
                                >
                                  + Thêm bài
                                </button>
                              </div>
                            </div>

                            {dayList.length > 0 && (
                              <div className="mt-4 space-y-2">
                                {dayList.map(ex => (
                                  <div key={ex.id} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                    <div className="min-w-0">
                                      <div className="text-xs font-heading font-bold text-gray-800 truncate">
                                        {MODES.find(m => m.id === ex.mode)?.label ?? ex.mode} • {ex.question_count} câu
                                      </div>
                                      <div className="text-[10px] text-gray-500 truncate">
                                        {DIFFICULTIES.find(d => d.id === ex.difficulty)?.label ?? ex.difficulty} • {ex.digits} chữ số • {ex.rows} dòng • {ex.source === 'json_upload' ? `JSON${ex.template_name ? `: ${ex.template_name}` : ''}` : 'Tự sinh'}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => openCreateModal(selectedLevelSymbol, day, ex.id)}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-[10px] font-heading font-black uppercase hover:bg-gray-50"
                                      >
                                        Sửa
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteTrackExercise(ex.id)}
                                        className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10px] font-heading font-black uppercase hover:bg-red-100"
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
            {trackExercises.length > 0 && selectedLevelForDays == null && (
              <div className="mt-10 px-2">
                <h4 className="text-sm font-heading font-black text-gray-600 uppercase tracking-wider mb-4">Bài đã tạo ({trackExercises.length})</h4>
                <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-3 font-heading font-black uppercase text-[10px] text-gray-500">Cấp</th>
                        <th className="p-3 font-heading font-black uppercase text-[10px] text-gray-500">Ngày</th>
                        <th className="p-3 font-heading font-black uppercase text-[10px] text-gray-500">Chế độ</th>
                        <th className="p-3 font-heading font-black uppercase text-[10px] text-gray-500">Số câu</th>
                        <th className="p-3 font-heading font-black uppercase text-[10px] text-gray-500">Độ khó</th>
                        <th className="p-3 font-heading font-black uppercase text-[10px] text-gray-500">Nguồn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {trackExercises.map((ex) => (
                        <tr key={ex.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold">{ex.level_symbol}</td>
                          <td className="p-3">{ex.day_no}</td>
                          <td className="p-3">{MODES.find(m => m.id === ex.mode)?.label ?? ex.mode}</td>
                          <td className="p-3">{ex.question_count}</td>
                          <td className="p-3">{DIFFICULTIES.find(d => d.id === ex.difficulty)?.label ?? ex.difficulty}</td>
                          <td className="p-3">{ex.source === 'json_upload' ? 'File JSON' : 'Tự sinh'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal tạo bài luyện tập */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 flex justify-between items-center rounded-t-3xl z-10">
                <h3 className="text-xl font-heading font-black text-gray-800 uppercase tracking-tight">Thiết lập ngày {trackForm.day_no} — {getLevelLabel(trackForm.level_symbol)}</h3>
                <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleTrackFormSubmit} className="p-8 space-y-5">
                {(() => {
                  const list = trackExercises.filter(e => e.level_symbol === trackForm.level_symbol && e.day_no === trackForm.day_no);
                  if (list.length === 0) return null;
                  return (
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                      <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-500 mb-3">
                        Bài đã có trong ngày {trackForm.day_no} ({list.length})
                      </div>
                      <div className="space-y-2">
                        {list.map(ex => (
                          <div key={ex.id} className="flex items-center justify-between gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-xs font-heading font-bold text-gray-800 truncate">
                                {MODES.find(m => m.id === ex.mode)?.label ?? ex.mode} • {ex.question_count} câu
                              </div>
                              <div className="text-[10px] text-gray-500 truncate">
                                {DIFFICULTIES.find(d => d.id === ex.difficulty)?.label ?? ex.difficulty} • {ex.digits} chữ số • {ex.rows} dòng
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button type="button" onClick={() => openCreateModal(trackForm.level_symbol, trackForm.day_no, ex.id)} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-[10px] font-heading font-black uppercase hover:bg-gray-50">
                                Sửa
                              </button>
                              <button type="button" onClick={() => deleteTrackExercise(ex.id)} className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10px] font-heading font-black uppercase hover:bg-red-100">
                                Xóa
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Chọn tệp (đặt lên đầu popup) */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Chọn tệp (từ kho)</div>
                      <p className="text-xs text-gray-500">
                        Nếu chọn tệp, toàn bộ bài của 3 chế độ sẽ theo tệp này. Các thiết lập bên dưới sẽ không áp dụng (trừ Cấp độ & Ngày).
                      </p>
                      {trackForm.template_name && (
                        <div className="mt-2 text-xs font-medium text-ucmas-green truncate">
                          Đang dùng: <span className="font-heading font-black">{trackForm.template_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {trackForm.template_id && (
                        <button
                          type="button"
                          onClick={() => openTemplateViewer(trackForm.template_id as string)}
                          className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-heading font-black text-[10px] uppercase hover:bg-gray-50"
                        >
                          Xem
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setTrackTemplatePickerOpen(true)}
                        className="px-4 py-2 rounded-xl bg-ucmas-blue text-white font-heading font-black text-[10px] uppercase shadow hover:bg-blue-700"
                      >
                        Chọn tệp
                      </button>
                      {trackForm.template_payload && (
                        <button
                          type="button"
                          onClick={() => setTrackForm((f) => ({ ...f, template_id: null, template_name: null, template_payload: null }))}
                          className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-heading font-black text-[10px] uppercase hover:bg-gray-50"
                        >
                          Bỏ chọn
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <button type="button" onClick={downloadTrackDayTemplateSampleJson} className="text-ucmas-blue text-sm font-heading font-bold hover:underline">
                      📥 Tải JSON mẫu
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Cấp độ</label>
                    <select
                      value={trackForm.level_symbol}
                      onChange={e => setTrackForm(f => ({ ...f, level_symbol: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue"
                    >
                      {LEVEL_SYMBOLS_ORDER.map(s => <option key={s} value={s}>{getLevelLabel(s)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Ngày (1–96)</label>
                    <input
                      type="number"
                      min={1}
                      max={TRACK_TOTAL_DAYS}
                      value={trackForm.day_no}
                      onChange={e => setTrackForm(f => ({ ...f, day_no: Math.max(1, Math.min(TRACK_TOTAL_DAYS, Number(e.target.value) || 1)) }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Chế độ</label>
                  <select
                    value={trackForm.mode}
                    onChange={e => setTrackForm(f => ({ ...f, mode: e.target.value as 'visual' | 'audio' | 'flash' }))}
                    disabled={usingTemplate}
                    className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue ${usingTemplate ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                  >
                    {MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Số câu</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={trackForm.question_count}
                      onChange={e => setTrackForm(f => ({ ...f, question_count: Math.max(1, Math.min(200, Number(e.target.value) || 1)) }))}
                      disabled={usingTemplate}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue ${usingTemplate ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Độ khó</label>
                    <select
                      value={trackForm.difficulty}
                      onChange={e => setTrackForm(f => ({ ...f, difficulty: e.target.value }))}
                      disabled={usingTemplate}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue ${usingTemplate ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    >
                      {DIFFICULTIES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Số chữ số</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={trackForm.digits}
                      onChange={e => setTrackForm(f => ({ ...f, digits: Math.max(1, Math.min(10, Number(e.target.value) || 1)) }))}
                      disabled={usingTemplate}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue ${usingTemplate ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Số dòng</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={trackForm.rows}
                      onChange={e => setTrackForm(f => ({ ...f, rows: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))}
                      disabled={usingTemplate}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue ${usingTemplate ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>
                {(trackForm.mode === 'audio' || trackForm.mode === 'flash') && (
                  <div>
                    <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">
                      {trackForm.mode === 'audio' ? 'Tốc độ đọc (giây/số)' : 'Tốc độ hiển thị (giây/số)'}
                    </label>
                    <input
                      type="number"
                      min={0.1}
                      max={1.5}
                      step={0.1}
                      value={trackForm.speed_seconds}
                      onChange={e => setTrackForm(f => ({ ...f, speed_seconds: Math.max(0.1, Math.min(1.5, Number(e.target.value) || 0.1)) }))}
                      disabled={usingTemplate}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue ${usingTemplate ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-heading font-black rounded-xl uppercase text-sm hover:bg-gray-50">
                    Hủy
                  </button>
                  <button type="submit" className="flex-1 py-3 bg-ucmas-blue text-white font-heading font-black rounded-xl uppercase text-sm hover:bg-blue-700 shadow-lg">
                    {usingTemplate ? 'Lưu theo tệp' : (trackForm.editingId ? 'Cập nhật bài' : 'Lưu bài luyện tập')}
                  </button>
                </div>
              </form>

              <TrackDayLibraryPickerModal
                isOpen={trackTemplatePickerOpen}
                presetLevelSymbol={trackForm.level_symbol}
                onClose={() => setTrackTemplatePickerOpen(false)}
                onSelect={(item) => {
                  setTrackForm((f) => ({
                    ...f,
                    template_id: item.id,
                    template_name: item.name,
                    template_payload: item.payload,
                    editingId: null,
                  }));
                  setTrackTemplatePickerOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Quick picker: đổi tệp JSON ngay trên card ngày */}
        <TrackDayLibraryPickerModal
          isOpen={!!dayQuickTemplatePicker}
          presetLevelSymbol={dayQuickTemplatePicker?.level_symbol || null}
          onClose={() => setDayQuickTemplatePicker(null)}
          onSelect={async (item) => {
            const ctx = dayQuickTemplatePicker;
            if (!ctx) return;
            setDayQuickTemplatePicker(null);
            setTrackSyncStatus('⏳ Đang đổi tệp JSON cho ngày...');
            const res = await trainingTrackService.adminUpsertDayFromTemplate({
              level_symbol: ctx.level_symbol,
              day_no: ctx.day_no,
              templatePayload: item.payload,
              templateMeta: { id: item.id, name: item.name, level_name: item.payload.level_name ?? null },
            });
            if (!res.success) {
              setTrackSyncStatus(`❌ Đổi tệp thất bại: ${res.error || 'Unknown error'}`);
              return;
            }
            await refreshTrackFromSupabase(ctx.level_symbol);
            setTrackSyncStatus('✅ Đã đổi tệp JSON');
            setTimeout(() => setTrackSyncStatus(''), 1500);
          }}
        />

        {/* Viewer: xem chi tiết tệp JSON đang dùng */}
        {templateViewer.open && (
          <div className="fixed inset-0 z-[130] bg-black/40 flex items-center justify-center p-4" onClick={() => setTemplateViewer((s) => ({ ...s, open: false }))}>
            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-400 font-heading font-black uppercase tracking-widest">TỆP JSON (KHO BÀI LUYỆN TẬP)</div>
                  <div className="text-2xl font-heading font-black text-gray-900 mt-1">
                    {templateViewer.loading ? 'Đang tải...' : (templateViewer.item?.name || 'Không tên')}
                  </div>
                  {!templateViewer.loading && templateViewer.item?.description && <div className="text-sm text-gray-600 mt-2">{templateViewer.item.description}</div>}
                  {!templateViewer.loading && templateViewer.error && <div className="text-sm text-red-600 mt-2">{templateViewer.error}</div>}
                </div>
                <button className="text-gray-400 hover:text-gray-700 text-2xl leading-none" onClick={() => setTemplateViewer((s) => ({ ...s, open: false }))}>×</button>
              </div>

              {!templateViewer.loading && templateViewer.item?.payload && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['visual', 'audio', 'flash'] as const).map((m) => {
                    const ex = templateViewer.item.payload?.exercises?.[m];
                    const count = ex?.questions?.length || 0;
                    return (
                      <div key={m} className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                        <div className="text-xs font-heading font-black uppercase tracking-widest text-gray-500">{m}</div>
                        <div className="text-sm font-bold text-gray-800 mt-1">{count} câu</div>
                        <div className="text-xs text-gray-600 mt-2">
                          {ex?.digits} chữ số • {ex?.rows} dòng • tốc độ {ex?.speed_seconds}s
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Độ khó: {ex?.difficulty}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-heading font-black text-xs uppercase hover:bg-gray-50"
                  onClick={() => setTemplateViewer((s) => ({ ...s, open: false }))}
                >
                  Đóng
                </button>
                {!templateViewer.loading && templateViewer.item && (
                  <button
                    className="px-5 py-2.5 rounded-xl bg-ucmas-blue text-white font-heading font-black text-xs uppercase hover:bg-blue-700 shadow-md"
                    onClick={() => trackDayLibraryService.downloadJson(templateViewer.item)}
                  >
                    Tải JSON
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
