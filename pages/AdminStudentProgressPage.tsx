import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import type { UserProfile } from '../types';

type DbClass = { id: string; name: string; center_id?: string | null };
type TimeFilter = 'week' | 'month' | 'year' | 'all';

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
  teachers: UserProfile[];
  classes: DbClass[];
  filterTeacherId: string;
  setFilterTeacherId: (id: string) => void;
  filterClassId: string;
  setFilterClassId: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (t: TimeFilter) => void;
  totalStudents: number;
  loading: boolean;
  onRefresh: () => void;
}> = ({ teachers, classes, filterTeacherId, setFilterTeacherId, filterClassId, setFilterClassId, search, setSearch, timeFilter, setTimeFilter, totalStudents, loading, onRefresh }) => (
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

    {/* Bottom Row: Filters */}
    <div className="flex flex-col md:flex-row gap-4">
      <div className="w-full md:w-56">
        <div className="relative">
          <select
            value={filterTeacherId}
            onChange={(e) => setFilterTeacherId(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ucmas-blue/20 transition-all font-medium appearance-none"
          >
            <option value="">[ Tất cả Giáo viên ]</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name || t.email}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
        </div>
      </div>

      <div className="w-full md:w-56">
        <div className="relative">
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            disabled={!!filterTeacherId}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ucmas-blue/20 transition-all font-medium appearance-none disabled:opacity-60"
          >
            <option value="">[ Tất cả Lớp ]</option>
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
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - day + 1);
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

const AdminStudentProgressPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<DbClass[]>([]);
  const [summaryByStudentId, setSummaryByStudentId] = useState<Record<string, any>>({});

  const [filterTeacherId, setFilterTeacherId] = useState<string>('');
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');

  // Side panel
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<UserProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  const activeFilters = useMemo(() => {
    const f: { teacherId?: string; classId?: string; search?: string } = {};
    if (filterTeacherId) f.teacherId = filterTeacherId;
    if (!filterTeacherId && filterClassId) f.classId = filterClassId;
    if (search.trim()) f.search = search.trim();
    return f;
  }, [filterTeacherId, filterClassId, search]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        backend.getTeachers(),
        backend.getClasses(),
      ]);
      setTeachers(t);
      setClasses(c);

      const { from, to } = getDateRange(timeFilter);

      const summaryRes = await backend.getStudentsProgressSummary({
        teacherId: activeFilters.teacherId,
        classId: activeFilters.classId,
        search: activeFilters.search,
        from,
        to,
        limit: 200,
        offset: 0,
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
            level_symbol: r.level_symbol,
          } as UserProfile;
        });
        setStudents(nextStudents);
        setSummaryByStudentId(map);
      } else {
        const s = await backend.getStudentsByFilter(activeFilters);
        setStudents(s);
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

  useEffect(() => {
    const handle = setTimeout(() => void refresh(), 400);
    return () => clearTimeout(handle);
  }, [activeFilters.teacherId, activeFilters.classId, activeFilters.search]);

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

  // --- Computed Stats ---
  const stats = useMemo(() => {
    const total = students.length;
    const today = new Date().toDateString();

    let submittedToday = 0;
    let needsAttention = 0;

    students.forEach(s => {
      const summary = summaryByStudentId[s.id];
      if (summary) {
        if (summary.last_attempt_at && new Date(summary.last_attempt_at).toDateString() === today) {
          submittedToday++;
        }
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
              Tiến trình học sinh (Admin)
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Tra cứu và theo dõi chi tiết hoạt động của toàn bộ học viên.
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-5 py-2.5 rounded-xl bg-white border-2 border-transparent hover:border-gray-200 text-gray-600 font-heading font-bold shadow-sm hover:shadow text-sm transition-all"
          >
            ← Về Admin
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Học sinh hiển thị"
            value={stats.total}
            icon={<span className="text-2xl">🎓</span>}
            colorClass="bg-blue-50 border-blue-100 text-blue-900"
          />
          <StatCard
            title="Cần chú ý"
            value={stats.needsAttention}
            subtext={stats.needsAttention > 0 ? "TB < 50%" : "Tốt"}
            icon={<span className="text-2xl">⚠️</span>}
            colorClass="bg-red-50 border-red-100 text-red-900"
          />
          <StatCard
            title="Nộp bài hôm nay"
            value={stats.submittedToday}
            icon={<span className="text-2xl">✅</span>}
            colorClass="bg-green-50 border-green-100 text-green-900"
          />
        </div>

        <FilterBar
          teachers={teachers}
          classes={classes}
          filterTeacherId={filterTeacherId}
          setFilterTeacherId={setFilterTeacherId}
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

        {/* Main Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50/80 border-b border-gray-100 text-xs font-heading font-black text-gray-400 uppercase tracking-wider">
            <div className="col-span-3 md:col-span-3">Học sinh</div>
            <div className="col-span-2 md:col-span-1 text-center">Level</div>
            <div className="col-span-2 md:col-span-1 text-center">Tổng Cup</div>
            <div className="col-span-3 md:col-span-3">Tiến độ ({
              timeFilter === 'week' ? 'Tuần' : timeFilter === 'month' ? 'Tháng' : timeFilter === 'year' ? 'Năm' : 'Tất cả'
            })</div>
            <div className="col-span-2 text-center hidden md:block">Tỉ lệ đúng</div>
            <div className="col-span-2 text-right">Hành động</div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 font-medium">Đang tải dữ liệu...</div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">📭</div>
              <div className="text-gray-900 font-bold mb-1">Không tìm thấy dữ liệu</div>
              <div className="text-gray-500 text-sm">Thử thay đổi bộ lọc tìm kiếm.</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {students.map((s) => {
                const summary = summaryByStudentId[s.id] || {};
                const accuracy = Number(summary.accuracy_pct) || 0;

                const trainingDays = summary.training_completed_days || 0;
                const maxDays = timeFilter === 'week' ? 7 : timeFilter === 'month' ? 30 : 100;
                const widthPct = Math.min(100, (trainingDays / maxDays) * 100);

                return (
                  <div key={s.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-blue-50/30 transition-colors group">
                    {/* Student Info */}
                    <div className="col-span-3 md:col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
                        {s.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-heading font-black text-gray-800 text-sm truncate">{s.full_name}</div>
                        <div className="text-xs text-gray-400 truncate font-medium">
                          {s.student_code && <span className="mr-1.5 px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{s.student_code}</span>}
                          {s.phone}
                        </div>
                      </div>
                    </div>

                    {/* Level */}
                    <div className="col-span-2 md:col-span-1 text-center font-heading font-black text-gray-700 text-sm">
                      {s.level_symbol || '-'}
                    </div>

                    {/* Cups */}
                    <div className="col-span-2 md:col-span-1 text-center font-heading font-black text-yellow-600 text-sm">
                      {s.cups_count || 0} 🏆
                    </div>

                    {/* Progress Bar */}
                    <div className="col-span-3 md:col-span-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-gray-600">
                          {trainingDays} ngày
                        </span>
                        <span className="text-gray-400">{widthPct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${widthPct}%` }}></div>
                      </div>
                    </div>

                    {/* Accuracy */}
                    <div className="col-span-2 hidden md:flex items-center justify-center font-heading font-black text-gray-700 text-sm">
                      {accuracy}%
                      {accuracy < 50 && accuracy > 0 && <span className="ml-1 text-red-500">⚠️</span>}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openDetail(s)}
                        className="text-blue-700 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 whitespace-nowrap"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar / Modal for Details */}
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
                      <div className="text-[10px] text-indigo-600 uppercase font-black tracking-wide">Cấp độ</div>
                      <div className="text-xl font-black text-indigo-700 mt-1">{detailStudent?.level_symbol || '-'}</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                      <div className="text-[10px] text-green-600 uppercase font-black tracking-wide">Luyện tập</div>
                      <div className="text-xl font-black text-green-700 mt-1">
                        {detailData?.training_track?.completed_days || 0} <span className="text-xs">ngày</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="text-[10px] text-blue-600 uppercase font-black tracking-wide">Chính xác</div>
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

export default AdminStudentProgressPage;
