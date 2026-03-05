import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import type { UserProfile } from '../types';
import { getStudyLevelIdFromLegacySymbol, getStudyLevelLabel } from '../config/levelsAndDifficulty';

type DbClass = { id: string; name: string; center_id?: string | null };

type TimeFilter = 'week_this' | 'week_last' | 'month_this' | 'month_last' | 'custom' | 'all';

// --- Sub-components --

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  colorClass: string;
  subtext?: string;
}> = ({ title, value, icon, colorClass, subtext }) => (
  <div className={`p-4 rounded-3xl border shadow-sm ${colorClass}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-heading font-black uppercase tracking-wide opacity-70 mb-1">{title}</p>
        <p className="text-3xl font-heading font-black">{value}</p>
        {subtext && <p className="text-xs font-bold mt-1 opacity-80">{subtext}</p>}
      </div>
      {icon && <div className="p-2 bg-white/50 rounded-xl">{icon}</div>}
    </div>
  </div>
);

const FilterBar: React.FC<{
  classes: DbClass[];
  filterClassId: string;
  setFilterClassId: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (t: TimeFilter) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  totalStudents: number;
  loading: boolean;
  onRefresh: () => void;
}> = ({
  classes,
  filterClassId,
  setFilterClassId,
  search,
  setSearch,
  timeFilter,
  setTimeFilter,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  totalStudents,
  loading,
  onRefresh,
}) => (
  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col gap-4">

    {/* Top Row: Time Filter & Refresh */}
    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex bg-gray-100 p-1 rounded-xl">
        {[
          { key: 'week_this', label: 'Tuần này' },
          { key: 'week_last', label: 'Tuần trước' },
          { key: 'month_this', label: 'Tháng này' },
          { key: 'month_last', label: 'Tháng trước' },
          { key: 'custom', label: 'Tùy chỉnh' },
          { key: 'all', label: 'Tất cả' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setTimeFilter(opt.key as TimeFilter)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === opt.key
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-heading font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg whitespace-nowrap">
          {totalStudents} học sinh
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-ucmas-blue text-white font-heading font-black hover:bg-ucmas-blue/90 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-ucmas-blue/20 flex items-center gap-2 text-sm"
        >
          {loading ? <span className="animate-spin">↻</span> : <span>↻</span>}
          <span className="hidden md:inline">Làm mới</span>
        </button>
      </div>
    </div>

    {/* Custom range */}
    {timeFilter === 'custom' && (
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1">Từ ngày</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ucmas-blue/20 transition-all"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1">Đến ngày</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ucmas-blue/20 transition-all"
          />
        </div>
      </div>
    )}

    {/* Bottom Row: Class & Search */}
    <div className="flex flex-col md:flex-row gap-4">
      <div className="w-full md:w-64">
        <div className="relative">
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ucmas-blue/20 transition-all font-medium appearance-none"
          >
            <option value="">[ Tất cả lớp của tôi ]</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
        </div>
      </div>

      <div className="flex-1">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ucmas-blue/20 transition-all"
          placeholder="🔍 Tìm tên, SĐT, mã học sinh..."
        />
      </div>
    </div>
  </div>
);

// --- Helper: Date Range ---
function getDateRange(filter: TimeFilter, customFrom: string, customTo: string): { from?: string; to?: string } {
  const now = new Date();
  if (filter === 'all') return {};

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  if (filter === 'week_this' || filter === 'week_last') {
    const day = now.getDay() || 7;
    const start = startOfDay(now);
    start.setDate(now.getDate() - day + 1 + (filter === 'week_last' ? -7 : 0));
    const end = endOfDay(start);
    end.setDate(start.getDate() + 6);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (filter === 'month_this' || filter === 'month_last') {
    const base = filter === 'month_last'
      ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const start = startOfDay(base);
    const end = endOfDay(new Date(base.getFullYear(), base.getMonth() + 1, 0));
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (filter === 'custom') {
    const fromOk = customFrom ? new Date(customFrom + 'T00:00:00') : null;
    const toOk = customTo ? new Date(customTo + 'T23:59:59') : null;
    return {
      from: fromOk && !Number.isNaN(fromOk.getTime()) ? fromOk.toISOString() : undefined,
      to: toOk && !Number.isNaN(toOk.getTime()) ? toOk.toISOString() : undefined,
    };
  }

  return {};
}

function formatDurationSeconds(totalSeconds: unknown): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}g ${m}p`;
  return `${m}p`;
}


// --- Main Page ---

const TeacherDashboardPage: React.FC<{ user: UserProfile }> = ({ user }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<DbClass[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [summaryByStudentId, setSummaryByStudentId] = useState<Record<string, any>>({});

  const [filterClassId, setFilterClassId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week_this');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  // Side panel state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<UserProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  const activeFilters = useMemo(() => {
    const f: { classId?: string; teacherId?: string; search?: string } = { teacherId: user.id };
    if (filterClassId) f.classId = filterClassId;
    if (search.trim()) f.search = search.trim();
    return f;
  }, [user.id, filterClassId, search]);

  const refresh = async () => {
    setLoading(true);
    try {
      // 1. Load Classes
      const classIds = await backend.getTeacherActiveClassIds(user.id);
      const allClasses = await backend.getClasses();
      const myClasses = allClasses.filter((c) => classIds.includes(c.id));
      setClasses(myClasses);

      // 2. Load Summary with Dates
      const { from, to } = getDateRange(timeFilter, customFrom, customTo);

      const summaryRes = await backend.getStudentsProgressSummary({
        teacherId: user.id,
        classId: filterClassId || undefined,
        search: activeFilters.search,
        from,
        to,
        limit: 200,
      });

      if (summaryRes.success) {
        const map: Record<string, any> = {};
        let nextStudents: UserProfile[] = (summaryRes.data || []).map((r: any) => {
          map[r.student_id] = r;
          return {
            id: r.student_id,
            email: r.email || '',
            full_name: r.full_name || '',
            role: 'student' as any,
            created_at: new Date().toISOString(),
            allowed_modes: [],
            student_code: r.student_code || undefined,
            phone: r.phone || undefined,
            cups_count: r.cups_count || 0,
            study_level_id: r.study_level_id || getStudyLevelIdFromLegacySymbol(r.level_symbol),
            exam_level_id: r.exam_level_id || undefined,
            level_symbol: r.level_symbol, // Bind Level
          } as UserProfile;
        });

        // Override cups_count by the same logic as Header Avatar profile (count rows in `user_collected_cups`).
        const cupCounts = await backend.getCupsCountsByUserIds(nextStudents.map(s => s.id));
        nextStudents = nextStudents.map((s) => ({
          ...s,
          cups_count: typeof cupCounts[s.id] === 'number' ? cupCounts[s.id] : (s.cups_count || 0),
        }));
        Object.keys(map).forEach((id) => {
          if (typeof cupCounts[id] === 'number') map[id].cups_count = cupCounts[id];
        });

        // If RPC is outdated / missing stats, fill using batch aggregation (same as detail logic).
        const needsFill =
          (summaryRes.data || []).length === 0 ||
          typeof (summaryRes.data?.[0] as any)?.nhin_tinh_attempts_count === 'undefined' ||
          typeof (summaryRes.data?.[0] as any)?.accuracy_pct === 'undefined';
        if (needsFill) {
          const attemptStats = await backend.getStudentsAttemptsSummaryByUserIds({
            userIds: nextStudents.map(s => s.id),
            from,
            to,
          });
          nextStudents.forEach((s) => {
            map[s.id] = { ...(map[s.id] || {}), ...(attemptStats[s.id] || {}) };
          });
        }

        setStudents(nextStudents);
        setSummaryByStudentId(map);
      } else {
        // Fallback usually shouldn't happen unless RPC fails
        setStudents([]);
        setSummaryByStudentId({});
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, customFrom, customTo]); // Refresh on time filter change

  // Debounce search/class
  useEffect(() => {
    const handle = setTimeout(() => void refresh(), 400);
    return () => clearTimeout(handle);
  }, [activeFilters.search, filterClassId]);

  const openDetail = async (student: UserProfile) => {
    setDetailStudent(student);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const data = await backend.getStudentProgressSnapshot(student.id);
      setDetailData(data);
    } catch (e: any) {
      setDetailData({ error: e?.message || 'Không tải được dữ liệu' });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailStudent(null);
  };

  // --- Stats Computation ---
  const stats = useMemo(() => {
    const total = students.length;
    let submittedToday = 0;
    let needsAttention = 0;
    const todayStr = new Date().toDateString();

    students.forEach(s => {
      const summary = summaryByStudentId[s.id];
      if (summary) {
        if (summary.last_attempt_at && new Date(summary.last_attempt_at).toDateString() === todayStr) {
          submittedToday++;
        }
        // Needs attention if Attempts > 0 but Accuracy < 50%
        if (summary.attempts_count > 0 && summary.accuracy_pct < 50) {
          needsAttention++;
        }
      }
    });
    return { total, submittedToday, needsAttention };
  }, [students, summaryByStudentId]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-heading font-black text-[#1a237e] uppercase tracking-tight">
              Bảng điều khiển giáo viên
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Quản lý lớp học và theo dõi tiến độ.
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-white border-2 border-transparent hover:border-gray-200 text-gray-600 font-heading font-bold shadow-sm hover:shadow text-sm transition-all"
          >
            ← Về Dashboard
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Tổng học sinh"
            value={stats.total}
            icon={<span className="text-2xl">🎓</span>}
            colorClass="bg-blue-50 border-blue-100 text-blue-900"
          />
          <StatCard
            title="Học sinh cần chú ý"
            value={stats.needsAttention}
            subtext={stats.needsAttention > 0 ? "Tỉ lệ chính xác < 50%" : "Tốt"}
            icon={<span className="text-2xl">⚠️</span>}
            colorClass="bg-red-50 border-red-100 text-red-900"
          />
          <StatCard
            title="Bài tập đã nộp hôm nay"
            value={stats.submittedToday}
            icon={<span className="text-2xl">✅</span>}
            colorClass="bg-green-50 border-green-100 text-green-900"
          />
        </div>

        <FilterBar
          classes={classes}
          filterClassId={filterClassId}
          setFilterClassId={setFilterClassId}
          search={search}
          setSearch={setSearch}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          totalStudents={students.length}
          loading={loading}
          onRefresh={refresh}
        />

        {/* Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1300px] grid grid-cols-[repeat(13,minmax(0,1fr))] gap-4 px-6 py-4 bg-gray-50/80 border-b border-gray-100 text-xs font-heading font-black text-gray-400 uppercase tracking-wider">
              <div className="col-span-3">Học sinh</div>
              <div className="col-span-1 text-center">Level</div>
              <div className="col-span-1 text-center">Tổng Cup</div>
              <div className="col-span-1 text-center">NHÌN TÍNH</div>
              <div className="col-span-1 text-center">NGHE TÍNH</div>
              <div className="col-span-1 text-center">FLASH</div>
              <div className="col-span-1 text-center">Tỉ lệ chính xác</div>
              <div className="col-span-1 text-center">Tổng thời gian</div>
              <div className="col-span-1 text-center">Làm gần nhất</div>
              <div className="col-span-1 text-center">Số lần</div>
              <div className="col-span-1 text-right">Chi tiết</div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-400 font-medium">Đang tải dữ liệu...</div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium">Chưa có dữ liệu</div>
            ) : (
              <div className="min-w-[1300px] divide-y divide-gray-50">
                {students.map((s) => {
                  const summary = summaryByStudentId[s.id] || {};
                  const nhinAttempts = Number(summary.nhin_tinh_attempts_count) || 0;
                  const nhinAcc = Number(summary.nhin_tinh_accuracy_pct) || 0;
                  const ngheAttempts = Number(summary.nghe_tinh_attempts_count) || 0;
                  const ngheAcc = Number(summary.nghe_tinh_accuracy_pct) || 0;
                  const flashAttempts = Number(summary.flash_attempts_count) || 0;
                  const flashAcc = Number(summary.flash_accuracy_pct) || 0;
                  const overallAcc = Number(summary.accuracy_pct) || 0;

                  const totalTimeSeconds = Number(summary.total_time_seconds) || 0;
                  const lastAttemptAt = summary.last_attempt_at ? new Date(summary.last_attempt_at) : null;
                  const attemptsCount = Number(summary.attempts_count) || 0;

                  const cell = (attempts: number, acc: number) => {
                    if (!attempts) return <span className="text-xs text-gray-400">—</span>;
                    const bad = acc > 0 && acc < 50;
                    return (
                      <div className="text-xs leading-tight">
                        <div className="font-heading font-black text-gray-800">{attempts} lượt</div>
                        <div className={`font-heading font-black ${bad ? 'text-red-600' : 'text-green-700'}`}>{acc}%</div>
                      </div>
                    );
                  };

                  return (
                    <div key={s.id} className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-4 px-6 py-4 items-center hover:bg-blue-50/30 transition-colors">
                      {/* Name */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                            {s.full_name?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-heading font-black text-gray-800 text-sm truncate">{s.full_name}</div>
                            <div className="text-xs text-gray-400 font-medium truncate">{s.student_code || '---'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Level */}
                      <div className="col-span-1 text-center font-heading font-black text-gray-700 text-sm">
                        {getStudyLevelLabel(s.study_level_id || getStudyLevelIdFromLegacySymbol(s.level_symbol))}
                      </div>

                      {/* Cups */}
                      <div className="col-span-1 text-center font-heading font-black text-yellow-600 text-sm">
                        {s.cups_count || 0} 🏆
                      </div>

                      {/* Mode cells */}
                      <div className="col-span-1 text-center">{cell(nhinAttempts, nhinAcc)}</div>
                      <div className="col-span-1 text-center">{cell(ngheAttempts, ngheAcc)}</div>
                      <div className="col-span-1 text-center">{cell(flashAttempts, flashAcc)}</div>

                      {/* Overall accuracy */}
                      <div className="col-span-1 text-center">
                        {!attemptsCount ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <span className={`font-heading font-black text-sm ${overallAcc > 0 && overallAcc < 50 ? 'text-red-600' : 'text-green-700'}`}>
                            {overallAcc}%
                          </span>
                        )}
                      </div>

                      {/* Total time */}
                      <div className="col-span-1 text-center font-heading font-black text-gray-700 text-xs">
                        {formatDurationSeconds(totalTimeSeconds)}
                      </div>

                      {/* Last attempt */}
                      <div className="col-span-1 text-center text-xs text-gray-700 font-heading font-black">
                        {lastAttemptAt ? lastAttemptAt.toLocaleDateString('vi-VN') : '—'}
                      </div>

                      {/* Attempts count */}
                      <div className="col-span-1 text-center font-heading font-black text-gray-700 text-sm">
                        {attemptsCount}
                      </div>

                      {/* Action */}
                      <div className="col-span-1 flex justify-end">
                        <button onClick={() => openDetail(s)} className="text-blue-700 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 whitespace-nowrap">
                          Chi tiết
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal (Simple Reuse) */}
        {detailOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={closeDetail}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-heading font-black mb-4">Chi tiết: {detailStudent?.full_name}</h2>
              {detailLoading ? (
                <div className="text-center py-8 text-gray-500">Đang tải dữ liệu...</div>
              ) : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  {/* Top Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                      <div className="text-[10px] text-yellow-600 uppercase font-black tracking-wide">Tổng Cup</div>
                      <div className="text-xl font-black text-yellow-700 mt-1">{detailStudent?.cups_count || 0} 🏆</div>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <div className="text-[10px] text-indigo-600 uppercase font-black tracking-wide">Cấp độ học</div>
                      <div className="text-xl font-black text-indigo-700 mt-1">
                        {getStudyLevelLabel(detailStudent?.study_level_id || getStudyLevelIdFromLegacySymbol(detailStudent?.level_symbol))}
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                      <div className="text-[10px] text-green-600 uppercase font-black tracking-wide">Luyện tập</div>
                      <div className="text-xl font-black text-green-700 mt-1">
                        {detailData?.training_track?.completed_days || 0} <span className="text-xs">ngày</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="text-[10px] text-blue-600 uppercase font-black tracking-wide">Tỉ lệ chính xác</div>
                      <div className="text-xl font-black text-blue-700 mt-1">
                        {detailData?.attempts?.accuracy_pct || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Summary Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <h3 className="font-heading font-bold text-sm text-gray-700 mb-3">Thống kê chung</h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Tổng số lần làm bài:</span>
                          <span className="font-bold">{detailData?.attempts?.count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tổng thời gian:</span>
                          <span className="font-bold">{Math.round((detailData?.attempts?.total_time_seconds || 0) / 60)} phút</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Làm bài gần nhất:</span>
                          <span className="font-bold text-xs">
                            {detailData?.attempts?.last_attempt_at ? new Date(detailData.attempts.last_attempt_at).toLocaleDateString('vi-VN') : '---'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <h3 className="font-heading font-bold text-sm text-gray-700 mb-3">Theo chế độ</h3>
                      <div className="space-y-2 text-xs">
                        {Object.entries(detailData?.attempts?.by_mode || {}).map(([mode, stats]: [string, any]) => (
                          <div key={mode} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                            <span className="font-bold uppercase text-gray-500">{mode.replace('_', ' ')}</span>
                            <div className="text-right">
                              <div className="font-bold">{stats.attempts} lượt</div>
                              <div className={`text-[10px] ${stats.correct / stats.total < 0.5 ? 'text-red-500' : 'text-green-600'}`}>
                                {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}% đúng
                              </div>
                            </div>
                          </div>
                        ))}
                        {Object.keys(detailData?.attempts?.by_mode || {}).length === 0 && (
                          <div className="text-gray-400 italic text-center py-2">Chưa có dữ liệu</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity List */}
                  <div className="pt-2">
                    <h3 className="font-heading font-bold text-sm text-gray-700 mb-3">Hoạt động gần đây (Speed Training)</h3>
                    <div className="space-y-2">
                      {(detailData?.speed_training || []).slice(0, 5).map((sess: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl text-sm">
                          <div>
                            <div className="font-bold text-gray-800 uppercase text-xs">{sess.mode}</div>
                            <div className="text-xs text-gray-400">{new Date(sess.created_at).toLocaleString('vi-VN')}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-blue-600">{sess.score} điểm</div>
                            <div className="text-xs text-gray-500">{sess.duration_seconds}s</div>
                          </div>
                        </div>
                      ))}
                      {(detailData?.speed_training || []).length === 0 && (
                        <div className="text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          Chưa có hoạt động
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button onClick={closeDetail} className="px-5 py-2 bg-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-300 transition-colors">Đóng</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TeacherDashboardPage;
