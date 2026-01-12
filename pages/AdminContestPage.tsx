
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { Contest, ContestAccessCode, Mode, ContestRegistration } from '../types';

const AdminContestPage: React.FC = () => {
  const navigate = useNavigate();
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'codes' | 'registrations'>('details');
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Contest>>({
      name: '', start_at: '', duration_minutes: 60, lobby_open_minutes: 15,
      enable_nhin_tinh: false, enable_nghe_tinh: false, enable_flash: false, status: 'draft'
  });

  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [codes, setCodes] = useState<ContestAccessCode[]>([]);
  const [registrations, setRegistrations] = useState<ContestRegistration[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadContests(); }, []);

  const loadContests = async () => {
    const list = await backend.getAdminContests();
    setContests(list);
  };

  const handleEdit = (c: Contest) => {
      setSelectedContest(c);
      setFormData({ ...c }); 
      setIsEditing(true);
      setUploadStatus({});
      loadCodes(c.id);
      loadRegistrations(c.id);
  };

  const loadCodes = async (contestId: string) => {
      const list = await backend.getContestCodes(contestId);
      setCodes(list);
  };

  const loadRegistrations = async (contestId: string) => {
      const list = await backend.getContestRegistrations(contestId);
      setRegistrations(list);
  };

  const handleApprove = async (reg: ContestRegistration) => {
      const ok = await backend.approveRegistration(reg);
      if (ok) {
          alert("Kích hoạt thí sinh thành công!");
          loadRegistrations(selectedContest!.id);
      }
  };

  const handleSaveContest = async () => {
      if (!formData.name) {
          alert("Vui lòng nhập tên cuộc thi");
          return;
      }
      
      setIsSaving(true);
      try {
          // Double check the status matches exact constraint values
          const payload = {
              ...formData,
              status: formData.status?.toLowerCase() as 'draft' | 'open' | 'closed'
          };

          const { data, error } = await backend.upsertContest(payload);
          if (error) {
              alert("Lỗi khi lưu: " + error);
          } else {
              alert("Lưu thông tin thành công!");
              setIsEditing(false);
              setSelectedContest(null);
              await loadContests(); 
          }
      } catch (err: any) {
          alert("Đã xảy ra lỗi không mong muốn: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleFileUpload = (mode: Mode, e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedContest || !e.target.files?.[0]) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              const questions = Array.isArray(json) ? json : (json.questions || []);
              const res = await backend.uploadContestExam(selectedContest.id, mode, questions);
              setUploadStatus(prev => ({ ...prev, [mode]: res.success ? '✅ Thành công!' : '❌ Lỗi!' }));
          } catch (err) { setUploadStatus(prev => ({ ...prev, [mode]: '❌ Lỗi JSON!' })); }
      };
      reader.readAsText(e.target.files[0]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-800 font-bold flex items-center gap-2 transition">
                    <span className="text-lg">←</span> Quay lại Dashboard
                </button>
                <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight">QUẢN LÝ CUỘC THI</h1>
                <button 
                    onClick={() => { 
                        setSelectedContest(null); 
                        setFormData({
                            name: '', start_at: '', duration_minutes: 60, lobby_open_minutes: 15,
                            enable_nhin_tinh: false, enable_nghe_tinh: false, enable_flash: false, status: 'draft'
                        });
                        setIsEditing(true); 
                        setActiveTab('details');
                    }}
                    className="bg-ucmas-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition active:scale-95"
                >
                    + Tạo Cuộc Thi Mới
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-sm p-4 h-[85vh] overflow-y-auto border border-gray-100">
                    <h3 className="font-bold text-gray-400 mb-4 px-2 uppercase text-[10px] tracking-widest">Danh sách cuộc thi</h3>
                    <div className="space-y-3">
                        {contests.map(c => (
                            <div key={c.id} onClick={() => handleEdit(c)} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${selectedContest?.id === c.id ? 'border-ucmas-blue bg-blue-50 shadow-md transform scale-[1.02]' : 'border-gray-50 hover:border-gray-200 bg-white'}`}>
                                <div className="font-bold text-gray-800 text-lg leading-tight mb-1">{c.name}</div>
                                <div className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                                    <span>📅</span> {c.start_at ? new Date(c.start_at).toLocaleString('vi-VN') : 'Chưa đặt ngày'}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${c.status === 'open' ? 'bg-green-100 text-green-700' : c.status === 'closed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {c.status === 'open' ? 'Đang mở' : c.status === 'closed' ? 'Kết thúc' : 'Bản nháp'}
                                    </span>
                                    <span className="text-xs font-bold text-ucmas-blue bg-blue-50 px-2 py-1 rounded-lg">{c.duration_minutes} phút</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm h-[85vh] flex flex-col border border-gray-100 overflow-hidden">
                    {isEditing ? (
                        <>
                            <div className="flex items-center border-b bg-gray-50 px-4">
                                <button onClick={() => setActiveTab('details')} className={`px-6 py-4 font-bold text-sm transition-all relative ${activeTab === 'details' ? 'text-ucmas-blue' : 'text-gray-400 hover:text-gray-600'}`}>
                                    Thông tin chung
                                    {activeTab === 'details' && <div className="absolute bottom-0 left-0 w-full h-1 bg-ucmas-blue rounded-t-full"></div>}
                                </button>
                                <button 
                                    onClick={() => { if(selectedContest) setActiveTab('codes') }} 
                                    disabled={!selectedContest}
                                    className={`px-6 py-4 font-bold text-sm transition-all relative ${!selectedContest ? 'opacity-30 cursor-not-allowed' : activeTab === 'codes' ? 'text-ucmas-blue' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Mã tham gia
                                    {activeTab === 'codes' && <div className="absolute bottom-0 left-0 w-full h-1 bg-ucmas-blue rounded-t-full"></div>}
                                </button>
                                <button 
                                    onClick={() => { if(selectedContest) setActiveTab('registrations') }}
                                    disabled={!selectedContest}
                                    className={`px-6 py-4 font-bold text-sm transition-all relative ${!selectedContest ? 'opacity-30 cursor-not-allowed' : activeTab === 'registrations' ? 'text-ucmas-blue' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Thí sinh đăng ký
                                    {activeTab === 'registrations' && <div className="absolute bottom-0 left-0 w-full h-1 bg-ucmas-blue rounded-t-full"></div>}
                                </button>
                            </div>

                            <div className="p-8 flex-grow overflow-y-auto bg-white">
                                {activeTab === 'details' && (
                                    <div className="max-w-3xl space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tên cuộc thi</label>
                                                <input 
                                                    className="w-full border-2 border-gray-100 p-3.5 rounded-2xl outline-none focus:border-ucmas-blue transition-colors bg-gray-50 focus:bg-white font-medium" 
                                                    placeholder="Nhập tên cuộc thi..."
                                                    value={formData.name} 
                                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Trạng thái kích hoạt</label>
                                                <select 
                                                    className="w-full border-2 border-gray-100 p-3.5 rounded-2xl outline-none focus:border-ucmas-blue transition-colors bg-gray-50 focus:bg-white font-bold text-gray-700" 
                                                    value={formData.status} 
                                                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                                                >
                                                    <option value="draft">📁 Bản nháp (Ẩn)</option>
                                                    <option value="open">🟢 Đang mở (Hiện)</option>
                                                    <option value="closed">🔴 Kết thúc (Hiện)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Thời gian bắt đầu</label>
                                                <input 
                                                    type="datetime-local" 
                                                    className="w-full border-2 border-gray-100 p-3.5 rounded-2xl outline-none focus:border-ucmas-blue transition-colors bg-gray-50 focus:bg-white font-mono" 
                                                    value={formData.start_at ? new Date(formData.start_at).toISOString().slice(0, 16) : ''} 
                                                    onChange={e => setFormData({...formData, start_at: new Date(e.target.value).toISOString()})} 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Thời gian làm bài (phút)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full border-2 border-gray-100 p-3.5 rounded-2xl outline-none focus:border-ucmas-blue transition-colors bg-gray-50 focus:bg-white font-bold" 
                                                    value={formData.duration_minutes} 
                                                    onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} 
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-6">
                                            <h4 className="font-black text-gray-700 uppercase text-xs tracking-widest border-b border-gray-200 pb-3 flex items-center gap-2">
                                                📄 Đề thi chi tiết cho các phần
                                            </h4>
                                            
                                            <div className="space-y-4">
                                                {[
                                                    { m: Mode.VISUAL, label: 'Nhìn Tính', icon: '👁️', color: 'text-ucmas-blue' },
                                                    { m: Mode.LISTENING, label: 'Nghe Tính', icon: '🎧', color: 'text-ucmas-red' },
                                                    { m: Mode.FLASH, label: 'Flash', icon: '⚡', color: 'text-ucmas-green' }
                                                ].map(item => (
                                                    <div key={item.m} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl">{item.icon}</span>
                                                            <span className={`font-bold ${item.color}`}>{item.label}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {uploadStatus[item.m] && (
                                                                <span className="text-[10px] font-black text-ucmas-green uppercase">{uploadStatus[item.m]}</span>
                                                            )}
                                                            <input type="file" className="hidden" id={`upload-${item.m}`} onChange={e => handleFileUpload(item.m, e)} accept=".json" />
                                                            <label htmlFor={`upload-${item.m}`} className="bg-ucmas-blue hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-[10px] font-black cursor-pointer transition shadow-md uppercase tracking-wider">
                                                                Tải JSON
                                                            </label>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <button 
                                                onClick={handleSaveContest} 
                                                disabled={isSaving}
                                                className={`w-full ${isSaving ? 'bg-gray-400' : 'bg-gray-800 hover:bg-black'} text-white py-4 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98]`}
                                            >
                                                {isSaving ? '⏳ ĐANG LƯU...' : '💾 Lưu thay đổi'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'codes' && selectedContest && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-green-50 p-6 rounded-2xl border border-green-100">
                                            <div>
                                                <h4 className="font-bold text-green-800">Quản lý mã tham gia</h4>
                                                <p className="text-xs text-green-600 mt-1">Tạo mã để thí sinh có thể vào phòng thi trực tiếp</p>
                                            </div>
                                            <button 
                                                onClick={() => backend.generateContestCodes(selectedContest!.id, 'shared', 5).then(() => loadCodes(selectedContest!.id))} 
                                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-md transition"
                                            >
                                                + Tạo 5 mã ngẫu nhiên
                                            </button>
                                        </div>
                                        
                                        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                                                    <tr>
                                                        <th className="p-5">Mã Code</th>
                                                        <th className="p-5">Lượt sử dụng</th>
                                                        <th className="p-5">Trạng thái</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {codes.map(c => (
                                                        <tr key={c.id} className="hover:bg-gray-50 transition">
                                                            <td className="p-5 font-mono font-black text-ucmas-blue text-lg">{c.code}</td>
                                                            <td className="p-5">
                                                                <span className="bg-gray-100 px-3 py-1 rounded-full font-bold text-xs">{c.uses_count}/{c.max_uses}</span>
                                                            </td>
                                                            <td className="p-5">
                                                                <span className={`px-2 py-1 rounded-lg font-black uppercase text-[10px] ${c.status === 'active' ? 'text-green-600' : 'text-red-400'}`}>
                                                                    {c.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'registrations' && selectedContest && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-black text-gray-800 uppercase text-sm tracking-widest">Duyệt thí sinh tự do đăng ký ({registrations.length})</h4>
                                        </div>
                                        
                                        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                                                    <tr>
                                                        <th className="p-5">Họ tên</th>
                                                        <th className="p-5">Email</th>
                                                        <th className="p-5 text-center">Hành động</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {registrations.map(r => (
                                                        <tr key={r.id} className="hover:bg-gray-50 transition">
                                                            <td className="p-5 font-bold text-gray-800">{r.full_name}</td>
                                                            <td className="p-5 text-gray-500 font-mono text-xs">{r.email}</td>
                                                            <td className="p-5 text-center">
                                                                {r.is_approved ? (
                                                                    <span className="bg-green-50 text-green-600 px-4 py-1.5 rounded-full font-black text-[10px] uppercase">✓ Đã kích hoạt</span>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => handleApprove(r)} 
                                                                        className="bg-ucmas-blue hover:bg-blue-800 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase shadow-md transition active:scale-95"
                                                                    >
                                                                        Kích hoạt ngay
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300 p-10 text-center">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner animate-bounce">🏆</div>
                            <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest">Contest Control Center</h2>
                            <p className="mt-2 text-sm max-w-xs text-gray-400">Vui lòng chọn một cuộc thi từ danh sách bên trái để bắt đầu quản lý đề thi và thí sinh.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default AdminContestPage;
