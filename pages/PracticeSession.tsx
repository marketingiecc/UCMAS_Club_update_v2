
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { generateExam, getExamConfig } from '../services/examService';
import { Mode, Question, AttemptResult, UserProfile, CustomExam } from '../types';
import ResultDetailModal from '../components/ResultDetailModal';
import CustomSlider from '../components/CustomSlider';
import { getLevelIndex, getLevelLabel, LEVEL_SYMBOLS_ORDER } from '../config/levelsAndDifficulty';
import { cancelBrowserSpeechSynthesis, getGoogleTranslateTtsUrl, playFptAiTts, playStableTts, speakWithBrowserTts, splitTtsText } from '../services/googleTts';
import { canUseTrial, consumeTrial, type TrialArea } from '../services/trialUsage';
import { trainingTrackService } from '../services/trainingTrackService';

interface PracticeSessionProps {
  user: UserProfile;
}

const LANGUAGES = [
    // Ngôn ngữ cố định: Tiếng Việt
    { code: 'vi-VN', label: 'Tiếng Việt', sample: 'Một hai ba bốn năm sáu bảy tám chín mười' },
];

const PracticeSession: React.FC<PracticeSessionProps> = ({ user }) => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const currentMode = mode as Mode;
  const locationState = location.state as {
    fromHub?: boolean;
    elite?: boolean;
    origin?: 'contests_creative';
    returnTo?: { tab: 'elite' | 'mode' | 'path'; mode?: 'visual' | 'audio' | 'flash'; pathDay?: number };
    config?: {
      level_symbol?: string;
      difficulty?: string;
      question_count?: number;
      speed_seconds?: number;
      language?: string;
      digits?: number;
      rows?: number;
      questions?: Question[];
    };
    pathContext?: {
      trackId: string;
      dayId: string;
      exerciseId: string;
      levelSymbol: string;
      dayNo: number;
    };
  };
  const hubConfig = locationState?.config;
  const fromHub = locationState?.fromHub;
  const returnTo = locationState?.returnTo;
  const origin = locationState?.origin;

  useEffect(() => {
     if (user.role === 'admin') return;

     const now = new Date();
     const expiry = user.license_expiry ? new Date(user.license_expiry) : null;
     const hasActiveLicense = !!(expiry && expiry > now);
     const isModeAllowed = user.allowed_modes.includes(currentMode);

     // Users without activation can still access:
     // - Practice by mode: 3 times per mode
     // - Elite: 1 time per mode
     // - Creative (Contests): allowed
     // - Path: NOT allowed
     if (hasActiveLicense) {
       if (!isModeAllowed) navigate('/activate');
       return;
     }

     if (origin === 'contests_creative') return; // always allowed

     if (returnTo?.tab === 'path') {
       navigate('/activate');
       return;
     }

     const area: TrialArea | null =
       returnTo?.tab === 'mode' ? 'mode' :
       (locationState?.elite ? 'elite' : null);

     if (!area) {
       navigate('/activate');
       return;
     }

     const limit = area === 'mode' ? 3 : 1;
     if (!canUseTrial(user.id, area, currentMode, limit)) {
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
  const [selectedLevelSymbol, setSelectedLevelSymbol] = useState<string>(user.level_symbol || 'A');
  const [sourceType, setSourceType] = useState<'auto' | 'bank'>('auto');
  const [availableExams, setAvailableExams] = useState<CustomExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  
  const [speed, setSpeed] = useState(1.0);
  const selectedLang = 'vi-VN';
  const clampSpeedSeconds = (v: number) => Math.min(1.5, Math.max(0.1, v));
  const getListeningPhrases = (_langCode: string) => {
      // Cố định Tiếng Việt
      return { ready: 'Chuẩn bị', equals: 'Bằng' };
  };

  const [isLoadingRule, setIsLoadingRule] = useState(false);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialTimeLimit, setInitialTimeLimit] = useState(0);
  
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
          cancelBrowserSpeechSynthesis();
      };
  }, []);

  useEffect(() => {
      if (sourceType === 'bank') {
          const fetchExams = async () => {
              const levelNum = getLevelIndex(selectedLevelSymbol);
              const exams = await backend.getCustomExams(currentMode, levelNum, 'active');
              setAvailableExams(exams);
              if (exams.length > 0) setSelectedExamId(exams[0].id);
              else setSelectedExamId('');
          };
          fetchExams();
      }
  }, [sourceType, selectedLevelSymbol, currentMode]);

  const startFromHub = useCallback(async () => {
    if (!hubConfig) return;
    setIsLoadingRule(true);
    try {
      // Consume trial attempt (if user has no active license and this is a training flow)
      if (user.role !== 'admin') {
        const now = new Date();
        const expiry = user.license_expiry ? new Date(user.license_expiry) : null;
        const hasActiveLicense = !!(expiry && expiry > now);
        if (!hasActiveLicense && origin !== 'contests_creative') {
          const area: TrialArea | null =
            returnTo?.tab === 'mode' ? 'mode' :
            (locationState?.elite ? 'elite' : null);
          if (area) {
            consumeTrial(user.id, area, currentMode);
          }
        }
      }

      const levelSymbol = hubConfig.level_symbol || selectedLevelSymbol;
      const levelNum = getLevelIndex(levelSymbol);
      const numQuestions = hubConfig.question_count || 20;
      const speedSec = clampSpeedSeconds(hubConfig.speed_seconds ?? 1.2);
      // Ngôn ngữ cố định tiếng Việt (không nhận config từ hub)
      setSpeed(speedSec);
      setSelectedLevelSymbol(levelSymbol);
      setSourceType('auto');

      const ruleData = await backend.getLatestExamRule(currentMode);
      const customRules = ruleData ? ruleData.rules_json : null;
      const config = getExamConfig(currentMode, levelNum, customRules);
      config.numQuestions = numQuestions;

      if (hubConfig.digits != null && hubConfig.digits >= 1 && hubConfig.digits <= 10) {
        const d = hubConfig.digits;
        const minVal = d === 1 ? 1 : Math.pow(10, d - 1);
        const maxVal = Math.pow(10, d) - 1;
        config.digitRange = [minVal, maxVal];
      }
      if (hubConfig.rows != null && hubConfig.rows >= 1 && hubConfig.rows <= 100) {
        config.numOperandsRange = [hubConfig.rows, hubConfig.rows];
      }
      if (currentMode === Mode.FLASH || currentMode === Mode.LISTENING) {
        config.flashSpeed = speedSec * 1000;
      }

      const preloaded = Array.isArray((hubConfig as any)?.questions) ? ((hubConfig as any).questions as Question[]) : null;
      const generatedQuestions = (preloaded && preloaded.length > 0) ? preloaded : generateExam(config);
      const examTimeLimit = config.timeLimit || Math.max(300, (generatedQuestions.length || numQuestions) * 15);

      setQuestions(generatedQuestions);
      setTimeLeft(examTimeLimit);
      setInitialTimeLimit(examTimeLimit);
      setStatus('running');
      setCurrentQIndex(0);
      setAnswers({});
      setPlayCounts({});
      setFlashNumber(null);
      setFlashOverlay(null);
    } catch (e) {
      console.error("Start from hub failed", e);
      alert("Có lỗi khi tạo bài luyện tập. Vui lòng thử lại.");
    } finally {
      setIsLoadingRule(false);
    }
  }, [hubConfig, currentMode, origin, returnTo, user.id, user.license_expiry, user.role]);

  const hasStartedFromHub = useRef(false);
  useEffect(() => {
    if (!fromHub || !hubConfig || hasStartedFromHub.current) return;
    hasStartedFromHub.current = true;
    if (user.full_name) setFormName(user.full_name);
    startFromHub();
  }, [fromHub, hubConfig, user.full_name]);

  const getGoogleTTSUrl = (text: string, lang: string) => {
      return getGoogleTranslateTtsUrl(text, lang);
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
            const levelNum = getLevelIndex(selectedLevelSymbol);
            const config = getExamConfig(currentMode, levelNum, customRules);
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
        setInitialTimeLimit(examTimeLimit);
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
      cancelBrowserSpeechSynthesis();
      setIsPlayingAudio(false); 

      (async () => {
        const rate = getSpeechRate(speed);
        await playStableTts(langConfig.sample, selectedLang, rate, {
          onAudio: (a) => {
            audioRef.current = a;
          },
        });
      })();
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
      cancelBrowserSpeechSynthesis();

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
    }

    // --- 3. End with Equals Sign ---
    setFlashNumber('=');
    setIsFlashing(false);
  };

  const playSingleAudio = async (text: string, rate: number): Promise<void> => {
    // Test FPT.AI voice ONLY for: "Cuộc thi → ✨ Sáng tạo phép tính → 🎧 Nghe"
    if (origin === 'contests_creative' && currentMode === Mode.LISTENING) {
      await playFptAiTts(text, 'vi-VN', rate, {
        onAudio: (a) => {
          audioRef.current = a;
        },
        voice: 'banmai',
      });
      return;
    }

    await playStableTts(text, selectedLang, rate, {
      onAudio: (a) => {
        audioRef.current = a;
      },
    });
  };

  const playAudio = async () => {
    if (isPlayingAudio) return;
    if (!canPlay(currentQIndex)) return;

    setPlayCounts(prev => ({...prev, [currentQIndex]: (prev[currentQIndex] || 0) + 1}));
    setIsPlayingAudio(true);
    
    const q = questions[currentQIndex];
    const rate = getSpeechRate(speed);
    const phrases = getListeningPhrases(selectedLang);
    // Single TTS call: reduces autoplay-policy issues and Google blocking retries
    const text = `${phrases.ready}. ${q.operands.join(', ')}. ${phrases.equals}.`;
    await playSingleAudio(text, rate);

    setIsPlayingAudio(false);
    audioRef.current = null;
  };

  const PATH_COMPLETED_KEY = 'ucmas_path_day_completed';
  const markPathDayCompleted = (userId: string, level: string, dayNo: number) => {
    try {
      const raw = localStorage.getItem(PATH_COMPLETED_KEY);
      const all: Record<string, Record<string, Record<number, boolean>>> = raw ? JSON.parse(raw) : {};
      if (!all[userId]) all[userId] = {};
      if (!all[userId][level]) all[userId][level] = {};
      all[userId][level][dayNo] = true;
      localStorage.setItem(PATH_COMPLETED_KEY, JSON.stringify(all));
    } catch { /* ignore */ }
  };

  const submitExam = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause(); 
      
      setStatus('finished');

      try {
          let correct = 0, wrong = 0, skipped = 0;
          
          questions.forEach((q, idx) => {
            const ans = answers[idx];
            const isSkipped = !ans || ans.trim() === '';
            const isCorrect = !isSkipped && parseInt(ans) === q.correctAnswer;
            if (isSkipped) skipped++;
            else if (isCorrect) correct++;
            else wrong++;
          });

          const durationSeconds = Math.max(0, Math.floor((initialTimeLimit || 0) - (timeLeft || 0)));

          const levelNum = getLevelIndex(selectedLevelSymbol);
          const config = getExamConfig(currentMode, levelNum);
          if (currentMode !== Mode.VISUAL) config.flashSpeed = speed * 1000;

          const result = await backend.saveAttempt(
              user.id,
              config,
              questions,
              {
                  correct,
                  wrong,
                  skipped,
                  total: questions.length,
                  duration: durationSeconds
              },
              answers
          );

          if (!result.success) {
              console.error('Failed to save attempt:', result);
              // Still show results even if save fails
          }

          // If this run belongs to a roadmap exercise, store per-exercise progress in Supabase
          if (returnTo?.tab === 'path' && locationState?.pathContext?.dayId && locationState?.pathContext?.exerciseId) {
            const rec = await trainingTrackService.recordExerciseAttempt({
              userId: user.id,
              dayId: locationState.pathContext.dayId,
              exerciseId: locationState.pathContext.exerciseId,
              correctCount: correct,
              totalCount: questions.length,
              durationSeconds,
              answers,
            });
            if (!rec.success) {
              console.warn('recordExerciseAttempt failed, fallback localStorage:', rec.error);
              if (returnTo.pathDay != null) markPathDayCompleted(user.id, selectedLevelSymbol, returnTo.pathDay);
            }
          } else if (returnTo?.tab === 'path' && returnTo.pathDay != null) {
            // Fallback legacy behavior
            markPathDayCompleted(user.id, selectedLevelSymbol, returnTo.pathDay);
          }
      } catch (error: any) {
          console.error('Error submitting exam:', error);
          // Still show results even if save fails
      }
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
    if (fromHub && hubConfig && isLoadingRule) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center py-12 bg-gradient-to-br from-gray-50 to-white">
          <div className="w-14 h-14 border-4 border-ucmas-blue border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-700 font-heading font-semibold">Đang chuyển vào trang Làm bài...</p>
        </div>
      );
    }
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 bg-gradient-to-br from-gray-50 to-white">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-2 border-gray-100 relative overflow-hidden">
           {/* Decorative element */}
           <div className={`absolute top-0 right-0 w-32 h-32 ${theme.bg} opacity-5 rounded-full -mr-16 -mt-16`}></div>
           
           <div className={`mx-auto w-24 h-24 rounded-3xl ${theme.bg} text-white flex items-center justify-center text-5xl shadow-xl mb-6 relative z-10 transform hover:scale-110 transition-transform`}>
              {theme.icon}
           </div>

           <h2 className="text-center text-2xl font-heading-bold text-gray-800 mb-2">
             Luyện Tập <span className={`${theme.color}`}>{theme.title}</span>
           </h2>
           <p className="text-center text-gray-500 text-sm mb-8 uppercase tracking-widest font-heading font-semibold">
             {currentMode === Mode.VISUAL ? '200' : '30'} câu hỏi • {currentMode === Mode.FLASH ? 'Thẻ số nhanh' : currentMode === Mode.LISTENING ? 'Nghe đọc số' : '8 phút'}
           </p>

           <div className="space-y-5">
              <div>
                 <label className={`block text-xs font-heading-bold ${theme.color} mb-1.5 ml-1 uppercase tracking-wider`}>👤 Họ và tên <span className="text-ucmas-red">*</span></label>
                 <input 
                   type="text" 
                   value={formName} 
                   onChange={e => setFormName(e.target.value)}
                   placeholder="Nhập họ tên học sinh"
                   className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ucmas-blue focus:border-ucmas-blue focus:outline-none transition font-medium"
                 />
              </div>

              <div>
                 <label className={`block text-xs font-heading font-bold ${theme.color} mb-1.5 ml-1 uppercase`}>🎓 Cấp độ</label>
                 <select 
                   value={selectedLevelSymbol} 
                   onChange={e => setSelectedLevelSymbol(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition appearance-none"
                 >
                   {LEVEL_SYMBOLS_ORDER.map(s => <option key={s} value={s}>{getLevelLabel(s)}</option>)}
                 </select>
              </div>

              <div>
                 <label className={`block text-xs font-heading font-bold ${theme.color} mb-1.5 ml-1 uppercase`}>📄 Nguồn bài tập</label>
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
                      <label className="block text-xs font-heading font-bold text-gray-500 mb-1 uppercase">Chọn bài luyện tập</label>
                      <select 
                          value={selectedExamId}
                          onChange={(e) => setSelectedExamId(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      >
                          {availableExams.length === 0 ? (
                              <option value="">-- Không có bài nào cho {getLevelLabel(selectedLevelSymbol)} --</option>
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
                    <div className={`text-xs font-heading font-bold ${theme.color} mb-1.5 ml-1 uppercase`}>🗣️ Ngôn ngữ: Tiếng Việt</div>
                  </div>
              )}

              {(currentMode === Mode.FLASH || currentMode === Mode.LISTENING) && (
                 <div>
                    <CustomSlider
                      label="⏱️ Tốc độ hiển thị"
                      value={speed}
                      min={0.1}
                      max={1.5}
                      step={0.1}
                      onChange={(val) => setSpeed(clampSpeedSeconds(val))}
                      valueLabel={`${speed} giây/số`}
                      color={currentMode === Mode.FLASH ? 'green' : 'red'}
                      unit="s"
                      minLabel="Nhanh (0.1s)"
                      maxLabel="Chậm (1.5s)"
                    />

                    {currentMode === Mode.LISTENING && (
                        <div className="text-center">
                             <button 
                                onClick={testVoice}
                                className={`text-xs font-heading font-bold px-4 py-2 rounded-full border transition border-red-200 text-red-600 hover:bg-red-50`}
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
                className={`w-full ${theme.bg} text-white font-heading-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all mt-6 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait uppercase tracking-wider text-sm transform active:scale-95`}
              >
                 {isLoadingRule ? (
                   <>
                     <span className="animate-spin">⏳</span>
                     <span>Đang tạo bài luyện tập...</span>
                   </>
                 ) : (
                   <>
                     <span>✨</span>
                     <span>BẮT ĐẦU LUYỆN TẬP</span>
                   </>
                 )}
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (status === 'finished') {
     // ... (Keep existing results UI)
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

    const answeredCount = questions.filter((_, i) => {
      const v = answers[i];
      return v !== undefined && String(v).trim() !== '';
    }).length;
    const correctCount = questions.filter((q, i) => {
      const userNum = parseUserNumber(answers[i]);
      return isCorrectAnswer(userNum, q.correctAnswer);
    }).length;
    const percentage = Math.round((correctCount / Math.max(1, questions.length)) * 100);

    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <ResultDetailModal 
            isOpen={isReviewOpen} 
            onClose={() => setIsReviewOpen(false)} 
            questions={questions} 
            userAnswers={answers}
            title="Kết quả luyện tập"
        />

        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center border-2 border-gray-100 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-ucmas-blue opacity-5 rounded-full -mr-20 -mt-20"></div>
            
            <div className="w-24 h-24 bg-gradient-to-br from-ucmas-yellow to-ucmas-yellow/80 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-xl relative z-10">
               🏆
            </div>
            
            <h2 className="text-2xl font-heading-extrabold text-ucmas-blue mb-2 uppercase tracking-tight">Kết Quả Luyện Tập</h2>
            <p className="text-gray-600 text-sm mb-6 font-medium">{formName} • {getLevelLabel(selectedLevelSymbol)}</p>

            <div className="flex justify-center gap-1 mb-3 text-ucmas-yellow text-3xl">
               {[1,2,3,4,5].map(s => <span key={s} className="transform hover:scale-110 transition-transform">{percentage >= s*20 ? '★' : '☆'}</span>)}
            </div>
            <p className={`font-heading-bold text-base mb-8 ${percentage >= 80 ? 'text-ucmas-green' : percentage >= 50 ? 'text-ucmas-blue' : 'text-ucmas-red'}`}>
               {percentage >= 80 ? '🎉 Xuất sắc!' : percentage >= 50 ? '👍 Đạt yêu cầu' : '💪 Cần cố gắng hơn'}
            </p>

            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 mb-8 border-2 border-gray-100 shadow-inner">
               <div className="text-6xl font-heading-extrabold text-ucmas-blue mb-2">
                 {correctCount}<span className="text-3xl text-gray-400 font-medium">/{questions.length}</span>
               </div>
               <div className="w-full bg-gray-200 rounded-full h-3 mt-4 mb-3 overflow-hidden">
                  <div className={`h-3 rounded-full transition-all duration-1000 ${percentage >= 80 ? 'bg-ucmas-green' : percentage >= 50 ? 'bg-ucmas-blue' : 'bg-ucmas-red'}`} style={{ width: `${percentage}%` }}></div>
               </div>
               <p className="text-xs text-gray-600 font-heading-bold uppercase tracking-wider mb-3">Số câu đúng ({percentage}%)</p>

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

            <button 
               onClick={() => setIsReviewOpen(true)}
               className="w-full border-2 border-ucmas-blue text-ucmas-blue font-heading-bold py-3.5 rounded-xl hover:bg-ucmas-blue hover:text-white transition-all mb-3 flex items-center justify-center gap-2 uppercase text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
               👁️ Xem lại chi tiết
            </button>
            <div className="flex flex-wrap gap-3">
               {/* Creative (SÁNG TẠO PHÉP TÍNH): no Dashboard button */}
               {origin !== 'contests_creative' && (
                 <button
                   onClick={() => {
                     if (fromHub && returnTo?.tab === 'path' && returnTo.pathDay != null) {
                       navigate('/training', { state: { openTab: 'path' as const, pathDay: returnTo.pathDay } });
                     } else {
                       navigate('/dashboard');
                     }
                   }}
                   className="flex-1 min-w-[120px] border-2 border-gray-300 text-gray-600 font-heading-bold py-3 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition uppercase text-sm shadow-sm"
                 >
                    🏠 Dashboard
                 </button>
               )}

               {origin !== 'contests_creative' && fromHub && returnTo?.tab === 'path' && returnTo.pathDay != null && (
                 <button
                   onClick={() => navigate('/training', { state: { openTab: 'path' as const, pathDay: returnTo.pathDay } })}
                   className="flex-1 min-w-[140px] bg-ucmas-blue text-white font-heading-bold py-3 rounded-xl hover:bg-ucmas-red transition uppercase text-sm shadow-lg"
                 >
                   📋 Bài tiếp theo
                 </button>
               )}
               <button
                 onClick={() => {
                   // Creative flash: go back to Creative tab and generate a different calculation
                   if (origin === 'contests_creative') {
                     navigate('/contests', { state: { initialTab: 'practice' } });
                     return;
                   }

                   if (fromHub && returnTo) {
                     if (returnTo.tab === 'path' && returnTo.pathDay != null) {
                       navigate('/training', { state: { openTab: 'path' as const, pathDay: returnTo.pathDay } });
                     } else {
                       navigate('/training', { state: { openTab: returnTo.tab, openMode: returnTo.mode } });
                     }
                   } else {
                     setStatus('setup');
                   }
                 }}
                 className="flex-1 min-w-[120px] bg-ucmas-red text-white font-heading-bold py-3 rounded-xl hover:bg-ucmas-blue transition uppercase text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
               >
                  {origin === 'contests_creative' ? 'CÂU KHÁC' : '🔄 Làm lại'}
               </button>
            </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];

  // FLASH MODE: full-screen white focus view
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
            <div className="text-gray-900 font-heading font-bold leading-none tracking-[0.06em] text-center text-[clamp(6rem,22vw,18rem)] select-none tabular-nums">
              {flashNumber ?? ''}
            </div>
          )}

          {showStart && (
            <div className="mt-10 text-center">
              <button
                onClick={() => runFlashSequence(currentQIndex)}
                className={`px-10 py-5 rounded-2xl font-heading font-black uppercase tracking-widest shadow-lg transition ${
                  canPlay(currentQIndex)
                    ? 'bg-ucmas-blue text-white hover:bg-ucmas-red'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!canPlay(currentQIndex)}
              >
                Bắt đầu
              </button>
              <p className="mt-3 text-[10px] font-heading font-bold uppercase tracking-widest text-gray-400">
                {canPlay(currentQIndex) ? 'Tối đa 2 lần xem' : 'Hết lượt xem'}
              </p>
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
                value={answers[currentQIndex] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentQIndex]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isInputDisabled) return;
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
                {canPlay(currentQIndex) && (
                  <button
                    onClick={() => {
                      setFlashNumber(null);
                      runFlashSequence(currentQIndex);
                    }}
                    className="w-full px-8 py-4 rounded-2xl bg-white border-2 border-gray-300 text-gray-700 font-heading font-black hover:bg-gray-50 transition uppercase shadow-sm"
                  >
                    Xem lại
                  </button>
                )}

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

  // Visual mode: keep the whole multi-line calculation visible without scrolling.
  const visualLineCount = currentMode === Mode.VISUAL ? (currentQ?.operands?.length ?? 0) : 0;
  const visualTextClass =
    visualLineCount >= 14 ? 'text-xl md:text-2xl' :
    visualLineCount >= 11 ? 'text-2xl md:text-3xl' :
    visualLineCount >= 8 ? 'text-3xl md:text-4xl' :
    visualLineCount >= 6 ? 'text-4xl md:text-5xl' :
    'text-5xl md:text-6xl';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 min-h-[80vh]">
        {/* Left Sidebar (hide in Flash for max size) */}
        {currentMode !== Mode.FLASH && (
        <div className="hidden lg:block w-72 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-fit shrink-0">
           <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-full ${theme.bg} text-white flex items-center justify-center shadow-md`}>{theme.icon}</div>
              <div>
                 <div className="text-[10px] text-gray-400 font-heading font-black uppercase tracking-widest">Học sinh</div>
                 <div className="font-heading font-bold text-gray-800 leading-tight">{formName}</div>
              </div>
           </div>
           
           <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
               <div className="flex justify-between text-xs mb-2">
                   <span className="text-gray-500 font-heading font-bold uppercase">Cấp độ</span>
                   <span className="font-heading font-bold text-ucmas-green">{getLevelLabel(selectedLevelSymbol)}</span>
               </div>
               {currentMode !== Mode.VISUAL && (
                 <div className="flex justify-between text-xs mb-2">
                     <span className="text-gray-500 font-heading font-bold uppercase">Tốc độ</span>
                     <span className="font-heading font-bold text-gray-800">{speed}s</span>
                 </div>
               )}
               <div className={`flex justify-between text-xs ${currentMode !== Mode.VISUAL ? 'pt-2 border-t border-gray-200 mt-2' : ''}`}>
                   <span className="text-gray-500 font-heading font-bold uppercase">Câu hỏi</span>
                   <span className="font-heading font-black text-ucmas-blue text-lg">{currentQIndex + 1}/{questions.length}</span>
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
               <span className="text-ucmas-red font-heading font-mono font-black text-xl">{Math.floor(timeLeft/60)}:{((timeLeft%60)).toString().padStart(2,'0')}</span>
            </div>

            <div className={`flex-grow bg-white rounded-3xl shadow-sm border border-gray-100 relative flex ${currentMode === Mode.FLASH ? 'flex-col' : 'flex-col lg:flex-row'} overflow-hidden min-h-[500px]`}>
                <div className="hidden lg:flex absolute top-6 right-6 bg-ucmas-blue text-white px-5 py-2.5 rounded-2xl items-center gap-2 shadow-xl z-20">
                   <span className="text-[10px] font-heading uppercase font-black tracking-widest opacity-80">Còn lại</span>
                   <span className="text-2xl font-heading font-mono font-black">{Math.floor(timeLeft/60)}:{((timeLeft%60)).toString().padStart(2,'0')}</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative">
                    
                    {/* VISUAL MODE DISPLAY */}
                    {currentMode === Mode.VISUAL && (
                       <div className="bg-gray-50 px-6 py-5 rounded-[2rem] min-w-[220px] text-center shadow-inner border border-gray-100">
                          {currentQ.operands.map((num, i) => (
                             <div key={i} className={`${visualTextClass} font-heading font-black text-ucmas-blue mb-1.5 font-mono tracking-tighter leading-tight`}>{num}</div>
                          ))}
                          <div className="border-t-4 border-gray-300 w-24 mx-auto mt-4 mb-4"></div>
                          <div className={`${visualTextClass} font-heading font-black text-gray-300`}>?</div>
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
                                <div className="font-heading font-bold text-ucmas-blue leading-none tracking-[0.06em] text-[clamp(6rem,22vw,16rem)] tabular-nums">
                                   {flashNumber}
                                </div>
                            ) : (
                                <div 
                                    onClick={() => runFlashSequence(currentQIndex)} 
                                    className={`cursor-pointer group ${!canPlay(currentQIndex) ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <div className="w-28 h-28 md:w-36 md:h-36 bg-ucmas-blue rounded-full flex items-center justify-center text-white text-5xl shadow-2xl group-hover:scale-105 transition-all mx-auto mb-4">
                                       ▶
                                    </div>
                                    <p className="text-gray-400 font-heading font-bold uppercase tracking-widest text-[10px]">
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
                               className="bg-gradient-to-r from-ucmas-red to-red-600 text-white px-12 py-5 rounded-2xl font-heading font-black shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xl uppercase tracking-widest"
                            >
                               {isPlayingAudio ? 'Đang đọc...' : canPlay(currentQIndex) ? 'Phát âm thanh' : 'Hết lượt nghe'}
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

export default PracticeSession;
