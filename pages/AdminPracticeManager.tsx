
import React, { useState, useEffect } from 'react';
import { practiceService } from '../src/features/practice/services/practiceService';
import { backend } from '../services/mockBackend';
import { Mode, Contest } from '../types';

const AdminPracticeManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'creative' | 'upload'>('creative');
  
  // -- Form State Common --
  const [examName, setExamName] = useState('');
  const [examExpiry, setExamExpiry] = useState(new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]);
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  
  // -- Creative Mode State --
  const [examMode, setExamMode] = useState<Mode>(Mode.VISUAL);
  const [config, setConfig] = useState({
      digits: 1,
      operands: 5,
      speed: 1.0,
      count: 10
  });

  // -- Upload JSON State --
  const [jsonOverrideSpeed, setJsonOverrideSpeed] = useState<number | ''>(''); // Tùy chọn ghi đè tốc độ

  // -- Data State --
  const [contests, setContests] = useState<Contest[]>([]);
  const [examHistory, setExamHistory] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
      loadData();
  }, []);

  const loadData = async () => {
      const cData = await backend.getAdminContests();
      setContests(cData);
      loadHistory();
  };

  const loadHistory = async () => {
      setLoadingHistory(true);
      const hData = await practiceService.getAdminAllExams();
      setExamHistory(hData);
      setLoadingHistory(false);
  };

  // Tạo file mẫu để user tải về
  const downloadSampleJson = (type: 'visual' | 'listening' | 'flash') => {
      let sampleData: any = {};
      let fileName = '';

      if (type === 'visual') {
          fileName = 'mau_nhin_tinh.json';
          sampleData = {
              "name": "Đề Nhìn Tính Mẫu",
              "mode": "nhin_tinh",
              "config": { "digits": 2, "operands": 3 },
              "questions": [
                  { "id": "q1", "operands": [12, 34, -5], "correctAnswer": 41 },
                  { "id": "q2", "operands": [50, 10, 20], "correctAnswer": 80 }
              ]
          };
      } else if (type === 'listening') {
          fileName = 'mau_nghe_tinh.json';
          sampleData = {
              "name": "Đề Nghe Tính Mẫu",
              "mode": "nghe_tinh",
              "config": { "read_speed": 2.0 },
              "questions": [
                  { "id": "q1", "operands": [5, 5, 9], "correctAnswer": 19 },
                  { "id": "q2", "operands": [1, 2, 3], "correctAnswer": 6 }
              ]
          };
      } else {
          fileName = 'mau_flash.json';
          sampleData = {
              "name": "Đề Flash Mẫu",
              "mode": "flash",
              "config": { "display_speed": 1.0 },
              "questions": [
                  { "id": "q1", "operands": [10, 20, 30], "correctAnswer": 60 },
                  { "id": "q2", "operands": [100, 200], "correctAnswer": 300 }
              ]
          };
      }

      const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleCreateCreative = async () => {
      if (!examName) { setStatus('❌ Vui lòng nhập tên đề'); return; }
      setStatus('⏳ Đang tạo...');
      
      const res = await practiceService.adminCreateExam({
          name: examName,
          mode: examMode,
          exam_code: `${config.digits}D${config.operands}R`,
          config: { 
              ...config, 
              flashSpeed: config.speed * 1000,
              contestId: selectedContestId || null 
          },
          expiry_date: new Date(examExpiry).toISOString(),
          questions: [] // Sẽ tự sinh ở client khi user bấm làm bài, hoặc backend sinh. Ở đây ta đang lưu config đề.
          // Note: Logic hiện tại của PracticeSession_exam sẽ tự sinh nếu questions rỗng và có customConfig.
      });
      
      if (res.success) {
          setStatus('✅ Đã tạo & giao đề thành công!');
          setExamName('');
          loadHistory();
      } else setStatus('❌ Lỗi: ' + (res.error?.message || res.error));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!examName) { alert("Vui lòng nhập tên đề thi trước khi chọn file."); e.target.value = ''; return; }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            
            let questions = [];
            let fileConfig: any = {};

            if (Array.isArray(json)) {
                questions = json;
            } else {
                questions = json.questions || [];
                fileConfig = json.config || {};
            }

            // Xử lý Override Tốc độ
            if (jsonOverrideSpeed !== '') {
                const spd = Number(jsonOverrideSpeed);
                fileConfig.speed = spd;
                fileConfig.display_speed = spd; // Flash
                fileConfig.read_speed = spd;    // Listening
                fileConfig.flashSpeed = spd * 1000;
            }

            const res = await practiceService.adminCreateExam({
                name: examName,
                mode: fileConfig.mode || Mode.VISUAL, // Fallback mode
                exam_code: json.code || 'JSON_UPLOAD',
                config: { 
                    ...fileConfig,
                    contestId: selectedContestId || null 
                },
                questions: questions,
                expiry_date: new Date(examExpiry).toISOString()
            });

            if (res.success) {
                setStatus('✅ Upload thành công!');
                setExamName('');
                setJsonOverrideSpeed('');
                e.target.value = '';
                loadHistory();
            } else {
                setStatus('❌ Lỗi lưu đề: ' + res.error);
            }
        } catch (err) { setStatus('❌ Lỗi đọc file JSON'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
        <div className="w-full max-w-[1800px] mx-auto">
            
            {/* --- HEADER --- */}
            <div className="bg-ucmas-blue rounded-[2.5rem] p-8 mb-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
                <div className="relative z-10 mb-6 md:mb-0">
                    <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-4">
                        <span className="text-4xl bg-white/20 w-16 h-16 flex items-center justify-center rounded-2xl shadow-inner">📚</span> 
                        <div>
                            Quản lý Luyện Thi
                            <div className="text-sm font-medium text-blue-200 normal-case mt-1">Tạo đề thi, giao bài tập về nhà và quản lý ngân hàng đề.</div>
                        </div>
                    </h1>
                </div>
                <div className="flex gap-3 relative z-10 bg-blue-900/30 p-2 rounded-2xl">
                    <button onClick={() => { setActiveTab('creative'); setStatus(''); }} className={`px-8 py-4 rounded-xl font-black uppercase text-xs transition-all flex items-center gap-2 ${activeTab === 'creative' ? 'bg-white text-ucmas-blue shadow-lg transform scale-105' : 'text-blue-200 hover:bg-blue-800/50'}`}>
                        ✨ Tạo đề Sáng tạo
                    </button>
                    <button onClick={() => { setActiveTab('upload'); setStatus(''); }} className={`px-8 py-4 rounded-xl font-black uppercase text-xs transition-all flex items-center gap-2 ${activeTab === 'upload' ? 'bg-white text-ucmas-blue shadow-lg transform scale-105' : 'text-blue-200 hover:bg-blue-800/50'}`}>
                        📤 Tải file JSON
                    </button>
                </div>
                {/* Decor */}
                <div className="absolute -right-20 -bottom-40 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                
                {/* --- LEFT COLUMN: CONFIGURATION --- */}
                <div className="col-span-12 lg:col-span-5 space-y-8">
                    
                    {/* SECTION 1: GENERAL INFO */}
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ucmas-red to-ucmas-blue"></div>
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-6 flex items-center gap-2">
                            <span className="bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full text-sm">1</span> Thông tin chung
                        </h3>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Tiêu đề đề thi <span className="text-red-500">*</span></label>
                                <input 
                                    value={examName} 
                                    onChange={e => setExamName(e.target.value)} 
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-ucmas-blue focus:bg-white p-4 rounded-2xl font-bold text-gray-800 outline-none transition placeholder:font-normal" 
                                    placeholder="Vd: Luyện tập Tuần 1 - Phản xạ" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Ngày hết hạn</label>
                                    <input type="date" value={examExpiry} onChange={e => setExamExpiry(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-ucmas-blue focus:bg-white p-4 rounded-2xl font-bold text-gray-800 outline-none transition" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Thuộc cuộc thi</label>
                                    <select 
                                        value={selectedContestId} 
                                        onChange={e => setSelectedContestId(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-ucmas-blue focus:bg-white p-4 rounded-2xl font-bold text-gray-800 outline-none transition appearance-none"
                                    >
                                        <option value="">-- Không --</option>
                                        {contests.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: DETAILED CONFIG */}
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 relative overflow-hidden min-h-[400px]">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ucmas-green to-ucmas-blue"></div>
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-6 flex items-center gap-2">
                            <span className="bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full text-sm">2</span> Cấu hình ({activeTab === 'creative' ? 'Sáng tạo' : 'JSON'})
                        </h3>
                        
                        {activeTab === 'creative' ? (
                            <div className="space-y-8 animate-fade-in">
                                {/* Mode Selector */}
                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Chế độ thi</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[Mode.VISUAL, Mode.LISTENING, Mode.FLASH].map(m => (
                                            <button key={m} onClick={() => setExamMode(m)} className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${examMode === m ? 'border-ucmas-blue bg-blue-50 text-ucmas-blue shadow-md transform scale-105' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                                                <span className="text-2xl">{m === Mode.VISUAL ? '👁️' : m === Mode.LISTENING ? '🎧' : '⚡'}</span>
                                                <span className="text-[10px] font-black uppercase">{m === Mode.VISUAL ? 'Nhìn' : m === Mode.LISTENING ? 'Nghe' : 'Flash'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Digits & Rows */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Số chữ số</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(d => (
                                                <button key={d} onClick={() => setConfig({...config, digits: d})} className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${config.digits === d ? 'bg-ucmas-blue text-white shadow-lg scale-110' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{d}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Số dòng tính</label>
                                        <div className="grid grid-cols-6 gap-2">
                                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(r => (
                                                <button key={r} onClick={() => setConfig({...config, operands: r})} className={`py-3 rounded-xl font-bold text-xs transition-all ${config.operands === r ? 'bg-ucmas-blue text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{r}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Sliders */}
                                <div className="bg-gray-50 p-6 rounded-3xl space-y-6 border border-gray-100">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center"><label className="text-[10px] font-black text-gray-500 uppercase">Số lượng câu</label><span className="text-xs font-bold bg-white px-3 py-1 rounded-lg shadow-sm text-gray-800">{config.count} câu</span></div>
                                        <input type="range" min="5" max="50" value={config.count} onChange={e => setConfig({...config, count: parseInt(e.target.value)})} className="w-full accent-ucmas-blue h-2 bg-gray-200 rounded-full appearance-none cursor-pointer" />
                                    </div>
                                    {(examMode === Mode.LISTENING || examMode === Mode.FLASH) && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center"><label className="text-[10px] font-black text-gray-500 uppercase">Tốc độ (s/số)</label><span className="text-xs font-bold bg-white px-3 py-1 rounded-lg shadow-sm text-ucmas-red">{config.speed}s</span></div>
                                            <input type="range" min="0.2" max="3.0" step="0.1" value={config.speed} onChange={e => setConfig({...config, speed: parseFloat(e.target.value)})} className="w-full accent-ucmas-red h-2 bg-gray-200 rounded-full appearance-none cursor-pointer" />
                                        </div>
                                    )}
                                </div>

                                <button onClick={handleCreateCreative} className="w-full h-16 bg-gradient-to-r from-ucmas-blue to-blue-800 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2">
                                    <span>💾</span> Lưu & Giao Đề
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 text-blue-800 text-xs font-medium leading-relaxed">
                                    💡 <strong>Lưu ý:</strong> Hệ thống sẽ đọc cấu hình từ file JSON. Bạn có thể tải file mẫu bên dưới để xem cấu trúc chuẩn.
                                </div>

                                {/* Sample Buttons */}
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Tải file mẫu</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => downloadSampleJson('visual')} className="flex-1 bg-white border border-gray-200 hover:border-ucmas-blue hover:text-ucmas-blue text-gray-500 px-3 py-3 rounded-xl text-[10px] font-bold uppercase transition shadow-sm">
                                            📥 Mẫu Nhìn
                                        </button>
                                        <button onClick={() => downloadSampleJson('listening')} className="flex-1 bg-white border border-gray-200 hover:border-ucmas-red hover:text-ucmas-red text-gray-500 px-3 py-3 rounded-xl text-[10px] font-bold uppercase transition shadow-sm">
                                            📥 Mẫu Nghe
                                        </button>
                                        <button onClick={() => downloadSampleJson('flash')} className="flex-1 bg-white border border-gray-200 hover:border-ucmas-green hover:text-ucmas-green text-gray-500 px-3 py-3 rounded-xl text-[10px] font-bold uppercase transition shadow-sm">
                                            📥 Mẫu Flash
                                        </button>
                                    </div>
                                </div>

                                {/* Override Speed */}
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Ghi đè tốc độ (Tùy chọn)</label>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            min="0.1"
                                            placeholder="Mặc định theo file" 
                                            value={jsonOverrideSpeed} 
                                            onChange={e => setJsonOverrideSpeed(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            className="flex-1 bg-gray-50 border-2 border-gray-200 focus:border-ucmas-red p-4 rounded-2xl font-bold text-gray-800 outline-none transition placeholder:font-normal" 
                                        />
                                        <div className="text-[10px] text-gray-400 w-1/3 leading-tight">
                                            Chỉ áp dụng cho Flash & Nghe Tính
                                        </div>
                                    </div>
                                </div>

                                {/* Upload Box */}
                                <div className="border-4 border-dashed border-gray-200 hover:border-ucmas-blue hover:bg-blue-50/50 rounded-[2.5rem] p-10 text-center transition-all cursor-pointer relative group flex flex-col items-center bg-gray-50">
                                    <input type="file" accept=".json" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                    <span className="text-5xl mb-4 group-hover:scale-110 transition-transform grayscale group-hover:grayscale-0">📤</span>
                                    <p className="font-black text-gray-700 uppercase tracking-widest mb-1">Chọn file JSON đề thi</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-medium">Click hoặc kéo thả file vào đây</p>
                                </div>
                            </div>
                        )}

                        {status && <div className={`mt-6 p-4 rounded-xl text-center text-xs font-black uppercase tracking-widest border ${status.includes('✅') ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>{status}</div>}
                    </div>
                </div>

                {/* --- RIGHT COLUMN: HISTORY LIST --- */}
                <div className="col-span-12 lg:col-span-7">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 h-full flex flex-col max-h-[1200px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                                <span className="text-2xl">🕒</span> Lịch sử đề đã tạo
                            </h3>
                            <button onClick={loadHistory} className="text-[10px] font-bold text-ucmas-blue hover:bg-blue-50 bg-white border border-blue-100 px-4 py-2 rounded-xl transition uppercase tracking-widest">
                                🔄 Làm mới
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-grow pr-2 space-y-4">
                            {loadingHistory ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ucmas-blue"></div></div>
                            ) : examHistory.length === 0 ? (
                                <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                                    <p className="text-gray-300 font-black uppercase tracking-widest text-sm">Chưa có đề nào</p>
                                </div>
                            ) : (
                                examHistory.map((ex) => (
                                    <div key={ex.id} className="group p-5 rounded-2xl border border-gray-100 hover:border-ucmas-blue hover:shadow-md transition-all bg-white relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-800 text-base">{ex.name || 'Không tên'}</h4>
                                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg border ${ex.mode === 'nhin_tinh' ? 'bg-blue-50 text-ucmas-blue border-blue-100' : ex.mode === 'nghe_tinh' ? 'bg-red-50 text-ucmas-red border-red-100' : 'bg-green-50 text-ucmas-green border-green-100'}`}>
                                                {ex.mode === 'nhin_tinh' ? 'Nhìn Tính' : ex.mode === 'nghe_tinh' ? 'Nghe Tính' : 'Flash'}
                                            </span>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-4 text-[11px] text-gray-500 font-medium mb-3">
                                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md">
                                                <span>📅 Hết hạn:</span> 
                                                <span className="text-gray-800 font-bold">{new Date(ex.expiry_date).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md">
                                                <span>🔢 Code:</span> 
                                                <span className="text-gray-800 font-bold font-mono">{ex.exam_code}</span>
                                            </div>
                                            {ex.config?.contestId && (
                                                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md border border-yellow-100">
                                                    <span>🏆</span> 
                                                    <span className="font-bold">{contests.find(c => c.id === ex.config.contestId)?.name || 'Cuộc thi'}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                                                Cấu hình: <span className="text-gray-600">{ex.config?.digits || '?'} Digits x {ex.config?.operands || '?'} Rows</span>
                                            </div>
                                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest text-right">
                                                Tốc độ: <span className="text-ucmas-red">{ex.config?.speed || ex.config?.display_speed || ex.config?.read_speed || 'N/A'}s</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default AdminPracticeManager;
