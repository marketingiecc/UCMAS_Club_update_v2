import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import type { UserProfile } from '../types';

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
  const location = useLocation();
  const getTabFromQuery = () => {
    const tab = new URLSearchParams(location.search).get('tab');
    return tab === 'classes' || tab === 'teachers' ? tab : 'centers';
  };
  const [activeTab, setActiveTab] = useState<'centers' | 'classes' | 'teachers'>(getTabFromQuery());
  useEffect(() => {
    setActiveTab(getTabFromQuery());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [classes, setClasses] = useState<DbClass[]>([]);
  const [centerStats, setCenterStats] = useState<Record<string, { classCount: number; studentCount: number }>>({});
  const [classStudentCounts, setClassStudentCounts] = useState<Record<string, number>>({});
  const [classScheduleText, setClassScheduleText] = useState<Record<string, string>>({});
  const [classSchedulePrefill, setClassSchedulePrefill] = useState<Record<string, { days: number[]; start_time: string; end_time: string; multiTime: boolean }>>({});
  const [classTeacherText, setClassTeacherText] = useState<Record<string, string>>({});

  const centerNameByIdMemo = useMemo(() => {
    const m = new Map<string, string>();
    centers.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [centers]);

  const [centerSearch, setCenterSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const filteredCenters = useMemo(() => {
    const q = centerSearch.trim().toLowerCase();
    if (!q) return centers;
    return centers.filter((c) =>
      [c.name, c.address, c.hotline].filter(Boolean).some((x) => String(x).toLowerCase().includes(q)),
    );
  }, [centers, centerSearch]);
  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((cl) => {
      const centerName = cl.center_id ? centerNameByIdMemo.get(cl.center_id) : '';
      return [cl.name, centerName].filter(Boolean).some((x) => String(x).toLowerCase().includes(q));
    });
  }, [classes, classSearch, centerNameByIdMemo]);

  const [centerForm, setCenterForm] = useState({
    name: '',
    hotline: '',
    google_map_url: '',
    address: '',
    facebook_url: '',
  });
  const [centerCreating, setCenterCreating] = useState(false);
  const [centerMsg, setCenterMsg] = useState<string | null>(null);
  const [createCenterOpen, setCreateCenterOpen] = useState(false);

  const [editCenterOpen, setEditCenterOpen] = useState(false);
  const [editCenter, setEditCenter] = useState<Center | null>(null);
  const [editCenterSaving, setEditCenterSaving] = useState(false);
  const [editCenterMsg, setEditCenterMsg] = useState<string | null>(null);

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
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [editClassOpen, setEditClassOpen] = useState(false);
  const [editClass, setEditClass] = useState<DbClass | null>(null);
  const [editClassForm, setEditClassForm] = useState({
    name: '',
    center_id: '' as string,
    start_date: '',
    end_date: '',
    days: [] as number[],
    start_time: '17:00',
    end_time: '19:00',
  });
  const [editClassSaving, setEditClassSaving] = useState(false);
  const [editClassMsg, setEditClassMsg] = useState<string | null>(null);

  // --- Teachers tab state ---
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [createTeacherOpen, setCreateTeacherOpen] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [teacherCreating, setTeacherCreating] = useState(false);
  const [teacherMsg, setTeacherMsg] = useState<string | null>(null);
  const [editTeacherOpen, setEditTeacherOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<UserProfile | null>(null);
  const [editTeacherForm, setEditTeacherForm] = useState({ full_name: '', phone: '' });
  const [editTeacherSaving, setEditTeacherSaving] = useState(false);
  const [editTeacherMsg, setEditTeacherMsg] = useState<string | null>(null);

  const [teacherStats, setTeacherStats] = useState<
    Record<string, { classCount: number; studentCount: number; centerNames: string[] }>
  >({});

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTeacher, setAssignTeacher] = useState<UserProfile | null>(null);
  const [assignClassIds, setAssignClassIds] = useState<string[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const assignIdSet = useMemo(() => new Set(assignClassIds), [assignClassIds]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignCenterId, setAssignCenterId] = useState<string>('');

  const refresh = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Load independently so one failing (e.g., schema mismatch) doesn't blank the other.
      const [cens, cls] = await Promise.all([
        backend.getCenters().catch((e: any) => {
          throw e;
        }),
        backend
          .getClasses()
          .then((x) => x as any as DbClass[])
          .catch((e: any) => {
            // Show error but keep centers usable.
            setLoadError(e?.message || 'Không tải được danh sách lớp');
            return [] as DbClass[];
          }),
      ]);
      setCenters(cens as any);
      setClasses(cls as any);

      // Compute stats/summaries (best-effort)
      try {
        const classIds = (cls || []).map((c) => c.id).filter(Boolean);
        const [studentRows, schedRows, tcLinks] = await Promise.all([
          backend.getActiveClassStudentsRows(classIds),
          backend.getClassSchedulesByClassIds(classIds),
          backend.getActiveTeacherClassLinksByClassIds(classIds),
        ]);

        const classById = new Map<string, DbClass>();
        (cls || []).forEach((c) => classById.set(c.id, c));

        const [adminStats] = await Promise.all([
          backend.getAdminInfoStats().catch(() => null),
        ]);

        if (adminStats) {
          setCenterStats(adminStats.centerStats || {});
          setClassStudentCounts(adminStats.classStudentCounts || {});
        } else {
          // Fallback if RPC fails or not deployed yet
          // Class student counts + center unique student counts
          const classCounts: Record<string, number> = {};
          const centerStudentSets = new Map<string, Set<string>>();
          (studentRows || []).forEach((r) => {
            classCounts[r.class_id] = (classCounts[r.class_id] || 0) + 1;
            const cl = classById.get(r.class_id);
            const centerId = cl?.center_id || null;
            if (!centerId) return;
            if (!centerStudentSets.has(centerId)) centerStudentSets.set(centerId, new Set());
            centerStudentSets.get(centerId)!.add(r.student_id);
          });
          setClassStudentCounts(classCounts);

          // Center stats (class count + student count)
          const centerStatsNext: Record<string, { classCount: number; studentCount: number }> = {};
          (cens || []).forEach((c: any) => (centerStatsNext[c.id] = { classCount: 0, studentCount: 0 }));
          (cls || []).forEach((c) => {
            if (!c.center_id) return;
            if (!centerStatsNext[c.center_id]) centerStatsNext[c.center_id] = { classCount: 0, studentCount: 0 };
            centerStatsNext[c.center_id].classCount += 1;
          });
          centerStudentSets.forEach((set, centerId) => {
            if (!centerStatsNext[centerId]) centerStatsNext[centerId] = { classCount: 0, studentCount: 0 };
            centerStatsNext[centerId].studentCount = set.size;
          });
          setCenterStats(centerStatsNext);
        }

        // Schedule summaries per class
        const dowLabel = new Map<number, string>(DOW.map((d) => [d.id, d.label]));
        const schedByClass = new Map<string, Array<{ day_of_week: number; start_time: string; end_time: string }>>();
        (schedRows || []).forEach((s) => {
          if (!schedByClass.has(s.class_id)) schedByClass.set(s.class_id, []);
          schedByClass.get(s.class_id)!.push(s);
        });

        const schedText: Record<string, string> = {};
        const schedPrefill: Record<string, { days: number[]; start_time: string; end_time: string; multiTime: boolean }> = {};
        (cls || []).forEach((c) => {
          const rows = (schedByClass.get(c.id) || []).slice().sort((a, b) => a.day_of_week - b.day_of_week);
          if (!rows.length) return;
          const days = Array.from(new Set(rows.map((r) => r.day_of_week))).sort((a, b) => a - b);
          const timePairs = Array.from(new Set(rows.map((r) => `${r.start_time}-${r.end_time}`)));
          const multiTime = timePairs.length > 1;
          const first = rows[0];
          const dayText = days.map((d) => dowLabel.get(d) || `Thứ ${d}`).join(', ');
          const timeText = multiTime ? 'Nhiều khung giờ' : `${first.start_time}–${first.end_time}`;
          schedText[c.id] = `${dayText} • ${timeText}`;
          schedPrefill[c.id] = {
            days,
            start_time: first.start_time,
            end_time: first.end_time,
            multiTime,
          };
        });
        setClassScheduleText(schedText);
        setClassSchedulePrefill(schedPrefill);

        // Teacher summaries per class
        const links = (tcLinks || []);
        const teacherIds = Array.from(new Set(links.map((l) => l.teacher_id)));
        const teacherProfiles = await backend.getTeacherNamesByIds(teacherIds);
        const teacherNameById = new Map<string, string>();
        (teacherProfiles || []).forEach((t) => teacherNameById.set(t.id, t.full_name || t.email || 'Giáo viên'));
        const teacherNamesByClass = new Map<string, string[]>();
        links.forEach((l) => {
          if (!teacherNamesByClass.has(l.class_id)) teacherNamesByClass.set(l.class_id, []);
          teacherNamesByClass.get(l.class_id)!.push(teacherNameById.get(l.teacher_id) || 'Giáo viên');
        });
        const teacherText: Record<string, string> = {};
        (cls || []).forEach((c) => {
          const names = Array.from(new Set(teacherNamesByClass.get(c.id) || [])).filter(Boolean);
          teacherText[c.id] = names.length ? names.join(', ') : '—';
        });
        setClassTeacherText(teacherText);
      } catch {
        // Best-effort only; keep UI usable even if some tables aren't ready
        setCenterStats({});
        setClassStudentCounts({});
        setClassScheduleText({});
        setClassSchedulePrefill({});
        setClassTeacherText({});
      }

      // Teachers list (also best-effort) - we show it as a section (not a tab)
      try {
        await refreshTeachers();
      } catch {
        // ignore
      }
    } catch (e: any) {
      setLoadError(e?.message || 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const refreshTeachers = async () => {
    setTeachersLoading(true);
    setTeachersError(null);
    try {
      const t = await backend.getTeachers();
      setTeachers(t);

      // Compute stats (classes/students/centers) per teacher (best-effort).
      const statsEntries = await Promise.all(
        t.map(async (teacher) => {
          try {
            const [classIds, studentIds] = await Promise.all([
              backend.getTeacherActiveClassIdsOnly(teacher.id),
              backend.getTeacherStudentIds(teacher.id),
            ]);
            const centerNames = Array.from(
              new Set(
                classIds
                  .map((id) => classes.find((c) => c.id === id)?.center_id)
                  .filter(Boolean)
                  .map((cid) => centerNameByIdMemo.get(cid as string) || String(cid)),
              ),
            ).sort((a, b) => a.localeCompare(b));
            return [
              teacher.id,
              {
                classCount: classIds.length,
                studentCount: studentIds.length,
                centerNames,
              },
            ] as const;
          } catch {
            return [
              teacher.id,
              {
                classCount: 0,
                studentCount: 0,
                centerNames: [],
              },
            ] as const;
          }
        }),
      );
      setTeacherStats(Object.fromEntries(statsEntries));
    } catch (e: any) {
      setTeachersError(e?.message || 'Không tải được danh sách giáo viên');
      setTeachers([]);
      setTeacherStats({});
    } finally {
      setTeachersLoading(false);
    }
  };

  const goTab = (tab: 'centers' | 'classes' | 'teachers') => {
    navigate(`/admin/info?tab=${tab}`);
  };

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
      if ((res as any).center?.id) {
        const created = (res as any).center as Center;
        setCenters((prev) => {
          // avoid duplicates if refresh also adds it
          if (prev.some((c) => c.id === created.id)) return prev;
          return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
        });
      }
      setCenterForm({ name: '', hotline: '', google_map_url: '', address: '', facebook_url: '' });
      // Refresh from server as source of truth (and to ensure RLS/select are OK)
      await refresh();
      setCreateCenterOpen(false);
    } finally {
      setCenterCreating(false);
    }
  };

  const openEditCenter = (c: Center) => {
    setEditCenter(c);
    setEditCenterMsg(null);
    setEditCenterOpen(true);
  };

  const closeEditCenter = () => {
    setEditCenterOpen(false);
    setEditCenter(null);
    setEditCenterMsg(null);
  };

  const saveEditCenter = async () => {
    if (!editCenter) return;
    setEditCenterSaving(true);
    setEditCenterMsg(null);
    try {
      const res = await backend.adminUpdateCenter(editCenter.id, {
        name: editCenter.name.trim(),
        hotline: editCenter.hotline || '',
        google_map_url: editCenter.google_map_url || '',
        address: editCenter.address || '',
        facebook_url: editCenter.facebook_url || '',
      });
      if (!res.success) {
        setEditCenterMsg(`❌ ${res.message}`);
        return;
      }
      const updated = (res as any).center as Center;
      setCenters((prev) => prev.map((x) => (x.id === updated.id ? updated : x)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditCenterMsg('✅ Đã cập nhật trung tâm.');
      // refresh for source of truth
      await refresh();
      closeEditCenter();
    } finally {
      setEditCenterSaving(false);
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
      const warning = (res as any).warning as string | undefined;
      setClassMsg(warning ? `✅ Đã tạo lớp. (${warning})` : '✅ Đã tạo lớp.');
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
      setCreateClassOpen(false);
    } finally {
      setClassCreating(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) =>
      [t.full_name, t.email, t.phone].filter(Boolean).some((x) => String(x).toLowerCase().includes(q)),
    );
  }, [teachers, teacherSearch]);

  const onCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherMsg(null);
    setTeacherCreating(true);
    try {
      const res = await backend.createTeacherAccount({
        email: teacherForm.email.trim(),
        password: teacherForm.password,
        full_name: teacherForm.full_name.trim(),
        phone: teacherForm.phone.trim() || undefined,
      });
      if (!res.success) {
        setTeacherMsg(`❌ ${res.message}`);
        return;
      }
      setTeacherMsg('✅ Đã tạo tài khoản giáo viên. Giáo viên có thể đăng nhập ngay.');
      setTeacherForm({ full_name: '', phone: '', email: '', password: '' });
      await refreshTeachers();
      setCreateTeacherOpen(false);
    } finally {
      setTeacherCreating(false);
    }
  };

  const openAssign = async (t: UserProfile) => {
    setAssignTeacher(t);
    setAssignOpen(true);
    setAssignSearch('');
    setAssignCenterId('');
    try {
      const ids = await backend.getTeacherActiveClassIdsOnly(t.id);
      setAssignClassIds(ids);
    } catch {
      setAssignClassIds([]);
    }
  };
  const closeAssign = () => {
    setAssignOpen(false);
    setAssignTeacher(null);
    setAssignClassIds([]);
    setAssignSearch('');
    setAssignCenterId('');
  };
  const toggleAssignClass = (classId: string) => {
    setAssignClassIds((prev) => (prev.includes(classId) ? prev.filter((x) => x !== classId) : [...prev, classId]));
  };
  const saveAssign = async () => {
    if (!assignTeacher) return;
    setAssignSaving(true);
    try {
      const res = await backend.setTeacherClasses(assignTeacher.id, assignClassIds);
      if (!res.success) {
        alert(res.message || 'Lưu thất bại');
        return;
      }
      await refreshTeachers();
      closeAssign();
    } finally {
      setAssignSaving(false);
    }
  };

  const assignFilteredClasses = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    return classes.filter((cl) => {
      if (assignCenterId && (cl.center_id || '') !== assignCenterId) return false;
      if (!q) return true;
      const centerName = cl.center_id ? centerNameByIdMemo.get(cl.center_id) : '';
      return [cl.name, centerName].filter(Boolean).some((x) => String(x).toLowerCase().includes(q));
    });
  }, [assignCenterId, assignSearch, classes, centerNameByIdMemo]);

  const openEditClass = (cl: DbClass) => {
    setEditClass(cl);
    setEditClassMsg(null);
    const pre = classSchedulePrefill[cl.id];
    setEditClassForm({
      name: cl.name || '',
      center_id: (cl.center_id || '') as string,
      start_date: cl.start_date || '',
      end_date: cl.end_date || '',
      days: pre?.days || [],
      start_time: pre?.start_time || '17:00',
      end_time: pre?.end_time || '19:00',
    });
    setEditClassOpen(true);
  };
  const closeEditClass = () => {
    setEditClassOpen(false);
    setEditClass(null);
    setEditClassMsg(null);
  };
  const saveEditClass = async () => {
    if (!editClass) return;
    setEditClassSaving(true);
    setEditClassMsg(null);
    try {
      const schedule = editClassForm.days.map((d) => ({
        day_of_week: d,
        start_time: editClassForm.start_time,
        end_time: editClassForm.end_time,
      }));
      const res = await backend.adminUpdateClass(editClass.id, {
        name: editClassForm.name.trim(),
        center_id: editClassForm.center_id || null,
        start_date: editClassForm.start_date || null,
        end_date: editClassForm.end_date || null,
        schedule,
      });
      if (!res.success) {
        setEditClassMsg(`❌ ${res.message}`);
        return;
      }
      const warning = (res as any).warning as string | undefined;
      setEditClassMsg(warning ? `✅ Đã cập nhật lớp. (${warning})` : '✅ Đã cập nhật lớp.');
      await refresh();
      closeEditClass();
    } finally {
      setEditClassSaving(false);
    }
  };

  const openEditTeacher = (t: UserProfile) => {
    setEditTeacher(t);
    setEditTeacherMsg(null);
    setEditTeacherForm({ full_name: t.full_name || '', phone: t.phone || '' });
    setEditTeacherOpen(true);
  };
  const closeEditTeacher = () => {
    setEditTeacherOpen(false);
    setEditTeacher(null);
    setEditTeacherMsg(null);
  };
  const saveEditTeacher = async () => {
    if (!editTeacher) return;
    setEditTeacherSaving(true);
    setEditTeacherMsg(null);
    try {
      const res = await backend.adminUpdateTeacherProfile(editTeacher.id, {
        full_name: editTeacherForm.full_name.trim(),
        phone: editTeacherForm.phone.trim() || null,
      });
      if (!res.success) {
        setEditTeacherMsg(`❌ ${res.message}`);
        return;
      }
      await refreshTeachers();
      closeEditTeacher();
    } finally {
      setEditTeacherSaving(false);
    }
  };

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
            onClick={() => goTab('centers')}
            className={`px-5 py-3 rounded-2xl text-xs font-heading font-black uppercase transition ${activeTab === 'centers' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            Trung tâm
          </button>
          <button
            onClick={() => goTab('classes')}
            className={`px-5 py-3 rounded-2xl text-xs font-heading font-black uppercase transition ${activeTab === 'classes' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            Lớp học
          </button>
          <button
            onClick={() => goTab('teachers')}
            className={`px-5 py-3 rounded-2xl text-xs font-heading font-black uppercase transition ${activeTab === 'teachers' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            Giáo viên
          </button>
        </div>

        {activeTab === 'centers' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-heading font-black text-gray-800">Danh sách trung tâm</h2>
                <div className="text-xs text-gray-500 mt-1">Danh sách là thông tin chính. Bấm “Tạo trung tâm” để thêm mới.</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCreateCenterOpen(true)}
                  className="px-4 py-2 rounded-xl bg-ucmas-red text-white text-xs font-heading font-black uppercase hover:bg-ucmas-blue transition"
                >
                  Tạo trung tâm
                </button>
                <button
                  onClick={() => void refresh()}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-heading font-black uppercase"
                >
                  Làm mới
                </button>
              </div>
            </div>

            <input
              value={centerSearch}
              onChange={(e) => setCenterSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 mb-4"
              placeholder="Search tên / địa chỉ / hotline"
            />

            {loading ? (
              <div className="text-gray-500 text-sm">Đang tải...</div>
            ) : loadError ? (
              <div className="text-sm text-red-600">❌ {loadError}</div>
            ) : filteredCenters.length === 0 ? (
              <div className="text-gray-500 text-sm">Chưa có trung tâm.</div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
                {filteredCenters.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-heading font-black text-gray-800">{c.name}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditCenter(c)}
                        className="flex-shrink-0 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-heading font-black uppercase"
                      >
                        Sửa
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2 py-1 rounded-xl bg-white border border-gray-200 text-gray-700">
                        {(centerStats[c.id]?.classCount ?? 0)} lớp
                      </span>
                      <span className="px-2 py-1 rounded-xl bg-white border border-gray-200 text-gray-700">
                        {(centerStats[c.id]?.studentCount ?? 0)} học sinh
                      </span>
                    </div>
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
        )}

        {activeTab === 'classes' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-heading font-black text-gray-800">Danh sách lớp</h2>
                <div className="text-xs text-gray-500 mt-1">Danh sách là thông tin chính. Bấm “Tạo lớp” để thêm mới.</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCreateClassOpen(true)}
                  className="px-4 py-2 rounded-xl bg-ucmas-red text-white text-xs font-heading font-black uppercase hover:bg-ucmas-blue transition"
                >
                  Tạo lớp
                </button>
                <button
                  onClick={() => void refresh()}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-heading font-black uppercase"
                >
                  Làm mới
                </button>
              </div>
            </div>

            <input
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 mb-4"
              placeholder="Search tên lớp / trung tâm"
            />

            {loading ? (
              <div className="text-gray-500 text-sm">Đang tải...</div>
            ) : classes.length === 0 ? (
              <div className="text-gray-500 text-sm">Chưa có lớp.</div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
                {filteredClasses.map((cl) => (
                  <div key={cl.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-heading font-black text-gray-800">{cl.name}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditClass(cl)}
                        className="flex-shrink-0 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-heading font-black uppercase"
                      >
                        Sửa
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Trung tâm: {cl.center_id ? centerNameByIdMemo.get(cl.center_id) || cl.center_id : '—'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Học sinh: {classStudentCounts[cl.id] ?? 0}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Lịch: {classScheduleText[cl.id] || '—'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Giáo viên: {classTeacherText[cl.id] || '—'}
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
        )}

        {activeTab === 'teachers' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-heading font-black text-gray-800">Danh sách giáo viên</h2>
                <div className="text-xs text-gray-500 mt-1">Danh sách là thông tin chính. Bấm “Thêm giáo viên” để tạo mới.</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCreateTeacherOpen(true)}
                  className="px-4 py-2 rounded-xl bg-ucmas-red text-white text-xs font-heading font-black uppercase hover:bg-ucmas-blue transition"
                >
                  Thêm giáo viên
                </button>
                <button
                  onClick={() => void refreshTeachers()}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-heading font-black uppercase"
                >
                  Làm mới
                </button>
              </div>
            </div>

            <input
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 mb-4"
              placeholder="Search tên / email / SĐT"
            />

            {teachersLoading ? (
              <div className="text-gray-500 text-sm">Đang tải...</div>
            ) : teachersError ? (
              <div className="text-sm text-red-600">❌ {teachersError}</div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-gray-500 text-sm">Chưa có giáo viên.</div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
                {filteredTeachers.map((t) => {
                  const st = teacherStats[t.id] || { classCount: 0, studentCount: 0, centerNames: [] };
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-heading font-black text-gray-800 truncate">{t.full_name || 'Giáo viên'}</div>
                        <div className="text-xs text-gray-500 truncate">{t.email}</div>
                        {t.phone && <div className="text-xs text-gray-500">SĐT: {t.phone}</div>}
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          <span className="px-2 py-1 rounded-xl bg-white border border-gray-200 text-gray-700">
                            {st.studentCount} học sinh
                          </span>
                          <span className="px-2 py-1 rounded-xl bg-white border border-gray-200 text-gray-700">
                            {st.classCount} lớp
                          </span>
                          <span className="px-2 py-1 rounded-xl bg-white border border-gray-200 text-gray-700">
                            Trung tâm: {st.centerNames.length ? st.centerNames.join(', ') : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditTeacher(t)}
                          className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-heading font-black uppercase"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => void openAssign(t)}
                          className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-heading font-black uppercase"
                        >
                          Thêm lớp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Center modal */}
        {createCenterOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-heading font-black uppercase text-gray-400">Tạo trung tâm</div>
                  <div className="text-lg font-heading font-black text-gray-800">Thêm trung tâm mới</div>
                </div>
                <button
                  onClick={() => setCreateCenterOpen(false)}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-heading font-black"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
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
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Hotline (không bắt buộc)</label>
                    <input
                      value={centerForm.hotline}
                      onChange={(e) => setCenterForm((p) => ({ ...p, hotline: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">
                      Link Google Map (không bắt buộc)
                    </label>
                    <input
                      value={centerForm.google_map_url}
                      onChange={(e) => setCenterForm((p) => ({ ...p, google_map_url: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                      placeholder="https://maps.google.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Địa chỉ (không bắt buộc)</label>
                    <input
                      value={centerForm.address}
                      onChange={(e) => setCenterForm((p) => ({ ...p, address: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">
                      Link Facebook (không bắt buộc)
                    </label>
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
                  {centerMsg && <div className="text-sm mt-2 p-3 rounded-2xl bg-gray-50 border border-gray-100">{centerMsg}</div>}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Create Class modal */}
        {createClassOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-heading font-black uppercase text-gray-400">Tạo lớp</div>
                  <div className="text-lg font-heading font-black text-gray-800">Thêm lớp mới</div>
                </div>
                <button
                  onClick={() => setCreateClassOpen(false)}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-heading font-black"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
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
                          className={`px-3 py-2 rounded-xl border text-xs font-heading font-black uppercase transition ${classForm.days.includes(d.id)
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
                  {classMsg && <div className="text-sm mt-2 p-3 rounded-2xl bg-gray-50 border border-gray-100">{classMsg}</div>}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Class modal */}
        {editClassOpen && editClass && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-heading font-black uppercase text-gray-400">Sửa lớp</div>
                  <div className="text-lg font-heading font-black text-gray-800">{editClass.name}</div>
                </div>
                <button
                  onClick={closeEditClass}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-heading font-black"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveEditClass();
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Tên lớp</label>
                    <input
                      value={editClassForm.name}
                      onChange={(e) => setEditClassForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Trung tâm</label>
                    <select
                      value={editClassForm.center_id}
                      onChange={(e) => setEditClassForm((p) => ({ ...p, center_id: e.target.value }))}
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
                        value={editClassForm.start_date}
                        onChange={(e) => setEditClassForm((p) => ({ ...p, start_date: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Ngày kết thúc (dự kiến)</label>
                      <input
                        type="date"
                        value={editClassForm.end_date}
                        onChange={(e) => setEditClassForm((p) => ({ ...p, end_date: e.target.value }))}
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
                          onClick={() =>
                            setEditClassForm((p) => ({
                              ...p,
                              days: p.days.includes(d.id) ? p.days.filter((x) => x !== d.id) : [...p.days, d.id].sort((a, b) => a - b),
                            }))
                          }
                          className={`px-3 py-2 rounded-xl border text-xs font-heading font-black uppercase transition ${editClassForm.days.includes(d.id)
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
                          value={editClassForm.start_time}
                          onChange={(e) => setEditClassForm((p) => ({ ...p, start_time: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Giờ kết thúc</label>
                        <input
                          type="time"
                          value={editClassForm.end_time}
                          onChange={(e) => setEditClassForm((p) => ({ ...p, end_time: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                        />
                      </div>
                    </div>
                    {classSchedulePrefill[editClass.id]?.multiTime && (
                      <div className="text-[11px] text-amber-600 mt-2">
                        Lưu ý: Lớp này đang có nhiều khung giờ khác nhau. Khi lưu, hệ thống sẽ áp dụng 1 khung giờ chung cho các thứ đã chọn.
                      </div>
                    )}
                  </div>

                  {editClassMsg && <div className="text-sm mt-2 p-3 rounded-2xl bg-gray-50 border border-gray-100">{editClassMsg}</div>}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeEditClass}
                      className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-heading font-bold"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={editClassSaving || !editClassForm.name.trim()}
                      className="px-5 py-2 rounded-xl bg-ucmas-red text-white font-heading font-black uppercase text-xs tracking-wide hover:bg-ucmas-blue transition disabled:opacity-60"
                    >
                      {editClassSaving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Create Teacher modal */}
        {createTeacherOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-heading font-black uppercase text-gray-400">Thêm giáo viên</div>
                  <div className="text-lg font-heading font-black text-gray-800">Tạo tài khoản giáo viên</div>
                </div>
                <button
                  onClick={() => setCreateTeacherOpen(false)}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-heading font-black"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={onCreateTeacher} className="space-y-3">
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Họ và tên</label>
                    <input
                      value={teacherForm.full_name}
                      onChange={(e) => setTeacherForm((p) => ({ ...p, full_name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Số điện thoại (không bắt buộc)</label>
                    <input
                      value={teacherForm.phone}
                      onChange={(e) => setTeacherForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                      placeholder="09xxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Email</label>
                    <input
                      value={teacherForm.email}
                      onChange={(e) => setTeacherForm((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                      placeholder="teacher@email.com"
                      type="email"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Mật khẩu</label>
                    <input
                      value={teacherForm.password}
                      onChange={(e) => setTeacherForm((p) => ({ ...p, password: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                      placeholder="Mật khẩu đăng nhập"
                      type="password"
                      required
                    />
                    <div className="text-[11px] text-gray-400 mt-1">
                      Không gửi email. Tài khoản sẽ được tạo và đăng nhập được ngay.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={teacherCreating}
                    className="w-full mt-2 px-5 py-3 rounded-2xl bg-ucmas-red text-white font-heading font-black uppercase text-xs tracking-wide hover:bg-ucmas-blue transition disabled:opacity-60"
                  >
                    {teacherCreating ? 'Đang tạo...' : 'Tạo tài khoản giáo viên'}
                  </button>
                  {teacherMsg && <div className="text-sm mt-2 p-3 rounded-2xl bg-gray-50 border border-gray-100">{teacherMsg}</div>}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Teacher modal */}
        {editTeacherOpen && editTeacher && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-heading font-black uppercase text-gray-400">Sửa giáo viên</div>
                  <div className="text-lg font-heading font-black text-gray-800">{editTeacher.full_name || editTeacher.email}</div>
                </div>
                <button
                  onClick={closeEditTeacher}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-heading font-black"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveEditTeacher();
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Họ và tên</label>
                    <input
                      value={editTeacherForm.full_name}
                      onChange={(e) => setEditTeacherForm((p) => ({ ...p, full_name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Số điện thoại</label>
                    <input
                      value={editTeacherForm.phone}
                      onChange={(e) => setEditTeacherForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                    />
                  </div>

                  {editTeacherMsg && (
                    <div className="text-sm mt-2 p-3 rounded-2xl bg-gray-50 border border-gray-100">{editTeacherMsg}</div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeEditTeacher}
                      className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-heading font-bold"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={editTeacherSaving || !editTeacherForm.full_name.trim()}
                      className="px-5 py-2 rounded-xl bg-ucmas-red text-white font-heading font-black uppercase text-xs tracking-wide hover:bg-ucmas-blue transition disabled:opacity-60"
                    >
                      {editTeacherSaving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Assign classes modal */}
        {assignOpen && assignTeacher && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-heading font-black uppercase text-gray-400">Thêm lớp</div>
                  <div className="text-lg font-heading font-black text-gray-800">{assignTeacher.full_name || assignTeacher.email}</div>
                </div>
                <button
                  onClick={closeAssign}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-heading font-black"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    className="sm:col-span-2 w-full px-4 py-3 rounded-2xl border border-gray-200"
                    placeholder="Search lớp theo tên hoặc trung tâm"
                  />
                  <select
                    value={assignCenterId}
                    onChange={(e) => setAssignCenterId(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white"
                  >
                    <option value="">— Tất cả trung tâm —</option>
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {classes.length === 0 ? (
                  <div className="text-sm text-gray-600">
                    Chưa có lớp trong hệ thống (bảng `classes`). Hãy tạo lớp trong tab “Lớp học” hoặc chạy script migrate.
                  </div>
                ) : assignFilteredClasses.length === 0 ? (
                  <div className="text-sm text-gray-600">Không có lớp phù hợp.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[55vh] overflow-auto pr-1">
                    {assignFilteredClasses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleAssignClass(c.id)}
                        className={`text-left p-4 rounded-2xl border transition ${assignIdSet.has(c.id) ? 'border-ucmas-blue bg-ucmas-blue/10' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        <div className="font-heading font-black text-gray-800 truncate">{c.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {c.center_id ? centerNameByIdMemo.get(c.center_id) || c.center_id : '—'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{assignIdSet.has(c.id) ? 'Đã chọn' : 'Chưa chọn'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={closeAssign}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-heading font-bold"
                >
                  Hủy
                </button>
                <button
                  onClick={() => void saveAssign()}
                  disabled={assignSaving || classes.length === 0}
                  className="px-5 py-2 rounded-xl bg-ucmas-red text-white font-heading font-black uppercase text-xs tracking-wide hover:bg-ucmas-blue transition disabled:opacity-60"
                >
                  {assignSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editCenterOpen && editCenter && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-heading font-black uppercase text-gray-400">Sửa trung tâm</div>
                  <div className="text-lg font-heading font-black text-gray-800">{editCenter.name}</div>
                </div>
                <button
                  onClick={closeEditCenter}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-heading font-black"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-3">
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Tên trung tâm</label>
                  <input
                    value={editCenter.name}
                    onChange={(e) => setEditCenter((p) => (p ? { ...p, name: e.target.value } : p))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Hotline</label>
                  <input
                    value={editCenter.hotline || ''}
                    onChange={(e) => setEditCenter((p) => (p ? { ...p, hotline: e.target.value } : p))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Link Google Map</label>
                  <input
                    value={editCenter.google_map_url || ''}
                    onChange={(e) => setEditCenter((p) => (p ? { ...p, google_map_url: e.target.value } : p))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Địa chỉ</label>
                  <input
                    value={editCenter.address || ''}
                    onChange={(e) => setEditCenter((p) => (p ? { ...p, address: e.target.value } : p))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Link Facebook</label>
                  <input
                    value={editCenter.facebook_url || ''}
                    onChange={(e) => setEditCenter((p) => (p ? { ...p, facebook_url: e.target.value } : p))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200"
                  />
                </div>
                {editCenterMsg && (
                  <div className="text-sm mt-2 p-3 rounded-2xl bg-gray-50 border border-gray-100">{editCenterMsg}</div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={closeEditCenter}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-heading font-bold"
                >
                  Hủy
                </button>
                <button
                  onClick={() => void saveEditCenter()}
                  disabled={editCenterSaving || !editCenter.name.trim()}
                  className="px-5 py-2 rounded-xl bg-ucmas-red text-white font-heading font-black uppercase text-xs tracking-wide hover:bg-ucmas-blue transition disabled:opacity-60"
                >
                  {editCenterSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInfoManagerPage;

