
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';

interface HomePageProps {
    user: UserProfile | null;
}

const HomePage: React.FC<HomePageProps> = ({ user }) => {
  const navigate = useNavigate();
  const PATH_TOTAL_DAYS = 96;
  const PATH_TOTAL_WEEKS = 16;
  const brainSvgUrl = new URL('../svg/brain.svg', import.meta.url).toString();

  const handlePracticeClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/training');
  };

  const handleRoadmapClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/training', { state: { openTab: 'path' as const } });
  };

  const handleContestClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/contests');
  };

  const handleActivateClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/activate');
  };

  return (
    <div className="relative">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-[520px] h-[520px] bg-ucmas-blue/10 rounded-full blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-28 -right-24 w-[620px] h-[620px] bg-ucmas-red/10 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
        {/* HERO */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ucmas-blue/20 bg-white/60 backdrop-blur text-xs text-gray-700 mb-5">
              <span className="font-heading font-semibold text-ucmas-blue">UCMAS Club</span>
              <span className="text-gray-300">•</span>
              <span className="font-heading font-semibold">Education With A Difference</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-heading-extrabold text-ucmas-blue leading-tight">
              Khai mở tiềm năng trí tuệ
              <span className="text-ucmas-red"> mỗi ngày</span>
            </h1>
            <p className="text-gray-600 text-lg mt-4 max-w-xl">
              Nền tảng luyện tập UCMAS: <strong>Nhìn tính</strong>, <strong>Nghe tính</strong>, <strong>Flash</strong>,
              lộ trình <strong>{PATH_TOTAL_WEEKS} tuần ({PATH_TOTAL_DAYS} ngày)</strong> theo cấp độ và hệ thống <strong>Cuộc thi</strong> để theo dõi tiến bộ.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {!user ? (
                <>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-6 py-3 bg-ucmas-red text-white font-heading-bold rounded-xl hover:bg-ucmas-blue shadow-md transition-all"
                  >
                    Đăng ký ngay
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 border-2 border-ucmas-blue text-ucmas-blue font-heading-bold rounded-xl hover:bg-ucmas-blue hover:text-white transition-all"
                  >
                    Đăng nhập
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-3 bg-ucmas-blue text-white font-heading-bold rounded-xl hover:bg-ucmas-red transition-all shadow-md"
                  >
                    Vào trang cá nhân
                  </button>
                  <button
                    onClick={handlePracticeClick}
                    className="px-6 py-3 border-2 border-ucmas-blue/30 bg-white text-ucmas-blue font-heading-bold rounded-xl hover:bg-ucmas-blue hover:text-white transition-all"
                  >
                    Bắt đầu luyện tập
                  </button>
                </>
              )}
            </div>

            <div className="mt-7 grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/70 backdrop-blur border border-gray-200 p-4">
                <div className="text-2xl mb-1">🏁</div>
                <div className="font-heading font-bold text-gray-800">Lộ trình {PATH_TOTAL_WEEKS} tuần</div>
                <div className="text-xs text-gray-600 mt-1">{PATH_TOTAL_DAYS} ngày • Mỗi tuần 6 ngày • Theo cấp độ</div>
              </div>
              <div className="rounded-2xl bg-white/70 backdrop-blur border border-gray-200 p-4">
                <div className="text-2xl mb-1">📚</div>
                <div className="font-heading font-bold text-gray-800">Lịch sử luyện tập</div>
                <div className="text-xs text-gray-600 mt-1">Lưu kết quả, xem lại chi tiết từng câu</div>
              </div>
              <div className="rounded-2xl bg-white/70 backdrop-blur border border-gray-200 p-4">
                <div className="text-2xl mb-1">🏆</div>
                <div className="font-heading font-bold text-gray-800">Cuộc thi</div>
                <div className="text-xs text-gray-600 mt-1">Sảnh chờ, tham gia, làm bài, nộp kết quả</div>
              </div>
            </div>
          </div>

          {/* Right visual cards */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-ucmas-blue/10 to-ucmas-red/10 rounded-[2.5rem] blur-xl"></div>
            <div className="relative bg-white/80 backdrop-blur rounded-[2.5rem] border border-gray-200 shadow-xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-xs text-gray-500 font-heading font-semibold uppercase tracking-widest">Trí tuệ số học</div>
                  <div className="text-2xl font-heading-extrabold text-gray-800">Nạp kiến thức mỗi ngày</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Rèn phản xạ • tăng tập trung • phát triển tư duy
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-ucmas-yellow/20 flex items-center justify-center text-2xl">✨</div>
              </div>

              {/* Brain illustration */}
              <div className="relative rounded-[2rem] border border-gray-200 bg-gradient-to-br from-white via-ucmas-blue/5 to-ucmas-red/5 overflow-hidden p-6 sm:p-8">
                {/* glow */}
                <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-ucmas-blue/20 blur-3xl rounded-full"></div>
                <div className="pointer-events-none absolute -bottom-16 -right-16 w-64 h-64 bg-ucmas-red/20 blur-3xl rounded-full"></div>

                {/* Neural data transmission overlay */}
                <svg
                  className="pointer-events-none absolute inset-0 w-full h-full"
                  viewBox="0 0 200 200"
                  aria-hidden="true"
                >
                  <defs>
                    <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2.2" result="blur" />
                      <feColorMatrix
                        in="blur"
                        type="matrix"
                        values="
                          0 0 0 0 0.10
                          0 0 0 0 0.35
                          0 0 0 0 0.90
                          0 0 0 0.9 0"
                        result="blue"
                      />
                      <feMerge>
                        <feMergeNode in="blue" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2.2" result="blur" />
                      <feColorMatrix
                        in="blur"
                        type="matrix"
                        values="
                          0 0 0 0 0.90
                          0 0 0 0 0.18
                          0 0 0 0 0.25
                          0 0 0 0.9 0"
                        result="red"
                      />
                      <feMerge>
                        <feMergeNode in="red" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2.2" result="blur" />
                      <feColorMatrix
                        in="blur"
                        type="matrix"
                        values="
                          0 0 0 0 0.05
                          0 0 0 0 0.65
                          0 0 0 0 0.35
                          0 0 0 0.9 0"
                        result="green"
                      />
                      <feMerge>
                        <feMergeNode in="green" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <linearGradient id="wireBlue" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#2563eb" stopOpacity="0.2" />
                      <stop offset="0.5" stopColor="#2563eb" stopOpacity="0.55" />
                      <stop offset="1" stopColor="#2563eb" stopOpacity="0.2" />
                    </linearGradient>
                    <linearGradient id="wireRed" x1="1" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#ef4444" stopOpacity="0.18" />
                      <stop offset="0.5" stopColor="#ef4444" stopOpacity="0.55" />
                      <stop offset="1" stopColor="#ef4444" stopOpacity="0.18" />
                    </linearGradient>
                    <linearGradient id="wireGreen" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0" stopColor="#16a34a" stopOpacity="0.16" />
                      <stop offset="0.5" stopColor="#16a34a" stopOpacity="0.5" />
                      <stop offset="1" stopColor="#16a34a" stopOpacity="0.16" />
                    </linearGradient>
                  </defs>

                  {/* faint neuron "wires" */}
                  <path
                    d="M25,120 C55,85 70,90 95,70 C120,50 145,65 170,40"
                    fill="none"
                    stroke="url(#wireBlue)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeDasharray="10 8"
                    opacity="0.9"
                  >
                    <animate attributeName="stroke-dashoffset" values="0;180" dur="3.2s" repeatCount="indefinite" />
                  </path>
                  <path
                    d="M30,55 C60,35 85,55 105,85 C125,115 150,120 175,105"
                    fill="none"
                    stroke="url(#wireRed)"
                    strokeWidth="2.0"
                    strokeLinecap="round"
                    strokeDasharray="12 9"
                    opacity="0.85"
                  >
                    <animate attributeName="stroke-dashoffset" values="200;0" dur="3.8s" repeatCount="indefinite" />
                  </path>
                  <path
                    d="M22,90 C52,115 70,135 100,130 C130,125 145,105 178,85"
                    fill="none"
                    stroke="url(#wireGreen)"
                    strokeWidth="2.0"
                    strokeLinecap="round"
                    strokeDasharray="9 10"
                    opacity="0.8"
                  >
                    <animate attributeName="stroke-dashoffset" values="0;220" dur="4.4s" repeatCount="indefinite" />
                  </path>

                  {/* moving "signals" */}
                  {[
                    { color: '#2563eb', filter: 'url(#glowBlue)', dur: '2.4s', begin: '0s', path: 'M25,120 C55,85 70,90 95,70 C120,50 145,65 170,40' },
                    { color: '#ef4444', filter: 'url(#glowRed)', dur: '2.9s', begin: '0.4s', path: 'M30,55 C60,35 85,55 105,85 C125,115 150,120 175,105' },
                    { color: '#16a34a', filter: 'url(#glowGreen)', dur: '3.3s', begin: '0.8s', path: 'M22,90 C52,115 70,135 100,130 C130,125 145,105 178,85' },
                    { color: '#2563eb', filter: 'url(#glowBlue)', dur: '3.6s', begin: '1.2s', path: 'M170,40 C140,70 125,78 100,100 C75,122 55,118 30,145' },
                  ].map((s, i) => (
                    <g key={i}>
                      <circle r="3.2" fill={s.color} filter={s.filter} opacity="0.95">
                        <animateMotion dur={s.dur} begin={s.begin} repeatCount="indefinite" path={s.path} />
                      </circle>
                      <circle r="1.5" fill="#ffffff" opacity="0.9">
                        <animateMotion dur={s.dur} begin={s.begin} repeatCount="indefinite" path={s.path} />
                      </circle>
                    </g>
                  ))}
                </svg>

                {/* floating math */}
                {[
                  { s: '+', cls: 'text-ucmas-blue', x: '8%', y: '18%', a: 'animate-bounce', d: '0ms' },
                  { s: '−', cls: 'text-ucmas-red', x: '18%', y: '70%', a: 'animate-bounce', d: '120ms' },
                  { s: '×', cls: 'text-ucmas-green', x: '82%', y: '22%', a: 'animate-bounce', d: '240ms' },
                  { s: '÷', cls: 'text-ucmas-blue', x: '78%', y: '74%', a: 'animate-bounce', d: '360ms' },
                  { s: '√', cls: 'text-ucmas-red', x: '50%', y: '12%', a: 'animate-pulse', d: '0ms' },
                  { s: 'π', cls: 'text-ucmas-green', x: '50%', y: '88%', a: 'animate-pulse', d: '0ms' },
                ].map((m, idx) => (
                  <div
                    key={idx}
                    className={`pointer-events-none absolute ${m.a} ${m.cls} font-heading font-black text-2xl drop-shadow-sm opacity-80`}
                    style={{ left: m.x, top: m.y, transform: 'translate(-50%, -50%)', animationDelay: m.d as any }}
                  >
                    {m.s}
                  </div>
                ))}

                <div className="relative flex items-center justify-center">
                  {/* outer ring */}
                  <div className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-br from-ucmas-blue/20 via-white to-ucmas-red/20 blur-xl"></div>
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-[2.5rem] bg-white border border-gray-200 shadow-lg flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-ucmas-blue/10 to-ucmas-red/10 animate-pulse"></div>
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white/80 border border-gray-200 shadow-2xl flex items-center justify-center overflow-hidden">
                      <img
                        src={brainSvgUrl}
                        alt="Brain"
                        className="w-full h-full object-contain drop-shadow-[0_10px_22px_rgba(37,99,235,0.18)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { k: 'Phát triển', v: 'Tư duy', c: 'text-ucmas-blue' },
                    { k: 'Tỏa sáng', v: 'Phản xạ', c: 'text-ucmas-red' },
                    { k: 'Nạp', v: 'Kiến thức', c: 'text-ucmas-green' },
                  ].map((i) => (
                    <div key={i.k} className="rounded-2xl bg-white/70 border border-gray-200 p-3 text-center">
                      <div className={`text-[10px] font-heading font-black uppercase tracking-widest ${i.c}`}>{i.k}</div>
                      <div className="text-xs text-gray-700 font-heading font-bold mt-1">{i.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handlePracticeClick}
                  className="px-5 py-3 bg-ucmas-blue text-white font-heading-bold rounded-xl hover:bg-ucmas-red transition-all shadow-md"
                >
                  Vào luyện tập
                </button>
                <button
                  onClick={handleRoadmapClick}
                  className="px-5 py-3 bg-white border-2 border-ucmas-blue/30 text-ucmas-blue font-heading-bold rounded-xl hover:bg-ucmas-blue hover:text-white transition-all"
                >
                  Xem lộ trình
                </button>
                <button
                  onClick={handleContestClick}
                  className="px-5 py-3 bg-white border-2 border-ucmas-red/30 text-ucmas-red font-heading-bold rounded-xl hover:bg-ucmas-red hover:text-white transition-all"
                >
                  Xem cuộc thi
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="mt-12 grid lg:grid-cols-4 sm:grid-cols-2 gap-4">
          <button
            onClick={handlePracticeClick}
            className="text-left p-6 rounded-3xl border border-gray-200 bg-white hover:shadow-lg transition"
          >
            <div className="w-12 h-12 rounded-2xl bg-ucmas-blue/10 flex items-center justify-center text-2xl mb-4">📋</div>
            <div className="font-heading font-black text-gray-800">Luyện tập</div>
            <div className="text-sm text-gray-600 mt-1">Chọn chế độ, độ khó, số câu, tốc độ</div>
          </button>
          <button
            onClick={handleRoadmapClick}
            className="text-left p-6 rounded-3xl border border-gray-200 bg-white hover:shadow-lg transition"
          >
            <div className="w-12 h-12 rounded-2xl bg-ucmas-green/10 flex items-center justify-center text-2xl mb-4">🏁</div>
            <div className="font-heading font-black text-gray-800">Lộ trình</div>
            <div className="text-sm text-gray-600 mt-1">Theo ngày – mỗi ngày tối đa 3 bài</div>
          </button>
          <button
            onClick={handleContestClick}
            className="text-left p-6 rounded-3xl border border-gray-200 bg-white hover:shadow-lg transition"
          >
            <div className="w-12 h-12 rounded-2xl bg-ucmas-yellow/20 flex items-center justify-center text-2xl mb-4">🏆</div>
            <div className="font-heading font-black text-gray-800">Cuộc thi</div>
            <div className="text-sm text-gray-600 mt-1">Tham gia, làm bài theo chế độ, nộp kết quả</div>
          </button>
          <button
            onClick={handleActivateClick}
            className="text-left p-6 rounded-3xl border border-gray-200 bg-white hover:shadow-lg transition"
          >
            <div className="w-12 h-12 rounded-2xl bg-ucmas-red/10 flex items-center justify-center text-2xl mb-4">🔑</div>
            <div className="font-heading font-black text-gray-800">Kích hoạt</div>
            <div className="text-sm text-gray-600 mt-1">Nhập mã để mở khóa lộ trình và tăng quyền luyện tập</div>
          </button>
        </div>

        {/* CORE MODES (moved down from hero right panel) */}
        <div className="mt-12">
          <div className="text-center mb-6">
            <div className="text-xs text-gray-500 font-heading font-semibold uppercase tracking-widest">Chế độ luyện tập</div>
            <div className="text-3xl font-heading-extrabold text-gray-800">3 chế độ cốt lõi</div>
            <p className="text-gray-600 mt-2">Nhìn – Nghe – Flash: luyện đều để tăng tốc độ và độ chính xác.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-[2.5rem] border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition">
              <div className="w-14 h-14 rounded-2xl bg-ucmas-blue/10 flex items-center justify-center text-3xl mb-4">👁️</div>
              <div className="font-heading font-black text-ucmas-blue text-xl">Nhìn tính</div>
              <div className="text-sm text-gray-600 mt-2">Tập trung – tốc độ – độ chính xác</div>
            </div>
            <div className="rounded-[2.5rem] border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition">
              <div className="w-14 h-14 rounded-2xl bg-ucmas-red/10 flex items-center justify-center text-3xl mb-4">🎧</div>
              <div className="font-heading font-black text-ucmas-red text-xl">Nghe tính</div>
              <div className="text-sm text-gray-600 mt-2">Phản xạ nghe – ghi nhớ chuỗi số</div>
            </div>
            <div className="rounded-[2.5rem] border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition">
              <div className="w-14 h-14 rounded-2xl bg-ucmas-green/10 flex items-center justify-center text-3xl mb-4">⚡</div>
              <div className="font-heading font-black text-ucmas-green text-xl">Flash</div>
              <div className="text-sm text-gray-600 mt-2">Tốc độ hiển thị – xử lý nhanh</div>
            </div>
          </div>
        </div>

        {/* BENEFITS + FEATURES */}
        <div className="mt-14 grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-heading-extrabold text-gray-800 mb-2">Lợi ích nổi bật</h2>
            <p className="text-gray-600 mb-6">
              UCMAS giúp rèn luyện tư duy và kỹ năng học tập thông qua luyện tập đều đặn mỗi ngày.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: '🎯', title: 'Tập trung', desc: 'Tăng khả năng chú ý và kỷ luật học tập' },
                { icon: '🧩', title: 'Tư duy logic', desc: 'Phát triển tư duy và cách giải quyết vấn đề' },
                { icon: '🧠', title: 'Ghi nhớ', desc: 'Cải thiện trí nhớ ngắn hạn và dài hạn' },
                { icon: '⚡', title: 'Phản xạ nhanh', desc: 'Xử lý chuỗi số nhanh và chính xác' },
              ].map((b) => (
                <div key={b.title} className="rounded-2xl bg-gray-50 border border-gray-200 p-5">
                  <div className="text-2xl">{b.icon}</div>
                  <div className="mt-2 font-heading font-bold text-gray-800">{b.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-ucmas-blue/5 via-white to-ucmas-red/5 rounded-3xl border border-ucmas-blue/10 p-8">
            <h2 className="text-2xl font-heading-extrabold text-gray-800 mb-2">Tính năng trên UCMAS Club</h2>
            <p className="text-gray-600 mb-6">
              Thiết kế để học sinh dễ tập trung, dễ theo dõi tiến bộ và luyện đúng lộ trình.
            </p>
            <ul className="space-y-3">
              {[
                { icon: '✅', text: 'Luyện theo chế độ: chọn cấp độ, độ khó, số câu (và tốc độ cho Nghe/Flash).' },
                { icon: '🏁', text: `Luyện theo lộ trình ${PATH_TOTAL_WEEKS} tuần (${PATH_TOTAL_DAYS} ngày): chọn tuần/ngày để làm bài.` },
                { icon: '📊', text: 'Lưu lịch sử luyện tập và xem lại chi tiết đáp án.' },
                { icon: '🏆', text: 'Cuộc thi: sảnh chờ, vào phòng thi, làm bài theo chế độ.' },
                { icon: '🔐', text: 'Kích hoạt bản quyền để mở khóa đầy đủ luyện tập (đặc biệt lộ trình) và xem hạn sử dụng.' },
              ].map((f) => (
                <li key={f.text} className="flex gap-3 items-start">
                  <span className="mt-0.5">{f.icon}</span>
                  <span className="text-gray-700">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA BOTTOM */}
        <div className="mt-14 rounded-[2.5rem] bg-ucmas-blue text-white p-8 sm:p-10 overflow-hidden relative">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-heading-extrabold">Sẵn sàng bắt đầu luyện tập?</h2>
            <p className="text-white/90 mt-2 max-w-2xl">
              Học đều mỗi ngày theo lộ trình – xem kết quả, rèn phản xạ và cải thiện độ chính xác.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {!user ? (
                <>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-6 py-3 bg-white text-ucmas-blue font-heading-bold rounded-xl hover:bg-ucmas-yellow transition shadow-md"
                  >
                    Tạo tài khoản
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 border-2 border-white/60 text-white font-heading-bold rounded-xl hover:bg-white hover:text-ucmas-blue transition"
                  >
                    Đăng nhập
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handlePracticeClick}
                    className="px-6 py-3 bg-white text-ucmas-blue font-heading-bold rounded-xl hover:bg-ucmas-yellow transition shadow-md"
                  >
                    Vào luyện tập
                  </button>
                  <button
                    onClick={handleActivateClick}
                    className="px-6 py-3 border-2 border-white/60 text-white font-heading-bold rounded-xl hover:bg-white hover:text-ucmas-blue transition"
                  >
                    Kích hoạt / Gia hạn
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-10 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} UCMAS Club. Nền tảng luyện tập dành cho học sinh – giáo viên – trung tâm.
        </div>
      </div>
    </div>
  );
};

export default HomePage;
