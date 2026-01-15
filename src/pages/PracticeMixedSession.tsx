
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/mockBackend';
import { practiceService } from '../src/features/practice/services/practiceService';
import { Mode, UserProfile } from '../types';

interface PracticeMixedSessionProps {
  user: UserProfile;
}

const PracticeMixedSession: React.FC<PracticeMixedSessionProps> = ({ user }) => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  // Data State
  const [examName, setExamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter State
  const [selectedMode, setSelectedMode] = useState<Mode | 'all'>('all');
  const [digits, setDigits] = useState<number>(2);
  const [rows, setRows] = useState<number>(3);
  const [speed, setSpeed] = useState<number>(1.0);
  const [questionCount, setQuestionCount] = useState<number>(20);

  // Loading State for Generation
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
      const fetchExamMetadata = async () => {
          if (!examId) return;
          setLoading(true);
          // Only select name to be lightweight
          const { data, error } = await supabase.from('assigned_practice_exams').select('name').eq('id', examId).single();
          
          if (data) {
              setExamName(data.name);
          } else {
              console.error("Mixed Exam Load Error:", error);
              setErrorMsg("Không tìm thấy thông tin đề thi.");
          }
          setLoading(false);
      };
      fetchExamMetadata();
  }, [examId]);

  const handleStart = async () => {
      if (!examId) return;
      setIsGenerating(true);
      
      try {
          // Fetch a batch of questions matching the criteria
          const questions = await practiceService.getMixedQuestionsBatch(
              examId, 
              {
                  mode: selectedMode,
                  digits: digits,
                  rows: rows
              },
              questionCount
          );

          if (!questions || questions.length === 0) {
              alert(`Không tìm thấy câu hỏi nào phù hợp với: ${selectedMode !== 'all' ? selectedMode : 'Tất cả'}, ${digits} chữ số, ${rows} dòng.`);
              setIsGenerating(false);
              return;
          }

          // Navigate to the PracticeSessionExam (reuse existing UI)
          navigate(`/practice-exam/${Mode.MIXED}`, {
              state: {
                  examId: examId,
                  predefinedQuestions: questions,
                  customConfig: {
                      name: examName,
                      speed: speed,
                      flashSpeed: speed * 1000,
                      isCreative: false,
                      isMixed: true
                  }
              }
          });
      } catch (err) {
          console.error(err);
          alert("Có lỗi khi tạo bài thi.");
          setIsGenerating(false);
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500">⏳ Đang tải thông tin đề thi...</div>;
  
  if (errorMsg) return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
          <div className="text-red-500 font-bold text-xl">{errorMsg}</div>
          <button onClick={() => navigate('/contests')} className="px-6 py-2 bg-gray-200 rounded-lg font-bold">Quay lại</button>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl border border-gray-100 p-10 lg:p-12 relative overflow-hidden">
            
            {/* Header */}
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
            <button onClick={() => navigate('/contests')} className="absolute top-8 left-8 text-gray-400 hover:text-gray-800 font-bold uppercase text-xs tracking-widest">← Quay lại</button>
            
            <div className="text-center mb-10 mt-6">
                <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">{examName}</h2>
                <div className="text-xs font-bold text-purple-600 bg-purple-50 inline-block px-3 py-1 rounded-full mt-2 uppercase tracking-widest">Cấu hình Luyện tập</div>
            </div>

            <div className="space-y-8 animate-fade-in">
                
                {/* Mode Selector */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center">Chọn phần thi</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setSelectedMode('all')} 
                            className={`p-4 rounded-2xl border-2 transition flex items-center justify-center gap-2 ${selectedMode === 'all' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                        >
                            <span>🔄</span> <span className="font-bold text-sm">Tất cả</span>
                        </button>
                        <button 
                            onClick={() => setSelectedMode(Mode.VISUAL)} 
                            className={`p-4 rounded-2xl border-2 transition flex items-center justify-center gap-2 ${selectedMode === Mode.VISUAL ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                        >
                            <span>👁️</span> <span className="font-bold text-sm">Nhìn Tính</span>
                        </button>
                        <button 
                            onClick={() => setSelectedMode(Mode.LISTENING)} 
                            className={`p-4 rounded-2xl border-2 transition flex items-center justify-center gap-2 ${selectedMode === Mode.LISTENING ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                        >
                            <span>🎧</span> <span className="font-bold text-sm">Nghe Tính</span>
                        </button>
                        <button 
                            onClick={() => setSelectedMode(Mode.FLASH)} 
                            className={`p-4 rounded-2xl border-2 transition flex items-center justify-center gap-2 ${selectedMode === Mode.FLASH ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                        >
                            <span>⚡</span> <span className="font-bold text-sm">Flash</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center">Số chữ số</label>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {[1, 2, 3, 4, 5].map(d => (
                                <button key={d} onClick={() => setDigits(d)} className={`w-10 h-10 rounded-xl font-bold transition text-sm ${digits === d ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{d}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center">Số dòng tính</label>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                                <button key={r} onClick={() => setRows(r)} className={`w-10 h-10 rounded-xl font-bold transition text-sm ${rows === r ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{r}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sliders Area */}
                <div className="bg-gray-50 rounded-2xl p-6 space-y-6 border border-gray-100">
                     {/* Speed Slider */}
                     {(selectedMode === 'all' || selectedMode === Mode.LISTENING || selectedMode === Mode.FLASH) && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tốc độ hiển thị (giây/số)</label>
                                <span className="text-xs font-black bg-white text-purple-600 px-3 py-1 rounded-lg border border-purple-100 shadow-sm">{speed}s</span>
                            </div>
                            <input 
                                type="range" 
                                min="0.1" max="3.0" step="0.1" 
                                value={speed} 
                                onChange={e => setSpeed(parseFloat(e.target.value))} 
                                className="w-full accent-purple-600 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer" 
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                                <span>0.1s (Siêu nhanh)</span>
                                <span>3.0s (Chậm)</span>
                            </div>
                        </div>
                     )}

                     {/* Count Slider */}
                     <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số lượng câu hỏi</label>
                            <span className="text-xs font-black bg-white text-purple-600 px-3 py-1 rounded-lg border border-purple-100 shadow-sm">{questionCount} câu</span>
                        </div>
                        <input 
                            type="range" 
                            min="5" max="50" step="5" 
                            value={questionCount} 
                            onChange={e => setQuestionCount(parseInt(e.target.value))} 
                            className="w-full accent-purple-600 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer" 
                        />
                         <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                                <span>5 câu</span>
                                <span>50 câu</span>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleStart}
                    disabled={isGenerating}
                    className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-black text-xl shadow-xl transition transform active:scale-95 uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-wait"
                >
                    {isGenerating ? '⏳ Đang tạo bài...' : 'Bắt đầu luyện tập 🚀'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default PracticeMixedSession;
