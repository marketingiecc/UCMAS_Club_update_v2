import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import type { UserProfile } from '../types';

type DbClass = { id: string; name: string; center_id?: string | null };

const AdminTeacherManagerPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<DbClass[]>([]);

  const [createForm, setCreateForm] = useState({
    full_name: '',
    phone: '',
    email: '',
  });
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const [manageOpen, setManageOpen] = useState(false);
  const [manageTeacher, setManageTeacher] = useState<UserProfile | null>(null);
  const [manageClassIds, setManageClassIds] = useState<string[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);

  const classIdSet = useMemo(() => new Set(manageClassIds), [manageClassIds]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([backend.getTeachers(), backend.getClasses()]);
      setTeachers(t);
      setClasses(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMessage(null);
    setCreating(true);
    try {
      const res = await backend.inviteTeacher({
        email: createForm.email,
        full_name: createForm.full_name,
        phone: createForm.phone || undefined,
      });
      if (!res.success) {
        setCreateMessage(`❌ ${res.message}`);
        return;
      }
      setCreateMessage('✅ Đã gửi email mời giáo viên. Giáo viên sẽ tự set mật khẩu qua email.');
      setCreateForm({ full_name: '', phone: '', email: '' });
      await refresh();
    } finally {
      setCreating(false);
    }
  };

  const openManage = async (teacher: UserProfile) => {
    setManageTeacher(teacher);
    setManageOpen(true);
    try {
      const ids = await backend.getTeacherActiveClassIds(teacher.id);
      setManageClassIds(ids);
    } catch {
      setManageClassIds([]);
    }
  };

  const closeManage = () => {
    setManageOpen(false);
    setManageTeacher(null);
    setManageClassIds([]);
  };

  const toggleClass = (classId: string) => {
    setManageClassIds((prev) =>
      prev.includes(classId) ? prev.filter((x) => x !== classId) : [...prev, classId],
    );
  };

  const saveManage = async () => {
    if (!manageTeacher) return;
    setSavingAssign(true);
    try {
      const res = await backend.setTeacherClasses(manageTeacher.id, manageClassIds);
      if (!res.success) {
        alert(res.message || 'Lưu thất bại');
        return;
      }
      await refresh();
      closeManage();
    } finally {
      setSavingAssign(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-black text-gray-800 uppercase tracking-tight">
              Quản lý giáo viên
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Tạo giáo viên bằng email mời (giáo viên tự đặt mật khẩu) và gán lớp cho giáo viên.
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-heading font-bold"
          >
            ← Về Admin
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-heading font-black text-gray-800 mb-4">Thêm giáo viên</h2>
            <form onSubmit={onInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Họ và tên</label>
                <input
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ucmas-blue/30"
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Số điện thoại</label>
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ucmas-blue/30"
                  placeholder="09xxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Email</label>
                <input
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ucmas-blue/30"
                  placeholder="teacher@email.com"
                  type="email"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full mt-2 px-5 py-3 rounded-2xl bg-ucmas-red text-white font-heading font-black uppercase text-xs tracking-wide hover:bg-ucmas-blue transition disabled:opacity-60"
              >
                {creating ? 'Đang gửi...' : 'Gửi email mời giáo viên'}
              </button>
              {createMessage && (
                <div className="text-sm mt-2 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  {createMessage}
                </div>
              )}
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-black text-gray-800">Danh sách giáo viên</h2>
              <button
                onClick={() => void refresh()}
                className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-heading font-black uppercase"
              >
                Làm mới
              </button>
            </div>

            {loading ? (
              <div className="text-gray-500 text-sm">Đang tải...</div>
            ) : teachers.length === 0 ? (
              <div className="text-gray-500 text-sm">
                Chưa có giáo viên. Hãy thêm giáo viên bằng email mời.
              </div>
            ) : (
              <div className="space-y-3">
                {teachers.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-heading font-black text-gray-800 truncate">{t.full_name || 'Giáo viên'}</div>
                      <div className="text-xs text-gray-500 truncate">{t.email}</div>
                      {t.phone && <div className="text-xs text-gray-500">SĐT: {t.phone}</div>}
                    </div>
                    <button
                      onClick={() => void openManage(t)}
                      className="flex-shrink-0 px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-heading font-black uppercase"
                    >
                      Gán lớp
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Manage classes modal */}
        {manageOpen && manageTeacher && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-heading font-black uppercase text-gray-400">Gán lớp</div>
                  <div className="text-lg font-heading font-black text-gray-800">
                    {manageTeacher.full_name || manageTeacher.email}
                  </div>
                </div>
                <button
                  onClick={closeManage}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-heading font-black"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                {classes.length === 0 ? (
                  <div className="text-sm text-gray-600">
                    Chưa có lớp trong hệ thống (bảng `classes`). Hãy chạy script migrate từ `profiles.class_name` để tạo lớp,
                    hoặc tạo lớp mới trong Supabase.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-auto pr-1">
                    {classes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleClass(c.id)}
                        className={`text-left p-4 rounded-2xl border transition ${
                          classIdSet.has(c.id)
                            ? 'border-ucmas-blue bg-ucmas-blue/10'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-heading font-black text-gray-800 truncate">{c.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {classIdSet.has(c.id) ? 'Đã gán' : 'Chưa gán'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={closeManage}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-heading font-bold"
                >
                  Hủy
                </button>
                <button
                  onClick={() => void saveManage()}
                  disabled={savingAssign || classes.length === 0}
                  className="px-5 py-2 rounded-xl bg-ucmas-red text-white font-heading font-black uppercase text-xs tracking-wide hover:bg-ucmas-blue transition disabled:opacity-60"
                >
                  {savingAssign ? 'Đang lưu...' : 'Lưu gán lớp'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTeacherManagerPage;

