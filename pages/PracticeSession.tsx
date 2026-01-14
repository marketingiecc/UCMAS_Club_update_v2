
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { generateExam, getExamConfig } from '../services/examService';
import { Mode, Question, UserProfile, CustomExam } from '../types';
import ResultDetailModal from '../components/ResultDetailModal';

interface PracticeSessionProps {
  user: UserProfile;
}

const LANGUAGES = [
    { code: 'vi-VN', label: 'Tiếng Việt', sample: 'Một hai ba bốn năm sáu bảy tám chín mười' },
    { code: 'en-US', label: 'Tiếng Anh', sample: 'One two three four five six seven eight nine ten' },
];

const PracticeSession: React.FC<PracticeSessionProps> = ({ user }) => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const currentMode = mode as Mode;

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
  const [flashNumber, setFlashNumber] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [playCounts, setPlayCounts] = useState<Record<number, number>>({});

  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Xử lý nạp dữ liệu từ tab Luyện thi chuyên sâu
  useEffect(() => {
    const locState = location.state as any;
    if (locState?.customConfig) {
        setFormName(user.full_name);
        setSpeed(locState.customConfig.speed);
        
        if (locState.preloadedQuestions) {
            setQuestions(locState.preloadedQuestions);
            setTimeLeft(locState.customConfig.timeLimit || 300);
            setStatus('running');
        } else {
            // Tự động start nếu là cấu hình tùy chỉnh từ UI
            startExam(locState.customConfig);
        }
    }
  }, [location.state]);

  const theme = {
    [Mode.VISUAL]: { color: 'text-ucmas-blue', bg: 'bg-ucmas-blue', icon: '👁️', title: 'Nhìn Tính' },
    [Mode.LISTENING]: { color: 'text-ucmas-red', bg: 'bg-ucmas-red', icon: '🎧', title: 'Nghe Tính' },
    [Mode.FLASH]: { color: 'text-ucmas-green', bg: 'bg-ucmas-green', icon: '⚡', title: 'Flash' }
  }[currentMode] || { color: 'text-gray-800', bg: 'bg-gray-800', icon: '?', title: 'Luyện Tập' };

  const startExam = async (overrideConfig?: any) => {
    if (!formName) { alert("Vui lòng nhập họ và tên!"); return; }
    setIsLoadingRule(true);
    
    try {
        let generatedQuestions: Question[] = [];
        let examTimeLimit = 0;

        if (overrideConfig) {
            generatedQuestions = generateExam(overrideConfig);
            examTimeLimit = overrideConfig.timeLimit || 300;
        } else if (sourceType === 'auto') {
            const ruleData = await backend.getLatestExamRule(currentMode);
            const config = getExamConfig(currentMode, selectedLevel, ruleData?.rules_json);
            generatedQuestions = generateExam(config);
            examTimeLimit = config.timeLimit;
        } else {
            const exam = await backend.getCustomExamById(selectedExamId);
            if (!exam) throw new Error("Không tìm thấy bài.");
            generatedQuestions = exam.questions;
            examTimeLimit = exam.time_limit;
        }
        
        setQuestions(generatedQuestions);
        setTimeLeft(examTimeLimit);
        setStatus('running');
        setCurrentQIndex(0);
        setAnswers({});
        setPlayCounts({});
    } catch (e) {
        alert("Lỗi khi tạo bài: " + (e as Error).message);
    } finally {
        setIsLoadingRule(false);
    }
  };

  useEffect(() => {
    if (status === 'running' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  useEffect(() => {
    if (status === 'running') {
      if (currentMode === Mode.FLASH) runFlashSequence(currentQIndex);
      if (currentMode === Mode.LISTENING) playAudio();
    }
  }, [currentQIndex, status]);

  const runFlashSequence = async (qIndex: number) => {
    if ((playCounts[qIndex] || 0) >= 2) return;
    setPlayCounts(prev => ({...prev, [qIndex]: (prev[qIndex] || 0) + 1}));
    setIsFlashing(true);
    const q = questions[qIndex];
    for (const num of q.operands) {
      setFlashNumber(num);
      await new Promise(r => setTimeout(r, speed * 1000));
      setFlashNumber(null);
      await new Promise(r => setTimeout(r, 200)); 
    }
    setIsFlashing(false);
  };

  const playAudio = () => {
    if (isPlayingAudio || (playCounts[currentQIndex] || 0) >= 2) return;
    setPlayCounts(prev => ({...prev, [currentQIndex]: (prev[currentQIndex] || 0) + 1}));
    setIsPlayingAudio(true);
    const q = questions[currentQIndex];
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${selectedLang.split('-')[0]}&q=${encodeURIComponent(q.operands.join(', '))}`;
    const audio = new Audio(url);
    audio.playbackRate = 0.9 / speed;
    audio.onended = () => setIsPlayingAudio(false);
    audioRef.current = audio;
    audio.play().catch(() => setIsPlayingAudio(false));
  };

  const submitExam = async () => {
      setStatus('finished');
      let correct = 0, wrong = 0, skipped = 0;
      questions.forEach((q, i) => {
        const ans = answers[i];
        if (!ans) skipped++;
        else if (parseInt(ans) === q.correctAnswer) correct++;
        else wrong++;
      });
      await backend.saveAttempt(user.id, { mode: currentMode, level: selectedLevel }, questions, { correct, wrong, skipped, total: questions.length }, answers);
  };

  if (status === 'setup') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border border-gray-100">
           <div className={`mx-auto w-20 h-20 rounded-2xl ${theme.bg} text-white flex items-center justify-center text-4xl shadow-lg mb-6`}>{theme.icon}</div>
           <h2 className="text-center text-2xl font-black text-gray-800 mb-8 uppercase">Luyện Tập {theme.title}</h2>
           <div className="space-y-5">
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nhập họ tên học sinh" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-blue outline-none" />
              <select value={selectedLevel} onChange={e => setSelectedLevel(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm">
                    {[1,2,3,4,5,6,7,8,9,10].map(l => <option key={l} value={l}>Cấp {l}</option>)}
              </select>
              <button onClick={() => startExam()} className={`w-full ${theme.bg} text-white font-bold py-3.5 rounded-xl shadow-lg uppercase tracking-widest`}>
                 {isLoadingRule ? 'Đang tải...' : 'Bắt đầu luyện tập'}
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (status === 'finished') {
    const correctCount = questions.filter((q, i) => parseInt(answers[i]) === q.correctAnswer).length;
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-1 uppercase">Kết Quả</h2>
            <div className="bg-slate-50 rounded-2xl p-8 mb-8 mt-6">
               <div className="text-5xl font-black text-ucmas-blue">{correctCount}/{questions.length}</div>
            </div>
            <button onClick={() => navigate('/contests')} className="w-full bg-ucmas-blue text-white font-bold py-3 rounded-xl uppercase">Quay lại trang cuộc thi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 min-h-[80vh]">
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-20">
            {currentMode === Mode.VISUAL && (
                <div className="text-center">
                    {questions[currentQIndex].operands.map((num, i) => <div key={i} className="text-7xl font-black text-ucmas-blue mb-4">{num}</div>)}
                    <div className="text-7xl font-black text-gray-200">?</div>
                </div>
            )}
            {currentMode === Mode.FLASH && (
                <div className="text-[180px] font-black text-ucmas-blue">{isFlashing ? flashNumber : '🏁'}</div>
            )}
            {currentMode === Mode.LISTENING && (
                <div className={`w-48 h-48 rounded-full flex items-center justify-center text-7xl text-white ${isPlayingAudio ? 'bg-ucmas-red animate-pulse' : 'bg-ucmas-red/50'}`}>🎧</div>
            )}
        </div>
        <div className="w-80 bg-white rounded-3xl p-8 border border-gray-100 flex flex-col justify-center shadow-lg">
            <h3 className="text-center font-black text-gray-400 uppercase text-xs mb-4 tracking-widest">Câu {currentQIndex + 1}/{questions.length}</h3>
            <input 
                ref={inputRef} type="number" value={answers[currentQIndex] || ''} 
                onChange={e => setAnswers({...answers, [currentQIndex]: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && (currentQIndex < questions.length - 1 ? setCurrentQIndex(p => p+1) : submitExam())}
                className="w-full border-4 border-ucmas-blue rounded-[2rem] py-8 text-center text-6xl font-black text-ucmas-blue outline-none"
            />
            <button onClick={submitExam} className="mt-8 bg-ucmas-red text-white py-4 rounded-xl font-black uppercase shadow-xl hover:bg-red-700 transition">Nộp bài làm 🏁</button>
        </div>
    </div>
  );
};

export default PracticeSession;
