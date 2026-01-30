
import React, { useState, useEffect } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const showMobileNav = !isAdminRoute;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await backend.logout();
    setUser(null);
    navigate('/login');
    setMobileMenuOpen(false);
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

  const navLinkClass = (active: boolean) =>
    active ? 'text-ucmas-red border-b-2 border-ucmas-red pb-1' : 'text-gray-700 hover:text-ucmas-red';

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <nav className="bg-white border-b-2 border-ucmas-blue/10 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo with Tagline */}
            <div className="flex items-center gap-3 cursor-pointer group flex-shrink-0" onClick={() => navigate('/')}>
               <img 
                 src="https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/sign/UCMAS/logo%20UCMAS.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84MzcyMmZjMi1kNTFiLTQzYWItYmQ5OC1kYjY5MTc1ZjAxYWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJVQ01BUy9sb2dvIFVDTUFTLnBuZyIsImlhdCI6MTc2Nzg2MDYzMiwiZXhwIjoxODU0MjYwNjMyfQ.-gXR6eggFwBAK-zmgXRHhB3rs8SNogaV2am-1V4GJro" 
                 alt="UCMAS Logo" 
                 className="h-12 sm:h-14 md:h-16 w-auto object-contain transition-transform group-hover:scale-105"
               />
            </div>

            {/* Desktop Navigation Links (chỉ desktop >= lg) */}
            <div className="hidden lg:flex items-center space-x-6">
               <Link to="/" className={`text-sm font-heading font-semibold transition-colors ${navLinkClass(location.pathname === '/')}`}>Trang chủ</Link>
               {user && (
                 <>
                   <Link to="/training" className={`text-sm font-heading font-semibold transition-colors ${navLinkClass(location.pathname === '/training')}`}>Luyện tập</Link>
                   <Link to="/contests" className={`text-sm font-heading font-semibold transition-colors ${navLinkClass(location.pathname.startsWith('/contests'))}`}>
                     <span className="flex items-center gap-1">Cuộc thi <span className="text-ucmas-yellow">🏆</span></span>
                   </Link>
                   <Link to="/activate" className={`text-sm font-heading font-semibold transition-colors ${navLinkClass(location.pathname === '/activate')}`}>Kích hoạt</Link>
                   {user.role === 'admin' && (
                     <Link to="/admin" className={`text-xs font-heading-bold text-white bg-ucmas-red uppercase px-4 py-2 rounded-lg hover:bg-ucmas-blue transition-all shadow-md ${location.pathname === '/admin' ? 'ring-2 ring-ucmas-yellow' : ''}`}>
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
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {user ? (
                <>
                  {/* Profile preview: chỉ desktop để không chật trên mobile/tablet */}
                  <Link to="/dashboard" className="hidden lg:flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-ucmas-blue/20 flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-ucmas-blue font-heading-bold text-base md:text-lg">{user.full_name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <div className="hidden lg:flex flex-col items-start">
                      <span className="text-sm font-heading-bold text-gray-800">{user.full_name || 'Học sinh'}</span>
                      <span className="text-xs text-gray-500">Cấp độ: {user.level_symbol || '—'}</span>
                    </div>
                  </Link>
                  {user.role !== 'admin' && daysLeft > 0 && (
                    <span className={`hidden lg:inline text-[10px] px-2 py-0.5 rounded-full font-heading font-bold border ${daysLeft <= 5 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      Còn {daysLeft} ngày
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="hidden lg:inline-flex bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <div className="flex gap-2 sm:gap-3">
                   <Link to="/login" className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg text-xs sm:text-sm font-heading-bold text-ucmas-blue border-2 border-ucmas-blue hover:bg-ucmas-blue hover:text-white transition-all shadow-sm">
                     Đăng nhập
                   </Link>
                   <Link to="/register" className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg text-xs sm:text-sm font-heading-bold bg-ucmas-red text-white hover:bg-ucmas-blue shadow-lg transition-all transform hover:-translate-y-0.5 hover:shadow-xl">
                     Đăng ký
                   </Link>
                </div>
              )}
              {/* Hamburger - chỉ hiện trên mobile/tablet và khi KHÔNG ở trang admin */}
              {showMobileNav && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((o) => !o)}
                  className="lg:hidden p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-ucmas-blue transition"
                  aria-label="Mở menu"
                >
                  {user ? (
                    user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-ucmas-blue/10 text-ucmas-blue font-heading-bold flex items-center justify-center">
                        {user.full_name?.charAt(0) || '?'}
                      </span>
                    )
                  ) : mobileMenuOpen ? (
                    <span className="text-2xl leading-none">✕</span>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile/Tablet menu - chỉ cho trang học sinh */}
        {showMobileNav && (
          <div
            className={`lg:hidden overflow-hidden transition-all duration-200 ease-out ${
              mobileMenuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="border-t border-gray-100 bg-white px-4 py-4 space-y-2">
              {user && (
                <div className="p-3 rounded-2xl border border-gray-200 bg-gray-50 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-ucmas-blue/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-ucmas-blue font-heading-bold text-lg">{user.full_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-heading font-bold text-gray-800 truncate">{user.full_name || 'Học sinh'}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.student_code ? `Mã: ${user.student_code}` : user.email}
                      <span className="mx-2">•</span>
                      Cấp độ: {user.level_symbol || '—'}
                    </div>
                    {user.role !== 'admin' && daysLeft > 0 && (
                      <div className="mt-1 inline-flex text-[10px] px-2 py-0.5 rounded-full font-heading font-bold border bg-green-50 text-green-700 border-green-100">
                        Còn {daysLeft} ngày
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`block py-3 px-4 rounded-xl font-heading font-semibold text-sm ${location.pathname === '/' ? 'bg-ucmas-blue/10 text-ucmas-red' : 'text-gray-700'}`}>Trang chủ</Link>

              {user ? (
                <>
                  <Link to="/training" onClick={() => setMobileMenuOpen(false)} className={`block py-3 px-4 rounded-xl font-heading font-semibold text-sm ${location.pathname === '/training' ? 'bg-ucmas-blue/10 text-ucmas-red' : 'text-gray-700'}`}>Trung tâm luyện tập</Link>
                  <Link to="/training/speed" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 rounded-xl font-heading font-semibold text-sm text-gray-700">Speed Training</Link>
                  <Link to="/contests" onClick={() => setMobileMenuOpen(false)} className={`block py-3 px-4 rounded-xl font-heading font-semibold text-sm ${location.pathname.startsWith('/contests') ? 'bg-ucmas-blue/10 text-ucmas-red' : 'text-gray-700'}`}>Cuộc thi 🏆</Link>
                  <Link to="/history" onClick={() => setMobileMenuOpen(false)} className={`block py-3 px-4 rounded-xl font-heading font-semibold text-sm ${location.pathname === '/history' ? 'bg-ucmas-blue/10 text-ucmas-red' : 'text-gray-700'}`}>Lịch sử</Link>
                  <Link to="/activate" onClick={() => setMobileMenuOpen(false)} className={`block py-3 px-4 rounded-xl font-heading font-semibold text-sm ${location.pathname === '/activate' ? 'bg-ucmas-blue/10 text-ucmas-red' : 'text-gray-700'}`}>Kích hoạt</Link>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className={`block py-3 px-4 rounded-xl font-heading font-semibold text-sm ${location.pathname === '/dashboard' ? 'bg-ucmas-blue/10 text-ucmas-red' : 'text-gray-700'}`}>Hồ sơ</Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full mt-2 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-heading font-bold text-sm transition"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 rounded-xl font-heading font-semibold text-sm text-gray-700">Đăng nhập</Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 rounded-xl font-heading font-semibold text-sm text-gray-700">Đăng ký</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow w-full">
        {children}
      </main>

      <footer className="bg-gradient-to-r from-ucmas-blue to-ucmas-blue/90 text-white py-6 sm:py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="mb-3 sm:mb-4">
            <p className="text-base sm:text-lg font-heading-bold mb-1 sm:mb-2">UCMAS VIỆT NAM</p>
            <p className="text-xs sm:text-sm font-heading font-semibold opacity-90 uppercase tracking-widest">Education With A Difference</p>
          </div>
          <div className="border-t border-white/20 pt-3 sm:pt-4 mt-3 sm:mt-4">
            <p className="text-[10px] sm:text-xs opacity-75">
              &copy; {new Date().getFullYear()} Bản quyền thuộc về UCMAS Vietnam.
              <span className="mx-2 max-sm:hidden">|</span>
              <span className="block sm:inline mt-1 sm:mt-0">Phát triển bởi IECC</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
