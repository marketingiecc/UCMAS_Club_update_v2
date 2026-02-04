import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { backend } from '../services/mockBackend';

interface LayoutProps {
    children: React.ReactNode;
    user: UserProfile | null;
    setUser: (u: UserProfile | null) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, setUser }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await backend.logout();
        setUser(null);
        navigate('/login');
    };

    if (!user) {
        return <div className="min-h-screen bg-slate-50">{children}</div>;
    }

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-8">
                            <Link to="/dashboard" className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-ucmas-blue rounded-lg flex items-center justify-center text-white font-bold text-lg">U</div>
                                <span className="font-excl-bold text-xl text-gray-800 tracking-tight">UCMAS Club</span>
                            </Link>

                            <nav className="hidden md:flex gap-1">
                                <Link to="/dashboard" className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/dashboard') ? 'bg-blue-50 text-ucmas-blue' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                                    Trang chủ
                                </Link>
                                <Link to="/contests" className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/contests') ? 'bg-blue-50 text-ucmas-blue' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                                    Cuộc thi
                                </Link>
                                <Link to="/history" className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/history') ? 'bg-blue-50 text-ucmas-blue' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                                    Lịch sử
                                </Link>
                                {user.role === 'admin' && (
                                    <>
                                        <Link to="/admin/practice" className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/admin/practice') ? 'bg-blue-50 text-ucmas-blue' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                                            QL Luyện tập
                                        </Link>
                                        <Link to="/admin/repository" className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/admin/repository') ? 'bg-blue-50 text-ucmas-blue' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                                            Kho Bài Tập
                                        </Link>
                                    </>
                                )}
                            </nav>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-sm font-bold text-gray-700">{user.full_name || user.email}</span>
                                <span className="text-xs text-ucmas-blue font-medium bg-blue-50 px-2 py-0.5 rounded-full">{user.role === 'admin' ? 'Quản trị viên' : 'Học viên'}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-gray-400 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-full"
                                title="Đăng xuất"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            <footer className="bg-white border-t border-gray-100 py-6">
                <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
                    &copy; {new Date().getFullYear()} UCMAS Club. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default Layout;
