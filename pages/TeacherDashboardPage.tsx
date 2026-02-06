import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import type { UserProfile } from '../types';

type DbClass = { id: string; name: string; center_id?: string | null };

type TimeFilter = 'week' | 'month' | 'year' | 'all';

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
  totalStudents: number;
  loading: boolean;
  onRefresh: () => void;
}> = ({ classes, filterClassId, setFilterClassId, search, setSearch, timeFilter, setTimeFilter, totalStudents, loading, onRefresh }) => (
  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col gap-4">

    {/* Top Row: Time Filter & Refresh */}
    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex bg-gray-100 p-1 rounded-xl">
        {[
          { key: 'week', label: 'Tuần này' },
          { key: 'month', label: 'Tháng này' },
          { key: 'year', label: 'Năm nay' },
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
function getDateRange(filter: TimeFilter): { from?: string; to?: string } {
  const now = new Date();
  if (filter === 'all') return {};

  if (filter === 'week') {
    // Current week (Monday start)
    const day = now.getDay() || 7; // 1=Mon, 7=Sun
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - day + 1);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    // Usually 'to' is consistent, but RPC uses <= so now is fine or end of week
    // Let's just use 'start' as 'from'. 'to' can be null (meaning up to now)
    return { from: start.toISOString() };
  }

  if (filter === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString() };
  }

  if (filter === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { from: start.toISOString() };
  }
  return {};
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
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');

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
      const { from, to } = getDateRange(timeFilter);

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
        const nextStudents: UserProfile[] = (summaryRes.data || []).map((r: any) => {
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
            level_symbol: r.level_symbol, // Bind Level
          } as UserProfile;
        });
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
  }, [timeFilter]); // Refresh on time filter change

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
            subtext={stats.needsAttention > 0 ? "Tỉ lệ đúng < 50%" : "Tốt"}
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
          totalStudents={students.length}
          loading={loading}
          onRefresh={refresh}
        />

        {/* Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50/80 border-b border-gray-100 text-xs font-heading font-black text-gray-400 uppercase tracking-wider">
            <div className="col-span-4 md:col-span-3">Học sinh</div>
            <div className="col-span-2 text-center">Cấp độ</div>
            <div className="col-span-4 md:col-span-3">Tiến độ ({
              timeFilter === 'week' ? 'Tuần' : timeFilter === 'month' ? 'Tháng' : timeFilter === 'year' ? 'Năm' : 'Tất cả'
            })</div>
            <div className="col-span-2 hidden md:block text-center">Tỉ lệ đúng</div>
            <div className="col-span-2 text-right">Hành động</div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 font-medium">Đang tải dữ liệu...</div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-medium">Chưa có dữ liệu</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {students.map((s) => {
                const summary = summaryByStudentId[s.id] || {};
                const accuracy = Number(summary.accuracy_pct) || 0;
                const trainingDays = summary.training_completed_days || 0;
                // Visual bar for training days (goal: say 7 days for week, 30 for month?)
                const maxDays = timeFilter === 'week' ? 7 : timeFilter === 'month' ? 30 : 100;
                const widthPct = Math.min(100, (trainingDays / maxDays) * 100);

                return (
                  <div key={s.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-blue-50/30 transition-colors">
                    {/* Name & Cups */}
                    <div className="col-span-4 md:col-span-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                          {s.full_name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-heading font-black text-gray-800 text-sm truncate">{s.full_name}</div>
                          <div className="text-xs text-blue-600 font-bold flex items-center gap-1">
                            <span>🏆 {s.cups_count || 0}</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-400 font-medium">{s.student_code || '---'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Level */}
                    <div className="col-span-2 text-center font-heading font-black text-gray-700 text-sm">
                      {s.level_symbol || '-'}
                    </div>

                    {/* Progress (Training Days) */}
                    <div className="col-span-4 md:col-span-3">
                      <div className="flex justify-between text-xs mb-1 font-bold text-gray-600">
                        <span>{trainingDays} ngày luyện</span>
                        <span className="text-gray-400">{widthPct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${widthPct}%` }}></div>
                      </div>
                    </div>

                    {/* Accuracy */}
                    <div className="col-span-2 hidden md:flex items-center justify-center font-heading font-black text-gray-700">
                      {accuracy}%
                      {accuracy < 50 && accuracy > 0 && <span className="ml-1 text-red-500">⚠️</span>}
                    </div>

                    {/* Action */}
                    <div className="col-span-2 flex justify-end">
                      <button onClick={() => openDetail(s)} className="text-blue-700 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                        Chi tiết
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Modal (Simple Reuse) */}
        {detailOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={closeDetail}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-heading font-black mb-4">Chi tiết: {detailStudent?.full_name}</h2>
              {detailLoading ? 'Đang tải...' : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-xs text-gray-500 uppercase font-bold">Tổng Cup</div>
                      <div className="text-2xl font-black text-yellow-600">{detailStudent?.cups_count || 0} 🏆</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-xs text-gray-500 uppercase font-bold">Cấp độ hiện tại</div>
                      <div className="text-2xl font-black text-indigo-900">{detailStudent?.level_symbol || '-'}</div>
                    </div>
                  </div>

                  {/* Mini Chart Placeholder */}
                  <div className="h-32 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 text-xs">
                    Biểu đồ chi tiết (Đang cập nhật)
                  </div>

                  <div className="flex justify-end pt-4">
                    <button onClick={closeDetail} className="px-5 py-2 bg-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-300">Đóng</button>
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
