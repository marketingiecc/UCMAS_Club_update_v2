import React, { useEffect, useState } from 'react';
import { backend } from '../services/mockBackend';
import { UserProfile, AttemptResult, Question } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { LEVEL_SYMBOLS_ORDER, DIFFICULTIES } from '../config/levelsAndDifficulty';

const MODES = [
  { id: 'visual', label: 'Nhìn tính' },
  { id: 'audio', label: 'Nghe tính' },
  { id: 'flash', label: 'Flash' },
] as const;

/** Bài luyện tập trong lộ trình (1 bài = 1 ngày, 1 chế độ, có thể kèm JSON) */
export interface TrackExerciseEntry {
  id: string;
  level_symbol: string;
  day_no: number;
  mode: 'visual' | 'audio' | 'flash';
  question_count: number;
  difficulty: string;
  digits: number;
  rows: number;
  speed_seconds: number;
  source: 'generated' | 'json_upload';
  questions?: Question[];
  created_at: string;
}

const SAMPLE_QUESTIONS_JSON: Question[] = [
  { id: 'q-1', operands: [12, -5, 8], correctAnswer: 15 },
  { id: 'q-2', operands: [7, 3, -2], correctAnswer: 8 },
  { id: 'q-3', operands: [20, -10, 5], correctAnswer: 15 },
];

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

  // Thiết kế lộ trình: danh sách bài đã tạo (localStorage key có thể dùng sau)
  const [trackExercises, setTrackExercises] = useState<TrackExerciseEntry[]>(() => {
    try {
      const raw = localStorage.getItem('ucmas_track_exercises');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPresetLevel, setModalPresetLevel] = useState<string | null>(null);
  /** Khi set: hiển thị danh sách 120 ngày để thiết lập cho cấp này */
  const [selectedLevelForDays, setSelectedLevelForDays] = useState<string | null>(null);
  const [trackForm, setTrackForm] = useState({
    level_symbol: 'A',
    day_no: 1,
    mode: 'visual' as 'visual' | 'audio' | 'flash',
    question_count: 20,
    difficulty: 'basic',
    digits: 2,
    rows: 5,
    speed_seconds: 1.2,
    jsonFile: null as File | null,
    questionsFromJson: null as Question[] | null,
  });

  const saveTrackExercises = (list: TrackExerciseEntry[]) => {
    setTrackExercises(list);
    localStorage.setItem('ucmas_track_exercises', JSON.stringify(list));
  };

  const openCreateModal = (levelSymbol: string, dayNo?: number) => {
    setModalPresetLevel(levelSymbol);
    const day = dayNo ?? 1;
    const existing = trackExercises.find(e => e.level_symbol === levelSymbol && e.day_no === day);
    setTrackForm({
      level_symbol: levelSymbol,
      day_no: day,
      mode: (existing?.mode as 'visual' | 'audio' | 'flash') ?? 'visual',
      question_count: existing?.question_count ?? 20,
      difficulty: existing?.difficulty ?? 'basic',
      digits: existing?.digits ?? 2,
      rows: existing?.rows ?? 5,
      speed_seconds: existing?.speed_seconds ?? 1.2,
      jsonFile: null,
      questionsFromJson: existing?.questions ?? null,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalPresetLevel(null);
  };

  const handleTrackFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const questions = trackForm.questionsFromJson && trackForm.questionsFromJson.length > 0
      ? trackForm.questionsFromJson
      : undefined;
    const entry: TrackExerciseEntry = {
      id: `te-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      level_symbol: trackForm.level_symbol,
      day_no: trackForm.day_no,
      mode: trackForm.mode,
      question_count: trackForm.question_count,
      difficulty: trackForm.difficulty,
      digits: trackForm.digits,
      rows: trackForm.rows,
      speed_seconds: trackForm.speed_seconds,
      source: questions ? 'json_upload' : 'generated',
      questions,
      created_at: new Date().toISOString(),
    };
    const rest = trackExercises.filter(
      e => !(e.level_symbol === trackForm.level_symbol && e.day_no === trackForm.day_no)
    );
    saveTrackExercises([...rest, entry]);
    closeModal();
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
        if (arr.length && typeof arr[0]?.operands !== 'undefined' && typeof arr[0]?.correctAnswer !== 'undefined') {
          setTrackForm(f => ({ ...f, questionsFromJson: arr as Question[], jsonFile: file }));
        } else {
          alert('File JSON không đúng định dạng. Cần mảng các object có operands và correctAnswer.');
        }
      } catch (err) {
        alert('Không đọc được file JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadSampleJson = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_QUESTIONS_JSON, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bai-luyen-tap-mau.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  useEffect(() => {
    loadData();
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
            <button onClick={() => navigate('/admin/practice')} className="w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition border border-blue-200 bg-blue-50 text-ucmas-blue hover:bg-blue-100 shadow-sm flex items-center justify-between">
                <span>Quản lý Luyện Thi</span>
                <span>📚</span>
            </button>
            <button onClick={() => navigate('/admin/training')} className="w-full text-left px-5 py-4 rounded-2xl font-heading font-black text-xs uppercase transition border border-red-200 bg-red-50 text-ucmas-red hover:bg-red-100 shadow-sm flex items-center justify-between">
                <span>Quản lý Luyện Tập</span>
                <span>🛠️</span>
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
                {reportData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        {[{ label: 'Học sinh mới', val: reportData.new_users, bg: 'bg-blue-50', text: 'text-ucmas-blue' }, { label: 'Đã kích hoạt', val: reportData.new_licenses, bg: 'bg-green-50', text: 'text-green-600' }, { label: 'Đang luyện tập', val: reportData.active_students, bg: 'bg-orange-50', text: 'text-orange-600' }, { label: 'Tổng lượt thi', val: reportData.total_attempts, bg: 'bg-purple-50', text: 'text-purple-600' }].map((card, i) => (
                            <div key={i} className={`${card.bg} p-8 rounded-[2.5rem] border border-gray-100 shadow-sm`}>
                                <div className={`${card.text} text-[10px] font-heading font-black uppercase mb-2 tracking-widest`}>{card.label}</div>
                                <div className="text-4xl font-heading font-black text-gray-800">{card.val}</div>
                            </div>
                        ))}
                    </div>
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
                {selectedLevelForDays == null ? (
                    <>
                        <h3 className="text-2xl font-heading font-black text-gray-800 uppercase tracking-tight mb-2 px-2">Thiết kế lộ trình luyện tập</h3>
                        <p className="text-gray-500 text-sm mb-8 px-2">Chọn cấp độ và bấm Thiết lập để cấu hình bài luyện tập cho từng ngày (1–120). Bài từ file JSON sẽ giao đúng đề cho học sinh.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 px-2">
                            {LEVEL_SYMBOLS_ORDER.map((symbol) => {
                                const count = trackExercises.filter(e => e.level_symbol === symbol).length;
                                return (
                                    <div key={symbol} className="bg-gray-50 rounded-2xl border-2 border-gray-100 p-6 flex flex-col items-center justify-center min-h-[140px] hover:border-ucmas-blue/30 transition-colors">
                                        <div className="text-2xl font-heading font-black text-ucmas-blue mb-2">Cấp {symbol}</div>
                                        {count > 0 && <div className="text-xs text-gray-500 mb-3">{count} ngày đã thiết lập</div>}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedLevelForDays(symbol)}
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
                        <h3 className="text-2xl font-heading font-black text-gray-800 uppercase tracking-tight mb-2 px-2">Cấp {selectedLevelForDays} — 120 ngày</h3>
                        <p className="text-gray-500 text-sm mb-6 px-2">Bấm vào từng ngày để thiết lập bài luyện tập. Ngày đã thiết lập hiển thị tích xanh và tóm tắt.</p>
                        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2 px-2">
                            {Array.from({ length: 120 }, (_, i) => i + 1).map((day) => {
                                const ex = trackExercises.find(e => e.level_symbol === selectedLevelForDays && e.day_no === day);
                                const modeLabel = ex ? (MODES.find(m => m.id === ex.mode)?.label ?? ex.mode) : '';
                                const diffLabel = ex ? (DIFFICULTIES.find(d => d.id === ex.difficulty)?.label ?? ex.difficulty) : '';
                                const summary = ex ? `${modeLabel}, ${ex.question_count} câu, ${diffLabel}` : '';
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => openCreateModal(selectedLevelForDays, day)}
                                        className={`rounded-xl border-2 p-3 text-left min-h-[72px] flex flex-col justify-center transition ${
                                            ex
                                                ? 'border-ucmas-green bg-green-50/80 hover:bg-green-50'
                                                : 'border-gray-200 bg-gray-50 hover:border-ucmas-blue hover:bg-ucmas-blue/5'
                                        }`}
                                    >
                                        <span className="flex items-center gap-1.5 font-heading font-bold text-gray-800">
                                            {ex && <span className="text-ucmas-green text-lg" title="Đã thiết lập">✓</span>}
                                            Ngày {day}
                                        </span>
                                        {summary && <span className="text-[10px] text-gray-600 mt-0.5 truncate" title={summary}>{summary}</span>}
                                    </button>
                                );
                            })}
                        </div>
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
                        <h3 className="text-xl font-heading font-black text-gray-800 uppercase tracking-tight">Thiết lập ngày {trackForm.day_no} — Cấp {trackForm.level_symbol}</h3>
                        <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                    </div>
                    <form onSubmit={handleTrackFormSubmit} className="p-8 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Cấp độ</label>
                                <select
                                    value={trackForm.level_symbol}
                                    onChange={e => setTrackForm(f => ({ ...f, level_symbol: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue"
                                >
                                    {LEVEL_SYMBOLS_ORDER.map(s => <option key={s} value={s}>Cấp {s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Ngày (1–120)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={120}
                                    value={trackForm.day_no}
                                    onChange={e => setTrackForm(f => ({ ...f, day_no: Math.max(1, Math.min(120, Number(e.target.value) || 1)) }))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Chế độ</label>
                            <select
                                value={trackForm.mode}
                                onChange={e => setTrackForm(f => ({ ...f, mode: e.target.value as 'visual' | 'audio' | 'flash' }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue"
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
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Độ khó</label>
                                <select
                                    value={trackForm.difficulty}
                                    onChange={e => setTrackForm(f => ({ ...f, difficulty: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue"
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
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue"
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
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue"
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
                                    max={5}
                                    step={0.1}
                                    value={trackForm.speed_seconds}
                                    onChange={e => setTrackForm(f => ({ ...f, speed_seconds: Math.max(0.1, Math.min(5, Number(e.target.value) || 0.1)) }))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue"
                                />
                            </div>
                        )}
                        <div className="border-t border-gray-100 pt-5 space-y-3">
                            <div>
                                <label className="block text-xs font-heading font-black text-gray-500 uppercase mb-1.5">Upload file JSON (tùy chọn)</label>
                                <p className="text-xs text-gray-500 mb-2">Nếu upload, học sinh sẽ làm đúng đề từ file này.</p>
                                <input
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={handleJsonUpload}
                                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-ucmas-blue file:text-white file:font-black file:text-xs"
                                />
                                {trackForm.questionsFromJson && (
                                    <p className="mt-2 text-xs text-ucmas-green font-medium">Đã tải {trackForm.questionsFromJson.length} câu từ file.</p>
                                )}
                            </div>
                            <div>
                                <button type="button" onClick={downloadSampleJson} className="text-ucmas-blue text-sm font-heading font-bold hover:underline">
                                    📥 Tải file JSON mẫu
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={closeModal} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-heading font-black rounded-xl uppercase text-sm hover:bg-gray-50">
                                Hủy
                            </button>
                            <button type="submit" className="flex-1 py-3 bg-ucmas-blue text-white font-heading font-black rounded-xl uppercase text-sm hover:bg-blue-700 shadow-lg">
                                Lưu bài luyện tập
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
