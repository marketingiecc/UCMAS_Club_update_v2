
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { backend, supabase } from '../services/mockBackend';
import { Contest, Question, ContestSession, Mode, ContestExam, UserProfile } from '../types';
import { cancelBrowserSpeechSynthesis, buildListeningPhraseVi, playGoogleTranslateTts } from '../services/googleTts';

interface ContestExamPageProps {
  user: UserProfile;
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
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState<'ready' | 'running' | 'submitted' | 'error'>('ready');

  // Flash/Audio State
  type FlashFrame = { value: number | string; token: number };
  type FlashOverlayState =
    | null
    | { kind: 'intro'; digits: number; rows: number; secondsPerItem: number }
    | { kind: 'countdown'; text: string };

  const [flashFrame, setFlashFrame] = useState<FlashFrame | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashOverlay, setFlashOverlay] = useState<FlashOverlayState>(null);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlayCounts, setAudioPlayCounts] = useState<Record<number, number>>({});

  const audioPlayCountsRef = useRef<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      cancelBrowserSpeechSynthesis();
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!contestId) return;

      const { data: c } = await supabase.from('contests').select('*').eq('id', contestId).single();
      const s = await backend.getMyContestSession(contestId);

      if (!c || !s) {
        alert('Không tìm thấy phiên thi.');
        navigate('/contests');
        return;
      }

      const attempt = await backend.getContestSectionAttempt(s.id, currentMode);
      if (attempt) {
        alert('Bạn đã hoàn thành phần thi này rồi!');
        navigate(`/contests/${contestId}`);
        return;
      }

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
      setStatus('running');
    };
    init();

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [contestId, currentMode]);

  useEffect(() => {
    if (status === 'running' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            submitExam(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, timeLeft]);

  useEffect(() => {
    if (status === 'running' && questions.length > 0) {
      // Reset states when question index changes
      setFlashFrame(null);
      setFlashOverlay(null);
      setIsFlashing(false);
      setIsPlayingAudio(false);
      cancelBrowserSpeechSynthesis();

      if (currentMode === Mode.FLASH) {
        runFlashSequence(currentQIndex);
      } else if (currentMode === Mode.LISTENING) {
        playAudioSequence(currentQIndex, false);
      }
      setShowResult(false);
    }
  }, [currentQIndex, status]);

  // Focus Input
  useEffect(() => {
    if (!isFlashing && !isPlayingAudio && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFlashing, isPlayingAudio, currentQIndex]);

  const formatSecondsVi = (s: number) => {
    if (!Number.isFinite(s)) return String(s);
    const rounded = Math.round(s * 10) / 10;
    return String(rounded).replace(/\.0$/, '');
  };
  const getFlashMeta = (q: Question, secondsPerItem: number) => {
    const rows = Array.isArray(q?.operands) ? q.operands.length : 0;
    const digitCounts = (q?.operands || []).map((op) => {
      const onlyDigits = String(op).replace(/[^\d]/g, '');
      return Math.max(1, onlyDigits.length);
    });
    const digits = digitCounts.length ? Math.max(...digitCounts) : 1;
    return { digits, rows, secondsPerItem };
  };

  const runFlashSequence = async (qIndex: number) => {
    setIsFlashing(true);
    const q = questions[qIndex];
    const displaySpeed = exam?.display_seconds_per_number || exam?.config?.display_speed || 1.0;
    const interval = displaySpeed * 1000;

    // Preload calculation font to avoid first digits rendering in fallback font
    const fontReadyPromise = (async () => {
      try {
        if (typeof document === 'undefined') return;
        await document.fonts.load('1em DnEalianManuscript');
        await document.fonts.ready;
      } catch { /* ignore */ }
    })();

    // 0. Intro: thông tin phép tính
    const meta = getFlashMeta(q, displaySpeed);
    setFlashOverlay({ kind: 'intro', ...meta });
    await new Promise(r => setTimeout(r, 3000));

    // 1. Countdown
    const countdowns = ['3...', '2...', '1...', 'Bắt Đầu'];
    for (const text of countdowns) {
      setFlashOverlay({ kind: 'countdown', text });
      await new Promise(r => setTimeout(r, 1000));
    }
    setFlashOverlay(null);
    await new Promise(r => setTimeout(r, 1000));

    // 2. Numbers (giữ đúng timing interval; chỉ thêm hiệu ứng qua CSS)
    await fontReadyPromise;
    let token = 0;
    for (const num of q.operands) {
      token += 1;
      setFlashFrame({ value: num, token });
      await new Promise(r => setTimeout(r, interval));
    }

    // 3. Equals
    token += 1;
    setFlashFrame({ value: '=', token });
    setIsFlashing(false);
  };

  const getSpeechRate = (secondsPerItem: number) => {
    const rate = 0.9 / secondsPerItem;
    return Math.min(Math.max(rate, 0.5), 2.5);
  };

  const playSingleAudio = async (text: string, rate: number): Promise<void> => {
    const lang = 'vi-VN';
    await playGoogleTranslateTts(text, lang, rate, {
      onAudio: (a) => {
        audioRef.current = a;
      },
    });
  };

  const getPlayCount = (qIndex: number) => audioPlayCountsRef.current[qIndex] || 0;
  const bumpPlayCount = (qIndex: number) => {
    audioPlayCountsRef.current = { ...audioPlayCountsRef.current, [qIndex]: getPlayCount(qIndex) + 1 };
    setAudioPlayCounts(audioPlayCountsRef.current);
  };

  const playAudioSequence = async (qIndex: number, force: boolean) => {
    if (isPlayingAudio) return;
    const count = getPlayCount(qIndex);
    // Policy: auto-play only once; allow ONE replay (total 2 plays).
    if (!force && count >= 1) return;
    if (count >= 2) return;

    bumpPlayCount(qIndex);
    setIsPlayingAudio(true);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const q = questions[qIndex];
    const readSpeed = exam?.read_seconds_per_number || exam?.config?.read_speed || 2.0;
    const rate = getSpeechRate(readSpeed);
    const text = buildListeningPhraseVi(q.operands);
    await playSingleAudio(text, rate);

    setIsPlayingAudio(false);
  };

  const submitExam = async (auto: boolean = false) => {
    if (status === 'submitted') return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioRef.current) audioRef.current.pause();

    setStatus('submitted');
    if (!session || !contest) return;

    try {
      const duration = contest.duration_minutes * 60 - timeLeft;
      await backend.submitContestSection(session.id, currentMode, questions, answers, duration);

      if (auto) alert('Hết giờ! Bài làm đã được tự động nộp.');
      else alert('Nộp bài thành công!');

      navigate(`/contests/${contestId}`);
    } catch (error: any) {
      console.error('Error submitting exam:', error);
      alert('Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.');
      setStatus('running'); // Allow retry
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Đang tải đề thi...</div>;

  // FLASH MODE: full-screen white focus view
  if (currentMode === Mode.FLASH && status === 'running') {
    const flashValue = flashFrame?.value ?? null;
    const showAnswerArea = !flashOverlay && !isFlashing && flashValue === '=';
    const isInputDisabled = !!flashOverlay || isFlashing;
    const timeText = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
    const displaySpeed = exam?.display_seconds_per_number || exam?.config?.display_speed || 1.0;
    const displayMs = Math.max(80, Math.round(displaySpeed * 1000));
    const inMs = Math.min(120, Math.max(50, Math.round(displayMs * 0.25)));
    const outMs = Math.min(140, Math.max(60, Math.round(displayMs * 0.3)));

    return (
      <div className="fixed inset-0 bg-white z-50">
        <style>{`
          @keyframes ucmasFlashZoomIn {
            0% { opacity: 0; transform: scale(0.88); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes ucmasFlashFadeOut {
            0% { opacity: 1; }
            100% { opacity: 0; }
          }
          .ucmas-flash-number-anim {
            animation:
              ucmasFlashZoomIn var(--in-ms) ease-out 0ms 1 both,
              ucmasFlashFadeOut var(--out-ms) ease-in calc(var(--display-ms) - var(--out-ms)) 1 both;
          }
          @media (prefers-reduced-motion: reduce) {
            .ucmas-flash-number-anim { animation: none !important; }
          }
        `}</style>

        <div className="absolute top-4 left-4 text-xs font-heading font-black uppercase tracking-widest text-gray-500">
          {contest?.name || 'Cuộc thi'} • Câu {currentQIndex + 1}/{questions.length}
        </div>
        <div className="absolute top-4 right-4 text-sm font-heading font-mono font-black text-ucmas-red bg-white/90 px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
          {timeText}
        </div>

        <div className="h-full w-full flex flex-col items-center justify-center px-4">
          {/* Font preloader to avoid first frames using fallback font */}
          <span aria-hidden className="absolute opacity-0 pointer-events-none select-none" style={{ fontFamily: 'DnEalianManuscript' }}>
            88888888
          </span>
          {flashOverlay?.kind === 'intro' ? (
            <div
              className="text-gray-900 leading-snug text-center select-none tabular-nums"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <div className="text-[clamp(1.6rem,4.5vw,3.2rem)] font-bold">
                Phép tính <span className="text-ucmas-red">{flashOverlay.digits}</span> chữ số{' '}
                <span className="text-ucmas-red">{flashOverlay.rows}</span> dòng
              </div>
              <div className="mt-4 text-[clamp(1.2rem,3.2vw,2.2rem)] font-normal">
                Khoảng thời gian xuất hiện mỗi phép tính:{' '}
                <span className="text-ucmas-red">{formatSecondsVi(flashOverlay.secondsPerItem)}</span> giây
              </div>
            </div>
          ) : flashOverlay?.kind === 'countdown' ? (
            <div
              className={`text-gray-900 leading-none tracking-[0.06em] text-center ${flashOverlay.text === 'Bắt Đầu'
                ? 'text-[clamp(4.66rem,16.85vw,14.0rem)]'
                : 'text-[clamp(5.83rem,21.06vw,17.5rem)]'
                } select-none tabular-nums uppercase`}
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {flashOverlay.text}
            </div>
          ) : (
            <div
              key={flashFrame?.token ?? 'blk'}
              className={`text-gray-900 font-heading font-black leading-none tracking-tighter text-center text-[clamp(7.2rem,26vw,21.6rem)] select-none tabular-nums w-full max-w-4xl mx-auto px-10 ${flashValue !== null && flashValue !== '=' ? 'ucmas-flash-number-anim' : ''}`}
              style={{
                fontFamily: 'DnEalianManuscript',
                ...(flashValue !== null && flashValue !== '=' ? ({
                  ['--display-ms' as any]: `${displayMs}ms`,
                  ['--in-ms' as any]: `${inMs}ms`,
                  ['--out-ms' as any]: `${outMs}ms`,
                } as React.CSSProperties) : {}),
              }}
            >
              {flashValue ?? <span className="opacity-0">...</span>}
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
                disabled={isInputDisabled || showResult}
                value={showResult ? questions[currentQIndex].correctAnswer : (answers[currentQIndex] || '')}
                onChange={e => setAnswers({ ...answers, [currentQIndex]: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (isInputDisabled) return;
                    if (currentQIndex < questions.length - 1) {
                      setCurrentQIndex(p => p + 1);
                    } else {
                      if (window.confirm('Nộp bài ngay?')) submitExam();
                    }
                  }
                }}
                className={`w-full border-4 rounded-[2rem] py-6 px-6 text-center text-6xl font-heading font-black outline-none shadow-xl transition-all duration-500 ${showResult
                  ? 'bg-ucmas-red text-white border-ucmas-red'
                  : 'border-ucmas-blue bg-white text-ucmas-blue'
                  }`}
                style={showResult ? { fontFamily: 'DnEalianManuscript' } : {}}
                placeholder="?"
              />

              <div className="mt-6 flex gap-3">
                {user.role === 'teacher' && (
                  <button
                    onClick={() => setShowResult(!showResult)}
                    className="w-full px-8 py-4 rounded-2xl bg-white border-2 border-ucmas-yellow text-ucmas-yellow font-heading font-black hover:bg-yellow-50 transition uppercase shadow-sm"
                  >
                    {showResult ? 'Ẩn Kết Quả' : 'Kết Quả'}
                  </button>
                )}

                <button
                  disabled={currentQIndex === 0 || isInputDisabled}
                  onClick={() => setCurrentQIndex(p => Math.max(0, p - 1))}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white border-2 border-gray-300 text-gray-700 font-heading font-black hover:bg-gray-50 transition uppercase shadow-sm disabled:opacity-50"
                >
                  ← Trước
                </button>
                {currentQIndex < questions.length - 1 ? (
                  <button
                    disabled={isInputDisabled}
                    onClick={() => setCurrentQIndex(p => p + 1)}
                    className="flex-1 px-6 py-4 rounded-2xl bg-ucmas-blue text-white font-heading font-black hover:bg-ucmas-red transition uppercase shadow-lg disabled:opacity-50"
                  >
                    Tiếp ➜
                  </button>
                ) : (
                  <button
                    disabled={isInputDisabled}
                    onClick={() => {
                      if (window.confirm('Nộp bài ngay?')) submitExam();
                    }}
                    className="flex-1 px-6 py-4 rounded-2xl bg-ucmas-red text-white font-heading font-black hover:bg-red-700 transition uppercase shadow-lg disabled:opacity-50"
                  >
                    Nộp bài 🏁
                  </button>
                )}
              </div>
            </div>
          )}

          {!flashOverlay && !isFlashing && flashValue !== '=' && (
            <div className="mt-6 text-[10px] font-heading font-bold uppercase tracking-widest text-gray-300">
              Đang chuẩn bị...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h2 className="font-bold text-gray-800">{contest?.name}</h2>
          <div className="text-xs text-gray-500 uppercase font-bold">{currentMode}</div>
        </div>
        <div className="bg-ucmas-red text-white px-4 py-2 rounded-xl font-mono text-2xl font-bold shadow-md">
          {Math.floor(timeLeft / 60)}:{((timeLeft % 60)).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 gap-6">

        {/* Question Area */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-10 min-h-[500px] relative overflow-hidden">
          {currentMode === Mode.VISUAL && (() => {
            const q = questions[currentQIndex];
            const count = q.operands.length;
            const textClass =
              count >= 14 ? 'text-xl md:text-2xl' :
                count >= 11 ? 'text-2xl md:text-3xl' :
                  count >= 8 ? 'text-3xl md:text-4xl' :
                    count >= 6 ? 'text-4xl md:text-5xl' :
                      'text-5xl md:text-6xl';
            return (
              <div className="flex flex-col items-center">
                <div className="text-gray-400 text-sm mb-4">Câu {currentQIndex + 1}</div>
                <div className="flex flex-col items-end px-10">
                  <div className={`${textClass} font-bold text-ucmas-blue font-mono space-y-1.5`} style={{ fontFamily: 'DnEalianManuscript' }}>
                    {q.operands.map((op, i) => (
                      <div key={i}>{op}</div>
                    ))}
                  </div>
                  <div className="w-full h-1 bg-gray-300 mt-5 mb-5"></div>
                  <div className={`${textClass} font-black text-gray-300`}>?</div>
                </div>
              </div>
            );
          })()}
          {currentMode === Mode.LISTENING && (
            <div className="text-center">
              <div className={`w-48 h-48 mx-auto rounded-full flex items-center justify-center text-7xl text-white shadow-2xl mb-6 transition-all ${isPlayingAudio ? 'bg-ucmas-red scale-105 animate-pulse' : 'bg-ucmas-red shadow-red-100'}`}>
                🔊
              </div>
              <p className="text-gray-500 font-bold">{isPlayingAudio ? 'Đang đọc số...' : 'Đã đọc xong'}</p>
              {!isPlayingAudio && (
                <button
                  onClick={() => playAudioSequence(currentQIndex, true)}
                  disabled={(audioPlayCounts[currentQIndex] || 0) >= 2}
                  className="mt-4 text-xs font-bold text-ucmas-blue underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(audioPlayCounts[currentQIndex] || 0) >= 2 ? 'Đã hết lượt nghe' : 'Nghe lại (1 lần)'}
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
            ref={inputRef}
            type="number"
            autoFocus
            disabled={isFlashing || isPlayingAudio}
            value={answers[currentQIndex] || ''}
            onChange={e => setAnswers({ ...answers, [currentQIndex]: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (currentQIndex < questions.length - 1) {
                  setCurrentQIndex(p => p + 1);
                } else {
                  if (window.confirm('Nộp bài ngay?')) submitExam();
                }
              }
            }}
            className="w-full text-center text-4xl font-bold p-4 border-2 border-ucmas-blue rounded-2xl mb-6 outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400"
          />

          <div className="flex gap-2 mb-6">
            <button
              disabled={currentQIndex === 0 || isFlashing || isPlayingAudio}
              onClick={() => {
                setCurrentQIndex(p => p - 1);
              }}
              className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            >
              ← Trước
            </button>
            <button
              disabled={currentQIndex === questions.length - 1 || isFlashing || isPlayingAudio}
              onClick={() => {
                setCurrentQIndex(p => p + 1);
              }}
              className="flex-1 py-3 bg-ucmas-blue text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              Sau →
            </button>
          </div>

          <div className="mt-auto">
            <div className="grid grid-cols-5 gap-2 mb-6">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-8 rounded flex items-center justify-center text-xs font-bold ${currentQIndex === i ? 'bg-ucmas-blue text-white' :
                    answers[i] ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'
                    }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <button
              onClick={() => { if (window.confirm('Nộp bài ngay?')) submitExam(); }}
              disabled={isFlashing || isPlayingAudio}
              className="w-full py-4 bg-ucmas-red text-white font-bold rounded-xl hover:bg-red-700 shadow-lg disabled:opacity-50"
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
