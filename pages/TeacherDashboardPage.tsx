import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import type { UserProfile } from '../types';

type DbClass = { id: string; name: string; center_id?: string | null };

const TeacherDashboardPage: React.FC<{ user: UserProfile }> = ({ user }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<DbClass[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [summaryByStudentId, setSummaryByStudentId] = useState<Record<string, any>>({});

  const [filterClassId, setFilterClassId] = useState<string>('');
  const [search, setSearch] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<UserProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  const activeFilters = useMemo(() => {
    const f: { classId?: string; teacherId?: string; search?: string } = { teacherId: user.id };
    if (filterClassId) f.classId = filterClassId; // handled client-side by fetching class roster
    if (search.trim()) f.search = search.trim();
    return f;
  }, [user.id, filterClassId, search]);

  const refresh = async () => {
    setLoading(true);
    try {
      // Load teacher classes (subset) then students (filtered by teacher roster).
      const classIds = await backend.getTeacherActiveClassIds(user.id);
      const allClasses = await backend.getClasses();
      const myClasses = allClasses.filter((c) => classIds.includes(c.id));
      setClasses(myClasses);

      const summaryRes = await backend.getStudentsProgressSummary({
        teacherId: user.id,
        classId: filterClassId || undefined,
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
            level_symbol: undefined,
            class_name: undefined,
            center_id: undefined,
            center_name: undefined,
            avatar_url: undefined,
            license_expiry: undefined,
          };
        });
        setStudents(nextStudents);
        setSummaryByStudentId(map);
      } else {
        // Fallback without RPC
        const roster = await backend.getStudentsByFilter({ teacherId: user.id, search: activeFilters.search });
        setStudents(roster);
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
    const handle = setTimeout(() => void refresh(), 250);
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
    setDetailData(null);
    setDetailLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-black text-gray-800 uppercase tracking-tight">
              Bảng điều khiển giáo viên
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Xem danh sách học sinh thuộc các lớp bạn quản lý và theo dõi tiến trình luyện tập.
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-heading font-bold"
          >
            ← Về Dashboard
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Lớp của tôi</label>
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white"
              >
                <option value="">Tất cả lớp</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-gray-400 mt-1">
                Chỉ hiển thị lớp đã được Admin gán cho bạn.
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Tìm học sinh</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ucmas-blue/30"
                placeholder="Tên / Mã học sinh / SĐT"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-black text-gray-800">
              Học sinh ({loading ? '…' : students.length})
            </h2>
            <button
              onClick={() => void refresh()}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-heading font-black uppercase"
            >
              Làm mới
            </button>
          </div>

          {loading ? (
            <div className="text-gray-500 text-sm">Đang tải...</div>
          ) : students.length === 0 ? (
            <div className="text-gray-500 text-sm">
              Không có học sinh trong phạm vi lớp của bạn (hoặc chưa được gán lớp).
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((s) => (
                (() => {
                  const summary = summaryByStudentId[s.id];
                  return (
                <button
                  key={s.id}
                  onClick={() => void openDetail(s)}
                  className="w-full text-left p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-heading font-black text-gray-800 truncate">
                      {s.full_name || 'Học sinh'}
                      {s.student_code ? <span className="ml-2 text-xs text-gray-400">({s.student_code})</span> : null}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {s.phone ? `SĐT: ${s.phone} • ` : ''}
                      {s.email}
                    </div>
                    {summary && (
                      <div className="text-[11px] text-gray-500 mt-1">
                        Attempts: <b>{summary.attempts_count}</b> • Accuracy: <b>{summary.accuracy_pct}%</b> • Lộ trình: <b>{summary.training_completed_days}</b> ngày
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-xs font-heading font-black uppercase text-gray-500">
                    Xem tiến trình →
                  </div>
                </button>
                  );
                })()
              ))}
            </div>
          )}
        </div>

        {detailOpen && detailStudent && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-heading font-black uppercase text-gray-400">Tiến trình học sinh</div>
                  <div className="text-lg font-heading font-black text-gray-800 truncate">
                    {detailStudent.full_name || detailStudent.email}
                    {detailStudent.student_code ? (
                      <span className="ml-2 text-sm text-gray-400">({detailStudent.student_code})</span>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={closeDetail}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-heading font-black"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-auto">
                {detailLoading ? (
                  <div className="text-gray-500 text-sm">Đang tải dữ liệu...</div>
                ) : detailData?.error ? (
                  <div className="text-sm text-red-600">{detailData.error}</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="text-xs font-heading font-black uppercase text-gray-400">Luyện (attempts)</div>
                        <div className="text-2xl font-heading font-black text-gray-800">{detailData?.attempts?.count ?? 0}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Độ chính xác: {detailData?.attempts?.accuracy_pct ?? 0}% • Tổng thời gian: {detailData?.attempts?.total_time_seconds ?? 0}s
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="text-xs font-heading font-black uppercase text-gray-400">Lộ trình luyện tập</div>
                        <div className="text-2xl font-heading font-black text-gray-800">{detailData?.training_track?.completed_days ?? 0}</div>
                        <div className="text-xs text-gray-500 mt-1">Ngày hoàn thành</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="text-xs font-heading font-black uppercase text-gray-400">Speed training</div>
                        <div className="text-2xl font-heading font-black text-gray-800">
                          {(detailData?.speed_training || []).length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Phiên gần đây</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-heading font-black uppercase text-gray-700 mb-2">Theo chế độ</h3>
                        <div className="space-y-2">
                          {Object.entries(detailData?.attempts?.by_mode || {}).map(([mode, v]: any) => (
                            <div key={mode} className="p-3 rounded-2xl border border-gray-100 bg-gray-50">
                              <div className="text-xs font-heading font-black text-gray-800 uppercase">{mode}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Lượt: {v.attempts} • Đúng: {v.correct}/{v.total} • Thời gian: {v.time}s
                              </div>
                            </div>
                          ))}
                          {Object.keys(detailData?.attempts?.by_mode || {}).length === 0 && (
                            <div className="text-sm text-gray-500">Chưa có dữ liệu luyện tập (attempts).</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-heading font-black uppercase text-gray-700 mb-2">Luyện theo lộ trình</h3>
                        <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
                          <div className="text-sm text-gray-700">
                            Hoàn thành: <b>{detailData?.training_track?.completed_days ?? 0}</b> ngày
                          </div>
                          {detailData?.training_track?.last_completed_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              Gần nhất: {new Date(detailData.training_track.last_completed_at).toLocaleString()}
                            </div>
                          )}
                        </div>

                        <h3 className="text-sm font-heading font-black uppercase text-gray-700 mt-6 mb-2">Learning paths</h3>
                        {(detailData?.learning_paths || []).length === 0 ? (
                          <div className="text-sm text-gray-500">Chưa tham gia learning path.</div>
                        ) : (
                          <div className="space-y-2">
                            {(detailData.learning_paths || []).map((en: any) => (
                              <div key={en.path_id} className="p-3 rounded-2xl border border-gray-100 bg-gray-50">
                                <div className="text-xs text-gray-700">
                                  Path: <b>{en.path_id}</b>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Level hiện tại: {en.current_level}</div>
                              </div>
                            ))}
                          </div>
                        )}
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

export default TeacherDashboardPage;

