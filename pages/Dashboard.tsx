import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Mode } from '../types';

interface DashboardProps {
  user: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [daysLeft, setDaysLeft] = useState<number>(0);

  useEffect(() => {
    if (user.license_expiry) {
      const now = new Date();
      const expiry = new Date(user.license_expiry);
      const diffTime = expiry.getTime() - now.getTime();
      setDaysLeft(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
  }, [user]);

  const modes = [
    {
      id: Mode.VISUAL,
      title: "Nhìn Tính",
      subtitle: "200 câu hỏi • 8 phút",
      icon: "👁️",
      colorClass: "bg-ucmas-blue",
      hoverClass: "group-hover:text-ucmas-blue"
    },
    {
      id: Mode.LISTENING,
      title: "Nghe Tính",
      subtitle: "30 câu hỏi • Nghe đọc số",
      icon: "🎧",
      colorClass: "bg-ucmas-red",
      hoverClass: "group-hover:text-ucmas-red"
    },
    {
      id: Mode.FLASH,
      title: "Flash",
      subtitle: "30 câu hỏi • Thẻ số nhanh",
      icon: "⚡",
      colorClass: "bg-ucmas-green",
      hoverClass: "group-hover:text-ucmas-green"
    }
  ];

  const hasAccess = (mode: Mode) => {
    if (user.role === 'admin') return true;
    if (!user.license_expiry) return false;
    if (new Date(user.license_expiry) < new Date()) return false;
    return user.allowed_modes.includes(mode);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-ucmas-blue mb-4">
          Chào mừng đến với <span className="bg-ucmas-red text-white px-2 rounded">UCMAS Club</span>
        </h1>
        <p className="text-gray-500">Chọn bài luyện tập để bắt đầu</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {modes.map((mode) => {
          const locked = !hasAccess(mode.id);
          return (
            <div 
              key={mode.id} 
              onClick={() => !locked && navigate(`/practice/${mode.id}`)}
              className={`group bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col items-center text-center relative ${locked ? 'opacity-60 grayscale' : ''}`}
            >
               {/* Icon Circle */}
               <div className={`w-20 h-20 rounded-full ${mode.colorClass} text-white flex items-center justify-center text-3xl mb-6 shadow-lg transform group-hover:scale-110 transition-transform`}>
                 {mode.icon}
               </div>

               <h3 className={`text-2xl font-bold text-gray-800 mb-2 ${mode.hoverClass} transition-colors`}>
                 {mode.title}
               </h3>
               <p className="text-gray-500 font-medium">
                 {mode.subtitle}
               </p>

               {locked && (
                 <div className="mt-6 px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase">
                   🔒 Yêu cầu kích hoạt
                 </div>
               )}

               {!locked && (
                 <div className="mt-6 text-ucmas-blue opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                    <span className="text-2xl">➝</span>
                 </div>
               )}
            </div>
          );
        })}
      </div>

      {daysLeft <= 0 && user.role !== 'admin' && (
        <div className="mt-12 text-center">
            <div className="inline-block bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
                <p className="text-yellow-800 mb-2 font-medium">Tài khoản của bạn chưa kích hoạt hoặc đã hết hạn.</p>
                <button 
                  onClick={() => navigate('/activate')}
                  className="px-6 py-2 bg-yellow-500 text-white font-bold rounded-full hover:bg-yellow-600 shadow-md transition"
                >
                  Kích hoạt ngay
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;