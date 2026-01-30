
import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { UserProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await backend.logout();
    setUser(null);
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path ? "text-ucmas-blue font-heading font-bold border-b-2 border-ucmas-blue" : "text-gray-600 hover:text-ucmas-blue";
  const isContestActive = () => location.pathname.startsWith('/contests') ? "text-ucmas-blue font-heading font-bold border-b-2 border-ucmas-blue" : "text-gray-600 hover:text-ucmas-blue";


  // Calculate days remaining
  const getDaysLeft = () => {
     if (!user?.license_expiry) return 0;
     const diff = new Date(user.license_expiry).getTime() - new Date().getTime();
     return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };
  
  const daysLeft = getDaysLeft();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <nav className="bg-white border-b-2 border-ucmas-blue/10 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo with Tagline */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
               <img 
                 src="https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/sign/UCMAS/logo%20UCMAS.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84MzcyMmZjMi1kNTFiLTQzYWItYmQ5OC1kYjY5MTc1ZjAxYWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJVQ01BUy9sb2dvIFVDTUFTLnBuZyIsImlhdCI6MTc2Nzg2MDYzMiwiZXhwIjoxODU0MjYwNjMyfQ.-gXR6eggFwBAK-zmgXRHhB3rs8SNogaV2am-1V4GJro" 
                 alt="UCMAS Logo" 
                 className="h-14 md:h-16 w-auto object-contain transition-transform group-hover:scale-105"
               />
               <div className="hidden md:block">
                 <p className="text-[10px] font-heading-bold text-ucmas-blue uppercase tracking-widest">
                   Education With A Difference
                 </p>
               </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
               <Link to="/" className={`text-sm font-heading font-semibold transition-colors ${isActive('/') ? 'text-ucmas-red border-b-2 border-ucmas-red pb-1' : 'text-gray-700 hover:text-ucmas-red'}`}>Trang chủ</Link>
               {user && (
                 <>
                   <Link to="/training" className={`text-sm font-heading font-semibold transition-colors ${isActive('/training') ? 'text-ucmas-red border-b-2 border-ucmas-red pb-1' : 'text-gray-700 hover:text-ucmas-red'}`}>Luyện tập</Link>
                   <Link to="/contests" className={`text-sm font-heading font-semibold transition-colors ${isContestActive() ? 'text-ucmas-red border-b-2 border-ucmas-red pb-1' : 'text-gray-700 hover:text-ucmas-red'}`}>
                     <span className="flex items-center gap-1">Cuộc thi <span className="text-ucmas-yellow">🏆</span></span>
                   </Link>
                   <Link to="/activate" className={`text-sm font-heading font-semibold transition-colors ${isActive('/activate') ? 'text-ucmas-red border-b-2 border-ucmas-red pb-1' : 'text-gray-700 hover:text-ucmas-red'}`}>Kích hoạt</Link>
                   {user.role === 'admin' && (
                     <Link to="/admin" className={`text-xs font-heading-bold text-white bg-ucmas-red uppercase px-4 py-2 rounded-lg hover:bg-ucmas-blue transition-all shadow-md ${isActive('/admin') ? 'ring-2 ring-ucmas-yellow' : ''}`}>
                       Quản trị viên
                     </Link>
                   )}
                 </>
               )}

               {!user && (
                 <>
                   <a href="#" className="text-sm font-heading font-semibold text-gray-700 hover:text-ucmas-blue transition-colors">Tin tức</a>
                   <a href="#" className="text-sm font-heading font-semibold text-gray-700 hover:text-ucmas-blue transition-colors">Liên hệ</a>
                 </>
               )}
            </div>

            {/* Auth / User block */}
            <div>
              {user ? (
                <div className="flex items-center gap-3">
                  <Link to="/dashboard" className="hidden sm:flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-ucmas-blue/20 flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-ucmas-blue font-heading-bold text-lg">{user.full_name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-heading-bold text-gray-800">{user.full_name || 'Học sinh'}</span>
                      <span className="text-xs text-gray-500">Cấp độ: {user.level_symbol || '—'}</span>
                    </div>
                  </Link>
                  {user.role !== 'admin' && daysLeft > 0 && (
                    <span className={`hidden sm:inline text-[10px] px-2 py-0.5 rounded-full font-heading font-bold border ${daysLeft <= 5 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      Còn {daysLeft} ngày
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                   <Link to="/login" className="px-6 py-2.5 rounded-lg text-sm font-heading-bold text-ucmas-blue border-2 border-ucmas-blue hover:bg-ucmas-blue hover:text-white transition-all shadow-sm">
                     Đăng nhập
                   </Link>
                   <Link to="/register" className="px-6 py-2.5 rounded-lg text-sm font-heading-bold bg-ucmas-red text-white hover:bg-ucmas-blue shadow-lg transition-all transform hover:-translate-y-0.5 hover:shadow-xl">
                     Đăng ký
                   </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow w-full">
        {children}
      </main>

      <footer className="bg-gradient-to-r from-ucmas-blue to-ucmas-blue/90 text-white py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="mb-4">
            <p className="text-lg font-heading-bold mb-2">UCMAS VIỆT NAM</p>
            <p className="text-sm font-heading font-semibold opacity-90 uppercase tracking-widest">Education With A Difference</p>
          </div>
          <div className="border-t border-white/20 pt-4 mt-4">
            <p className="text-xs opacity-75">
              &copy; {new Date().getFullYear()} Bản quyền thuộc về UCMAS Vietnam. 
              <span className="mx-2">|</span>
              Phát triển bởi IECC
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
