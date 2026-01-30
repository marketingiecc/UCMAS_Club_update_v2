
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';

interface HomePageProps {
    user: UserProfile | null;
}

const HomePage: React.FC<HomePageProps> = ({ user }) => {
  const navigate = useNavigate();

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
              lộ trình <strong>120 ngày</strong> theo cấp độ và hệ thống <strong>Cuộc thi</strong> để theo dõi tiến bộ.
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
                <div className="font-heading font-bold text-gray-800">Lộ trình 120 ngày</div>
                <div className="text-xs text-gray-600 mt-1">Chia theo tab 1–30, 31–60, 61–90, 91–120</div>
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-xs text-gray-500 font-heading font-semibold uppercase tracking-widest">Chế độ luyện tập</div>
                  <div className="text-2xl font-heading-extrabold text-gray-800">3 chế độ cốt lõi</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-ucmas-blue/10 flex items-center justify-center text-2xl">🧠</div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-200 p-5 hover:shadow-md transition bg-gradient-to-br from-ucmas-blue/5 to-white">
                  <div className="text-3xl">👁️</div>
                  <div className="mt-2 font-heading font-bold text-ucmas-blue">Nhìn tính</div>
                  <div className="text-xs text-gray-600 mt-1">Tập trung – tốc độ – độ chính xác</div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-5 hover:shadow-md transition bg-gradient-to-br from-ucmas-red/5 to-white">
                  <div className="text-3xl">🎧</div>
                  <div className="mt-2 font-heading font-bold text-ucmas-red">Nghe tính</div>
                  <div className="text-xs text-gray-600 mt-1">Phản xạ nghe – ghi nhớ chuỗi số</div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-5 hover:shadow-md transition bg-gradient-to-br from-ucmas-green/10 to-white">
                  <div className="text-3xl">⚡</div>
                  <div className="mt-2 font-heading font-bold text-ucmas-green">Flash</div>
                  <div className="text-xs text-gray-600 mt-1">Tốc độ hiển thị – xử lý nhanh</div>
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
            <div className="text-sm text-gray-600 mt-1">Nhập mã để mở quyền luyện tập & cuộc thi</div>
          </button>
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
                { icon: '🏁', text: 'Luyện theo lộ trình 120 ngày: chia theo tab, chọn ngày để làm bài.' },
                { icon: '📊', text: 'Lưu lịch sử luyện tập và xem lại chi tiết đáp án.' },
                { icon: '🏆', text: 'Cuộc thi: sảnh chờ, vào phòng thi, làm bài theo chế độ.' },
                { icon: '🔐', text: 'Kích hoạt bản quyền để mở quyền truy cập luyện tập.' },
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
