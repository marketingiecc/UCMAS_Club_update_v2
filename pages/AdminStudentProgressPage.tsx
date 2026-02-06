import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import type { UserProfile } from '../types';

type DbClass = { id: string; name: string; center_id?: string | null };

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
  totalStudents: number;
  loading: boolean;
  onRefresh: () => void;
}> = ({ teachers, classes, filterTeacherId, setFilterTeacherId, filterClassId, setFilterClassId, search, setSearch, totalStudents, loading, onRefresh }) => (
  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">

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

    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
      <span className="text-xs font-heading font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg whitespace-nowrap">
        {totalStudents} học sinh
      </span>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="px-4 py-3 rounded-2xl bg-ucmas-blue text-white font-heading font-black hover:bg-ucmas-blue/90 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-ucmas-blue/20 flex items-center gap-2"
      >
        {loading ? (
          <span className="animate-spin text-lg">↻</span>
        ) : (
          <span>↻</span>
        )}
      </button>
    </div>
  </div>
);

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

      const summaryRes = await backend.getStudentsProgressSummary({
        teacherId: activeFilters.teacherId,
        classId: activeFilters.classId,
        search: activeFilters.search,
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
          };
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
  }, []);

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
          totalStudents={students.length}
          loading={loading}
          onRefresh={refresh}
        />

        {/* Main Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50/80 border-b border-gray-100 text-xs font-heading font-black text-gray-400 uppercase tracking-wider">
            <div className="col-span-4 md:col-span-3">Học sinh</div>
            <div className="col-span-2 hidden md:block text-center">Cấp độ</div>
            <div className="col-span-4 md:col-span-3">Tiến độ tuần này</div>
            <div className="col-span-2 hidden md:block text-center">Điểm TB</div>
            <div className="col-span-4 md:col-span-2 text-right">Hành động</div>
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
                const accuracy = summary.accuracy_pct || 0;
                const attempts = summary.attempts_count || 0;
                const progressColor = accuracy >= 80 ? 'bg-green-500' : accuracy >= 50 ? 'bg-yellow-400' : 'bg-red-400';
                const progressWidth = Math.min(100, Math.max(5, accuracy)) + '%';

                return (
                  <div key={s.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-blue-50/30 transition-colors group">
                    {/* Student Info */}
                    <div className="col-span-4 md:col-span-3 flex items-center gap-3">
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

                    {/* Cups / Level */}
                    <div className="col-span-2 hidden md:flex flex-col items-center justify-center">
                      {s.cups_count != null && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-bold border border-yellow-100">
                          <span>🏆</span> {s.cups_count}
                        </div>
                      )}
                      <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Cấp độ</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="col-span-4 md:col-span-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className={`font-bold ${accuracy >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                          {accuracy > 0 ? (accuracy >= 80 ? '>80%' : accuracy < 50 ? '<60%' : '60-80%') : 'Chưa học'}
                        </span>
                        <span className="text-gray-400">{accuracy}% ({attempts} lượt)</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${progressColor}`} style={{ width: progressWidth }}></div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="col-span-2 hidden md:flex items-center justify-center font-heading font-black text-gray-700">
                      {summary.accuracy_pct ? (summary.accuracy_pct / 10).toFixed(1) : '-'}
                      {accuracy < 50 && accuracy > 0 && <span className="ml-2 text-red-500 text-lg">⚠️</span>}
                    </div>

                    {/* Actions */}
                    <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openDetail(s)}
                        className="px-4 py-1.5 rounded-xl bg-[#1a237e] text-white text-xs font-heading font-bold hover:bg-[#1a237e]/90 shadow-md shadow-blue-900/20 transition"
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
          <div className="fixed inset-0 z-50 flex justify-end font-sans">
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
              onClick={closeDetail}
            ></div>

            <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-xl font-heading font-black text-gray-800">Chi tiết học sinh</h2>
                  {detailStudent && (
                    <div className="flex items-center gap-3 mt-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg">
                        {detailStudent.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{detailStudent.full_name}</div>
                        <div className="text-xs text-gray-500 font-medium">
                          {detailStudent.student_code} • {detailStudent.phone}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={closeDetail}
                  className="p-2 rounded-full hover:bg-gray-200 text-gray-400 transition"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
                    <span className="animate-spin text-2xl">⏳</span>
                    <span className="text-sm font-medium">Đang tải hồ sơ...</span>
                  </div>
                ) : detailData?.error ? (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                    {detailData.error}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="text-xs text-blue-800 font-bold mb-1">Cúp tích lũy</div>
                        <div className="text-2xl font-black text-blue-900">
                          {detailStudent?.cups_count || 0} 🏆
                        </div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100">
                        <div className="text-xs text-purple-800 font-bold mb-1">Điểm trung bình</div>
                        <div className="text-2xl font-black text-purple-900">
                          {(detailData?.attempts?.accuracy_pct / 10).toFixed(1)} <span className="text-sm font-normal text-purple-700">/10</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-heading font-black uppercase text-gray-800 mb-3">Kết quả luyện tập 7 ngày qua</h3>
                      <div className="h-40 w-full bg-gray-50 rounded-2xl border border-gray-100 flex items-end justify-between p-4 px-2">
                        {[60, 30, 80, 45, 90, 20, 70].map((h, i) => (
                          <div key={i} className="flex flex-col items-center gap-1 w-full">
                            <div
                              className="w-2 md:w-4 bg-teal-500 rounded-t-lg opacity-80 hover:opacity-100 transition-all"
                              style={{ height: `${h}%` }}
                            ></div>
                            <span className="text-[9px] text-gray-400 font-bold uppercase">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminStudentProgressPage;
