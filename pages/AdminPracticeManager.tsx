
import React, { useState, useEffect } from 'react';
import { practiceService } from '../src/features/practice/services/practiceService';
import { backend } from '../services/mockBackend';
import { Mode, Contest } from '../types';
import CustomSlider from '../components/CustomSlider';

const AdminPracticeManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'creative' | 'upload' | 'mixed'>('creative');
  
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
  const [jsonOverrideSpeed, setJsonOverrideSpeed] = useState<number | ''>(''); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // -- Data State --
  const [contests, setContests] = useState<Contest[]>([]);
  const [examHistory, setExamHistory] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
      loadData();
  }, []);

  useEffect(() => {
      setSelectedFile(null);
      setStatus('');
  }, [activeTab]);

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

  const formatError = (err: any) => {
      if (typeof err === 'string') return err;
      if (err?.message) return err.message;
      return JSON.stringify(err);
  };

  const downloadSampleJson = (type: 'visual' | 'listening' | 'flash' | 'mixed') => {
      let sampleData: any = {};
      let fileName = '';

      if (type === 'mixed') {
          fileName = 'mau_de_hon_hop.json';
          sampleData = {
              "name": "Đề Hỗn Hợp Mẫu",
              "questions": [
                  { "id": "q1", "mode": "nhin_tinh", "operands": [12, 34], "correctAnswer": 46 },
                  { "id": "q2", "mode": "nghe_tinh", "operands": [5, 2, 1], "correctAnswer": 8 },
                  { "id": "q3", "mode": "flash", "operands": [10, 20], "correctAnswer": 30 }
              ]
          };
      } else if (type === 'visual') {
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
          questions: [] 
      });
      
      if (res.success) {
          setStatus('✅ Đã tạo & giao đề thành công!');
          setExamName('');
          loadHistory();
      } else setStatus('❌ Lỗi: ' + formatError(res.error));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
        setStatus('');
    }
  };

  const handleSaveFileExam = () => {
    if (!selectedFile) {
        setStatus('❌ Vui lòng chọn file JSON');
        return;
    }
    if (!examName) { 
        alert("Vui lòng nhập tên đề thi."); 
        return; 
    }
    
    setStatus('⏳ Đang xử lý file...');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            
            let questions = [];
            let fileConfig: any = {};
            let mode = Mode.VISUAL;

            if (activeTab === 'mixed') {
                mode = Mode.MIXED;
                questions = json.questions || (Array.isArray(json) ? json : []);
                fileConfig = { contestId: selectedContestId || null };
                if (questions.length > 0 && !questions[0].mode) {
                   setStatus('⚠️ Cảnh báo: File thiếu trường "mode" trong câu hỏi.');
                }
            } else {
                if (Array.isArray(json)) {
                    questions = json;
                } else {
                    questions = json.questions || [];
                    fileConfig = json.config || {};
                }
                mode = fileConfig.mode || Mode.VISUAL;

                if (jsonOverrideSpeed !== '') {
                    const spd = Number(jsonOverrideSpeed);
                    fileConfig.speed = spd;
                    fileConfig.display_speed = spd;
                    fileConfig.read_speed = spd;
                    fileConfig.flashSpeed = spd * 1000;
                }
            }

            // WORKAROUND: If DB Constraint blocks 'hon_hop', we save as 'nhin_tinh' but flag isMixed
            const isMixed = mode === Mode.MIXED;
            const dbMode = isMixed ? Mode.VISUAL : mode;
            const finalConfig = { 
                ...fileConfig,
                contestId: selectedContestId || null,
                isMixed: isMixed
            };

            const res = await practiceService.adminCreateExam({
                name: examName,
                mode: dbMode,
                exam_code: activeTab === 'mixed' ? 'MIXED' : (json.code || 'JSON_UPLOAD'),
                config: finalConfig,
                questions: questions,
                expiry_date: new Date(examExpiry).toISOString()
            });

            if (res.success) {
                setStatus('✅ Lưu thành công!');
                setExamName('');
                setJsonOverrideSpeed('');
                setSelectedFile(null);
                loadHistory();
            } else {
                setStatus('❌ Lỗi hệ thống: ' + formatError(res.error));
            }
        } catch (err) { setStatus('❌ Lỗi cấu trúc file JSON: ' + err); }
    };
    reader.readAsText(selectedFile);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans">
        <div className="w-full max-w-[1800px] mx-auto">
            
            {/* --- HEADER --- */}
            <div className="bg-ucmas-blue rounded-[2rem] p-6 mb-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
                <div className="relative z-10 mb-4 md:mb-0">
                    <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                        <span className="text-3xl bg-white/20 w-12 h-12 flex items-center justify-center rounded-xl shadow-inner">📚</span> 
                        <div>
                            Quản lý Luyện Thi
                            <div className="text-xs font-medium text-blue-200 normal-case mt-0.5">Tạo đề thi, giao bài tập về nhà.</div>
                        </div>
                    </h1>
                </div>
                <div className="flex gap-2 relative z-10 bg-blue-900/30 p-1.5 rounded-xl">
                    <button onClick={() => { setActiveTab('creative'); setStatus(''); }} className={`px-4 py-2.5 rounded-lg font-bold uppercase text-[10px] transition-all flex items-center gap-1.5 ${activeTab === 'creative' ? 'bg-white text-ucmas-blue shadow-md' : 'text-blue-200 hover:bg-blue-800/50'}`}>
                        ✨ Sáng tạo
                    </button>
                    <button onClick={() => { setActiveTab('upload'); setStatus(''); }} className={`px-4 py-2.5 rounded-lg font-bold uppercase text-[10px] transition-all flex items-center gap-1.5 ${activeTab === 'upload' ? 'bg-white text-ucmas-blue shadow-md' : 'text-blue-200 hover:bg-blue-800/50'}`}>
                        📤 Upload JSON
                    </button>
                     <button onClick={() => { setActiveTab('mixed'); setStatus(''); }} className={`px-4 py-2.5 rounded-lg font-bold uppercase text-[10px] transition-all flex items-center gap-1.5 ${activeTab === 'mixed' ? 'bg-white text-ucmas-blue shadow-md' : 'text-blue-200 hover:bg-blue-800/50'}`}>
                        🧬 Hỗn hợp
                    </button>
                </div>
                {/* Decor */}
                <div className="absolute -right-20 -bottom-40 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                
                {/* --- LEFT COLUMN: CONFIGURATION --- */}
                <div className="col-span-12 lg:col-span-5 space-y-5">
                    
                    {/* SECTION 1: GENERAL INFO */}
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ucmas-red to-ucmas-blue"></div>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="bg-gray-100 w-5 h-5 flex items-center justify-center rounded-full text-[10px] text-gray-600">1</span> Thông tin chung
                        </h3>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 mb-1 block">Tiêu đề đề thi <span className="text-red-500">*</span></label>
                                <input 
                                    value={examName} 
                                    onChange={e => setExamName(e.target.value)} 
                                    className="w-full bg-gray-50 border border-gray-200 focus:border-ucmas-blue focus:bg-white p-2.5 rounded-lg font-bold text-sm text-gray-800 outline-none transition placeholder:font-normal" 
                                    placeholder={activeTab === 'mixed' ? "Vd: Đề tổng hợp kỹ năng" : "Vd: Luyện tập tuần 1"} 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 mb-1 block">Ngày hết hạn</label>
                                    <input type="date" value={examExpiry} onChange={e => setExamExpiry(e.target.value)} className="w-full bg-gray-50 border border-gray-200 focus:border-ucmas-blue focus:bg-white p-2.5 rounded-lg font-bold text-xs text-gray-800 outline-none transition" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 mb-1 block">Thuộc cuộc thi</label>
                                    <select 
                                        value={selectedContestId} 
                                        onChange={e => setSelectedContestId(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 focus:border-ucmas-blue focus:bg-white p-2.5 rounded-lg font-bold text-xs text-gray-800 outline-none transition appearance-none"
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

                    {/* SECTION 2: CONFIGURATION */}
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 relative overflow-hidden min-h-[300px]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ucmas-green to-ucmas-blue"></div>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="bg-gray-100 w-5 h-5 flex items-center justify-center rounded-full text-[10px] text-gray-600">2</span> Cấu hình ({activeTab === 'creative' ? 'Sáng tạo' : activeTab === 'mixed' ? 'Hỗn hợp' : 'JSON'})
                        </h3>
                        
                        {activeTab === 'creative' && (
                            <div className="space-y-5 animate-fade-in">
                                {/* Mode Selector */}
                                <div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[Mode.VISUAL, Mode.LISTENING, Mode.FLASH].map(m => (
                                            <button key={m} onClick={() => setExamMode(m)} className={`py-2 rounded-lg border transition-all flex flex-col items-center gap-0.5 ${examMode === m ? 'border-ucmas-blue bg-blue-50 text-ucmas-blue shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                                                <span className="text-lg">{m === Mode.VISUAL ? '👁️' : m === Mode.LISTENING ? '🎧' : '⚡'}</span>
                                                <span className="text-[10px] font-bold uppercase">{m === Mode.VISUAL ? 'Nhìn' : m === Mode.LISTENING ? 'Nghe' : 'Flash'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Digits & Rows */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 mb-1 block">Số chữ số</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(d => (
                                                <button key={d} onClick={() => setConfig({...config, digits: d})} className={`w-7 h-7 rounded-md font-bold text-xs transition-all ${config.digits === d ? 'bg-ucmas-blue text-white shadow' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{d}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 mb-1 block">Số dòng tính</label>
                                        <div className="grid grid-cols-6 gap-1.5">
                                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(r => (
                                                <button key={r} onClick={() => setConfig({...config, operands: r})} className={`py-1.5 rounded-md font-bold text-[10px] transition-all ${config.operands === r ? 'bg-ucmas-blue text-white shadow' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{r}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Sliders */}
                                <div className="bg-gray-50 p-6 rounded-xl space-y-6 border border-gray-100">
                                    <CustomSlider
                                        label="Số lượng"
                                        value={config.count}
                                        min={5}
                                        max={50}
                                        step={1}
                                        onChange={(val) => setConfig({...config, count: val})}
                                        valueLabel={`${config.count} câu`}
                                        color="blue"
                                        unit=""
                                        minLabel="5"
                                        maxLabel="50"
                                    />
                                    {(examMode === Mode.LISTENING || examMode === Mode.FLASH) && (
                                        <CustomSlider
                                            label="Tốc độ (s)"
                                            value={config.speed}
                                            min={0.2}
                                            max={3.0}
                                            step={0.1}
                                            onChange={(val) => setConfig({...config, speed: val})}
                                            valueLabel={`${config.speed}s`}
                                            color="red"
                                            unit="s"
                                            minLabel="0.2s"
                                            maxLabel="3.0s"
                                        />
                                    )}
                                </div>

                                <button onClick={handleCreateCreative} className="w-full h-10 bg-gradient-to-r from-ucmas-blue to-blue-800 text-white rounded-lg font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95 uppercase tracking-wide flex items-center justify-center gap-2">
                                    <span>💾</span> Lưu & Giao Đề
                                </button>
                            </div>
                        )}

                        {activeTab === 'upload' && (
                            <div className="space-y-5 animate-fade-in">
                                {/* Sample Buttons */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 mb-2 block">File mẫu</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => downloadSampleJson('visual')} className="flex-1 bg-gray-50 hover:bg-white border border-gray-200 hover:border-ucmas-blue text-gray-500 hover:text-ucmas-blue px-2 py-2 rounded-lg text-[10px] font-bold uppercase transition">
                                            📥 Nhìn
                                        </button>
                                        <button onClick={() => downloadSampleJson('listening')} className="flex-1 bg-gray-50 hover:bg-white border border-gray-200 hover:border-ucmas-red text-gray-500 hover:text-ucmas-red px-2 py-2 rounded-lg text-[10px] font-bold uppercase transition">
                                            📥 Nghe
                                        </button>
                                        <button onClick={() => downloadSampleJson('flash')} className="flex-1 bg-gray-50 hover:bg-white border border-gray-200 hover:border-ucmas-green text-gray-500 hover:text-ucmas-green px-2 py-2 rounded-lg text-[10px] font-bold uppercase transition">
                                            📥 Flash
                                        </button>
                                    </div>
                                </div>

                                {/* Override Speed */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 mb-1 block">Ghi đè tốc độ (Tùy chọn)</label>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            min="0.1"
                                            placeholder="Mặc định theo file" 
                                            value={jsonOverrideSpeed} 
                                            onChange={e => setJsonOverrideSpeed(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            className="w-full bg-gray-50 border border-gray-200 focus:border-ucmas-red p-2.5 rounded-lg font-bold text-xs text-gray-800 outline-none transition text-center" 
                                        />
                                    </div>
                                </div>

                                {/* Drag Drop Clickable */}
                                <label htmlFor="file-upload-single" className="block cursor-pointer group">
                                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center ${selectedFile ? 'border-ucmas-blue bg-blue-50' : 'border-gray-300 hover:border-ucmas-blue hover:bg-gray-50'}`}>
                                        <span className="text-3xl mb-2 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">📤</span>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">{selectedFile ? selectedFile.name : 'Click chọn file JSON'}</p>
                                    </div>
                                    <input id="file-upload-single" type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
                                </label>

                                {/* Action Button */}
                                <button 
                                    onClick={handleSaveFileExam}
                                    disabled={!selectedFile}
                                    className={`w-full h-10 rounded-lg font-bold text-xs shadow-md transition-all uppercase tracking-wide flex items-center justify-center gap-2 ${!selectedFile ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-ucmas-blue hover:bg-blue-800 text-white active:scale-95'}`}
                                >
                                    <span>💾</span> Lưu & Tải Đề Lên
                                </button>
                            </div>
                        )}

                        {activeTab === 'mixed' && (
                            <div className="space-y-5 animate-fade-in">
                                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-purple-800 text-[10px] font-medium leading-relaxed">
                                    🧬 <strong>Chế độ Hỗn Hợp:</strong> Cho phép tải file đề chứa nhiều loại câu hỏi (Nhìn, Nghe, Flash).
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 mb-2 block">Tải file mẫu</label>
                                    <button onClick={() => downloadSampleJson('mixed')} className="w-full bg-white border border-gray-200 hover:border-purple-500 hover:text-purple-600 text-gray-500 px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition shadow-sm flex items-center justify-center gap-2">
                                        📥 Tải mẫu đề thi hỗn hợp (.json)
                                    </button>
                                </div>

                                {/* Drag Drop Clickable */}
                                <label htmlFor="file-upload-mixed" className="block cursor-pointer group">
                                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center ${selectedFile ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-500 hover:bg-purple-50'}`}>
                                        <span className="text-3xl mb-2 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">🧬</span>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">{selectedFile ? selectedFile.name : 'Click chọn file JSON'}</p>
                                    </div>
                                    <input id="file-upload-mixed" type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
                                </label>

                                {/* Action Button */}
                                <button 
                                    onClick={handleSaveFileExam}
                                    disabled={!selectedFile}
                                    className={`w-full h-10 rounded-lg font-bold text-xs shadow-md transition-all uppercase tracking-wide flex items-center justify-center gap-2 ${!selectedFile ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:to-indigo-700 text-white active:scale-95'}`}
                                >
                                    <span>💾</span> Lưu & Tải Đề Lên
                                </button>
                            </div>
                        )}

                        {status && <div className={`mt-4 p-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest border ${status.includes('✅') ? 'bg-green-50 border-green-100 text-green-700' : status.includes('⚠️') ? 'bg-yellow-50 border-yellow-100 text-yellow-700' : 'bg-red-50 border-red-100 text-red-700'}`}>{status}</div>}
                    </div>
                </div>

                {/* --- RIGHT COLUMN: HISTORY LIST --- */}
                <div className="col-span-12 lg:col-span-7">
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6 h-full flex flex-col max-h-[1000px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                                <span className="text-xl">🕒</span> Lịch sử đề đã tạo
                            </h3>
                            <button onClick={loadHistory} className="text-[10px] font-bold text-ucmas-blue hover:bg-blue-50 bg-white border border-blue-100 px-3 py-1.5 rounded-lg transition uppercase tracking-widest">
                                🔄 Làm mới
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-grow pr-2 space-y-3">
                            {loadingHistory ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ucmas-blue"></div></div>
                            ) : examHistory.length === 0 ? (
                                <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                                    <p className="text-gray-300 font-black uppercase tracking-widest text-xs">Chưa có đề nào</p>
                                </div>
                            ) : (
                                examHistory.map((ex) => {
                                    const isMixed = ex.mode === 'hon_hop' || ex.config?.isMixed;
                                    return (
                                        <div key={ex.id} className="group p-4 rounded-xl border border-gray-100 hover:border-ucmas-blue hover:shadow-sm transition-all bg-white relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-800 text-sm">{ex.name || 'Không tên'}</h4>
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${isMixed ? 'bg-purple-50 text-purple-600 border-purple-100' : ex.mode === 'nhin_tinh' ? 'bg-blue-50 text-ucmas-blue border-blue-100' : ex.mode === 'nghe_tinh' ? 'bg-red-50 text-ucmas-red border-red-100' : 'bg-green-50 text-ucmas-green border-green-100'}`}>
                                                    {isMixed ? 'Hỗn Hợp' : ex.mode === 'nhin_tinh' ? 'Nhìn' : ex.mode === 'nghe_tinh' ? 'Nghe' : 'Flash'}
                                                </span>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 font-medium mb-2">
                                                <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded">
                                                    <span>📅 Hạn:</span> 
                                                    <span className="text-gray-800 font-bold">{new Date(ex.expiry_date).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded">
                                                    <span>🔢 Code:</span> 
                                                    <span className="text-gray-800 font-bold font-mono">{ex.exam_code}</span>
                                                </div>
                                                {ex.config?.contestId && (
                                                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100">
                                                        <span>🏆</span> 
                                                        <span className="font-bold">{contests.find(c => c.id === ex.config.contestId)?.name || 'Cuộc thi'}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50 mt-2">
                                                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                                                    Cấu hình: <span className="text-gray-600">{isMixed ? 'Đa dạng' : `${ex.config?.digits || '?'} Digits x ${ex.config?.operands || '?'} Rows`}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest text-right">
                                                    Tốc độ: <span className="text-ucmas-red">{ex.config?.speed || ex.config?.display_speed || ex.config?.read_speed || 'N/A'}s</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
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
