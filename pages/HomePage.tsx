
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mode, UserProfile } from '../types';

interface HomePageProps {
    user: UserProfile | null;
}

const HomePage: React.FC<HomePageProps> = ({ user }) => {
  const navigate = useNavigate();

  const modes = [
    {
      id: Mode.VISUAL,
      title: "Nhìn Tính",
      subtitle: "Hàng tỷ phép tính hay • Đa dạng cấp độ",
      icon: "👁️",
      colorClass: "bg-ucmas-blue",
    },
    {
      id: Mode.LISTENING,
      title: "Nghe Tính",
      subtitle: "Luyện đa ngôn ngữ • Đa dạng cấp độ",
      icon: "🎧",
      colorClass: "bg-ucmas-red",
    },
    {
      id: Mode.FLASH,
      title: "Flash",
      subtitle: "Luyện tốc độ • Đa dạng cấp độ",
      icon: "⚡",
      colorClass: "bg-ucmas-green",
    }
  ];

  const handleModeClick = (modeId: Mode) => {
      if (!user) {
          navigate('/login');
          return;
      }

      // Check access
      if (user.role !== 'admin') {
          const isExpired = !user.license_expiry || new Date(user.license_expiry) < new Date();
          const isAllowed = user.allowed_modes.includes(modeId);
          
          if (isExpired || !isAllowed) {
              navigate('/activate');
              return;
          }
      }

      navigate(`/practice/${modeId}`);
  };

  const hasAccess = (modeId: Mode) => {
    if (!user) return false; // Show as available but will redirect to login
    if (user.role === 'admin') return true;
    if (!user.license_expiry) return false;
    if (new Date(user.license_expiry) < new Date()) return false;
    return user.allowed_modes.includes(modeId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-ucmas-blue mb-6 tracking-tight">
          Chào mừng đến với <br/>
          <span className="inline-block bg-ucmas-red text-white px-4 py-1 rounded-lg mt-2 transform -rotate-1 shadow-lg">UCMAS Club</span>
        </h1>
        <p className="text-gray-500 text-lg">Chọn bài luyện tập để bắt đầu</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {modes.map((mode) => {
          // If user is not logged in, we act like it's open (click -> login)
          // If logged in, we check license.
          const locked = user ? !hasAccess(mode.id) : false;
          
          return (
            <div 
                key={mode.id} 
                onClick={() => handleModeClick(mode.id)}
                className={`group bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 transition-all duration-300 cursor-pointer flex flex-col items-center text-center relative ${locked ? 'opacity-70 grayscale-[0.5]' : 'hover:shadow-2xl hover:-translate-y-2'}`}
            >
                {/* Icon */}
                <div className={`w-24 h-24 rounded-full ${mode.colorClass} text-white flex items-center justify-center text-4xl mb-8 shadow-lg bg-opacity-90 group-hover:bg-opacity-100 relative`}>
                {mode.icon}
                {locked && (
                    <div className="absolute -top-1 -right-1 bg-gray-600 text-white rounded-full p-2 border-2 border-white shadow-sm">
                        🔒
                    </div>
                )}
                </div>

                <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-ucmas-blue transition-colors">
                {mode.title}
                </h3>
                <p className="text-gray-500 font-medium">
                {mode.subtitle}
                </p>

                <div className={`mt-8 px-6 py-2 rounded-full text-sm font-semibold transition-all ${locked ? 'bg-gray-200 text-gray-600' : 'bg-gray-50 text-gray-400 group-hover:bg-ucmas-blue group-hover:text-white'}`}>
                {locked ? 'Yêu cầu kích hoạt' : 'Bắt đầu ngay ➝'}
                </div>
            </div>
          );
        })}
      </div>
      
      {/* Decorative blobs */}
      <div className="fixed top-20 left-0 w-64 h-64 bg-ucmas-blue opacity-5 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-ucmas-red opacity-5 rounded-full blur-3xl -z-10"></div>
    </div>
  );
};

export default HomePage;
