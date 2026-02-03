import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';

type Center = {
  id: string;
  name: string;
  address?: string | null;
  hotline?: string | null;
  google_map_url?: string | null;
  facebook_url?: string | null;
};

type DbClass = {
  id: string;
  name: string;
  center_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

const DOW: Array<{ id: number; label: string }> = [
  { id: 1, label: 'Thứ 2' },
  { id: 2, label: 'Thứ 3' },
  { id: 3, label: 'Thứ 4' },
  { id: 4, label: 'Thứ 5' },
  { id: 5, label: 'Thứ 6' },
  { id: 6, label: 'Thứ 7' },
  { id: 7, label: 'CN' },
];

const AdminInfoManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'centers' | 'classes'>('centers');

  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<Center[]>([]);
  const [classes, setClasses] = useState<DbClass[]>([]);

  const [centerSearch, setCenterSearch] = useState('');
  const filteredCenters = useMemo(() => {
    const q = centerSearch.trim().toLowerCase();
    if (!q) return centers;
    return centers.filter((c) =>
      [c.name, c.address, c.hotline].filter(Boolean).some((x) => String(x).toLowerCase().includes(q)),
    );
  }, [centers, centerSearch]);

  const [centerForm, setCenterForm] = useState({
    name: '',
    hotline: '',
    google_map_url: '',
    address: '',
    facebook_url: '',
  });
  const [centerCreating, setCenterCreating] = useState(false);
  const [centerMsg, setCenterMsg] = useState<string | null>(null);

  const [classForm, setClassForm] = useState({
    name: '',
    center_id: '' as string,
    start_date: '',
    end_date: '',
    days: [] as number[],
    start_time: '17:00',
    end_time: '19:00',
  });
  const [classCreating, setClassCreating] = useState(false);
  const [classMsg, setClassMsg] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [cens, cls] = await Promise.all([backend.getCenters(), backend.getClasses()]);
      setCenters(cens);
      setClasses(cls as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setCenterMsg(null);
    setCenterCreating(true);
    try {
      const res = await backend.adminCreateCenter({
        name: centerForm.name.trim(),
        hotline: centerForm.hotline.trim() || undefined,
        google_map_url: centerForm.google_map_url.trim() || undefined,
        address: centerForm.address.trim() || undefined,
        facebook_url: centerForm.facebook_url.trim() || undefined,
      });
      if (!res.success) {
        setCenterMsg(`❌ ${res.message}`);
        return;
      }
      setCenterMsg('✅ Đã tạo trung tâm.');
      setCenterForm({ name: '', hotline: '', google_map_url: '', address: '', facebook_url: '' });
      await refresh();
    } finally {
      setCenterCreating(false);
    }
  };

  const toggleDay = (dow: number) => {
    setClassForm((p) => ({
      ...p,
      days: p.days.includes(dow) ? p.days.filter((d) => d !== dow) : [...p.days, dow].sort((a, b) => a - b),
    }));
  };

  const onCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassMsg(null);
    setClassCreating(true);
    try {
      const schedule = classForm.days.map((d) => ({
        day_of_week: d,
        start_time: classForm.start_time,
        end_time: classForm.end_time,
      }));
      const res = await backend.adminCreateClass({
        name: classForm.name.trim(),
        center_id: classForm.center_id || null,
        start_date: classForm.start_date || null,
        end_date: classForm.end_date || null,
        schedule,
      });
      if (!res.success) {
        setClassMsg(`❌ ${res.message}`);
        return;
      }
      setClassMsg('✅ Đã tạo lớp.');
      setClassForm({
        name: '',
        center_id: '',
        start_date: '',
        end_date: '',
        days: [],
        start_time: '17:00',
        end_time: '19:00',
      });
      await refresh();
    } finally {
      setClassCreating(false);
    }
  };

  const centerNameById = useMemo(() => {
    const m = new Map<string, string>();
    centers.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [centers]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-black text-gray-800 uppercase tracking-tight">Quản lý thông tin</h1>
            <p className="text-sm text-gray-500 mt-1">Tạo Trung tâm và tạo Lớp (kèm lịch học).</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-heading font-bold"
          >
            ← Về Admin
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('centers')}
            className={`px-5 py-3 rounded-2xl text-xs font-heading font-black uppercase transition ${
              activeTab === 'centers' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Trung tâm
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-5 py-3 rounded-2xl text-xs font-heading font-black uppercase transition ${
              activeTab === 'classes' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Lớp học
          </button>
        </div>

        {activeTab === 'centers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-heading font-black text-gray-800 mb-4">Tạo trung tâm mới</h2>
              <form onSubmit={onCreateCenter} className="space-y-3">
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Tên trung tâm</label>
                  <input
                    value={centerForm.name}
                    onChange={(e) => setCenterForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Hotline</label>
                  <input
                    value={centerForm.hotline}
                    onChange={(e) => setCenterForm((p) => ({ ...p, hotline: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Link Google Map</label>
                  <input
                    value={centerForm.google_map_url}
                    onChange={(e) => setCenterForm((p) => ({ ...p, google_map_url: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                    placeholder="https://maps.google.com/..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Địa chỉ</label>
                  <input
                    value={centerForm.address}
                    onChange={(e) => setCenterForm((p) => ({ ...p, address: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Link Facebook</label>
                  <input
                    value={centerForm.facebook_url}
                    onChange={(e) => setCenterForm((p) => ({ ...p, facebook_url: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={centerCreating}
                  className="w-full mt-2 px-5 py-3 rounded-2xl bg-ucmas-red text-white font-heading font-black uppercase text-xs tracking-wide hover:bg-ucmas-blue transition disabled:opacity-60"
                >
                  {centerCreating ? 'Đang tạo...' : 'Tạo trung tâm'}
                </button>
                {centerMsg && (
                  <div className="text-sm mt-2 p-3 rounded-2xl bg-gray-50 border border-gray-100">{centerMsg}</div>
                )}
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-black text-gray-800">Danh sách trung tâm</h2>
                <button
                  onClick={() => void refresh()}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-heading font-black uppercase"
                >
                  Làm mới
                </button>
              </div>

              <input
                value={centerSearch}
                onChange={(e) => setCenterSearch(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 mb-4"
                placeholder="Search tên / địa chỉ / hotline"
              />

              {loading ? (
                <div className="text-gray-500 text-sm">Đang tải...</div>
              ) : filteredCenters.length === 0 ? (
                <div className="text-gray-500 text-sm">Chưa có trung tâm.</div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
                  {filteredCenters.map((c) => (
                    <div key={c.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
                      <div className="font-heading font-black text-gray-800">{c.name}</div>
                      {c.hotline && <div className="text-xs text-gray-500 mt-1">Hotline: {c.hotline}</div>}
                      {c.address && <div className="text-xs text-gray-500 mt-1">Địa chỉ: {c.address}</div>}
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-3">
                        {c.google_map_url && (
                          <a className="underline" href={c.google_map_url} target="_blank" rel="noreferrer">
                            Google Map
                          </a>
                        )}
                        {c.facebook_url && (
                          <a className="underline" href={c.facebook_url} target="_blank" rel="noreferrer">
                            Facebook
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-heading font-black text-gray-800 mb-4">Tạo lớp mới</h2>
              <form onSubmit={onCreateClass} className="space-y-3">
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Tên lớp</label>
                  <input
                    value={classForm.name}
                    onChange={(e) => setClassForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Trung tâm</label>
                  <select
                    value={classForm.center_id}
                    onChange={(e) => setClassForm((p) => ({ ...p, center_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white"
                  >
                    <option value="">— Chọn trung tâm —</option>
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={classForm.start_date}
                      onChange={(e) => setClassForm((p) => ({ ...p, start_date: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Ngày kết thúc (dự kiến)</label>
                    <input
                      type="date"
                      value={classForm.end_date}
                      onChange={(e) => setClassForm((p) => ({ ...p, end_date: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-2">Lịch học (chọn thứ)</label>
                  <div className="flex flex-wrap gap-2">
                    {DOW.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDay(d.id)}
                        className={`px-3 py-2 rounded-xl border text-xs font-heading font-black uppercase transition ${
                          classForm.days.includes(d.id)
                            ? 'border-ucmas-blue bg-ucmas-blue/10 text-ucmas-blue'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Giờ bắt đầu</label>
                      <input
                        type="time"
                        value={classForm.start_time}
                        onChange={(e) => setClassForm((p) => ({ ...p, start_time: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Giờ kết thúc</label>
                      <input
                        type="time"
                        value={classForm.end_time}
                        onChange={(e) => setClassForm((p) => ({ ...p, end_time: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-2">
                    Lưu ý: hiện UI này áp dụng cùng một khung giờ cho tất cả các thứ đã chọn.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={classCreating}
                  className="w-full mt-2 px-5 py-3 rounded-2xl bg-ucmas-red text-white font-heading font-black uppercase text-xs tracking-wide hover:bg-ucmas-blue transition disabled:opacity-60"
                >
                  {classCreating ? 'Đang tạo...' : 'Tạo lớp'}
                </button>
                {classMsg && (
                  <div className="text-sm mt-2 p-3 rounded-2xl bg-gray-50 border border-gray-100">{classMsg}</div>
                )}
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-black text-gray-800">Danh sách lớp</h2>
                <button
                  onClick={() => void refresh()}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-heading font-black uppercase"
                >
                  Làm mới
                </button>
              </div>

              {loading ? (
                <div className="text-gray-500 text-sm">Đang tải...</div>
              ) : classes.length === 0 ? (
                <div className="text-gray-500 text-sm">Chưa có lớp.</div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
                  {classes.map((cl) => (
                    <div key={cl.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
                      <div className="font-heading font-black text-gray-800">{cl.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Trung tâm: {cl.center_id ? centerNameById.get(cl.center_id) || cl.center_id : '—'}
                      </div>
                      {(cl.start_date || cl.end_date) && (
                        <div className="text-xs text-gray-500 mt-1">
                          Thời gian: {cl.start_date || '—'} → {cl.end_date || '—'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInfoManagerPage;

