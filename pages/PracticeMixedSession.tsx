
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/mockBackend';
import { practiceService } from '../src/features/practice/services/practiceService';
import { Mode, Question, UserProfile } from '../types';
import { cancelBrowserSpeechSynthesis, buildListeningPhraseVi, playStableTts } from '../services/googleTts';

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

  const clampSpeedSeconds = (v: number) => Math.min(1.5, Math.max(0.1, v));

  // Filter State
  const [selectedMode, setSelectedMode] = useState<Mode | 'all'>('all');
  const [digits, setDigits] = useState<number>(2);
  const [rows, setRows] = useState<number>(3);
  const [speed, setSpeed] = useState<number>(1.0);
  const TTS_LANG: 'vi-VN' = 'vi-VN';

  // Session State
  const [phase, setPhase] = useState<'setup' | 'playing' | 'result'>('setup');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');

  // Flash/Audio State
  const [flashNumber, setFlashNumber] = useState<number | string | null>(null);
  const [flashOverlay, setFlashOverlay] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlayCount, setAudioPlayCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

    setPhase('setup'); // Keep waiting UI if needed or show loading spinner locally

    // Fetch random question from service
    const q = await practiceService.getRandomMixedQuestion(examId, {
      mode: selectedMode,
      digits: digits,
      rows: rows
    });

    if (!q) {
      alert(`Không tìm thấy câu hỏi nào phù hợp với: ${selectedMode !== 'all' ? selectedMode : 'Tất cả'}, ${digits} chữ số, ${rows} dòng.`);
      return;
    }

    // Adapt question to Type
    const questionObj: Question = {
      id: q.id,
      operands: q.operands,
      correctAnswer: q.correctAnswer,
      mode: q.mode
    };

    setCurrentQuestion(questionObj);
    setUserAnswer('');
    setPhase('playing');
    setAudioPlayCount(0);

    if (questionObj.mode === Mode.FLASH) {
      setTimeout(() => runFlashSequence(questionObj), 500);
    } else if (questionObj.mode === Mode.LISTENING) {
      setTimeout(() => runAudioSequence(questionObj), 500);
    }
  };

  // -- FLASH LOGIC --
  const runFlashSequence = async (q: Question) => {
    setIsFlashing(true);
    const countdowns = ['3...', '2...', '1...', 'Bắt Đầu'];
    for (const c of countdowns) {
      setFlashOverlay(c);
      await new Promise(r => setTimeout(r, 1000));
    }
    setFlashOverlay(null);
    await new Promise(r => setTimeout(r, 1000));

    for (const num of q.operands) {
      setFlashNumber(num);
      await new Promise(r => setTimeout(r, speed * 1000));
    }
    setFlashNumber('=');
    setIsFlashing(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // -- AUDIO LOGIC --
  const runAudioSequence = async (q: Question) => {
    if (isPlayingAudio) return;
    // Policy: auto-play once + one replay (total 2)
    if (audioPlayCount >= 2) return;
    setAudioPlayCount(c => c + 1);
    setIsPlayingAudio(true);
    cancelBrowserSpeechSynthesis();

    // Adjust rate based on speed; use Vietnamese number words so TTS reads in Vietnamese
    const rate = Math.min(Math.max(0.9 / speed, 0.5), 2.5);
    const fullText = buildListeningPhraseVi(q.operands);
    await playStableTts(fullText, TTS_LANG, rate, {
      onAudio: (a) => {
        audioRef.current = a;
      },
    });

    setIsPlayingAudio(false);
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (!currentQuestion) return;
    setPhase('result');
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500">⏳ Đang tải đề thi...</div>;

  if (errorMsg) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-red-500 font-bold text-xl">{errorMsg}</div>
      <button onClick={() => navigate('/contests')} className="px-6 py-2 bg-gray-200 rounded-lg font-bold">Quay lại</button>
    </div>
  );

  // FLASH MODE: full-screen white focus view (when playing)
  if (phase === 'playing' && currentQuestion?.mode === Mode.FLASH) {
    const showAnswerArea = !flashOverlay && !isFlashing && flashNumber === '=';
    const showStart = !flashOverlay && !isFlashing && flashNumber === null;
    const isInputDisabled = !!flashOverlay || isFlashing;

    return (
      <div className="fixed inset-0 bg-white z-50">
        <button
          onClick={() => navigate('/contests')}
          className="absolute top-4 left-4 text-gray-500 hover:text-gray-900 font-bold uppercase text-xs tracking-widest"
        >
          ← Thoát
        </button>
        <div className="absolute top-4 right-4 text-xs font-black uppercase tracking-widest text-gray-500">
          {examName} • Flash
        </div>

        <div className="h-full w-full flex flex-col items-center justify-center px-4">
          {flashOverlay ? (
            <div
              className={`text-gray-900 font-heading font-normal leading-none tracking-[0.06em] text-center ${flashOverlay === 'Bắt Đầu'
                ? 'text-[clamp(5.18rem,18.72vw,15.55rem)]'
                : 'text-[clamp(6.48rem,23.4vw,19.44rem)]'
                } select-none tabular-nums uppercase`}
            >
              {flashOverlay}
            </div>
          ) : (
            <div className="text-gray-900 font-heading font-bold leading-none tracking-[0.06em] text-center text-[clamp(7.2rem,26vw,21.6rem)] select-none tabular-nums">
              {flashNumber ?? ''}
            </div>
          )}

          {showStart && (
            <div className="mt-10 text-center">
              <button
                onClick={() => runFlashSequence(currentQuestion)}
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
                disabled={isInputDisabled}
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="?"
                className="w-full border-4 border-ucmas-blue bg-white rounded-[2rem] py-6 px-6 text-center text-6xl font-heading font-black text-ucmas-blue outline-none shadow-xl"
              />

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setFlashNumber(null);
                    runFlashSequence(currentQuestion);
                  }}
                  className="w-full px-8 py-4 rounded-2xl bg-white border-2 border-gray-300 text-gray-700 font-heading font-black hover:bg-gray-50 transition uppercase shadow-sm"
                >
                  Xem lại
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!userAnswer}
                  className="w-full px-8 py-5 rounded-2xl bg-ucmas-blue text-white font-heading font-black text-xl hover:bg-ucmas-red transition-all disabled:opacity-50 uppercase shadow-lg"
                >
                  Trả lời ➜
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="max-w-4xl w-full bg-white rounded-[3rem] shadow-2xl border border-gray-100 p-8 lg:p-12 relative overflow-hidden">

        {/* Header */}
        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
        <button onClick={() => navigate('/contests')} className="absolute top-8 left-8 text-gray-400 hover:text-gray-800 font-bold uppercase text-xs tracking-widest">← Thoát</button>
        <div className="text-center mb-10 mt-6">
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">{examName}</h2>
          <div className="text-xs font-bold text-purple-600 bg-purple-50 inline-block px-3 py-1 rounded-full mt-2 uppercase tracking-widest">Luyện tập hỗn hợp</div>
        </div>

        {/* SETUP PHASE */}
        {phase === 'setup' && (
          <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chế độ thi</label>
                <select value={selectedMode} onChange={e => setSelectedMode(e.target.value as any)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-800 border-2 border-transparent focus:border-purple-500 outline-none">
                  <option value="all">🔄 Tất cả (Ngẫu nhiên)</option>
                  <option value={Mode.VISUAL}>👁️ Nhìn Tính</option>
                  <option value={Mode.LISTENING}>🎧 Nghe Tính</option>
                  <option value={Mode.FLASH}>⚡ Flash Anzan</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tốc độ (s/số)</label>
                <input type="number" step="0.1" min="0.1" max="1.5" value={speed} onChange={e => setSpeed(clampSpeedSeconds(parseFloat(e.target.value)))} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-800 border-2 border-transparent focus:border-purple-500 outline-none text-center" />
              </div>
            </div>

            {/* Ngôn ngữ: cố định tiếng Việt */}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số chữ số</label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(d => (
                    <button key={d} onClick={() => setDigits(d)} className={`w-10 h-10 rounded-xl font-bold transition ${digits === d ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số dòng tính</label>
                <div className="flex gap-2 justify-center flex-wrap">
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                    <button key={r} onClick={() => setRows(r)} className={`w-10 h-10 rounded-xl font-bold transition ${rows === r ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleStart} className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xl shadow-xl transition transform active:scale-95 uppercase tracking-widest">
              Bắt đầu luyện tập 🚀
            </button>

            <p className="text-center text-xs text-gray-400 italic">Hệ thống sẽ chọn ngẫu nhiên 1 câu hỏi phù hợp với cấu hình trên.</p>
          </div>
        )}

        {/* PLAYING PHASE */}
        {phase === 'playing' && currentQuestion && (
          <div className="max-w-2xl mx-auto text-center space-y-10 animate-fade-in">
            <div className="flex justify-center items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${currentQuestion.mode === Mode.VISUAL ? 'bg-blue-100 text-blue-700' : currentQuestion.mode === Mode.LISTENING ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {currentQuestion.mode === Mode.VISUAL ? 'Nhìn Tính' : currentQuestion.mode === Mode.LISTENING ? 'Nghe Tính' : 'Flash'}
              </span>
              {(isFlashing || isPlayingAudio) && <span className="text-xs font-bold text-gray-400 animate-pulse">Running...</span>}
            </div>

            <div className={`min-h-[250px] flex items-center justify-center relative ${currentQuestion.mode === Mode.FLASH ? 'min-h-[45vh]' : ''}`}>
              {currentQuestion.mode === Mode.VISUAL && (() => {
                const count = currentQuestion.operands.length;
                const textClass =
                  count >= 14 ? 'text-xl md:text-2xl' :
                    count >= 11 ? 'text-2xl md:text-3xl' :
                      count >= 8 ? 'text-3xl md:text-4xl' :
                        count >= 6 ? 'text-4xl md:text-5xl' :
                          'text-5xl md:text-6xl';
                return (
                  <div className="flex flex-col items-center">
                    {currentQuestion.operands.map((n, i) => (
                      <div key={i} className={`${textClass} font-black text-gray-800 font-mono leading-tight`}>{n}</div>
                    ))}
                    <div className="w-20 h-1 bg-gray-300 mt-4 mb-2"></div>
                  </div>
                );
              })()}

              {currentQuestion.mode === Mode.FLASH && (
                <div className="font-heading font-bold text-green-600 text-[clamp(6rem,24vw,16.8rem)] leading-none tracking-[0.06em] text-center px-2 tabular-nums">
                  {flashOverlay ? (
                    <span
                      className={`text-purple-600 ${flashOverlay === 'Bắt Đầu'
                          ? 'text-[clamp(4.32rem,17.28vw,12.1rem)]'
                          : 'text-[clamp(5.4rem,21.6vw,15.12rem)]'
                        } uppercase font-heading font-normal leading-none tracking-[0.06em] tabular-nums`}
                    >
                      {flashOverlay}
                    </span>
                  ) : flashNumber !== null ? (
                    flashNumber
                  ) : isFlashing ? (
                    ''
                  ) : (
                    <span className="text-gray-300 text-[clamp(3rem,12vw,7rem)] cursor-pointer hover:text-green-500" onClick={() => runFlashSequence(currentQuestion)}>
                      ⟳
                    </span>
                  )}
                </div>
              )}

              {currentQuestion.mode === Mode.LISTENING && (
                <div
                  className={`w-40 h-40 rounded-full flex items-center justify-center text-6xl text-white shadow-2xl transition-all ${isPlayingAudio
                    ? 'bg-red-500 scale-105 animate-pulse'
                    : audioPlayCount >= 2
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-red-400 cursor-pointer hover:bg-red-500'
                    }`}
                  onClick={() => !isPlayingAudio && audioPlayCount < 2 && runAudioSequence(currentQuestion)}
                  title={audioPlayCount >= 2 ? 'Đã hết lượt nghe' : 'Nghe lại (1 lần)'}
                >
                  🎧
                </div>
              )}
            </div>

            <div className="relative max-w-xs mx-auto">
              <input
                ref={inputRef}
                type="number"
                disabled={isFlashing || isPlayingAudio}
                autoFocus
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="?"
                className="w-full h-20 text-center text-5xl font-black bg-gray-50 border-4 border-gray-100 focus:border-purple-500 rounded-3xl outline-none transition"
              />
              <button onClick={handleSubmit} disabled={!userAnswer} className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl opacity-50 hover:opacity-100">⏎</button>
            </div>
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === 'result' && currentQuestion && (
          <div className="max-w-lg mx-auto text-center space-y-10 animate-fade-in">
            <div className="text-8xl mb-4">
              {parseInt(userAnswer) === currentQuestion.correctAnswer ? '🎉' : '❌'}
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-3xl">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Đáp án của bạn</p>
                <p className={`text-4xl font-black ${parseInt(userAnswer) === currentQuestion.correctAnswer ? 'text-green-600' : 'text-red-500'}`}>{userAnswer}</p>
              </div>
              <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Đáp án đúng</p>
                <p className="text-4xl font-black text-purple-700">{currentQuestion.correctAnswer}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setPhase('setup')} className="flex-1 py-4 border-2 border-gray-200 hover:border-gray-400 text-gray-600 rounded-2xl font-bold uppercase text-xs tracking-widest">
                ⚙️ Cấu hình lại
              </button>
              <button onClick={handleStart} className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg">
                🔄 Làm câu khác
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PracticeMixedSession;
