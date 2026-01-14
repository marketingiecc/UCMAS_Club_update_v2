
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { practiceService } from '../src/features/practice/services/practiceService';
import { generateExam } from '../services/examService';
import { Mode, Question, UserProfile } from '../types';
import ResultDetailModal from '../components/ResultDetailModal';

interface PracticeSessionExamProps {
  user: UserProfile;
}

const PracticeSessionExam: React.FC<PracticeSessionExamProps> = ({ user }) => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const currentMode = mode as Mode;

  const navState = location.state as { 
    customConfig?: any, 
    examId?: string, 
    predefinedQuestions?: Question[] 
  } | null;

  const [status, setStatus] = useState<'setup' | 'running' | 'finished'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [flashNumber, setFlashNumber] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const theme = {
      [Mode.VISUAL]: { color: 'text-ucmas-blue', bg: 'bg-ucmas-blue', icon: '👁️', title: 'Nhìn Tính' },
      [Mode.LISTENING]: { color: 'text-ucmas-red', bg: 'bg-ucmas-red', icon: '🎧', title: 'Nghe Tính' },
      [Mode.FLASH]: { color: 'text-ucmas-green', bg: 'bg-ucmas-green', icon: '⚡', title: 'Flash' },
  }[currentMode] || { color: 'text-gray-800', bg: 'bg-gray-800', icon: '?', title: 'Luyện Tập' };

  useEffect(() => {
    if (!navState) {
        navigate('/contests');
        return;
    }
    
    let finalQuestions: Question[] = [];
    if (navState.predefinedQuestions && navState.predefinedQuestions.length > 0) {
        finalQuestions = navState.predefinedQuestions;
    } else {
        const config = navState.customConfig;
        finalQuestions = generateExam({
            mode: currentMode,
            level: config.digits || 1,
            numQuestions: config.numQuestions || 10,
            timeLimit: 600,
            numOperandsRange: config.numOperandsRange || [config.operands, config.operands],
            digitRange: config.digitRange || [1, 9],
            flashSpeed: config.flashSpeed || 1000
        });
    }
    
    setQuestions(finalQuestions);
    setTimeLeft(600);
    setStatus('running');
  }, [navState, currentMode, navigate]);

  useEffect(() => {
    if (status === 'running' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => setTimeLeft(prev => {
          if (prev <= 1) {
              submitExam();
              return 0;
          }
          return prev - 1;
      }), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  useEffect(() => {
    if (status === 'running') {
        if (currentMode === Mode.FLASH) runFlashSequence(currentQIndex);
        if (currentMode === Mode.LISTENING) playAudio(currentQIndex);
    }
  }, [currentQIndex, status]);

  const runFlashSequence = async (idx: number) => {
    if (isFlashing) return;
    setIsFlashing(true);
    // Ưu tiên flashSpeed (ms) nếu có, nếu không thì dùng speed (s) * 1000
    const configSpeed = navState?.customConfig?.flashSpeed || (navState?.customConfig?.speed ? navState.customConfig.speed * 1000 : 1000);
    const q = questions[idx];
    for (const num of q.operands) {
      setFlashNumber(num);
      await new Promise(r => setTimeout(r, configSpeed));
      setFlashNumber(null);
      await new Promise(r => setTimeout(r, 150));
    }
    setIsFlashing(false);
  };

  const playAudio = (idx: number) => {
      if (isPlayingAudio) return;
      setIsPlayingAudio(true);
      const q = questions[idx];
      const speed = navState?.customConfig?.speed || 1.0;
      const text = q.operands.join(', ');
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      audio.playbackRate = Math.min(Math.max(0.9 / speed, 0.5), 2.5);
      audio.onended = () => setIsPlayingAudio(false);
      audioRef.current = audio;
      audio.play().catch(() => setIsPlayingAudio(false));
  };

  const submitExam = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
      setStatus('finished');
      
      let correct = 0;
      questions.forEach((q, idx) => {
          if (parseInt(answers[idx]) === q.correctAnswer) correct++;
      });

      await practiceService.savePracticeAttempt({
          userId: user.id,
          examId: navState?.examId,
          mode: currentMode,
          config: navState?.customConfig || {},
          score: { correct, total: questions.length },
          duration: 600 - timeLeft,
          isCreative: !!navState?.customConfig?.isCreative
      });
  };

  if (status === 'setup') return <div className="h-screen flex items-center justify-center font-black text-gray-400 uppercase tracking-widest">Đang khởi tạo...</div>;

  if (status === 'finished') {
    const correctCount = questions.filter((q, i) => parseInt(answers[i]) === q.correctAnswer).length;
    const percentage = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <ResultDetailModal isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} questions={questions} userAnswers={answers} title="Kết quả bài làm" />
        <div className="bg-white rounded-[3rem] shadow-2xl p-10 w-full max-w-lg text-center border border-gray-100">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 animate-bounce">🏆</div>
            <h2 className="text-3xl font-black text-gray-800 mb-2 uppercase tracking-tight">Hoàn thành!</h2>
            <div className="bg-gray-50 rounded-[2.5rem] p-10 mb-10 shadow-inner">
               <div className="text-7xl font-black text-ucmas-blue mb-4">{correctCount}<span className="text-2xl text-gray-300 ml-1">/{questions.length}</span></div>
               <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden mb-4"><div className="bg-ucmas-green h-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div></div>
               <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Độ chính xác {percentage}%</p>
            </div>
            <div className="flex flex-col gap-4">
               <button onClick={() => setIsReviewOpen(true)} className="w-full py-4 bg-white border-2 border-ucmas-blue text-ucmas-blue font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-blue-50 transition">Xem chi tiết</button>
               <button onClick={() => navigate('/contests')} className="w-full py-4 bg-ucmas-blue text-white font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-blue-800 transition shadow-lg">Quay lại</button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 min-h-[85vh] flex flex-col items-center justify-center animate-fade-in">
        <div className="w-full max-w-4xl bg-white rounded-[3.5rem] shadow-2xl border border-gray-100 p-8 lg:p-16 relative">
            <div className="absolute top-10 right-10 flex items-center gap-4">
                 <div className="bg-red-50 text-ucmas-red px-6 py-2.5 rounded-2xl font-mono font-black text-2xl shadow-sm border border-red-100">
                    {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
                 </div>
            </div>
            
            <div className="text-center mb-16">
                <span className="bg-blue-50 text-ucmas-blue px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest border border-blue-100">Câu {currentQIndex + 1} / {questions.length}</span>
                <h3 className="mt-4 text-gray-400 font-bold uppercase text-xs tracking-widest">{theme.title}</h3>
            </div>

            <div className="min-h-[250px] flex items-center justify-center mb-20">
                {currentMode === Mode.VISUAL && (
                   <div className="text-center animate-fade-in">
                      {questions[currentQIndex]?.operands.map((num, i) => (
                         <div key={i} className="text-7xl font-black text-gray-800 mb-2 font-mono tracking-tighter leading-tight">{num}</div>
                      ))}
                      <div className="w-32 h-2 bg-gray-100 mx-auto my-8 rounded-full"></div>
                      <div className="text-7xl font-black text-gray-200">?</div>
                   </div>
                )}
                {currentMode === Mode.FLASH && (
                    <div className="text-[160px] font-black text-ucmas-blue leading-none tracking-tighter transition-all">
                       {flashNumber || <span className="text-gray-100">...</span>}
                    </div>
                )}
                {currentMode === Mode.LISTENING && (
                    <div className={`w-40 h-40 rounded-full flex items-center justify-center text-6xl text-white shadow-2xl transition-all ${isPlayingAudio ? 'bg-ucmas-red scale-105 animate-pulse' : 'bg-ucmas-red/50'}`}>🎧</div>
                )}
            </div>

            <div className="max-w-md mx-auto relative">
                <input 
                  ref={inputRef} type="number" autoFocus disabled={isFlashing || isPlayingAudio}
                  value={answers[currentQIndex] || ''}
                  onChange={(e) => setAnswers({...answers, [currentQIndex]: e.target.value})}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          if (currentQIndex < questions.length - 1) setCurrentQIndex(p => p+1);
                          else submitExam();
                      }
                  }}
                  className="w-full h-24 border-4 border-gray-100 focus:border-ucmas-blue rounded-[2.5rem] text-center text-6xl font-black text-ucmas-blue bg-gray-50 focus:bg-white outline-none transition shadow-inner"
                  placeholder="..."
                />
                <p className="text-center text-[10px] font-bold text-gray-400 uppercase mt-4 tracking-widest">Nhấn Enter để chuyển câu</p>
            </div>
            
            <div className="mt-16 flex justify-between items-center px-10">
                <button onClick={() => setCurrentQIndex(p => Math.max(0, p-1))} className="text-gray-400 font-black uppercase text-xs hover:text-gray-800 transition">← Trước</button>
                <div className="flex gap-2">
                    {questions.map((_, i) => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${currentQIndex === i ? 'bg-ucmas-blue w-8' : answers[i] ? 'bg-blue-200' : 'bg-gray-100'}`}></div>
                    ))}
                </div>
                <button onClick={() => { if(currentQIndex < questions.length - 1) setCurrentQIndex(p => p+1); else submitExam(); }} className="text-ucmas-blue font-black uppercase text-xs hover:scale-105 transition">
                    {currentQIndex < questions.length - 1 ? 'Tiếp ➜' : 'Nộp bài 🏁'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default PracticeSessionExam;
