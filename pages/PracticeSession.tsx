
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { generateExam, getExamConfig } from '../services/examService';
import { Mode, Question, AttemptResult, UserProfile, CustomExam } from '../types';
import ResultDetailModal from '../components/ResultDetailModal';

interface PracticeSessionProps {
  user: UserProfile;
}

const LANGUAGES = [
    { code: 'vi-VN', label: 'Tiếng Việt', sample: 'Một hai ba bốn năm sáu bảy tám chín mười' },
    { code: 'en-US', label: 'Tiếng Anh', sample: 'One two three four five six seven eight nine ten' },
    { code: 'ru-RU', label: 'Tiếng Nga', sample: 'один два три' },
    { code: 'zh-CN', label: 'Tiếng Trung', sample: '一 二 三 四 五' },
    { code: 'ja-JP', label: 'Tiếng Nhật', sample: 'いち に さん し go' },
];

const PracticeSession: React.FC<PracticeSessionProps> = ({ user }) => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const currentMode = mode as Mode;

  useEffect(() => {
     if (user.role === 'admin') return;

     const now = new Date();
     const expiry = user.license_expiry ? new Date(user.license_expiry) : null;
     const hasLicense = expiry && expiry > now;
     const isModeAllowed = user.allowed_modes.includes(currentMode);

     if (!hasLicense || !isModeAllowed) {
         navigate('/activate');
     }
  }, [user, currentMode, navigate]);

  const getTheme = (m: Mode) => {
      switch(m) {
          case Mode.VISUAL: return { color: 'text-ucmas-blue', bg: 'bg-ucmas-blue', icon: '👁️', title: 'Nhìn Tính' };
          case Mode.LISTENING: return { color: 'text-ucmas-red', bg: 'bg-ucmas-red', icon: '🎧', title: 'Nghe Tính' };
          case Mode.FLASH: return { color: 'text-ucmas-green', bg: 'bg-ucmas-green', icon: '⚡', title: 'Flash' };
          default: return { color: 'text-gray-800', bg: 'bg-gray-800', icon: '?', title: 'Luyện Tập' };
      }
  };
  const theme = getTheme(currentMode);

  const [status, setStatus] = useState<'setup' | 'running' | 'finished'>('setup');
  
  const [formName, setFormName] = useState(user.full_name || '');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [sourceType, setSourceType] = useState<'auto' | 'bank'>('auto');
  const [availableExams, setAvailableExams] = useState<CustomExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  
  const [speed, setSpeed] = useState(1.0);
  const [selectedLang, setSelectedLang] = useState('vi-VN');
  const [isLoadingRule, setIsLoadingRule] = useState(false);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Flash States
  const [flashNumber, setFlashNumber] = useState<number | string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashOverlay, setFlashOverlay] = useState<string | null>(null); // State cho đếm ngược

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  
  const [playCounts, setPlayCounts] = useState<Record<number, number>>({});

  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
     if (user.full_name) setFormName(user.full_name);
  }, [user.full_name]);

  useEffect(() => {
      return () => {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
          }
      };
  }, []);

  useEffect(() => {
      if (sourceType === 'bank') {
          const fetchExams = async () => {
              const exams = await backend.getCustomExams(currentMode, selectedLevel, 'active');
              setAvailableExams(exams);
              if (exams.length > 0) setSelectedExamId(exams[0].id);
              else setSelectedExamId('');
          };
          fetchExams();
      }
  }, [sourceType, selectedLevel, currentMode]);

  const getGoogleTTSUrl = (text: string, lang: string) => {
      const langCode = lang.split('-')[0];
      return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode}&q=${encodeURIComponent(text)}`;
  };

  const startExam = async () => {
    if (!formName) {
        alert("Vui lòng nhập họ và tên!");
        return;
    }

    if (sourceType === 'bank' && !selectedExamId) {
        alert("Vui lòng chọn bài luyện tập từ danh sách.");
        return;
    }

    setIsLoadingRule(true);
    
    try {
        let generatedQuestions: Question[] = [];
        let examTimeLimit = 0;

        if (sourceType === 'auto') {
            const ruleData = await backend.getLatestExamRule(currentMode);
            const customRules = ruleData ? ruleData.rules_json : null;

            const config = getExamConfig(currentMode, selectedLevel, customRules);
            generatedQuestions = generateExam(config);
            examTimeLimit = config.timeLimit;
        } else {
            const exam = await backend.getCustomExamById(selectedExamId);
            if (!exam) throw new Error("Không tìm thấy bài luyện tập.");
            
            generatedQuestions = exam.questions;
            examTimeLimit = exam.time_limit;
        }
        
        setQuestions(generatedQuestions);
        setTimeLeft(examTimeLimit);
        setStatus('running');
        
        setCurrentQIndex(0);
        setAnswers({});
        setPlayCounts({});
        setFlashNumber(null);
        setFlashOverlay(null);
    } catch (e) {
        console.error("Failed to start", e);
        alert("Có lỗi khi tạo bài luyện tập. Vui lòng thử lại.");
    } finally {
        setIsLoadingRule(false);
    }
  };

  const getSpeechRate = (secondsPerItem: number) => {
      const rate = 0.9 / secondsPerItem;
      return Math.min(Math.max(rate, 0.5), 2.5); 
  };

  const testVoice = () => {
      const langConfig = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }
      setIsPlayingAudio(false); 

      const url = getGoogleTTSUrl(langConfig.sample, selectedLang);
      const audio = new Audio(url);
      audio.playbackRate = getSpeechRate(speed);
      audio.play().catch(e => alert("Không thể phát âm thanh. Kiểm tra kết nối mạng."));
  };

  const canPlay = (idx: number) => {
      if (currentMode === Mode.VISUAL) return true;
      const count = playCounts[idx] || 0;
      return count < 2; 
  };

  useEffect(() => {
    if (status === 'running' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  useEffect(() => {
    if (status === 'running') {
      setIsPlayingAudio(false);
      setFlashOverlay(null);
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }

      const count = playCounts[currentQIndex] || 0;
      if (count === 0 && currentMode === Mode.FLASH) {
        runFlashSequence(currentQIndex);
      }
    }
  }, [currentQIndex, status]);

  const runFlashSequence = async (qIndex: number) => {
    if (!canPlay(qIndex)) return;

    setPlayCounts(prev => ({...prev, [qIndex]: (prev[qIndex] || 0) + 1}));
    setIsFlashing(true);
    
    // --- 1. Countdown Sequence (Blue bg, White text) ---
    const countdowns = ['3', '2', '1', 'Bắt đầu'];
    for (const count of countdowns) {
        setFlashOverlay(count);
        await new Promise(r => setTimeout(r, 1000));
    }
    setFlashOverlay(null); // Tắt overlay, hiện số

    // --- 2. Number Sequence ---
    const q = questions[qIndex];
    for (const num of q.operands) {
      setFlashNumber(num);
      await new Promise(r => setTimeout(r, speed * 1000));
      setFlashNumber(null);
      await new Promise(r => setTimeout(r, 200)); 
    }

    // --- 3. End with Equals Sign ---
    setFlashNumber('=');
    setIsFlashing(false);
  };

  const playSingleAudio = (text: string, rate: number): Promise<void> => {
      return new Promise((resolve) => {
          const url = getGoogleTTSUrl(text, selectedLang);
          const audio = new Audio(url);
          audio.playbackRate = rate;
          audioRef.current = audio;
          
          audio.onended = () => resolve();
          audio.onerror = () => resolve(); // Bỏ qua lỗi để chạy tiếp
          
          audio.play().catch(() => resolve());
      });
  };

  const playAudio = async () => {
    if (isPlayingAudio) return;
    if (!canPlay(currentQIndex)) return;

    setPlayCounts(prev => ({...prev, [currentQIndex]: (prev[currentQIndex] || 0) + 1}));
    setIsPlayingAudio(true);
    
    const q = questions[currentQIndex];
    const rate = getSpeechRate(speed);

    // 1. Đọc "Chuẩn bị"
    await playSingleAudio("Chuẩn bị", 1.2);
    
    // 2. Đọc dãy số (nghỉ 1 chút)
    await new Promise(r => setTimeout(r, 300));
    const text = q.operands.join(', ');
    await playSingleAudio(text, rate);

    // 3. Đọc "Bằng"
    await new Promise(r => setTimeout(r, 300));
    await playSingleAudio("Bằng", 1.2);

    setIsPlayingAudio(false);
    audioRef.current = null;
  };

  const submitExam = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause(); 
      
      setStatus('finished');
      
      let correct = 0, wrong = 0, skipped = 0;
      
      questions.forEach((q, idx) => {
        const ans = answers[idx];
        const isSkipped = !ans || ans.trim() === '';
        const isCorrect = !isSkipped && parseInt(ans) === q.correctAnswer;
        if (isSkipped) skipped++;
        else if (isCorrect) correct++;
        else wrong++;
      });

      const config = getExamConfig(currentMode, selectedLevel);
      if (currentMode !== Mode.VISUAL) config.flashSpeed = speed * 1000;

      await backend.saveAttempt(
          user.id,
          config,
          questions,
          {
              correct,
              wrong,
              skipped,
              total: questions.length,
              duration: (questions.length * 300)
          },
          answers
      );
  };

  useEffect(() => {
    if (status === 'running' && timeLeft <= 0) {
        submitExam();
    }
  }, [timeLeft, status]);

  const isInputDisabled = (currentMode === Mode.FLASH && isFlashing) || 
                          (currentMode === Mode.LISTENING && isPlayingAudio);

  useEffect(() => {
    if (!isInputDisabled && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isInputDisabled]);

  if (status === 'setup') {
    // ... (Keep existing setup UI)
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border border-gray-100 relative overflow-hidden">
           <div className={`mx-auto w-20 h-20 rounded-2xl ${theme.bg} text-white flex items-center justify-center text-4xl shadow-lg mb-6`}>
              {theme.icon}
           </div>

           <h2 className="text-center text-2xl font-black text-gray-800 mb-1">
             Luyện Tập <span className={`${theme.color}`}>{theme.title}</span>
           </h2>
           <p className="text-center text-gray-500 text-sm mb-8 uppercase tracking-widest font-bold">
             {currentMode === Mode.VISUAL ? '200' : '30'} câu hỏi • {currentMode === Mode.FLASH ? 'Thẻ số nhanh' : currentMode === Mode.LISTENING ? 'Nghe đọc số' : '8 phút'}
           </p>

           <div className="space-y-5">
              <div>
                 <label className={`block text-xs font-bold ${theme.color} mb-1.5 ml-1 uppercase`}>👤 Họ và tên <span className="text-red-500">*</span></label>
                 <input 
                   type="text" 
                   value={formName} 
                   onChange={e => setFormName(e.target.value)}
                   placeholder="Nhập họ tên học sinh"
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                 />
              </div>

              <div>
                 <label className={`block text-xs font-bold ${theme.color} mb-1.5 ml-1 uppercase`}>🎓 Cấp độ</label>
                 <select 
                   value={selectedLevel} 
                   onChange={e => setSelectedLevel(parseInt(e.target.value))}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition appearance-none"
                 >
                    {[1,2,3,4,5,6,7,8,9,10].map(l => <option key={l} value={l}>Cấp {l}</option>)}
                 </select>
              </div>

              <div>
                 <label className={`block text-xs font-bold ${theme.color} mb-1.5 ml-1 uppercase`}>📄 Nguồn bài tập</label>
                 <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                       <input type="radio" name="source" checked={sourceType === 'auto'} onChange={() => setSourceType('auto')} className="text-blue-600 focus:ring-blue-500" />
                       🔀 Tự động sinh
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                       <input type="radio" name="source" checked={sourceType === 'bank'} onChange={() => setSourceType('bank')} className="text-blue-600 focus:ring-blue-500" />
                       📚 Kho bài luyện tập
                    </label>
                 </div>
              </div>

              {sourceType === 'bank' && (
                  <div className="animate-fade-in bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Chọn bài luyện tập</label>
                      <select 
                          value={selectedExamId}
                          onChange={(e) => setSelectedExamId(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      >
                          {availableExams.length === 0 ? (
                              <option value="">-- Không có bài nào cho Cấp {selectedLevel} --</option>
                          ) : (
                              availableExams.map(ex => (
                                  <option key={ex.id} value={ex.id}>{ex.name} ({ex.questions.length} câu)</option>
                              ))
                          )}
                      </select>
                  </div>
              )}

              {currentMode === Mode.LISTENING && (
                  <div>
                    <label className={`block text-xs font-bold ${theme.color} mb-1.5 ml-1 uppercase`}>🗣️ Ngôn ngữ</label>
                    <select 
                        value={selectedLang} 
                        onChange={e => setSelectedLang(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition appearance-none"
                    >
                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>
              )}

              {(currentMode === Mode.FLASH || currentMode === Mode.LISTENING) && (
                 <div>
                    <div className="flex justify-between items-center mb-2 ml-1">
                        <label className={`text-xs font-bold ${theme.color} uppercase`}>⏱️ Tốc độ hiển thị</label>
                        <span className={`text-xs font-bold ${theme.color} bg-gray-100 px-2 py-1 rounded`}>{speed} giây/số</span>
                    </div>
                    
                    <div className="relative pt-1 pb-4">
                        <input 
                            type="range" 
                            min="0.25" 
                            max="3.0" 
                            step="0.25" 
                            value={speed} 
                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            className={`w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme.color}`}
                            style={{
                                background: `linear-gradient(to right, ${currentMode === Mode.FLASH ? '#10B981' : '#E31E24'} 0%, ${currentMode === Mode.FLASH ? '#10B981' : '#E31E24'} ${(speed - 0.25) / (3.0 - 0.25) * 100}%, #e5e7eb ${(speed - 0.25) / (3.0 - 0.25) * 100}%, #e5e7eb 100%)`
                            }}
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 font-medium mt-2">
                            <span>Siêu nhanh (0.25s)</span>
                            <span>Chậm (3s)</span>
                        </div>
                    </div>

                    {currentMode === Mode.LISTENING && (
                        <div className="text-center">
                             <button 
                                onClick={testVoice}
                                className={`text-xs font-bold px-4 py-2 rounded-full border transition border-red-200 text-red-600 hover:bg-red-50`}
                             >
                                 🔊 Nghe thử giọng Google
                             </button>
                        </div>
                    )}
                 </div>
              )}

              <button 
                onClick={startExam}
                disabled={isLoadingRule}
                className={`w-full ${theme.bg} text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait uppercase`}
              >
                 {isLoadingRule ? '⏳ Đang tạo bài luyện tập...' : '✨ BẮT ĐẦU LUYỆN TẬP'}
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (status === 'finished') {
     // ... (Keep existing results UI)
    const correctCount = questions.filter((q, i) => parseInt(answers[i]) === q.correctAnswer).length;
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <ResultDetailModal 
            isOpen={isReviewOpen} 
            onClose={() => setIsReviewOpen(false)} 
            questions={questions} 
            userAnswers={answers}
            title="Kết quả luyện tập"
        />

        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 text-green-600">
               🏆
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-1 uppercase">Kết Quả Luyện Tập</h2>
            <p className="text-gray-500 text-sm mb-6">{formName} • Cấp {selectedLevel}</p>

            <div className="flex justify-center gap-1 mb-2 text-yellow-400 text-2xl">
               {[1,2,3,4,5].map(s => <span key={s}>{percentage >= s*20 ? '★' : '☆'}</span>)}
            </div>
            <p className="text-ucmas-blue font-bold text-sm mb-8">
               {percentage >= 80 ? 'Xuất sắc!' : percentage >= 50 ? 'Đạt yêu cầu' : 'Cần cố gắng hơn'}
            </p>

            <div className="bg-slate-50 rounded-2xl p-8 mb-8">
               <div className="text-5xl font-black text-ucmas-blue">
                 {correctCount}<span className="text-2xl text-gray-400 font-medium">/{questions.length}</span>
               </div>
               <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 mb-2">
                  <div className="bg-ucmas-green h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
               </div>
               <p className="text-xs text-gray-500 font-bold uppercase">Số câu đúng ({percentage}%)</p>
            </div>

            <button 
               onClick={() => setIsReviewOpen(true)}
               className="w-full border border-ucmas-blue text-ucmas-blue font-bold py-3 rounded-xl hover:bg-blue-50 transition mb-3 flex items-center justify-center gap-2 uppercase"
            >
               👁️ Xem lại chi tiết
            </button>
            <div className="flex gap-3">
               <button onClick={() => navigate('/dashboard')} className="flex-1 border border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition uppercase text-sm">
                  🏠 Dashboard
               </button>
               <button onClick={() => setStatus('setup')} className="flex-1 bg-ucmas-red text-white font-bold py-3 rounded-xl hover:bg-red-700 transition uppercase text-sm">
                  🔄 Làm lại
               </button>
            </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 min-h-[80vh]">
        {/* Left Sidebar */}
        <div className="hidden lg:block w-72 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-fit shrink-0">
           <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-full ${theme.bg} text-white flex items-center justify-center shadow-md`}>{theme.icon}</div>
              <div>
                 <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Học sinh</div>
                 <div className="font-bold text-gray-800 leading-tight">{formName}</div>
              </div>
           </div>
           
           <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
               <div className="flex justify-between text-xs mb-2">
                   <span className="text-gray-500 font-bold uppercase">Cấp độ</span>
                   <span className="font-bold text-ucmas-green">Cấp {selectedLevel}</span>
               </div>
               <div className="flex justify-between text-xs mb-2">
                   <span className="text-gray-500 font-bold uppercase">Tốc độ</span>
                   <span className="font-bold text-gray-800">{speed}s</span>
               </div>
               <div className="flex justify-between text-xs pt-2 border-t border-gray-200 mt-2">
                   <span className="text-gray-500 font-bold uppercase">Câu hỏi</span>
                   <span className="font-black text-ucmas-blue text-lg">{currentQIndex + 1}/{questions.length}</span>
               </div>
           </div>

           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Danh sách câu</div>
           <div className="grid grid-cols-5 gap-2">
              {questions.map((_, idx) => {
                  const isDone = answers[idx] !== undefined;
                  const isActive = currentQIndex === idx;
                  return (
                    <button 
                        key={idx}
                        onClick={() => {
                            if (!isFlashing && !isInputDisabled && (isDone || isActive)) {
                                setCurrentQIndex(idx);
                            }
                        }}
                        disabled={isFlashing || isInputDisabled || (!isDone && !isActive)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition shadow-sm ${
                            isActive ? `${theme.bg} text-white shadow-md transform scale-110` :
                            isDone ? 'bg-blue-50 text-ucmas-blue border border-blue-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                    >
                        {idx + 1}
                    </button>
                  );
              })}
           </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
            <div className="lg:hidden flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
               <span className="font-bold text-gray-700">Câu {currentQIndex + 1}/{questions.length}</span>
               <span className="text-ucmas-red font-mono font-black text-xl">{Math.floor(timeLeft/60)}:{((timeLeft%60)).toString().padStart(2,'0')}</span>
            </div>

            <div className="flex-grow bg-white rounded-3xl shadow-sm border border-gray-100 relative flex flex-col lg:flex-row overflow-hidden min-h-[500px]">
                <div className="hidden lg:flex absolute top-6 right-6 bg-ucmas-blue text-white px-5 py-2.5 rounded-2xl items-center gap-2 shadow-xl z-20">
                   <span className="text-[10px] uppercase font-black tracking-widest opacity-80">Còn lại</span>
                   <span className="text-2xl font-mono font-black">{Math.floor(timeLeft/60)}:{((timeLeft%60)).toString().padStart(2,'0')}</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative">
                    
                    {/* VISUAL MODE DISPLAY */}
                    {currentMode === Mode.VISUAL && (
                       <div className="bg-gray-50 p-12 rounded-[2.5rem] min-w-[300px] text-center shadow-inner border border-gray-100">
                          {currentQ.operands.map((num, i) => (
                             <div key={i} className="text-7xl font-black text-ucmas-blue mb-4 font-mono tracking-tighter leading-tight">{num}</div>
                          ))}
                          <div className="border-t-4 border-gray-300 w-32 mx-auto mt-6 mb-6"></div>
                          <div className="text-7xl font-black text-gray-300">?</div>
                       </div>
                    )}

                    {/* FLASH MODE DISPLAY */}
                    {currentMode === Mode.FLASH && (
                        <div className="text-center w-full h-full flex items-center justify-center">
                            {flashOverlay ? (
                                <div className="absolute inset-0 bg-ucmas-blue z-50 flex items-center justify-center">
                                    <div className="text-white font-black text-8xl uppercase animate-bounce">{flashOverlay}</div>
                                </div>
                            ) : isFlashing ? (
                                <div className="text-[180px] font-black text-ucmas-blue leading-none tracking-tighter animate-pulse">
                                   {flashNumber}
                                </div>
                            ) : (
                                <div 
                                    onClick={() => runFlashSequence(currentQIndex)} 
                                    className={`cursor-pointer group ${!canPlay(currentQIndex) ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <div className="w-40 h-40 bg-ucmas-blue rounded-full flex items-center justify-center text-white text-6xl shadow-2xl group-hover:scale-105 transition-all mx-auto mb-6">
                                       ▶
                                    </div>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                                        {canPlay(currentQIndex) ? 'Bắt đầu (Tối đa 2 lần)' : 'Hết lượt xem'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LISTENING MODE DISPLAY */}
                    {currentMode === Mode.LISTENING && (
                        <div className="text-center">
                            <div className={`w-48 h-48 rounded-full flex items-center justify-center text-7xl text-white shadow-2xl mb-10 transition-all ${isPlayingAudio ? 'bg-ucmas-red scale-105 animate-pulse' : 'bg-ucmas-red shadow-red-100'}`}>
                                🎧
                            </div>
                            <button 
                               onClick={playAudio}
                               disabled={isPlayingAudio || !canPlay(currentQIndex)}
                               className="bg-gradient-to-r from-ucmas-red to-red-600 text-white px-12 py-5 rounded-2xl font-black shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xl uppercase tracking-widest"
                            >
                               {isPlayingAudio ? 'Đang đọc...' : canPlay(currentQIndex) ? 'Phát âm thanh' : 'Hết lượt nghe'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l border-gray-100 p-10 flex flex-col justify-center bg-gray-50/50 z-10">
                    <div className="text-center mb-8">
                         <h3 className="text-gray-400 font-black uppercase text-xs tracking-widest mb-2">Nhập đáp án</h3>
                         <div className="text-ucmas-blue font-bold">Câu số {currentQIndex + 1}</div>
                    </div>

                    <div className="relative w-full mb-8">
                        <input 
                          ref={inputRef}
                          type="number" 
                          autoFocus
                          disabled={isInputDisabled}
                          value={answers[currentQIndex] || ''}
                          onChange={(e) => setAnswers(prev => ({...prev, [currentQIndex]: e.target.value}))}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                  if (isInputDisabled) return;
                                  if (answers[currentQIndex] === undefined) setAnswers(prev => ({...prev, [currentQIndex]: ''}));
                                  if (currentQIndex < questions.length - 1) {
                                      setCurrentQIndex(p => p+1);
                                      // Reset states
                                      setIsFlashing(false);
                                      setFlashOverlay(null); 
                                      setIsPlayingAudio(false);
                                      if(audioRef.current) audioRef.current.pause();
                                  }
                                  else submitExam();
                              }
                          }}
                          className={`w-full border-4 ${isInputDisabled ? 'bg-gray-100 text-gray-300 border-gray-100' : answers[currentQIndex] ? 'border-ucmas-blue bg-white shadow-xl' : 'border-gray-200 bg-white'} rounded-[2rem] py-8 px-6 text-center text-6xl font-black text-ucmas-blue focus:border-ucmas-blue outline-none transition-all`}
                          placeholder={isInputDisabled ? "..." : "?"}
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        {currentQIndex < questions.length - 1 ? (
                            <button 
                                onClick={() => {
                                    if (answers[currentQIndex] === undefined) setAnswers(prev => ({...prev, [currentQIndex]: ''}));
                                    setCurrentQIndex(p => p+1);
                                }}
                                disabled={isInputDisabled}
                                className="w-full px-8 py-5 rounded-2xl bg-white border-2 border-ucmas-blue text-ucmas-blue font-black text-xl hover:bg-blue-50 transition-all disabled:opacity-50 uppercase shadow-md"
                            >
                                Câu tiếp theo ➜
                            </button>
                        ) : (
                            <button 
                                onClick={submitExam}
                                disabled={isInputDisabled}
                                className="w-full px-8 py-5 rounded-2xl bg-ucmas-red text-white font-black text-xl hover:bg-red-700 shadow-2xl transition-all disabled:opacity-50 uppercase tracking-widest"
                            >
                                Nộp bài làm 🏁
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default PracticeSession;
