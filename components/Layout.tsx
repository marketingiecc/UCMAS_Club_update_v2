
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

  const isActive = (path: string) => location.pathname === path ? "text-ucmas-blue font-bold border-b-2 border-ucmas-blue" : "text-gray-600 hover:text-ucmas-blue";

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
               <div className="flex flex-col items-start leading-none">
                  <span className="text-4xl font-black text-ucmas-red tracking-tight">UCMAS</span>
                  <span className="text-[10px] font-bold bg-ucmas-blue text-white px-1 py-px rounded-sm tracking-widest">EDUCATION WITH A DIFFERENCE</span>
               </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
               <Link to="/" className={`text-sm font-medium transition-colors ${isActive('/')}`}>Trang chủ</Link>
               {user && (
                 <>
                   <Link to="/dashboard" className={`text-sm font-medium transition-colors ${isActive('/dashboard')}`}>Luyện tập</Link>
                   <Link to="/history" className={`text-sm font-medium transition-colors ${isActive('/history')}`}>Lịch sử</Link>
                   <Link to="/activate" className={`text-sm font-medium transition-colors ${isActive('/activate')}`}>Kích hoạt</Link>
                 </>
               )}
               
               {/* Admin Link Logic */}
               {user?.role === 'admin' && (
                 <Link to="/admin" className={`text-sm font-bold text-ucmas-red uppercase border border-red-100 bg-red-50 px-3 py-1 rounded hover:bg-ucmas-red hover:text-white transition-all ${isActive('/admin')}`}>
                   Quản trị viên
                 </Link>
               )}

               <a href="#" className="text-sm font-medium text-gray-600 hover:text-ucmas-blue">Tin tức</a>
               <a href="#" className="text-sm font-medium text-gray-600 hover:text-ucmas-blue">Liên hệ</a>
            </div>

            {/* Auth Buttons */}
            <div>
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end">
                     <span className="text-sm font-bold text-gray-800">{user.full_name}</span>
                     <span className="text-xs text-gray-500 uppercase">{user.role === 'admin' ? 'Quản trị viên' : 'Học viên'}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                   <Link to="/login" className="px-5 py-2.5 rounded-full text-sm font-bold text-ucmas-blue hover:bg-blue-50 transition">
                     Đăng nhập
                   </Link>
                   <Link to="/login" className="px-5 py-2.5 rounded-full text-sm font-bold bg-ucmas-red text-white hover:bg-red-700 shadow-md transition transform hover:-translate-y-0.5">
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

      <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 mb-2">UCMAS Club - Education With A Difference</p>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Bản quyền thuộc về UCMAS Vietnam.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
