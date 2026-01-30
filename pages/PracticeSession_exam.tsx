
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { practiceService } from '../src/features/practice/services/practiceService';
import { generateExam } from '../services/examService';
import { Mode, Question, UserProfile } from '../types';
import ResultDetailModal from '../components/ResultDetailModal';
import { cancelBrowserSpeechSynthesis, getGoogleTranslateTtsUrl, speakWithBrowserTts } from '../services/googleTts';
import { getLevelIndex } from '../config/levelsAndDifficulty';

interface PracticeSessionExamProps {
  user: UserProfile;
}

const PracticeSessionExam: React.FC<PracticeSessionExamProps> = ({ user }) => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const currentMode = mode as Mode;

  // Lấy config từ state
  const navState = location.state as { 
    customConfig?: any, 
    examId?: string, 
    predefinedQuestions?: Question[];
    returnTo?: { tab: 'elite' | 'mode' | 'path'; mode?: 'visual' | 'audio' | 'flash'; pathDay?: number };
  } | null;
  const returnTo = navState?.returnTo;

  const [status, setStatus] = useState<'setup' | 'running' | 'finished'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(600);
  
  // Flash & Audio states
  const [flashNumber, setFlashNumber] = useState<number | string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashOverlay, setFlashOverlay] = useState<string | null>(null);
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
        const resolvedLevel =
          typeof config?.level === 'string'
            ? getLevelIndex(config.level)
            : typeof config?.level === 'number'
              ? config.level
              : typeof config?.digits === 'number'
                ? config.digits
                : 1;
        const resolvedTimeLimit = typeof config?.timeLimit === 'number' ? config.timeLimit : 600;
        finalQuestions = generateExam({
            mode: currentMode,
            level: resolvedLevel,
            numQuestions: config.numQuestions || 10,
            timeLimit: resolvedTimeLimit,
            numOperandsRange: Array.isArray(config.numOperandsRange) ? config.numOperandsRange : [config.operands, config.operands],
            digitRange: Array.isArray(config.digitRange) ? config.digitRange : [1, 9],
            flashSpeed: config.flashSpeed || 1000
        });
    }
    
    setQuestions(finalQuestions);
    setTimeLeft(typeof navState.customConfig?.timeLimit === 'number' ? navState.customConfig.timeLimit : 600);
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
  }, [status, timeLeft]);

  // Trigger Flash/Audio khi chuyển câu
  useEffect(() => {
    if (status === 'running') {
        // Reset local states
        setFlashNumber(null);
        setFlashOverlay(null);
        setIsFlashing(false);
        setIsPlayingAudio(false);
        if (audioRef.current) audioRef.current.pause();
        cancelBrowserSpeechSynthesis();

        if (currentMode === Mode.FLASH) runFlashSequence(currentQIndex);
        if (currentMode === Mode.LISTENING) playAudio(currentQIndex);
    }
  }, [currentQIndex, status]);

  // Focus input
  useEffect(() => {
      if (!isFlashing && !isPlayingAudio && inputRef.current) {
          inputRef.current.focus();
      }
  }, [isFlashing, isPlayingAudio, currentQIndex]);

  const runFlashSequence = async (idx: number) => {
    if (isFlashing) return;
    setIsFlashing(true);
    
    const configSpeed = navState?.customConfig?.flashSpeed || (navState?.customConfig?.speed ? navState.customConfig.speed * 1000 : 1000);
    const q = questions[idx];
    
    // 1. Countdown
    const countdowns = ['3', '2', '1', 'Bắt đầu'];
    for (const count of countdowns) {
        setFlashOverlay(count);
        await new Promise(r => setTimeout(r, 1000));
    }
    setFlashOverlay(null);

    // 2. Numbers
    for (const num of q.operands) {
      setFlashNumber(num);
      await new Promise(r => setTimeout(r, configSpeed));
    }

    // 3. Equals
    setFlashNumber('=');
    setIsFlashing(false);
  };

  const playSingleAudio = (text: string, rate: number): Promise<void> => {
    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        const url = getGoogleTranslateTtsUrl(text, 'vi');
        const audio = new Audio(url);
        audio.playbackRate = rate;
        audioRef.current = audio;
        
        audio.onended = () => finish();
        audio.onerror = async () => {
          await speakWithBrowserTts(text, 'vi-VN', rate);
          finish();
        };
        audio.play().catch(async () => {
          await speakWithBrowserTts(text, 'vi-VN', rate);
          finish();
        });
    });
  };

  const playAudio = async (idx: number) => {
      if (isPlayingAudio) return;
      setIsPlayingAudio(true);
      const q = questions[idx];
      const speed = navState?.customConfig?.speed || 1.0;
      
      const rate = Math.min(Math.max(0.9 / speed, 0.5), 2.5);
      const text = `Chuẩn bị. ${q.operands.join(', ')}. Bằng.`;
      await playSingleAudio(text, rate);

      setIsPlayingAudio(false);
      audioRef.current = null;
  };

  const submitExam = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
      setStatus('finished');
      
      try {
          let correct = 0;
          questions.forEach((q, idx) => {
              if (parseInt(answers[idx]) === q.correctAnswer) correct++;
          });

          const result = await practiceService.savePracticeAttempt({
              userId: user.id,
              examId: navState?.examId,
              mode: currentMode,
              config: navState?.customConfig || {},
              score: { correct, total: questions.length },
              duration: 600 - timeLeft,
              isCreative: !!navState?.customConfig?.isCreative
          });

          if (!result.success) {
              console.error('Failed to save attempt:', result.error);
              // Still show results even if save fails
          }
      } catch (error: any) {
          console.error('Error submitting exam:', error);
          // Still show results even if save fails
      }
  };

  if (status === 'setup') return <div className="h-screen flex items-center justify-center font-black text-gray-400 uppercase tracking-widest">Đang khởi tạo...</div>;

  if (status === 'finished') {
    // ... (Result UI code - no changes needed)
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
               <button
                 onClick={() => {
                   if (returnTo?.tab === 'elite') {
                     navigate('/training', { state: { openTab: 'elite' as const, openMode: returnTo.mode } });
                     return;
                   }
                   if (returnTo?.tab === 'mode') {
                     navigate('/training', { state: { openTab: 'mode' as const, openMode: returnTo.mode } });
                     return;
                   }
                   if (returnTo?.tab === 'path' && returnTo.pathDay != null) {
                     navigate('/training', { state: { openTab: 'path' as const, pathDay: returnTo.pathDay } });
                     return;
                   }
                   navigate('/training');
                 }}
                 className="w-full py-4 bg-ucmas-blue text-white font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-blue-800 transition shadow-lg"
               >
                 Quay lại
               </button>
            </div>
        </div>
      </div>
    );
  }

  // FLASH MODE: full-screen white focus view (same as PracticeSession)
  if (currentMode === Mode.FLASH) {
    const showAnswerArea = !flashOverlay && !isFlashing && flashNumber === '=';
    const showStart = !flashOverlay && !isFlashing && (flashNumber === null);
    const timeText = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;

    return (
      <div className="fixed inset-0 bg-white z-50">
        <div className="absolute top-4 left-4 text-xs font-heading font-black uppercase tracking-widest text-gray-500">
          Câu {currentQIndex + 1}/{questions.length}
        </div>
        <div className="absolute top-4 right-4 text-sm font-heading font-mono font-black text-ucmas-red bg-white/90 px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
          {timeText}
        </div>

        <div className="h-full w-full flex flex-col items-center justify-center px-4">
          {flashOverlay ? (
            <div className="text-gray-700 font-heading font-black text-[clamp(2rem,8vw,5rem)] uppercase">
              {flashOverlay}
            </div>
          ) : (
            <div className="text-gray-900 font-heading font-black leading-none tracking-tighter text-center text-[clamp(6rem,22vw,18rem)] select-none">
              {flashNumber ?? ''}
            </div>
          )}

          {showStart && (
            <div className="mt-10 text-center">
              <button
                onClick={() => runFlashSequence(currentQIndex)}
                className="px-10 py-5 rounded-2xl font-heading font-black uppercase tracking-widest shadow-lg transition bg-ucmas-blue text-white hover:bg-ucmas-red"
              >
                Bắt đầu
              </button>
            </div>
          )}

          {showAnswerArea && (
            <div className="w-full max-w-xl mt-10">
              <div className="text-center text-xs font-heading font-black uppercase tracking-widest text-gray-400 mb-3">
                Nhập đáp án
              </div>

              <input
                ref={inputRef}
                type="number"
                autoFocus
                disabled={isFlashing || isPlayingAudio}
                value={answers[currentQIndex] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentQIndex]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isFlashing || isPlayingAudio) return;
                    if (answers[currentQIndex] === undefined) setAnswers(prev => ({ ...prev, [currentQIndex]: '' }));
                    if (currentQIndex < questions.length - 1) {
                      setCurrentQIndex(p => p + 1);
                      setFlashNumber(null);
                    } else submitExam();
                  }
                }}
                className="w-full border-4 border-ucmas-blue bg-white rounded-[2rem] py-6 px-6 text-center text-6xl font-heading font-black text-ucmas-blue outline-none shadow-xl"
                placeholder="?"
              />

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setFlashNumber(null);
                    runFlashSequence(currentQIndex);
                  }}
                  className="w-full px-8 py-4 rounded-2xl bg-white border-2 border-gray-300 text-gray-700 font-heading font-black hover:bg-gray-50 transition uppercase shadow-sm"
                >
                  Xem lại
                </button>

                {currentQIndex < questions.length - 1 ? (
                  <button
                    onClick={() => {
                      if (answers[currentQIndex] === undefined) setAnswers(prev => ({ ...prev, [currentQIndex]: '' }));
                      setCurrentQIndex(p => p + 1);
                      setFlashNumber(null);
                    }}
                    className="w-full px-8 py-5 rounded-2xl bg-ucmas-blue text-white font-heading font-black text-xl hover:bg-ucmas-red transition-all uppercase shadow-lg"
                  >
                    Câu tiếp theo ➜
                  </button>
                ) : (
                  <button
                    onClick={submitExam}
                    className="w-full px-8 py-5 rounded-2xl bg-ucmas-red text-white font-heading font-black text-xl hover:bg-red-700 shadow-2xl transition-all uppercase tracking-widest"
                  >
                    Nộp bài làm 🏁
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];
  const isInputDisabled = isFlashing || isPlayingAudio;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 min-h-[80vh]">
        {/* Left Sidebar (hide in Flash for max size) */}
        {currentMode !== Mode.FLASH && (
        <div className="hidden lg:block w-72 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-fit shrink-0">
           <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-full ${theme.bg} text-white flex items-center justify-center shadow-md`}>{theme.icon}</div>
              <div>
                 <div className="text-[10px] text-gray-400 font-heading font-black uppercase tracking-widest">
                   {returnTo?.tab === 'elite' ? 'Luyện thi HSG' : 'Làm bài'}
                 </div>
                 <div className="font-heading font-bold text-gray-800 leading-tight">{user.full_name || user.email}</div>
              </div>
           </div>
           
           <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
               <div className="flex justify-between text-xs mb-2">
                   <span className="text-gray-500 font-heading font-bold uppercase">Chế độ</span>
                   <span className={`font-heading font-bold ${theme.color}`}>{theme.title}</span>
               </div>
               <div className="flex justify-between text-xs mb-2">
                   <span className="text-gray-500 font-heading font-bold uppercase">Câu hỏi</span>
                   <span className="font-heading font-black text-ucmas-blue text-lg">{currentQIndex + 1}/{questions.length}</span>
               </div>
               <div className="flex justify-between text-xs pt-2 border-t border-gray-200 mt-2">
                   <span className="text-gray-500 font-heading font-bold uppercase">Thời gian</span>
                   <span className="font-heading font-mono font-black text-ucmas-red">
                     {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
                   </span>
               </div>
           </div>

           <div className="text-[10px] font-heading font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Danh sách câu</div>
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
                        className={`w-8 h-8 rounded-lg text-xs font-heading font-bold transition shadow-sm ${
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
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
            <div className="lg:hidden flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
               <span className="font-heading font-bold text-gray-700">Câu {currentQIndex + 1}/{questions.length}</span>
               <span className="text-ucmas-red font-heading font-mono font-black text-xl">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
            </div>

            <div className={`flex-grow bg-white rounded-3xl shadow-sm border border-gray-100 relative flex ${currentMode === Mode.FLASH ? 'flex-col' : 'flex-col lg:flex-row'} overflow-hidden min-h-[500px]`}>
                <div className="hidden lg:flex absolute top-6 right-6 bg-ucmas-blue text-white px-5 py-2.5 rounded-2xl items-center gap-2 shadow-xl z-20">
                   <span className="text-[10px] font-heading uppercase font-black tracking-widest opacity-80">Còn lại</span>
                   <span className="text-2xl font-heading font-mono font-black">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative">
                    {/* VISUAL MODE DISPLAY */}
                    {currentMode === Mode.VISUAL && currentQ && (
                       <div className="bg-gray-50 p-12 rounded-[2.5rem] min-w-[300px] text-center shadow-inner border border-gray-100">
                          {currentQ.operands.map((num, i) => (
                             <div key={i} className="text-7xl font-heading font-black text-ucmas-blue mb-4 font-mono tracking-tighter leading-tight">{num}</div>
                          ))}
                          <div className="border-t-4 border-gray-300 w-32 mx-auto mt-6 mb-6"></div>
                          <div className="text-7xl font-heading font-black text-gray-300">?</div>
                       </div>
                    )}

                    {/* FLASH MODE DISPLAY */}
                    {currentMode === Mode.FLASH && (
                        <div className="text-center w-full h-full flex items-center justify-center min-h-[50vh] px-2">
                            {flashOverlay ? (
                                <div className="absolute inset-0 bg-ucmas-blue z-50 flex items-center justify-center">
                                    <div className="text-white font-heading font-black text-[clamp(2.5rem,10vw,6rem)] uppercase animate-bounce">
                                        {flashOverlay}
                                    </div>
                                </div>
                            ) : (isFlashing || flashNumber !== null) ? (
                                <div className="font-heading font-black text-ucmas-blue leading-none tracking-tighter text-[clamp(6rem,22vw,16rem)]">
                                   {flashNumber}
                                </div>
                            ) : (
                                <div className="text-gray-400 font-medium">Đang chuẩn bị...</div>
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
                               onClick={() => playAudio(currentQIndex)}
                               disabled={isPlayingAudio}
                               className="bg-gradient-to-r from-ucmas-red to-red-600 text-white px-12 py-5 rounded-2xl font-heading font-black shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xl uppercase tracking-widest"
                            >
                               {isPlayingAudio ? 'Đang đọc...' : 'Nghe lại'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className={`w-full ${currentMode === Mode.FLASH ? 'lg:w-full' : 'lg:w-[400px]'} border-t lg:border-t-0 lg:border-l border-gray-100 p-6 lg:p-10 flex flex-col justify-center bg-gray-50/50 z-10`}>
                    <div className="text-center mb-8">
                         <h3 className="text-gray-400 font-heading font-black uppercase text-xs tracking-widest mb-2">Nhập đáp án</h3>
                         <div className="text-ucmas-blue font-heading font-bold">Câu số {currentQIndex + 1}</div>
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
                                  if (currentQIndex < questions.length - 1) setCurrentQIndex(p => p+1);
                                  else submitExam();
                              }
                          }}
                          className={`w-full border-4 ${isInputDisabled ? 'bg-gray-100 text-gray-300 border-gray-100' : answers[currentQIndex] ? 'border-ucmas-blue bg-white shadow-xl' : 'border-gray-200 bg-white'} rounded-[2rem] py-8 px-6 text-center text-6xl font-heading font-black text-ucmas-blue focus:border-ucmas-blue outline-none transition-all`}
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
                                className="w-full px-8 py-5 rounded-2xl bg-white border-2 border-ucmas-blue text-ucmas-blue font-heading font-black text-xl hover:bg-blue-50 transition-all disabled:opacity-50 uppercase shadow-md"
                            >
                                Câu tiếp theo ➜
                            </button>
                        ) : (
                            <button 
                                onClick={submitExam}
                                disabled={isInputDisabled}
                                className="w-full px-8 py-5 rounded-2xl bg-ucmas-red text-white font-heading font-black text-xl hover:bg-red-700 shadow-2xl transition-all disabled:opacity-50 uppercase tracking-widest"
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

export default PracticeSessionExam;
