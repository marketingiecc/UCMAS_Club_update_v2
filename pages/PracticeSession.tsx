
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
    { code: 'ja-JP', label: 'Tiếng Nhật', sample: 'いち に さん し ご' },
];

const PracticeSession: React.FC<PracticeSessionProps> = ({ user }) => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const currentMode = mode as Mode;

  // --- Security / License Check ---
  useEffect(() => {
     if (user.role === 'admin') return;

     const now = new Date();
     const expiry = user.license_expiry ? new Date(user.license_expiry) : null;
     const hasLicense = expiry && expiry > now;
     const isModeAllowed = user.allowed_modes.includes(currentMode);

     if (!hasLicense || !isModeAllowed) {
         // Prevent access
         navigate('/activate');
     }
  }, [user, currentMode, navigate]);


  // --- Theme Config based on Mode ---
  const getTheme = (m: Mode) => {
      switch(m) {
          case Mode.VISUAL: return { color: 'text-ucmas-blue', bg: 'bg-ucmas-blue', icon: '👁️', title: 'Nhìn Tính' };
          case Mode.LISTENING: return { color: 'text-ucmas-red', bg: 'bg-ucmas-red', icon: '🎧', title: 'Nghe Tính' };
          case Mode.FLASH: return { color: 'text-ucmas-green', bg: 'bg-ucmas-green', icon: '⚡', title: 'Flash' };
          default: return { color: 'text-gray-800', bg: 'bg-gray-800', icon: '?', title: 'Practice' };
      }
  };
  const theme = getTheme(currentMode);

  // --- States ---
  const [status, setStatus] = useState<'setup' | 'running' | 'finished'>('setup');
  
  // Setup Form State
  const [formName, setFormName] = useState(user.full_name || '');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [sourceType, setSourceType] = useState<'auto' | 'bank'>('auto');
  const [availableExams, setAvailableExams] = useState<CustomExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  
  // Custom Settings
  const [speed, setSpeed] = useState(1.0); // Seconds per item (Lower is faster)
  const [selectedLang, setSelectedLang] = useState('vi-VN');
  const [isLoadingRule, setIsLoadingRule] = useState(false);
  
  // Exam State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [flashNumber, setFlashNumber] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Review Modal State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  
  // Track replays: Map<QuestionIndex, Count>
  const [playCounts, setPlayCounts] = useState<Record<number, number>>({});

  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize form defaults
  useEffect(() => {
     if (user.full_name) setFormName(user.full_name);
  }, [user.full_name]);

  // Cleanup Audio on unmount
  useEffect(() => {
      return () => {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
          }
      };
  }, []);

  // Update audio speed dynamically
  useEffect(() => {
      if (audioRef.current && isPlayingAudio) {
          audioRef.current.playbackRate = getSpeechRate(speed);
      }
  }, [speed, isPlayingAudio]);

  // Fetch available exams when Source Type or Level changes
  useEffect(() => {
      if (sourceType === 'bank') {
          const fetchExams = async () => {
              const exams = await backend.getCustomExams(currentMode, selectedLevel);
              setAvailableExams(exams);
              if (exams.length > 0) setSelectedExamId(exams[0].id);
              else setSelectedExamId('');
          };
          fetchExams();
      }
  }, [sourceType, selectedLevel, currentMode]);

  // --- Helpers ---
  
  const getGoogleTTSUrl = (text: string, lang: string) => {
      const langCode = lang.split('-')[0]; // vi-VN -> vi
      return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode}&q=${encodeURIComponent(text)}`;
  };

  const startExam = async () => {
    if (!formName) {
        alert("Vui lòng nhập họ và tên!");
        return;
    }

    if (sourceType === 'bank' && !selectedExamId) {
        alert("Vui lòng chọn đề bài từ danh sách.");
        return;
    }

    setIsLoadingRule(true);
    
    try {
        let generatedQuestions: Question[] = [];
        let examTimeLimit = 0;

        if (sourceType === 'auto') {
            // Fetch dynamic rules from backend
            const ruleData = await backend.getLatestExamRule(currentMode);
            const customRules = ruleData ? ruleData.rules_json : null;

            // Config exam
            const config = getExamConfig(currentMode, selectedLevel, customRules);
            generatedQuestions = generateExam(config);
            examTimeLimit = config.timeLimit;
            
        } else {
            // Fetch custom exam
            const exam = await backend.getCustomExamById(selectedExamId);
            if (!exam) throw new Error("Không tìm thấy đề thi.");
            
            // USE QUESTIONS DIRECTLY FROM DB (Already normalized)
            generatedQuestions = exam.questions;
            examTimeLimit = exam.time_limit;
        }
        
        setQuestions(generatedQuestions);
        setTimeLeft(examTimeLimit);
        setStatus('running');
        
        // Reset states
        setCurrentQIndex(0);
        setAnswers({});
        setPlayCounts({});
        setFlashNumber(null);
    } catch (e) {
        console.error("Failed to start exam", e);
        alert("Có lỗi khi tạo đề. Vui lòng thử lại.");
    } finally {
        setIsLoadingRule(false);
    }
  };

  const getSpeechRate = (secondsPerItem: number) => {
      // Audio Playback Rate: 1.0 is normal.
      const rate = 0.9 / secondsPerItem;
      return Math.min(Math.max(rate, 0.5), 2.5); 
  };

  const testVoice = () => {
      const langConfig = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];
      
      // Stop existing
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }
      setIsPlayingAudio(false); 

      const url = getGoogleTTSUrl(langConfig.sample, selectedLang);
      const audio = new Audio(url);
      
      audio.playbackRate = getSpeechRate(speed);
      
      console.log(`Testing Voice: Google TTS, Lang: ${selectedLang}, Rate: ${audio.playbackRate}`);
      audio.play().catch(e => alert("Không thể phát âm thanh. Kiểm tra kết nối mạng."));
  };

  // Helper to check replay limit (Max 2: 1 initial + 1 review)
  const canPlay = (idx: number) => {
      if (currentMode === Mode.VISUAL) return true;
      const count = playCounts[idx] || 0;
      return count < 2; 
  };

  // --- Running Logic ---
  
  // 1. Timer Countdown
  useEffect(() => {
    if (status === 'running' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        // Simple decrement, do not check for finish here to avoid stale closure
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Auto-start Flash/Audio when question changes
  useEffect(() => {
    if (status === 'running') {
      // Reset Audio
      setIsPlayingAudio(false);
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }

      // Auto-play logic for Flash
      // Only auto-play if it's the FIRST time (count is 0)
      const count = playCounts[currentQIndex] || 0;
      
      if (count === 0) {
          if (currentMode === Mode.FLASH) {
            runFlashSequence(currentQIndex);
          }
      }
    }
  }, [currentQIndex, status]);

  const runFlashSequence = async (qIndex: number) => {
    if (!canPlay(qIndex)) return; // Should be handled by UI disabled state, but double check

    setPlayCounts(prev => ({...prev, [qIndex]: (prev[qIndex] || 0) + 1}));
    setIsFlashing(true);
    
    const q = questions[qIndex];
    await new Promise(r => setTimeout(r, 500)); // Pre-delay

    for (const num of q.operands) {
      setFlashNumber(num);
      await new Promise(r => setTimeout(r, speed * 1000));
      setFlashNumber(null);
      await new Promise(r => setTimeout(r, 200)); 
    }
    setIsFlashing(false);
  };

  const playAudio = () => {
    if (isPlayingAudio) return;
    if (!canPlay(currentQIndex)) return;

    setPlayCounts(prev => ({...prev, [currentQIndex]: (prev[currentQIndex] || 0) + 1}));
    setIsPlayingAudio(true);
    
    const q = questions[currentQIndex];
    const text = q.operands.join(', ');
    const url = getGoogleTTSUrl(text, selectedLang);
    
    const audio = new Audio(url);
    audio.playbackRate = getSpeechRate(speed);
    
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = (e) => {
        console.error("Audio error", e);
        setIsPlayingAudio(false);
        alert("Lỗi tải giọng đọc Google.");
    };

    audioRef.current = audio;
    audio.play().catch(e => {
        console.error("Play error", e);
        setIsPlayingAudio(false);
    });
  };

  const submitExam = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause(); 
      
      setStatus('finished');
      
      // Calculate Stats
      let correct = 0;
      let wrong = 0;
      let skipped = 0;
      
      questions.forEach((q, idx) => {
        const ans = answers[idx];
        const isSkipped = !ans || ans.trim() === '';
        const isCorrect = !isSkipped && parseInt(ans) === q.correctAnswer;
        if (isSkipped) skipped++;
        else if (isCorrect) correct++;
        else wrong++;
      });

      // If custom exam, we might not have a full config object, so recreate basic
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
              duration: (questions.length * 300) // Placeholder if time limit varies in custom
          },
          answers
      );
  };

  // 2. Watcher for Timeout (Must be placed after submitExam is defined)
  useEffect(() => {
    if (status === 'running' && timeLeft <= 0) {
        submitExam();
    }
  }, [timeLeft, status]);

  // --- Disable Logic ---
  const isInputDisabled = (currentMode === Mode.FLASH && isFlashing) || 
                          (currentMode === Mode.LISTENING && isPlayingAudio);

  // Auto focus when input becomes enabled
  useEffect(() => {
    if (!isInputDisabled && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isInputDisabled]);

  // --- Renders ---

  if (status === 'setup') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border border-gray-100 relative overflow-hidden">
           {/* Top Icon */}
           <div className={`mx-auto w-20 h-20 rounded-2xl ${theme.bg} text-white flex items-center justify-center text-4xl shadow-lg mb-6`}>
              {theme.icon}
           </div>

           <h2 className="text-center text-2xl font-black text-gray-800 mb-1">
             Luyện Tập <span className={`${theme.color}`}>{theme.title}</span>
           </h2>
           <p className="text-center text-gray-500 text-sm mb-8">
             {currentMode === Mode.VISUAL ? '200' : '30'} câu hỏi • {currentMode === Mode.FLASH ? 'Thẻ số nhanh' : currentMode === Mode.LISTENING ? 'Nghe đọc số' : '8 phút'}
           </p>

           <div className="space-y-5">
              <div>
                 <label className={`block text-xs font-bold ${theme.color} mb-1.5 ml-1`}>👤 Họ và tên <span className="text-red-500">*</span></label>
                 <input 
                   type="text" 
                   value={formName} 
                   onChange={e => setFormName(e.target.value)}
                   placeholder="Nhập họ tên học sinh"
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                 />
              </div>

              <div>
                 <label className={`block text-xs font-bold ${theme.color} mb-1.5 ml-1`}>🎓 Cấp độ</label>
                 <select 
                   value={selectedLevel} 
                   onChange={e => setSelectedLevel(parseInt(e.target.value))}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition appearance-none"
                 >
                    {[1,2,3,4,5,6,7,8,9,10].map(l => <option key={l} value={l}>Cấp {l}</option>)}
                 </select>
              </div>

              {/* Source Selection - Enabled for ALL modes now */}
              <div>
                 <label className={`block text-xs font-bold ${theme.color} mb-1.5 ml-1`}>📄 Nguồn đề</label>
                 <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                       <input type="radio" name="source" checked={sourceType === 'auto'} onChange={() => setSourceType('auto')} className="text-blue-600 focus:ring-blue-500" />
                       🔀 Tự động sinh đề
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                       <input type="radio" name="source" checked={sourceType === 'bank'} onChange={() => setSourceType('bank')} className="text-blue-600 focus:ring-blue-500" />
                       📚 Chọn từ kho đề
                    </label>
                 </div>
              </div>

              {/* Dynamic Exam Selector when Bank is chosen */}
              {sourceType === 'bank' && (
                  <div className="animate-fade-in bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Chọn đề thi</label>
                      <select 
                          value={selectedExamId}
                          onChange={(e) => setSelectedExamId(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      >
                          {availableExams.length === 0 ? (
                              <option value="">-- Không có đề nào cho Cấp {selectedLevel} --</option>
                          ) : (
                              availableExams.map(ex => (
                                  <option key={ex.id} value={ex.id}>{ex.name} ({ex.questions.length} câu)</option>
                              ))
                          )}
                      </select>
                  </div>
              )}

              {/* Language Selection for Listening */}
              {currentMode === Mode.LISTENING && (
                  <div>
                    <label className={`block text-xs font-bold ${theme.color} mb-1.5 ml-1`}>🗣️ Ngôn ngữ giọng đọc</label>
                    <select 
                        value={selectedLang} 
                        onChange={e => setSelectedLang(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition appearance-none"
                    >
                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>
              )}

              {/* Speed Slider for Flash & Listening */}
              {(currentMode === Mode.FLASH || currentMode === Mode.LISTENING) && (
                 <div>
                    <div className="flex justify-between items-center mb-2 ml-1">
                        <label className={`text-xs font-bold ${theme.color}`}>⏱️ Tốc độ hiển thị</label>
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
                className={`w-full ${theme.bg} text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait`}
              >
                 {isLoadingRule ? '⏳ Đang tạo đề...' : '✨ BẮT ĐẦU LUYỆN TẬP'}
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (status === 'finished') {
    const correctCount = questions.filter((q, i) => parseInt(answers[i]) === q.correctAnswer).length;
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <ResultDetailModal 
            isOpen={isReviewOpen} 
            onClose={() => setIsReviewOpen(false)} 
            questions={questions} 
            userAnswers={answers}
        />

        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 text-green-600">
               🏆
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Kết Quả Bài Thi</h2>
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
               <p className="text-xs text-gray-500">Số câu đúng ({percentage}%)</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
               <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="text-ucmas-blue font-bold text-lg">{correctCount}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Đúng</div>
               </div>
               <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="text-ucmas-blue font-bold text-lg">{questions.length - correctCount}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Sai/Bỏ</div>
               </div>
               <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="text-red-500 font-bold text-lg">
                      {Math.floor((getExamConfig(currentMode, selectedLevel).timeLimit - timeLeft)/60)}:
                      {((getExamConfig(currentMode, selectedLevel).timeLimit - timeLeft)%60).toString().padStart(2,'0')}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase">Thời gian</div>
               </div>
            </div>

            <button 
               onClick={() => setIsReviewOpen(true)}
               className="w-full border border-ucmas-blue text-ucmas-blue font-bold py-3 rounded-xl hover:bg-blue-50 transition mb-3 flex items-center justify-center gap-2"
            >
               👁️ Xem lại kết quả
            </button>
            <div className="flex gap-3">
               <button onClick={() => navigate('/dashboard')} className="flex-1 border border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition">
                  🏠 Trang chủ
               </button>
               <button onClick={() => setStatus('setup')} className="flex-1 bg-ucmas-red text-white font-bold py-3 rounded-xl hover:bg-red-700 transition">
                  🔄 Làm lại
               </button>
            </div>
        </div>
      </div>
    );
  }

  // --- Running UI ---
  const currentQ = questions[currentQIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 min-h-[80vh]">
        {/* Sidebar Question Nav */}
        <div className="hidden lg:block w-72 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-fit">
           <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-full ${theme.bg} text-white flex items-center justify-center`}>{theme.icon}</div>
              <div>
                 <div className="text-xs text-gray-500">Thí sinh</div>
                 <div className="font-bold text-gray-800">{formName}</div>
              </div>
           </div>
           
           <div className="bg-gray-50 rounded-xl p-4 mb-4">
               <div className="flex justify-between text-xs mb-2">
                   <span className="text-gray-500">Cấp độ</span>
                   <span className="font-bold text-ucmas-green">Cấp {selectedLevel}</span>
               </div>
               <div className="flex justify-between text-xs">
                   <span className="text-gray-500">Tốc độ</span>
                   <span className="font-bold text-gray-800">{speed}s</span>
               </div>
           </div>

           <div className="mb-4">
              <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
                 <span>Tiến độ</span>
                 <span className="text-ucmas-green">{answers[currentQIndex] ? 'Đã làm' : 'Chưa làm'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-ucmas-blue h-1.5 rounded-full" style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}></div>
              </div>
           </div>

           <div className="text-xs font-bold text-gray-800 mb-3">Câu hỏi</div>
           <div className="grid grid-cols-5 gap-2">
              {questions.map((_, idx) => {
                  // Only allow clicking if question is done (has answer) or is current
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
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                            isActive ? `${theme.bg} text-white shadow-md transform scale-110` :
                            isDone ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
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
            {/* Header Mobile */}
            <div className="lg:hidden flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm">
               <span className="font-bold text-gray-700">Câu {currentQIndex + 1}/{questions.length}</span>
               <span className="text-red-500 font-mono font-bold">{Math.floor(timeLeft/60)}:{((timeLeft%60)).toString().padStart(2,'0')}</span>
            </div>

            <div className="flex-grow bg-white rounded-3xl shadow-sm border border-gray-100 relative flex flex-col overflow-hidden">
                {/* Timer Desktop */}
                <div className="hidden lg:flex absolute top-6 right-6 bg-ucmas-blue text-white px-4 py-2 rounded-xl items-center gap-2 shadow-lg">
                   <span className="text-xs uppercase font-bold opacity-80">Thời gian</span>
                   <span className="text-2xl font-mono font-bold">{Math.floor(timeLeft/60)}:{((timeLeft%60)).toString().padStart(2,'0')}</span>
                </div>

                <div className="absolute top-6 left-6 lg:hidden">
                    <span className="text-gray-400 text-sm">Câu <span className="text-ucmas-blue font-bold text-xl">{currentQIndex+1}</span> / {questions.length}</span>
                </div>
                
                <div className="hidden lg:block absolute top-8 left-1/2 transform -translate-x-1/2 text-gray-400 font-medium">
                    Câu <span className={`text-3xl font-bold ${theme.color} mx-1`}>{currentQIndex + 1}</span> / {questions.length}
                </div>

                {/* Question Area */}
                <div className="flex-grow flex flex-col items-center justify-center p-8">
                    
                    {currentMode === Mode.VISUAL && (
                       <div className="bg-gray-100 p-8 rounded-2xl min-w-[200px] text-center shadow-inner">
                          {currentQ.operands.map((num, i) => (
                             <div key={i} className="text-4xl font-bold text-ucmas-blue mb-2 font-mono tracking-wider">{num}</div>
                          ))}
                          <div className="border-t-4 border-gray-400 w-16 mx-auto mt-4 mb-4"></div>
                          <div className="text-5xl font-black text-ucmas-blue">?</div>
                       </div>
                    )}

                    {currentMode === Mode.FLASH && (
                        <div className="text-center">
                            {isFlashing ? (
                                <div className="text-[150px] font-black text-ucmas-blue leading-none tracking-tighter transition-all transform scale-110">
                                   {flashNumber}
                                </div>
                            ) : (
                                <div 
                                    onClick={() => runFlashSequence(currentQIndex)} 
                                    className={`cursor-pointer group ${!canPlay(currentQIndex) ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <div className="w-24 h-24 bg-ucmas-blue rounded-full flex items-center justify-center text-white text-4xl shadow-xl group-hover:scale-110 transition mx-auto mb-4">
                                       ▶
                                    </div>
                                    <p className="text-gray-400 text-sm">
                                        {canPlay(currentQIndex) ? 'Nhấn để xem lại (Tối đa 2 lần)' : 'Đã hết lượt xem'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {currentMode === Mode.LISTENING && (
                        <div className="text-center">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl text-white shadow-2xl mb-8 transition-all ${isPlayingAudio ? 'bg-ucmas-red scale-110 animate-pulse' : 'bg-ucmas-red'}`}>
                                🎧
                            </div>
                            <button 
                               onClick={playAudio}
                               disabled={isPlayingAudio || !canPlay(currentQIndex)}
                               className="bg-gradient-to-r from-ucmas-red to-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                               {isPlayingAudio ? 'Đang đọc...' : canPlay(currentQIndex) ? '🔊 Bắt đầu nghe' : '🚫 Hết lượt nghe'}
                            </button>
                            <p className="text-red-500 text-xs font-bold mt-4 bg-red-50 inline-block px-3 py-1 rounded">
                                Mỗi câu chỉ được nghe tối đa 2 lần
                            </p>
                        </div>
                    )}
                </div>

                {/* Bottom Input Area */}
                <div className="bg-white border-t border-gray-100 p-6 flex justify-center items-center gap-4 relative z-10">
                    
                    <div className="relative w-full max-w-md">
                        <input 
                          ref={inputRef}
                          type="number" 
                          autoFocus
                          disabled={isInputDisabled}
                          value={answers[currentQIndex] || ''}
                          onChange={(e) => setAnswers(prev => ({...prev, [currentQIndex]: e.target.value}))}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                  e.preventDefault();
                                  // Prevent submission if disabled (though input is disabled, good safeguard)
                                  if (isInputDisabled) return;

                                  // Mark blank if empty to register as done
                                  if (answers[currentQIndex] === undefined) {
                                      setAnswers(prev => ({...prev, [currentQIndex]: ''}));
                                  }

                                  if (currentQIndex < questions.length - 1) {
                                      setCurrentQIndex(p => p+1);
                                      // Stop any media
                                      setIsFlashing(false);
                                      setIsPlayingAudio(false);
                                      if(audioRef.current) audioRef.current.pause();
                                  }
                                  else submitExam();
                              }
                          }}
                          className={`w-full border-2 ${isInputDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : answers[currentQIndex] ? 'border-ucmas-blue bg-blue-50' : 'border-gray-200'} rounded-xl py-3 px-4 text-center text-xl font-bold text-ucmas-blue focus:border-ucmas-blue focus:ring-0 outline-none transition`}
                          placeholder={isInputDisabled ? "Vui lòng lắng nghe/quan sát..." : "Nhập đáp án..."}
                        />
                        {answers[currentQIndex] && !isInputDisabled && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500">✓</div>
                        )}
                    </div>

                    {currentQIndex < questions.length - 1 ? (
                        <button 
                            onClick={() => {
                                // Manual click Next also counts as completing the question even if blank
                                if (answers[currentQIndex] === undefined) {
                                    setAnswers(prev => ({...prev, [currentQIndex]: ''}));
                                }
                                setCurrentQIndex(p => p+1);
                            }}
                            disabled={isInputDisabled}
                            className="px-6 py-3 rounded-xl border border-ucmas-blue text-ucmas-blue font-bold hover:bg-blue-50 transition min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Tiếp theo &gt;
                        </button>
                    ) : (
                        <button 
                            onClick={submitExam}
                            disabled={isInputDisabled}
                            className="px-6 py-3 rounded-xl bg-ucmas-red text-white font-bold hover:bg-red-700 shadow-lg transition min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Nộp bài 🏁
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default PracticeSession;
