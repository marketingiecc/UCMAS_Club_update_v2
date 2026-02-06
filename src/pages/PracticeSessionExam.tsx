
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { practiceService } from '../src/features/practice/services/practiceService';
import { generateExam } from '../services/examService';
import { Mode, Question, UserProfile } from '../types';
import ResultDetailModal from '../components/ResultDetailModal';
import { cancelBrowserSpeechSynthesis, playStableTts } from '../services/googleTts';

interface PracticeSessionExamProps {
    user: UserProfile;
}

const PracticeSessionExam: React.FC<PracticeSessionExamProps> = ({ user }) => {
    const { mode } = useParams<{ mode: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Default mode from URL, but questions can override this in mixed exams
    const urlMode = mode as Mode;

    // Lấy config từ state
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

    // Flash & Audio states
    const [flashNumber, setFlashNumber] = useState<number | string | null>(null);
    const [isFlashing, setIsFlashing] = useState(false);
    const [flashOverlay, setFlashOverlay] = useState<string | null>(null);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const timerRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
                mode: urlMode,
                level: config.digits || 1,
                numQuestions: config.numQuestions || 10,
                timeLimit: 600,
                numOperandsRange: Array.isArray(config.numOperandsRange) ? config.numOperandsRange : [config.operands, config.operands],
                digitRange: Array.isArray(config.digitRange) ? config.digitRange : [1, 9],
                flashSpeed: config.flashSpeed || 1000
            });
        }

        setQuestions(finalQuestions);
        setTimeLeft(600);
        setStatus('running');
    }, [navState, urlMode, navigate]);

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

    // Determine current active mode for the question
    const getCurrentActiveMode = (): Mode => {
        if (questions.length === 0) return urlMode;
        return questions[currentQIndex]?.mode || urlMode;
    };

    const activeMode = getCurrentActiveMode();

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

            const currentQMode = questions[currentQIndex]?.mode || urlMode;

            if (currentQMode === Mode.FLASH) runFlashSequence(currentQIndex);
            else if (currentQMode === Mode.LISTENING) playAudio(currentQIndex);
        }
    }, [currentQIndex, status, questions]);

    // Focus input
    useEffect(() => {
        if (!isFlashing && !isPlayingAudio && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isFlashing, isPlayingAudio, currentQIndex]);

    const runFlashSequence = async (idx: number) => {
        if (isFlashing) return;
        setIsFlashing(true);

        // Use config speed or default 1s
        const configSpeed = navState?.customConfig?.flashSpeed || (navState?.customConfig?.speed ? navState.customConfig.speed * 1000 : 1000);
        const q = questions[idx];

        // 1. Countdown
        const countdowns = ['3...', '2...', '1...', 'Bắt Đầu'];
        for (const count of countdowns) {
            setFlashOverlay(count);
            await new Promise(r => setTimeout(r, 1000));
        }
        setFlashOverlay(null);
        await new Promise(r => setTimeout(r, 1000));

        // 2. Numbers
        for (const num of q.operands) {
            setFlashNumber(num);
            await new Promise(r => setTimeout(r, configSpeed));
            setFlashNumber(null);
            await new Promise(r => setTimeout(r, 150));
        }

        // 3. Equals
        setFlashNumber('=');
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

    const playAudio = async (idx: number) => {
        if (isPlayingAudio) return;
        setIsPlayingAudio(true);
        const q = questions[idx];
        const speed = navState?.customConfig?.speed || 1.0;

        const rate = Math.min(Math.max(0.9 / speed, 0.5), 2.5);

        // 1. "Chuẩn bị"
        await playSingleAudio("Chuẩn bị", 1.2);

        // 2. Numbers
        await new Promise(r => setTimeout(r, 300));
        const text = q.operands.join(', ');
        await playSingleAudio(text, rate);

        // 3. "Bằng"
        await new Promise(r => setTimeout(r, 300));
        await playSingleAudio("Bằng", 1.2);

        setIsPlayingAudio(false);
        audioRef.current = null;
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
            mode: urlMode, // Log attempt under the main URL mode (e.g. mixed)
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

    // Determine display Theme based on Active Mode
    const theme = {
        [Mode.VISUAL]: { title: 'Nhìn Tính', color: 'text-ucmas-blue' },
        [Mode.LISTENING]: { title: 'Nghe Tính', color: 'text-ucmas-red' },
        [Mode.FLASH]: { title: 'Flash', color: 'text-ucmas-green' },
        [Mode.MIXED]: { title: 'Hỗn Hợp', color: 'text-purple-600' },
    }[activeMode] || { title: 'Luyện Tập', color: 'text-gray-800' };

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 min-h-[85vh] flex flex-col items-center justify-center animate-fade-in">
            <div className="w-full max-w-4xl bg-white rounded-[3.5rem] shadow-2xl border border-gray-100 p-8 lg:p-16 relative">
                <div className="absolute top-10 right-10 flex items-center gap-4">
                    <div className="bg-red-50 text-ucmas-red px-6 py-2.5 rounded-2xl font-mono font-black text-2xl shadow-sm border border-red-100">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                </div>

                <div className="text-center mb-16">
                    <div className="flex justify-center items-center gap-2">
                        <span className="bg-blue-50 text-ucmas-blue px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest border border-blue-100">Câu {currentQIndex + 1} / {questions.length}</span>
                        {urlMode === Mode.MIXED && (
                            <span className={`${activeMode === Mode.VISUAL ? 'bg-blue-100 text-blue-800' : activeMode === Mode.LISTENING ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} px-3 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest`}>
                                {theme.title}
                            </span>
                        )}
                    </div>
                    <h3 className="mt-4 text-gray-400 font-bold uppercase text-xs tracking-widest">{navState?.customConfig?.name || 'Bài tập'}</h3>
                </div>

                <div className="min-h-[250px] flex items-center justify-center mb-20 relative overflow-hidden">
                    {activeMode === Mode.VISUAL && (
                        <div className="text-center animate-fade-in">
                            {questions[currentQIndex]?.operands.map((num, i) => (
                                <div key={i} className="text-7xl font-black text-gray-800 mb-2 font-mono tracking-tighter leading-tight">{num}</div>
                            ))}
                            <div className="w-32 h-2 bg-gray-100 mx-auto my-8 rounded-full"></div>
                            <div className="text-7xl font-black text-gray-200">?</div>
                        </div>
                    )}
                    {activeMode === Mode.FLASH && (
                        <div className="text-center w-full h-full flex items-center justify-center">
                            {flashOverlay ? (
                                <div className="absolute inset-0 bg-ucmas-blue z-50 flex items-center justify-center rounded-[2rem]">
                                    <div className="text-white font-normal text-[4.86rem] uppercase animate-bounce">{flashOverlay}</div>
                                </div>
                            ) : (
                                <div key={flashNumber?.toString() || 'blank'} className="text-[160px] font-black text-ucmas-blue leading-none tracking-tighter transition-all animate-fade-in">
                                    {flashNumber ?? <span className="opacity-0">...</span>}
                                </div>
                            )}
                        </div>
                    )}
                    {activeMode === Mode.LISTENING && (
                        <div className={`w-40 h-40 rounded-full flex items-center justify-center text-6xl text-white shadow-2xl transition-all ${isPlayingAudio ? 'bg-ucmas-red scale-105 animate-pulse' : 'bg-ucmas-red/50'}`}>🎧</div>
                    )}
                </div>

                <div className="max-w-md mx-auto relative">
                    <input
                        ref={inputRef} type="number" autoFocus disabled={isFlashing || isPlayingAudio}
                        value={answers[currentQIndex] || ''}
                        onChange={(e) => setAnswers({ ...answers, [currentQIndex]: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (currentQIndex < questions.length - 1) setCurrentQIndex(p => p + 1);
                                else submitExam();
                            }
                        }}
                        className="w-full h-24 border-4 border-gray-100 focus:border-ucmas-blue rounded-[2.5rem] text-center text-6xl font-black text-ucmas-blue bg-gray-50 focus:bg-white outline-none transition shadow-inner"
                        placeholder="..."
                    />
                    <p className="text-center text-[10px] font-bold text-gray-400 uppercase mt-4 tracking-widest">Nhấn Enter để chuyển câu</p>
                </div>

                <div className="mt-16 flex justify-between items-center px-10">
                    <button
                        disabled={isFlashing || isPlayingAudio}
                        onClick={() => setCurrentQIndex(p => Math.max(0, p - 1))}
                        className="text-gray-400 font-black uppercase text-xs hover:text-gray-800 transition disabled:opacity-50"
                    >
                        ← Trước
                    </button>
                    <div className="flex gap-2">
                        {questions.map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${currentQIndex === i ? 'bg-ucmas-blue w-8' : answers[i] ? 'bg-blue-200' : 'bg-gray-100'}`}></div>
                        ))}
                    </div>
                    <button
                        disabled={isFlashing || isPlayingAudio}
                        onClick={() => { if (currentQIndex < questions.length - 1) setCurrentQIndex(p => p + 1); else submitExam(); }}
                        className="text-ucmas-blue font-black uppercase text-xs hover:scale-105 transition disabled:opacity-50"
                    >
                        {currentQIndex < questions.length - 1 ? 'Tiếp ➜' : 'Nộp bài 🏁'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PracticeSessionExam;
