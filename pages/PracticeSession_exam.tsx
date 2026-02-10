
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { practiceService } from '../src/features/practice/services/practiceService';
import { generateExam } from '../services/examService';
import { Mode, Question, UserProfile } from '../types';
import ResultDetailModal from '../components/ResultDetailModal';
import { cancelBrowserSpeechSynthesis, buildListeningPhraseVi, playStableTts } from '../services/googleTts';
import { getLevelIndex, getLevelLabel, LEVEL_SYMBOLS_ORDER } from '../config/levelsAndDifficulty';
import { generateExam as generateUcmasExam, type GeneratedQuestion as UcmasGeneratedQuestion, type LevelSymbol as UcmasLevelSymbol } from '../ucmas_exam_generator';
import { canUseTrial, consumeTrial } from '../services/trialUsage';

interface PracticeSessionExamProps {
  user: UserProfile;
}

const PER_QUESTION_SECONDS = 30;
const HSG_VISUAL_FIXED_SECONDS = 8 * 60;

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
  const [initialTimeLimit, setInitialTimeLimit] = useState(600);

  // For the 200-question sheet: 4 tabs x 50 questions.
  const QUESTIONS_PER_TAB = 50;
  const [questionTab, setQuestionTab] = useState(0);

  // Flash & Audio states
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
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const trialConsumedRef = useRef(false);

  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseUserNumber = (raw: string | undefined) => {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const isCorrectAnswer = (userValue: number | null, correct: number) => {
    if (userValue == null) return false;
    return Math.abs(userValue - correct) < 1e-6;
  };

  const theme = {
    [Mode.VISUAL]: { color: 'text-ucmas-blue', bg: 'bg-ucmas-blue', icon: '👁️', title: 'Nhìn Tính' },
    [Mode.LISTENING]: { color: 'text-ucmas-red', bg: 'bg-ucmas-red', icon: '🎧', title: 'Nghe Tính' },
    [Mode.FLASH]: { color: 'text-ucmas-green', bg: 'bg-ucmas-green', icon: '⚡', title: 'Flash' },
  }[currentMode] || { color: 'text-gray-800', bg: 'bg-gray-800', icon: '?', title: 'Luyện Tập' };

  // Access control:
  // - Without activation: Elite = 1 attempt per mode; Contests/Assigned/Creative allowed.
  useEffect(() => {
    if (!navState) return;
    if (user.role === 'admin') return;

    const now = new Date();
    const expiry = user.license_expiry ? new Date(user.license_expiry) : null;
    const hasActiveLicense = !!(expiry && expiry > now);
    const isModeAllowed = user.allowed_modes.includes(currentMode);

    if (hasActiveLicense) {
      if (!isModeAllowed) navigate('/activate');
      return;
    }

    // Unactivated user:
    const isElite = returnTo?.tab === 'elite';
    if (isElite) {
      if (!canUseTrial(user.id, 'elite', currentMode, 1)) {
        navigate('/activate');
      }
    }
  }, [navState, currentMode, navigate, returnTo?.tab, user.allowed_modes, user.id, user.license_expiry, user.role]);

  useEffect(() => {
    if (!navState) {
      navigate('/contests');
      return;
    }

    let finalQuestions: Question[] = [];
    if (navState.predefinedQuestions && navState.predefinedQuestions.length > 0) {
      finalQuestions = navState.predefinedQuestions;
    } else {
      const config = navState.customConfig || {};
      const resolvedTimeLimit = typeof config?.timeLimit === 'number' ? config.timeLimit : 600;

      // Elite Visual (Nhìn tính) must follow the rulebook in ucmas_exam_generator.ts
      if (currentMode === Mode.VISUAL && returnTo?.tab === 'elite' && (config.source ?? 'auto') === 'auto') {
        const rawLevel = typeof config.level === 'string' ? config.level : (user.level_symbol || 'A');
        const safeLevel = (LEVEL_SYMBOLS_ORDER.includes(rawLevel) ? rawLevel : 'A') as UcmasLevelSymbol;
        const targetCount = typeof config.numQuestions === 'number' ? config.numQuestions : 200;

        const exam = generateUcmasExam(safeLevel, { seed: `${user.id}-${Date.now()}` });
        const mapped = exam.questions.map((q: UcmasGeneratedQuestion) => {
          if (q.op === 'addsub') {
            const terms = q.decimal ? q.terms.map(t => t / 100) : q.terms;
            const answer = q.decimal ? q.answer / 100 : q.answer;
            return {
              id: `q-${q.no}`,
              operands: terms,
              correctAnswer: answer,
              displayLines: q.displayTerms,
            } as Question;
          }
          if (q.op === 'mul') {
            return {
              id: `q-${q.no}`,
              operands: [q.a, q.b],
              correctAnswer: q.answer,
              displayLines: [String(q.a), `x ${q.b}`],
            } as Question;
          }
          // div
          return {
            id: `q-${q.no}`,
            operands: [q.dividend, q.divisor],
            correctAnswer: q.answer,
            displayLines: [`${q.dividend} ÷ ${q.divisor}`],
          } as Question;
        });

        finalQuestions = mapped.slice(0, targetCount);
      } else {
        const resolvedLevel =
          typeof config?.level === 'string'
            ? getLevelIndex(config.level)
            : typeof config?.level === 'number'
              ? config.level
              : typeof config?.digits === 'number'
                ? config.digits
                : 1;

        const operands = typeof config.operands === 'number' ? config.operands : 5;
        const digitRange =
          Array.isArray(config.digitRange) ? config.digitRange :
            typeof config.digits === 'number' && config.digits >= 1
              ? [Math.pow(10, config.digits - 1), Math.pow(10, config.digits) - 1]
              : [1, 9];
        const numOperandsRange = Array.isArray(config.numOperandsRange) ? config.numOperandsRange : [operands, operands];

        finalQuestions = generateExam({
          mode: currentMode,
          level: resolvedLevel,
          numQuestions: config.numQuestions || 10,
          timeLimit: resolvedTimeLimit,
          numOperandsRange,
          digitRange,
          flashSpeed: config.flashSpeed || 1000
        });
      }
    }

    setQuestions(finalQuestions);
    const questionCount = finalQuestions.length || (typeof navState.customConfig?.numQuestions === 'number' ? navState.customConfig.numQuestions : 0);
    const resolvedLimit =
      (currentMode === Mode.VISUAL && returnTo?.tab === 'elite')
        ? HSG_VISUAL_FIXED_SECONDS
        : Math.max(PER_QUESTION_SECONDS, Math.floor(questionCount) * PER_QUESTION_SECONDS);

    setTimeLeft(resolvedLimit);
    setInitialTimeLimit(resolvedLimit);
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
      setFlashFrame(null);
      setFlashOverlay(null);
      setShowResult(false);
      setIsFlashing(false);
      setIsPlayingAudio(false);
      if (audioRef.current) audioRef.current.pause();
      cancelBrowserSpeechSynthesis();

      if (currentMode === Mode.FLASH) runFlashSequence(currentQIndex);
      if (currentMode === Mode.LISTENING) playAudio(currentQIndex, false);
    }
  }, [currentQIndex, status]);

  // Focus input
  useEffect(() => {
    if (!isFlashing && !isPlayingAudio && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFlashing, isPlayingAudio, currentQIndex]);

  // Keep the question tab in sync with current question index.
  useEffect(() => {
    const totalTabs = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_TAB));
    const nextTab = Math.min(totalTabs - 1, Math.floor(currentQIndex / QUESTIONS_PER_TAB));
    // IMPORTANT: do not override manual tab switching via arrows.
    // Only sync when the current question changes (or questions list changes).
    setQuestionTab(nextTab);
  }, [currentQIndex, questions.length]);

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

  const runFlashSequence = async (idx: number) => {
    if (isFlashing) return;
    setIsFlashing(true);

    const configSpeed = navState?.customConfig?.flashSpeed || (navState?.customConfig?.speed ? navState.customConfig.speed * 1000 : 1000);
    const q = questions[idx];

    // Preload calculation font to avoid first digits rendering in fallback font
    const fontReadyPromise = (async () => {
      try {
        if (typeof document === 'undefined') return;
        await document.fonts.load('1em DnEalianManuscript');
        await document.fonts.ready;
      } catch { /* ignore */ }
    })();

    // 0. Intro: thông tin phép tính (trước đếm ngược)
    const meta = getFlashMeta(q, configSpeed / 1000);
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

    // 2. Numbers (giữ đúng timing configSpeed; chỉ thêm hiệu ứng qua CSS)
    await fontReadyPromise;
    let token = 0;
    for (const num of q.operands) {
      token += 1;
      setFlashFrame({ value: num, token });
      await new Promise(r => setTimeout(r, configSpeed));
    }

    // 3. Equals
    token += 1;
    setFlashFrame({ value: '=', token });
    setIsFlashing(false);
  };

  const playSingleAudio = async (text: string, rate: number): Promise<void> => {
    const lang = 'vi-VN';
    await playStableTts(text, lang, rate, {
      onAudio: (a) => {
        audioRef.current = a;
      },
    });
  };

  const getPlayCount = (idx: number) => audioPlayCountsRef.current[idx] || 0;
  const bumpPlayCount = (idx: number) => {
    audioPlayCountsRef.current = { ...audioPlayCountsRef.current, [idx]: getPlayCount(idx) + 1 };
    setAudioPlayCounts(audioPlayCountsRef.current);
  };

  const playAudio = async (idx: number, force: boolean) => {
    if (isPlayingAudio) return;
    const count = getPlayCount(idx);
    // Policy: auto-play only once; allow ONE replay (total 2 plays).
    if (!force && count >= 1) return;
    if (count >= 2) return;
    bumpPlayCount(idx);
    setIsPlayingAudio(true);
    const q = questions[idx];
    const speed = navState?.customConfig?.speed || 1.0;

    const rate = Math.min(Math.max(0.9 / speed, 0.5), 2.5);
    const text = buildListeningPhraseVi(q.operands);
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
        const userNum = parseUserNumber(answers[idx]);
        if (isCorrectAnswer(userNum, q.correctAnswer)) correct++;
      });

      // Consume elite trial only AFTER the user completes the attempt.
      // This prevents losing the only trial just by navigating into the session.
      if (!trialConsumedRef.current && user.role !== 'admin') {
        const now = new Date();
        const expiry = user.license_expiry ? new Date(user.license_expiry) : null;
        const hasActiveLicense = !!(expiry && expiry > now);
        const isElite = returnTo?.tab === 'elite';
        if (!hasActiveLicense && isElite) {
          consumeTrial(user.id, 'elite', currentMode);
          trialConsumedRef.current = true;
        }
      }

      const result = await practiceService.savePracticeAttempt({
        userId: user.id,
        examId: navState?.examId,
        mode: currentMode,
        config: navState?.customConfig || {},
        score: { correct, total: questions.length },
        duration: Math.max(0, (initialTimeLimit || 0) - (timeLeft || 0)),
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
    const correctCount = questions.filter((q, i) => {
      const userNum = parseUserNumber(answers[i]);
      return isCorrectAnswer(userNum, q.correctAnswer);
    }).length;
    const answeredCount = questions.filter((_, i) => {
      const v = answers[i];
      return v !== undefined && String(v).trim() !== '';
    }).length;
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
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Độ chính xác {percentage}%</p>

            <div className="grid grid-cols-1 gap-2 text-xs font-heading font-bold text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500 uppercase tracking-wider">Đúng / Làm được</span>
                <span className="font-black text-gray-800">{correctCount}/{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 uppercase tracking-wider">Đúng / Tổng</span>
                <span className="font-black text-gray-800">{correctCount}/{questions.length}</span>
              </div>
            </div>
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
  const currentQ = questions[currentQIndex];
  if (currentMode === Mode.FLASH) {
    const flashValue = flashFrame?.value ?? null;
    const showAnswerArea = !flashOverlay && !isFlashing && flashValue === '=';
    const showStart = !flashOverlay && !isFlashing && (flashValue === null);
    const timeText = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
    const configSpeedMs = navState?.customConfig?.flashSpeed || (navState?.customConfig?.speed ? navState.customConfig.speed * 1000 : 1000);
    const displayMs = Math.max(80, Math.round(configSpeedMs));
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
          Câu {currentQIndex + 1}/{questions.length}
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
              className={`text-gray-900 font-heading font-bold leading-none tracking-[0.06em] text-center text-[clamp(7.2rem,26vw,21.6rem)] select-none tabular-nums w-full max-w-4xl mx-auto px-10 ${flashValue !== null && flashValue !== '=' ? 'ucmas-flash-number-anim' : ''}`}
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

          {showStart && (
            <div className="mt-10 text-center">
              <button
                onClick={() => runFlashSequence(currentQIndex)}
                className="px-10 py-5 rounded-2xl font-heading font-black uppercase tracking-widest shadow-lg transition bg-ucmas-blue text-white hover:bg-ucmas-red"
                style={{ fontFamily: 'Arial, sans-serif' }}
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
                disabled={isFlashing || isPlayingAudio || showResult}
                value={showResult ? currentQ.correctAnswer : (answers[currentQIndex] || '')}
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentQIndex]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isFlashing || isPlayingAudio) return;
                    if (answers[currentQIndex] === undefined) setAnswers(prev => ({ ...prev, [currentQIndex]: '' }));
                    if (currentQIndex < questions.length - 1) {
                      setCurrentQIndex(p => p + 1);
                      setFlashFrame(null);
                    } else submitExam();
                  }
                }}
                className={`w-full border-4 rounded-[2rem] py-6 px-6 text-center text-6xl font-heading font-black outline-none shadow-xl transition-all duration-500 ${showResult
                  ? 'bg-ucmas-red text-white border-ucmas-red'
                  : 'border-ucmas-blue bg-white text-ucmas-blue'
                  }`}
                style={showResult ? { fontFamily: 'DnEalianManuscript' } : {}}
                placeholder="?"
              />

              <div className="mt-6 flex flex-col gap-3">
                {user.role === 'teacher' && (
                  <button
                    onClick={() => setShowResult(!showResult)}
                    className="w-full px-8 py-4 rounded-2xl bg-white border-2 border-ucmas-yellow text-ucmas-yellow font-heading font-black hover:bg-yellow-50 transition uppercase shadow-sm"
                  >
                    {showResult ? 'Ẩn Kết Quả' : 'Kết Quả'}
                  </button>
                )}

                <button
                  onClick={() => {
                    setFlashFrame(null);
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
                      setFlashFrame(null);
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

  const isInputDisabled = isFlashing || isPlayingAudio;

  // Visual mode: render pre-formatted lines (from rulebook generator) when present.
  const visualLines =
    currentMode === Mode.VISUAL && currentQ
      ? (currentQ.displayLines ?? currentQ.operands.map((n) => String(n)))
      : [];
  const visualLineCount = visualLines.length;
  const visualTextClass =
    visualLineCount >= 14 ? 'text-xl md:text-2xl' :
      visualLineCount >= 11 ? 'text-2xl md:text-3xl' :
        visualLineCount >= 8 ? 'text-3xl md:text-4xl' :
          visualLineCount >= 6 ? 'text-4xl md:text-5xl' :
            'text-5xl md:text-6xl';

  const totalTabs = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_TAB));
  const tabStart = questionTab * QUESTIONS_PER_TAB;
  const tabEnd = Math.min(tabStart + QUESTIONS_PER_TAB, questions.length);

  // Sidebar level display (mainly for Elite Visual: level is a symbol like 'A', 'C', ...)
  const rawLevel = (navState?.customConfig as any)?.level;
  const levelSymbol =
    typeof rawLevel === 'string'
      ? rawLevel
      : (user.level_symbol || 'A');
  const levelLabel = getLevelLabel(levelSymbol);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 min-h-[80vh]">
      {/* Left Sidebar (hide in Flash for max size) */}
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
              <span className="text-gray-500 font-heading font-bold uppercase">Cấp độ</span>
              <span className="font-heading font-bold text-ucmas-green">{levelLabel}</span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-500 font-heading font-bold uppercase">Câu hỏi</span>
              <span className="font-heading font-black text-ucmas-blue text-lg">{currentQIndex + 1}/{questions.length}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-[10px] font-heading font-black text-gray-400 uppercase tracking-widest">
              Danh sách câu
            </div>

            {totalTabs > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuestionTab(t => Math.max(0, t - 1))}
                  disabled={questionTab === 0}
                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-700 font-black disabled:opacity-40"
                  title="Tab trước"
                >
                  ‹
                </button>
                <button
                  onClick={() => setQuestionTab(t => Math.min(totalTabs - 1, t + 1))}
                  disabled={questionTab >= totalTabs - 1}
                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-700 font-black disabled:opacity-40"
                  title="Tab sau"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.slice(tabStart, tabEnd).map((_, localIdx) => {
              const idx = tabStart + localIdx;
              const isDone = answers[idx] !== undefined;
              const isActive = currentQIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isFlashing && !isInputDisabled) setCurrentQIndex(idx);
                  }}
                  disabled={isFlashing || isInputDisabled}
                  className={`w-8 h-8 rounded-lg text-xs font-heading font-bold transition shadow-sm ${isActive ? `${theme.bg} text-white shadow-md transform scale-110` :
                    isDone ? 'bg-blue-50 text-ucmas-blue border border-blue-100' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
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
          <span className="font-heading font-bold text-gray-700">Câu {currentQIndex + 1}/{questions.length}</span>
          <span className="text-ucmas-red font-heading font-mono font-black text-xl">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
        </div>

        <div className="flex-grow bg-white rounded-3xl shadow-sm border border-gray-100 relative flex flex-col lg:flex-row overflow-hidden min-h-[500px]">
          <div className="hidden lg:flex absolute top-6 right-6 bg-ucmas-blue text-white px-5 py-2.5 rounded-2xl items-center gap-2 shadow-xl z-20">
            <span className="text-[10px] font-heading uppercase font-black tracking-widest opacity-80">Còn lại</span>
            <span className="text-2xl font-heading font-mono font-black">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative">
            {/* VISUAL MODE DISPLAY */}
            {currentMode === Mode.VISUAL && currentQ && (
              <div className="bg-gray-50 px-10 py-5 rounded-[2rem] w-fit mx-auto shadow-inner border border-gray-100 flex flex-col items-end">
                {visualLines.map((line, i) => (
                  <div key={i} className={`${visualTextClass} font-heading font-black text-ucmas-blue mb-1.5 font-mono tracking-tighter leading-tight`} style={{ fontFamily: 'DnEalianManuscript' }}>{line}</div>
                ))}
                <div className="border-t-4 border-gray-300 w-full mt-4 mb-4"></div>
                <div className={`${visualTextClass} font-heading font-black text-gray-300`}>?</div>
              </div>
            )}

            {/* LISTENING MODE DISPLAY */}
            {currentMode === Mode.LISTENING && (
              <div className="flex flex-col items-center justify-center text-center">
                <div className={`w-48 h-48 rounded-full flex items-center justify-center text-7xl text-white shadow-2xl mb-10 transition-all ${isPlayingAudio ? 'bg-ucmas-red scale-105 animate-pulse' : 'bg-ucmas-red shadow-red-100'}`}>
                  🔊
                </div>
                <button
                  onClick={() => playAudio(currentQIndex, true)}
                  disabled={isPlayingAudio || (audioPlayCounts[currentQIndex] || 0) >= 2}
                  className="bg-gradient-to-r from-ucmas-red to-red-600 text-white px-12 py-5 rounded-2xl font-heading font-black shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xl uppercase tracking-widest"
                >
                  {isPlayingAudio ? 'Đang đọc...' : (audioPlayCounts[currentQIndex] || 0) >= 2 ? 'Đã hết lượt nghe' : 'Nghe lại (1 lần)'}
                </button>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l border-gray-100 p-6 lg:p-10 flex flex-col justify-center bg-gray-50/50 z-10">
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
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentQIndex]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isInputDisabled) return;
                    if (answers[currentQIndex] === undefined) setAnswers(prev => ({ ...prev, [currentQIndex]: '' }));
                    if (currentQIndex < questions.length - 1) setCurrentQIndex(p => p + 1);
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
                    if (answers[currentQIndex] === undefined) setAnswers(prev => ({ ...prev, [currentQIndex]: '' }));
                    setCurrentQIndex(p => p + 1);
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

              {currentMode === Mode.VISUAL && (
                <button
                  onClick={() => {
                    if (isInputDisabled) return;
                    if (window.confirm('Nộp bài sớm?')) submitExam();
                  }}
                  disabled={isInputDisabled}
                  className="w-full px-8 py-4 rounded-2xl bg-white border-2 border-ucmas-red text-ucmas-red font-heading font-black hover:bg-red-50 transition-all disabled:opacity-50 uppercase shadow-sm"
                >
                  Nộp bài sớm
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
