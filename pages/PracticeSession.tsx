import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { generateExam, getExamConfig } from '../services/examService';
import { Mode, Question, AttemptResult } from '../types';

interface PracticeSessionProps {
  userId: string;
  userName?: string;
  studentCode?: string;
}

const PracticeSession: React.FC<PracticeSessionProps> = ({ userId, userName, studentCode }) => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const currentMode = mode as Mode;

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
  const [formName, setFormName] = useState(userName || '');
  const [formCode, setFormCode] = useState(studentCode || '');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [sourceType, setSourceType] = useState<'auto' | 'bank'>('auto');
  const [speed, setSpeed] = useState(1.0); // Seconds

  // Exam State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [flashNumber, setFlashNumber] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Initialize form defaults
  useEffect(() => {
     if (userName) setFormName(userName);
     if (studentCode) setFormCode(studentCode);
  }, [userName, studentCode]);

  // --- Helpers ---
  const startExam = () => {
    if (!formName) {
        alert("Vui lòng nhập họ và tên!");
        return;
    }

    // Config exam
    const config = getExamConfig(currentMode, selectedLevel);
    // Adjust speed if custom set (for Flash/Listening)
    if (currentMode !== Mode.VISUAL) {
        config.flashSpeed = speed * 1000;
        // Logic adjustment for listening pause could go here
    }

    const generatedQuestions = generateExam(config);
    setQuestions(generatedQuestions);
    setTimeLeft(config.timeLimit);
    setStatus('running');
    
    // Reset states
    setCurrentQIndex(0);
    setAnswers({});
    setFlashNumber(null);
  };

  // --- Running Logic ---
  useEffect(() => {
    if (status === 'running' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Auto-start Flash/Audio when question changes
  useEffect(() => {
    if (status === 'running') {
      if (currentMode === Mode.FLASH) {
        runFlashSequence(currentQIndex);
      } else if (currentMode === Mode.LISTENING) {
        // Reset audio state, user must click play
        setIsPlayingAudio(false);
      }
    }
  }, [currentQIndex, status]);

  const runFlashSequence = async (qIndex: number) => {
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
    setIsPlayingAudio(true);
    const q = questions[currentQIndex];
    
    // Very basic browser TTS for demo.
    // In production, use pre-recorded MP3s or a better TTS API (Google Cloud TTS).
    // Browser TTS often reads "1, 2" as "One, Two" or Vietnamese equivalent.
    
    const utterance = new SpeechSynthesisUtterance();
    utterance.lang = 'vi-VN';
    // Create a string with pauses
    utterance.text = q.operands.join('. '); 
    utterance.rate = 1.5 / speed; // Approximate rate adjustment
    utterance.onend = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  const submitExam = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus('finished');
      
      // Calculate Stats
      let correct = 0;
      let wrong = 0;
      let skipped = 0;
      const details = questions.map((q, idx) => {
        const ans = answers[idx];
        const isSkipped = !ans;
        const isCorrect = !isSkipped && parseInt(ans) === q.correctAnswer;
        if (isSkipped) skipped++;
        else if (isCorrect) correct++;
        else wrong++;
        return { question_no: idx+1, user_answer: ans || null, correct_answer: q.correctAnswer, is_correct: isCorrect };
      });

      // Save
      await backend.saveAttempt({
          id: crypto.randomUUID(),
          user_id: userId,
          mode: currentMode,
          level: selectedLevel,
          score_correct: correct,
          score_wrong: wrong,
          score_skipped: skipped,
          score_total: questions.length,
          duration_seconds: getExamConfig(currentMode, selectedLevel).timeLimit - timeLeft,
          created_at: new Date().toISOString(),
          details
      });
  };

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
                 <label className={`block text-xs font-bold ${theme.color} mb-1.5 ml-1`}># Mã học sinh</label>
                 <input 
                   type="text" 
                   value={formCode} 
                   onChange={e => setFormCode(e.target.value)}
                   placeholder="Nhập mã học sinh (tùy chọn)"
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

              {(currentMode === Mode.FLASH || currentMode === Mode.LISTENING) && (
                 <div>
                    <div className="flex justify-between mb-1.5 ml-1">
                        <label className={`block text-xs font-bold ${theme.color}`}>⏱️ Tốc độ hiển thị</label>
                        <span className={`text-xs font-bold ${theme.color}`}>{speed}s</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.25" 
                      max="3.0" 
                      step="0.25" 
                      value={speed} 
                      onChange={e => setSpeed(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                       <span>Nhanh (0.25s)</span>
                       <span>Chậm (3s)</span>
                    </div>
                 </div>
              )}

              <button 
                onClick={startExam}
                className={`w-full ${theme.bg} text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition mt-4 flex items-center justify-center gap-2`}
              >
                 ✨ BẮT ĐẦU LUYỆN TẬP
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
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 text-green-600">
               🏆
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Kết Quả Bài Thi</h2>
            <p className="text-gray-500 text-sm mb-6">{formName} • Cấp {selectedLevel}</p>

            <div className="flex justify-center gap-1 mb-2 text-yellow-400 text-2xl">
               {[1,2,3,4,5].map(s => <span key={s}>{percentage >= s*20 ? '★' : '☆'}</span>)}
            </div>
            <p className="text-ucmas-blue font-bold text-sm mb-8">Cần cố gắng hơn</p>

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

            <button className="w-full border border-ucmas-blue text-ucmas-blue font-bold py-3 rounded-xl hover:bg-blue-50 transition mb-3">
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
        {/* Sidebar Question Nav (Visual Mode Mainly, but shown for all as per screenshot) */}
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
                   <span className="text-gray-500">Mã học sinh</span>
                   <span className="font-bold text-gray-800">{formCode || '---'}</span>
               </div>
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
              {questions.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => !isFlashing && setCurrentQIndex(idx)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                        currentQIndex === idx ? `${theme.bg} text-white shadow-md transform scale-110` :
                        answers[idx] ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                     {idx + 1}
                  </button>
              ))}
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
                                <div onClick={() => runFlashSequence(currentQIndex)} className="cursor-pointer group">
                                    <div className="w-24 h-24 bg-ucmas-blue rounded-full flex items-center justify-center text-white text-4xl shadow-xl group-hover:scale-110 transition mx-auto mb-4">
                                       ▶
                                    </div>
                                    <p className="text-gray-400 text-sm">Nhấn để xem lại (Chỉ Flash)</p>
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
                               disabled={isPlayingAudio}
                               className="bg-gradient-to-r from-ucmas-red to-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
                            >
                               {isPlayingAudio ? 'Đang đọc...' : '🔊 Bắt đầu nghe'}
                            </button>
                            <p className="text-red-500 text-xs font-bold mt-4 bg-red-50 inline-block px-3 py-1 rounded">Mỗi câu chỉ được nghe 1 lần!</p>
                        </div>
                    )}
                </div>

                {/* Bottom Input Area */}
                <div className="bg-white border-t border-gray-100 p-6 flex justify-center items-center gap-4 relative z-10">
                    <button 
                        onClick={() => {
                             if(currentQIndex > 0) {
                                 setCurrentQIndex(p => p-1);
                                 if(currentMode === Mode.LISTENING) setIsPlayingAudio(false);
                             }
                        }}
                        disabled={currentQIndex === 0}
                        className="px-6 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 disabled:opacity-30 transition"
                    >
                        &lt; Câu trước
                    </button>
                    
                    <div className="relative w-full max-w-md">
                        <input 
                          type="number" 
                          autoFocus
                          value={answers[currentQIndex] || ''}
                          onChange={(e) => setAnswers(prev => ({...prev, [currentQIndex]: e.target.value}))}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                  if (currentQIndex < questions.length - 1) setCurrentQIndex(p => p+1);
                                  else submitExam();
                              }
                          }}
                          className={`w-full border-2 ${answers[currentQIndex] ? 'border-ucmas-blue bg-blue-50' : 'border-gray-200'} rounded-xl py-3 px-4 text-center text-xl font-bold text-ucmas-blue focus:border-ucmas-blue focus:ring-0 outline-none transition`}
                          placeholder="Nhập đáp án..."
                        />
                        {answers[currentQIndex] && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500">✓</div>
                        )}
                    </div>

                    {currentQIndex < questions.length - 1 ? (
                        <button 
                            onClick={() => setCurrentQIndex(p => p+1)}
                            className="px-6 py-3 rounded-xl border border-ucmas-blue text-ucmas-blue font-bold hover:bg-blue-50 transition min-w-[120px]"
                        >
                            Câu sau &gt;
                        </button>
                    ) : (
                        <button 
                            onClick={submitExam}
                            className="px-6 py-3 rounded-xl bg-ucmas-red text-white font-bold hover:bg-red-700 shadow-lg transition min-w-[120px]"
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