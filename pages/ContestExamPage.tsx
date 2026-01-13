
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { backend, supabase } from '../services/mockBackend';
import { Contest, Question, ContestSession, Mode, ContestExam } from '../types';

interface ContestExamPageProps {
    user: any;
}

const ContestExamPage: React.FC<ContestExamPageProps> = ({ user }) => {
  const { contestId, mode } = useParams<{ contestId: string, mode: string }>();
  const navigate = useNavigate();
  const currentMode = mode as Mode;

  const [loading, setLoading] = useState(true);
  const [contest, setContest] = useState<Contest | null>(null);
  const [session, setSession] = useState<ContestSession | null>(null);
  const [exam, setExam] = useState<ContestExam | null>(null);
  
  // Exam State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0); // Seconds remaining for CONTEST TOTAL
  const [status, setStatus] = useState<'ready' | 'running' | 'submitted' | 'error'>('ready');

  // Flash/Audio State
  const [flashNumber, setFlashNumber] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
      // Cleanup audio on unmount
      return () => {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
          }
      };
  }, []);

  useEffect(() => {
    const init = async () => {
        if(!contestId) return;
        
        // 1. Check Contest & Session
        const { data: c } = await supabase.from('contests').select('*').eq('id', contestId).single();
        const s = await backend.getMyContestSession(contestId);
        
        if (!c || !s) {
            alert('Không tìm thấy phiên thi.');
            navigate('/contests');
            return;
        }

        // 2. Check if already attempted this section
        const attempt = await backend.getContestSectionAttempt(s.id, currentMode);
        if (attempt) {
            alert('Bạn đã hoàn thành phần thi này rồi!');
            navigate(`/contests/${contestId}`);
            return;
        }

        // 3. Load Exam
        const ex = await backend.getContestExam(contestId, currentMode);
        if (!ex) {
            alert('Đề thi chưa được tải lên.');
            navigate(`/contests/${contestId}`);
            return;
        }

        setContest(c);
        setSession(s);
        setExam(ex);
        setQuestions(ex.questions);

        // Calculate Time Remaining (Based on Contest End Time)
        const now = new Date().getTime();
        const start = new Date(c.start_at).getTime();
        const end = start + c.duration_minutes * 60000;
        const remainingSeconds = Math.floor((end - now) / 1000);

        if (remainingSeconds <= 0) {
            alert('Cuộc thi đã kết thúc.');
            navigate('/contests');
            return;
        }

        setTimeLeft(remainingSeconds);
        setLoading(false);
        setStatus('running'); // Auto start
    };
    init();

    return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [contestId, currentMode]);

  // Timer Countdown
  useEffect(() => {
    if (status === 'running' && timeLeft > 0) {
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    submitExam(true); // Auto submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // Auto Run Sequences based on Mode
  useEffect(() => {
      if (status === 'running' && questions.length > 0) {
          if (currentMode === Mode.FLASH) {
              runFlashSequence(currentQIndex);
          } else if (currentMode === Mode.LISTENING) {
              playAudioSequence(currentQIndex);
          }
      }
  }, [currentQIndex, status]);

  const runFlashSequence = async (qIndex: number) => {
      setIsFlashing(true);
      const q = questions[qIndex];
      
      // Get display speed from specific column OR config OR fallback
      const displaySpeed = exam?.display_seconds_per_number || exam?.config?.display_speed || 1.0;
      const interval = displaySpeed * 1000; 
      
      await new Promise(r => setTimeout(r, 500));
      for (const num of q.operands) {
          setFlashNumber(num);
          await new Promise(r => setTimeout(r, interval));
          setFlashNumber(null);
          await new Promise(r => setTimeout(r, 200));
      }
      setIsFlashing(false);
  };

  const getSpeechRate = (secondsPerItem: number) => {
      // Calculate rate for TTS to match the approximate desired duration per number.
      // Normal speech (rate 1.0) roughly takes 0.6-0.9s per short number in VN.
      // We adjust rate: Higher secondsPerItem -> Slower rate.
      
      // Base assumption: rate 1.0 ~= 0.8s per number
      // rate = 0.8 / secondsPerItem
      const rate = 0.9 / secondsPerItem;
      return Math.min(Math.max(rate, 0.5), 2.5); // Clamp between 0.5x and 2.5x
  };

  const playAudioSequence = (qIndex: number) => {
      setIsPlayingAudio(true);
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }

      const q = questions[qIndex];
      
      // Get read speed from specific column OR config OR fallback
      const readSpeed = exam?.read_seconds_per_number || exam?.config?.read_speed || 2.0;
      
      const text = q.operands.join(', ');
      // Default to Vietnamese for contests
      const lang = 'vi'; 
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
      
      const audio = new Audio(url);
      audio.playbackRate = getSpeechRate(readSpeed);
      
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => {
          setIsPlayingAudio(false);
          console.error("Audio error");
      };

      audioRef.current = audio;
      audio.play().catch(e => {
          console.error("Auto-play blocked", e);
          setIsPlayingAudio(false);
      });
  };

  const submitExam = async (auto: boolean = false) => {
      if (status === 'submitted') return;
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
      
      setStatus('submitted');
      if (!session) return;

      // Duration taken (approx)
      const duration = contest!.duration_minutes * 60 - timeLeft;

      await backend.submitContestSection(session.id, currentMode, questions, answers, duration);
      
      if (auto) alert('Hết giờ! Bài làm đã được tự động nộp.');
      else alert('Nộp bài thành công!');
      
      navigate(`/contests/${contestId}`);
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Đang tải đề thi...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-50">
            <div>
                <h2 className="font-bold text-gray-800">{contest?.name}</h2>
                <div className="text-xs text-gray-500 uppercase font-bold">{currentMode}</div>
            </div>
            <div className="bg-ucmas-red text-white px-4 py-2 rounded-xl font-mono text-2xl font-bold shadow-md">
                {Math.floor(timeLeft/60)}:{((timeLeft%60)).toString().padStart(2,'0')}
            </div>
        </div>

        <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 gap-6">
            
            {/* Question Area */}
            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-10 min-h-[500px]">
                {currentMode === Mode.VISUAL && (
                    <div className="text-center">
                        <div className="text-gray-400 text-sm mb-4">Câu {currentQIndex + 1}</div>
                        <div className="text-6xl font-bold text-ucmas-blue font-mono space-y-2">
                            {questions[currentQIndex].operands.map((op, i) => (
                                <div key={i}>{op}</div>
                            ))}
                        </div>
                        <div className="w-20 h-1 bg-gray-300 mx-auto my-6"></div>
                        <div className="text-6xl font-black text-gray-300">?</div>
                    </div>
                )}
                {currentMode === Mode.FLASH && (
                    <div className="text-center">
                         <div className="text-gray-400 text-sm mb-4">Câu {currentQIndex + 1}</div>
                         <div className="text-[150px] font-black text-ucmas-green">
                             {isFlashing ? flashNumber : 'Checking...'}
                         </div>
                    </div>
                )}
                 {currentMode === Mode.LISTENING && (
                    <div className="text-center">
                         <div className={`w-48 h-48 rounded-full flex items-center justify-center text-7xl text-white shadow-2xl mb-6 transition-all ${isPlayingAudio ? 'bg-ucmas-red scale-105 animate-pulse' : 'bg-ucmas-red shadow-red-100'}`}>
                             🎧
                         </div>
                         <p className="text-gray-500 font-bold">{isPlayingAudio ? 'Đang đọc số...' : 'Đã đọc xong'}</p>
                         {!isPlayingAudio && (
                             <button 
                                onClick={() => playAudioSequence(currentQIndex)}
                                className="mt-4 text-xs font-bold text-ucmas-blue underline"
                             >
                                 Nghe lại (Nếu chưa rõ)
                             </button>
                         )}
                    </div>
                )}
            </div>

            {/* Answer Area */}
            <div className="w-full md:w-80 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <div className="text-center mb-6">
                    <div className="text-sm font-bold text-gray-400 uppercase">Nhập Đáp Án</div>
                    <div className="text-xs text-gray-400">Câu {currentQIndex + 1}</div>
                </div>

                <input 
                    type="number" 
                    autoFocus
                    disabled={isFlashing} // Disable input while flashing
                    value={answers[currentQIndex] || ''}
                    onChange={e => setAnswers({...answers, [currentQIndex]: e.target.value})}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            if (currentQIndex < questions.length - 1) {
                                setCurrentQIndex(p => p+1);
                                if (audioRef.current) audioRef.current.pause();
                            }
                        }
                    }}
                    className="w-full text-center text-4xl font-bold p-4 border-2 border-ucmas-blue rounded-2xl mb-6 outline-none focus:ring-4 focus:ring-blue-100"
                />

                <div className="flex gap-2 mb-6">
                    <button 
                        disabled={currentQIndex === 0}
                        onClick={() => {
                            setCurrentQIndex(p => p-1);
                            if (audioRef.current) audioRef.current.pause();
                        }}
                        className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200"
                    >
                        ← Trước
                    </button>
                    <button 
                        disabled={currentQIndex === questions.length - 1}
                        onClick={() => {
                            setCurrentQIndex(p => p+1);
                            if (audioRef.current) audioRef.current.pause();
                        }}
                        className="flex-1 py-3 bg-ucmas-blue text-white rounded-xl font-bold hover:bg-blue-700"
                    >
                        Sau →
                    </button>
                </div>

                <div className="mt-auto">
                    <div className="grid grid-cols-5 gap-2 mb-6">
                        {questions.map((_, i) => (
                            <div 
                                key={i} 
                                onClick={() => {
                                    setCurrentQIndex(i);
                                    if (audioRef.current) audioRef.current.pause();
                                }}
                                className={`h-8 rounded flex items-center justify-center text-xs font-bold cursor-pointer ${
                                    currentQIndex === i ? 'bg-ucmas-blue text-white' : 
                                    answers[i] ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'
                                }`}
                            >
                                {i+1}
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={() => { if(window.confirm('Nộp bài ngay?')) submitExam(); }}
                        className="w-full py-4 bg-ucmas-red text-white font-bold rounded-xl hover:bg-red-700 shadow-lg"
                    >
                        NỘP BÀI 🏁
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ContestExamPage;
