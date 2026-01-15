
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
      name: '', 
      start_at: '', 
      duration_minutes: 60, 
      lobby_open_minutes: 15,
      enable_nhin_tinh: false, 
      enable_nghe_tinh: false, 
      enable_flash: false, 
      status: 'draft' as any
  });

  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [examNames, setExamNames] = useState<Record<string, string>>({}); // Lưu tên đề thi hiện tại của từng mode
  
  const [codes, setCodes] = useState<ContestAccessCode[]>([]);
  const [registrations, setRegistrations] = useState<ContestRegistration[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [codeQuantity, setCodeQuantity] = useState<number>(10);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

  useEffect(() => { loadContests(); }, []);

  const loadContests = async () => {
    try {
      const list = await backend.getAdminContests();
      setContests(list);
    } catch (e) {
      console.error("Failed to load contests", e);
    }
  };

  const loadExistingExams = async (contestId: string) => {
      const names: Record<string, string> = {};
      const modes = [Mode.VISUAL, Mode.LISTENING, Mode.FLASH];
      
      // Kiểm tra song song cho nhanh
      await Promise.all(modes.map(async (m) => {
          try {
              const exam = await backend.getContestExam(contestId, m);
              if (exam) {
                  names[m] = exam.exam_name || 'Đề thi đã tải lên';
              }
          } catch (e) {
              // Ignore error if exam not found
          }
      }));
      setExamNames(names);
  };

  const handleEdit = (c: Contest) => {
      setSelectedContest(c);
      setFormData({ 
          ...c, 
          status: String(c.status || 'draft').toLowerCase().trim() as any 
      }); 
      setIsEditing(true);
      setUploadStatus({});
      setExamNames({}); // Reset trước khi load mới
      loadCodes(c.id);
      loadRegistrations(c.id);
      loadExistingExams(c.id); // Load tên đề thi đã có
  };

  const loadCodes = async (contestId: string) => {
      const list = await backend.getContestCodes(contestId);
      setCodes(list);
  };

  const loadRegistrations = async (contestId: string) => {
      const list = await backend.getContestRegistrations(contestId);
      setRegistrations(list);
  };

  const handleGenerateCodes = async () => {
      if (!selectedContest) return;
      if (codeQuantity <= 0 || codeQuantity > 500) {
          alert("Số lượng mã phải từ 1 đến 500");
          return;
      }

      setIsGeneratingCodes(true);
      try {
          await backend.generateContestCodes(selectedContest.id, 'shared', codeQuantity);
          await loadCodes(selectedContest.id);
          alert(`Đã tạo thành công ${codeQuantity} mã tham gia!`);
      } catch (err) {
          alert("Lỗi khi tạo mã");
      } finally {
          setIsGeneratingCodes(false);
      }
  };

  const handleApprove = async (reg: ContestRegistration) => {
      const ok = await backend.approveRegistration(reg);
      if (ok) {
          alert("Kích hoạt thí sinh thành công!");
          loadRegistrations(selectedContest!.id);
      }
  };

  const handleSaveContest = async () => {
      if (!formData.name || formData.name.trim() === '') {
          alert("Vui lòng nhập tên cuộc thi");
          return;
      }
      
      setIsSaving(true);
      try {
          let finalStatus = String(formData.status || 'draft').toLowerCase().trim();
          if (finalStatus === 'open') finalStatus = 'published';
          if (finalStatus === 'closed') finalStatus = 'archived';

          const validStatuses = ['draft', 'published', 'archived'];
          if (!validStatuses.includes(finalStatus)) {
              finalStatus = 'draft';
          }

          const payload = {
              ...formData,
              name: formData.name.trim(),
              status: finalStatus as any
          };

          const { data, error } = await backend.upsertContest(payload);
          
          if (error) {
              console.error("Supabase Save Error Details:", error);
              alert("Lỗi cơ sở dữ liệu: " + error);
          } else {
              alert("Lưu thông tin thành công!");
              setIsEditing(false);
              setSelectedContest(null);
              await loadContests(); 
          }
      } catch (err: any) {
          alert("Lỗi hệ thống: " + err.message);
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
              // Hỗ trợ cả format mảng trực tiếp hoặc object có key questions
              let questions = [];
              let config: any = {};
              
              if (Array.isArray(json)) {
                  questions = json;
                  // Defaults for array format if needed
                  if (mode === Mode.FLASH) config.display_speed = 1.0;
                  if (mode === Mode.LISTENING) config.read_speed = 2.0;
              } else {
                  questions = json.questions || [];
                  config = json.config || {};
                  
                  // Map root properties to config if they exist
                  if (json.name) config.name = json.name;
                  
                  // Support direct keys from JSON root or legacy config
                  if (json.display_speed) config.display_speed = json.display_speed;
                  if (json.read_speed) config.read_speed = json.read_speed;
                  
                  // Legacy support for 'speed' field
                  if (json.speed) {
                      if (mode === Mode.FLASH && !config.display_speed) config.display_speed = json.speed;
                      if (mode === Mode.LISTENING && !config.read_speed) config.read_speed = json.speed;
                  }
              }

              // Set defaults if still missing
              if (mode === Mode.FLASH && !config.display_speed) config.display_speed = 1.0;
              if (mode === Mode.LISTENING && !config.read_speed) config.read_speed = 2.0;
              
              const examName = config.name || (Array.isArray(json) ? `Đề ${mode} (Mảng)` : 'Đề thi không tên');
              config.name = examName;

              const res = await backend.uploadContestExam(selectedContest.id, mode, questions, config);
              
              if (res.success) {
                  setUploadStatus(prev => ({ ...prev, [mode]: '✅ Đã cập nhật!' }));
                  // Cập nhật ngay tên đề thi trên UI
                  setExamNames(prev => ({ ...prev, [mode]: examName }));
              } else {
                  setUploadStatus(prev => ({ ...prev, [mode]: '❌ Lỗi lưu!' }));
              }
          } catch (err) { setUploadStatus(prev => ({ ...prev, [mode]: '❌ Lỗi JSON!' })); }
      };
      reader.readAsText(e.target.files[0]);
  };

  const downloadSampleJson = (mode: Mode) => {
      const isFlash = mode === Mode.FLASH;
      const isListening = mode === Mode.LISTENING;
      
      const config: any = {};
      if (isFlash) {
          config.display_speed = 1.0;
          config.description = "Tốc độ hiển thị (giây/số)";
      } else if (isListening) {
          config.read_speed = 2.0;
          config.description = "Tốc độ đọc (giây/số)";
      }
      
      const sample: any = {
          "name": `Đề mẫu ${mode === Mode.VISUAL ? 'Nhìn Tính' : mode === Mode.LISTENING ? 'Nghe Tính' : 'Flash'}`,
          "questions": [
            { "id": "q1", "operands": [2, 5, -1], "correctAnswer": 6 },
            { "id": "q2", "operands": [10, 20], "correctAnswer": 30 }
          ]
      };

      // Add speed fields to root or config based on preference
      if (Object.keys(config).length > 0) {
          sample.config = config;
      }
      
      const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mau_de_thi_${mode}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
                            enable_nhin_tinh: false, enable_nghe_tinh: false, enable_flash: false, status: 'draft' as any
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
                    <h3 className="font-bold text-gray-400 mb-4 px-2 uppercase text-[10px] tracking-widest text-center">Danh sách cuộc thi</h3>
                    <div className="space-y-3">
                        {contests.map(c => {
                            const currentStatus = String(c.status || 'draft').toLowerCase().trim();
                            return (
                                <div key={c.id} onClick={() => handleEdit(c)} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${selectedContest?.id === c.id ? 'border-ucmas-blue bg-blue-50 shadow-md transform scale-[1.02]' : 'border-gray-50 hover:border-gray-200 bg-white'}`}>
                                    <div className="font-bold text-gray-800 text-lg leading-tight mb-1">{c.name}</div>
                                    <div className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                                        <span>📅</span> {c.start_at ? new Date(c.start_at).toLocaleString('vi-VN') : 'Chưa đặt ngày'}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${currentStatus === 'published' ? 'bg-green-100 text-green-700' : currentStatus === 'archived' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {currentStatus === 'published' ? 'Đang mở' : currentStatus === 'archived' ? 'Kết thúc' : 'Bản nháp'}
                                        </span>
                                        <span className="text-xs font-bold text-ucmas-blue bg-blue-50 px-2 py-1 rounded-lg">{c.duration_minutes} phút</span>
                                    </div>
                                </div>
                            );
                        })}
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
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Trạng thái (Status)</label>
                                                <select 
                                                    className="w-full border-2 border-gray-100 p-3.5 rounded-2xl outline-none focus:border-ucmas-blue transition-colors bg-gray-50 focus:bg-white font-bold text-gray-700" 
                                                    value={String(formData.status || 'draft').toLowerCase().trim()} 
                                                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                                                >
                                                    <option value="draft">📁 Bản nháp (draft)</option>
                                                    <option value="published">🟢 Đang mở (published)</option>
                                                    <option value="archived">🔴 Kết thúc (archived)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Thời gian bắt đầu</label>
                                                <input 
                                                    type="datetime-local" 
                                                    className="w-full border-2 border-gray-100 p-3.5 rounded-2xl outline-none focus:border-ucmas-blue transition-colors bg-gray-50 focus:bg-white font-mono" 
                                                    value={formData.start_at ? new Date(formData.start_at).toISOString().slice(0, 16) : ''} 
                                                    onChange={e => {
                                                        try {
                                                            setFormData({...formData, start_at: new Date(e.target.value).toISOString()});
                                                        } catch (err) {}
                                                    }} 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Thời gian làm bài (phút)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full border-2 border-gray-100 p-3.5 rounded-2xl outline-none focus:border-ucmas-blue transition-colors bg-gray-50 focus:bg-white font-bold" 
                                                    value={formData.duration_minutes} 
                                                    onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 0})} 
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
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xl">{item.icon}</span>
                                                                <span className={`font-bold ${item.color}`}>{item.label}</span>
                                                            </div>
                                                            {/* Hiển thị tên file hiện tại nếu có */}
                                                            {examNames[item.m] && (
                                                                <div className="ml-8 mt-1 text-[10px] text-gray-500 font-medium">
                                                                    📄 {examNames[item.m]}
                                                                </div>
                                                            )}
                                                            {/* Anchor Text tải mẫu */}
                                                            <button 
                                                                onClick={() => downloadSampleJson(item.m)}
                                                                className="ml-8 mt-1 text-[10px] text-gray-400 underline hover:text-gray-600"
                                                            >
                                                                Tải đề mẫu
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {uploadStatus[item.m] && (
                                                                <span className="text-[10px] font-black text-ucmas-green uppercase">{uploadStatus[item.m]}</span>
                                                            )}
                                                            <input type="file" className="hidden" id={`upload-${item.m}`} onChange={e => handleFileUpload(item.m, e)} accept=".json" />
                                                            <label htmlFor={`upload-${item.m}`} className="bg-ucmas-blue hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-[10px] font-black cursor-pointer transition shadow-md uppercase tracking-wider">
                                                                Cập nhật đề thi
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
                                                className={`w-full ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-800 hover:bg-black'} text-white py-4 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98]`}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <span className="animate-spin text-xl">⏳</span>
                                                        ĐANG LƯU...
                                                    </>
                                                ) : '💾 Lưu thay đổi'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'codes' && selectedContest && (
                                    <div className="space-y-6">
                                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-bold text-green-800">Tạo mã tham gia hàng loạt</h4>
                                                <p className="text-xs text-green-600 mt-1">Hệ thống sẽ tạo mã truy cập cho nhiều học sinh cùng lúc</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    max="500" 
                                                    value={codeQuantity}
                                                    onChange={(e) => setCodeQuantity(parseInt(e.target.value) || 1)}
                                                    className="w-20 px-3 py-2 rounded-lg border border-green-200 font-bold text-center"
                                                />
                                                <button 
                                                    onClick={handleGenerateCodes}
                                                    disabled={isGeneratingCodes}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-md transition whitespace-nowrap disabled:opacity-50"
                                                >
                                                    {isGeneratingCodes ? 'Đang tạo...' : '+ Tạo mã'}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="max-h-[400px] overflow-y-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest sticky top-0">
                                                        <tr>
                                                            <th className="p-5">Mã Code</th>
                                                            <th className="p-5">Lượt sử dụng</th>
                                                            <th className="p-5">Trạng thái</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {codes.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={3} className="p-10 text-center text-gray-400 font-bold uppercase text-xs tracking-widest italic">
                                                                    Chưa có mã nào được tạo
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            codes.map(c => (
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
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
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
                                                    {registrations.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={3} className="p-10 text-center text-gray-400 font-bold uppercase text-xs tracking-widest italic">
                                                                Chưa có thí sinh nào đăng ký
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        registrations.map(r => (
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
                                                        ))
                                                    )}
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
