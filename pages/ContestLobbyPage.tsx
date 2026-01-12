
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { backend, supabase } from '../services/mockBackend';
import { Contest, ContestSession, UserProfile, Mode } from '../types';

interface ContestLobbyPageProps {
    user: UserProfile;
}

const ContestLobbyPage: React.FC<ContestLobbyPageProps> = ({ user }) => {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [session, setSession] = useState<ContestSession | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Timer State
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [phase, setPhase] = useState<'early' | 'lobby' | 'live' | 'ended'>('early');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!contestId) return;
    
    // Fetch Contest Info & Session
    const init = async () => {
        const { data } = await supabase.from('contests').select('*').eq('id', contestId).single();
        if (data) setContest(data as Contest);
        
        const sess = await backend.getMyContestSession(contestId);
        setSession(sess);
        setLoading(false);
    };
    init();
  }, [contestId]);

  // Timer Logic
  useEffect(() => {
      if (!contest) return;

      const updateTimer = () => {
          const now = new Date().getTime();
          const start = new Date(contest.start_at).getTime();
          const end = start + contest.duration_minutes * 60000;
          const lobbyOpen = start - contest.lobby_open_minutes * 60000;

          if (now < lobbyOpen) {
              setPhase('early');
              setTimeLeftStr(`Sảnh chờ mở lúc: ${new Date(lobbyOpen).toLocaleTimeString('vi-VN')}`);
          } else if (now >= lobbyOpen && now < start) {
              setPhase('lobby');
              const diff = Math.ceil((start - now) / 1000);
              setTimeLeftStr(`Bắt đầu trong: ${Math.floor(diff/60)}p ${diff%60}s`);
          } else if (now >= start && now < end) {
              setPhase('live');
              const diff = Math.ceil((end - now) / 1000);
              setTimeLeftStr(`Còn lại: ${Math.floor(diff/60)}p ${diff%60}s`);
          } else {
              setPhase('ended');
              setTimeLeftStr('Cuộc thi đã kết thúc');
          }
      };

      timerRef.current = window.setInterval(updateTimer, 1000);
      updateTimer();

      return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [contest]);

  const handleJoin = async () => {
      if (!joinCode.trim()) return;
      setJoinError('');
      const res = await backend.joinContest(joinCode.toUpperCase().trim());
      if (res.ok) {
          // Refresh session
          const sess = await backend.getMyContestSession(contestId!);
          setSession(sess);
      } else {
          setJoinError(res.message || 'Lỗi tham gia.');
      }
  };

  const enterExam = (mode: Mode) => {
      if (phase !== 'live') return;
      navigate(`/contests/${contestId}/exam/${mode}`);
  };

  if (loading) return <div className="text-center py-20">Đang tải...</div>;
  if (!contest) return <div className="text-center py-20">Cuộc thi không tồn tại.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center border border-gray-100">
            <h1 className="text-3xl font-black text-ucmas-blue mb-2">{contest.name}</h1>
            <p className="text-gray-500 mb-8">
                {new Date(contest.start_at).toLocaleString('vi-VN')} • {contest.duration_minutes} phút
            </p>

            {/* PHASE STATUS */}
            <div className={`inline-block px-6 py-2 rounded-full font-bold text-lg mb-8 ${
                phase === 'early' ? 'bg-gray-100 text-gray-500' :
                phase === 'lobby' ? 'bg-yellow-100 text-yellow-700 animate-pulse' :
                phase === 'live' ? 'bg-red-100 text-red-600' : 'bg-gray-800 text-white'
            }`}>
                {timeLeftStr}
            </div>

            {/* NOT JOINED YET */}
            {!session && (
                <div className="bg-gray-50 p-8 rounded-2xl max-w-md mx-auto">
                    <h3 className="font-bold text-gray-700 mb-4">Nhập Mã Tham Gia</h3>
                    <input 
                        type="text" 
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value)}
                        placeholder="CODE"
                        className="w-full text-center text-2xl font-mono uppercase tracking-widest p-3 border-2 border-gray-200 rounded-xl mb-4 focus:border-ucmas-blue outline-none"
                    />
                    {joinError && <p className="text-red-500 text-sm mb-4">{joinError}</p>}
                    <button 
                        onClick={handleJoin}
                        className="w-full bg-ucmas-blue text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg"
                    >
                        Vào Phòng Thi
                    </button>
                </div>
            )}

            {/* JOINED - WAITING ROOM OR EXAM SELECTOR */}
            {session && (
                <div className="animate-fade-in">
                    <div className="flex items-center justify-center gap-2 mb-8 text-green-600 font-bold bg-green-50 p-2 rounded-lg inline-block">
                        <span>✓</span> Đã tham gia (Mã số: {user.student_code || user.email})
                    </div>

                    {phase === 'early' && <p className="text-gray-500">Vui lòng quay lại khi sảnh chờ mở cửa.</p>}
                    
                    {(phase === 'lobby' || phase === 'live') && (
                        <div>
                             <h3 className="font-bold text-gray-800 mb-6">Chọn phần thi</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {contest.enable_nhin_tinh && (
                                    <button 
                                        onClick={() => enterExam(Mode.VISUAL)}
                                        disabled={phase !== 'live'}
                                        className={`p-6 rounded-2xl border-2 transition ${phase === 'live' ? 'border-ucmas-blue text-ucmas-blue hover:bg-blue-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        <div className="text-3xl mb-2">👁️</div>
                                        <div className="font-bold">Nhìn Tính</div>
                                    </button>
                                )}
                                {contest.enable_nghe_tinh && (
                                    <button 
                                        onClick={() => enterExam(Mode.LISTENING)}
                                        disabled={phase !== 'live'}
                                        className={`p-6 rounded-2xl border-2 transition ${phase === 'live' ? 'border-ucmas-red text-ucmas-red hover:bg-red-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        <div className="text-3xl mb-2">🎧</div>
                                        <div className="font-bold">Nghe Tính</div>
                                    </button>
                                )}
                                {contest.enable_flash && (
                                    <button 
                                        onClick={() => enterExam(Mode.FLASH)}
                                        disabled={phase !== 'live'}
                                        className={`p-6 rounded-2xl border-2 transition ${phase === 'live' ? 'border-ucmas-green text-ucmas-green hover:bg-green-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        <div className="text-3xl mb-2">⚡</div>
                                        <div className="font-bold">Flash</div>
                                    </button>
                                )}
                             </div>
                             {phase === 'lobby' && <p className="mt-4 text-sm text-yellow-600">Đợi đồng hồ đếm ngược kết thúc để vào thi.</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default ContestLobbyPage;
