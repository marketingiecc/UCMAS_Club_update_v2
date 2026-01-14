
import React, { useState } from 'react';
import { practiceService } from '../src/features/practice/services/practiceService';
import { Mode } from '../types';

const AdminPracticeManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'creative' | 'upload'>('creative');
  const [examName, setExamName] = useState('');
  const [examExpiry, setExamExpiry] = useState(new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]);
  const [examMode, setExamMode] = useState<Mode>(Mode.VISUAL);
  const [config, setConfig] = useState({
      digits: 1,
      operands: 5,
      speed: 1.0,
      count: 10
  });
  const [status, setStatus] = useState('');

  const handleCreateCreative = async () => {
      if (!examName) { setStatus('❌ Vui lòng nhập tên đề'); return; }
      setStatus('⏳ Đang tạo...');
      const res = await practiceService.adminCreateExam({
          name: examName,
          mode: examMode,
          exam_code: `${config.digits}D${config.operands}R`,
          config: { ...config, flashSpeed: config.speed * 1000 },
          expiry_date: new Date(examExpiry).toISOString(),
          created_at: new Date().toISOString(),
          questions: [] 
      });
      if (res.success) {
          setStatus('✅ Đã tạo đề thành công!');
          setExamName('');
      } else setStatus('❌ Lỗi: ' + res.error);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !examName) { alert("Vui lòng nhập tên đề."); return; }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            const res = await practiceService.adminCreateExam({
                name: examName,
                mode: examMode,
                exam_code: json.code || 'JSON',
                config: json.config || { digits: 1, operands: 5 },
                questions: json.questions || [],
                expiry_date: new Date(examExpiry).toISOString()
            });
            if (res.success) setStatus('✅ Đã tải đề lên thành công!');
            else setStatus('❌ Lỗi lưu đề.');
        } catch (err) { setStatus('❌ Lỗi file JSON'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto p-10 animate-fade-in">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-800 p-10 text-white">
                <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-4">
                    <span className="text-4xl">📚</span> Quản lý Luyện Thi
                </h2>
                <div className="flex gap-4 mt-8">
                    <button onClick={() => setActiveTab('creative')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'creative' ? 'bg-white text-gray-800 shadow-xl' : 'text-gray-400 border border-gray-700 hover:bg-gray-700'}`}>Tạo đề sáng tạo</button>
                    <button onClick={() => setActiveTab('upload')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'upload' ? 'bg-white text-gray-800 shadow-xl' : 'text-gray-400 border border-gray-700 hover:bg-gray-700'}`}>Tải file JSON</button>
                </div>
            </div>

            <div className="p-12 lg:p-16 grid lg:grid-cols-2 gap-16">
                <div className="space-y-10">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tên bài thi hiển thị</label>
                            <input value={examName} onChange={e => setExamName(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-ucmas-blue p-4 rounded-2xl font-bold outline-none transition" placeholder="Vd: Luyện tập Tuần 1 - Phản xạ" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ngày hết hạn (Expiry)</label>
                            <input type="date" value={examExpiry} onChange={e => setExamExpiry(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-ucmas-blue p-4 rounded-2xl font-bold outline-none transition" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 ml-1">Phân hệ luyện tập</label>
                        <div className="grid grid-cols-3 gap-4">
                            {[Mode.VISUAL, Mode.LISTENING, Mode.FLASH].map(m => (
                                <button key={m} onClick={() => setExamMode(m)} className={`p-6 rounded-[2rem] border-2 transition-all ${examMode === m ? 'border-ucmas-blue bg-blue-50 text-ucmas-blue shadow-lg' : 'border-gray-50 text-gray-300 hover:bg-gray-50'}`}>
                                    <div className="text-2xl mb-1">{m === Mode.VISUAL ? '👁️' : m === Mode.LISTENING ? '🎧' : '⚡'}</div>
                                    <div className="text-[9px] font-black uppercase tracking-tight">{m === Mode.VISUAL ? 'Nhìn' : m === Mode.LISTENING ? 'Nghe' : 'Flash'}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-12">
                    {activeTab === 'creative' ? (
                        <div className="space-y-10">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Chọn số chữ số (Digits)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(d => (
                                            <button key={d} onClick={() => setConfig({...config, digits: d})} className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${config.digits === d ? 'bg-gray-800 text-white shadow-md scale-110' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{d}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Chọn số phép tính (Rows)</label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(r => (
                                            <button key={r} onClick={() => setConfig({...config, operands: r})} className={`py-3 rounded-xl font-bold text-[10px] transition-all ${config.operands === r ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{r}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-8 rounded-[2.5rem] space-y-8 shadow-inner border border-gray-100">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số câu hỏi</label><span className="text-sm font-black text-gray-800 bg-white px-2 py-1 rounded shadow-sm">{config.count} câu</span></div>
                                    <input type="range" min="5" max="50" value={config.count} onChange={e => setConfig({...config, count: parseInt(e.target.value)})} className="w-full accent-gray-800 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer" />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tốc độ (s/số)</label><span className="text-sm font-black text-ucmas-red bg-white px-2 py-1 rounded shadow-sm">{config.speed}s</span></div>
                                    <input type="range" min="0.2" max="3.0" step="0.1" value={config.speed} onChange={e => setConfig({...config, speed: parseFloat(e.target.value)})} className="w-full accent-ucmas-red h-2 bg-gray-200 rounded-full appearance-none cursor-pointer" />
                                </div>
                            </div>

                            <button onClick={handleCreateCreative} className="w-full h-20 bg-gray-900 text-white rounded-[2rem] font-black text-xl shadow-xl hover:bg-black transition-all active:scale-95 uppercase tracking-widest">Lưu Đề & Giao Bài 🚀</button>
                        </div>
                    ) : (
                        <div className="space-y-10">
                             <div className="border-4 border-dashed border-gray-100 rounded-[3rem] p-16 text-center hover:bg-blue-50 transition cursor-pointer relative group flex flex-col items-center">
                                <input type="file" accept=".json" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                <span className="text-6xl mb-6 group-hover:scale-110 transition-transform">📤</span>
                                <p className="font-black text-gray-700 uppercase tracking-widest mb-2">Tải file JSON đề thi</p>
                                <p className="text-[10px] text-gray-400 uppercase font-medium">Hệ thống sẽ tự động gán thông số từ file</p>
                            </div>
                        </div>
                    )}
                    {status && <div className={`p-6 rounded-2xl text-center text-xs font-black uppercase tracking-widest border ${status.includes('✅') ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>{status}</div>}
                </div>
            </div>
        </div>
    </div>
  );
};

export default AdminPracticeManager;
