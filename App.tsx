import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase, backend } from './services/mockBackend';
import { UserProfile } from './types';
import Layout from './components/Layout';

import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import PracticeSession from './pages/PracticeSession';
import ActivatePage from './pages/ActivatePage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import AdminLoginPage from './pages/AdminLoginPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import ContestListPage from './pages/ContestListPage';
import ContestLobbyPage from './pages/ContestLobbyPage';
import ContestExamPage from './pages/ContestExamPage';
import AdminContestPage from './pages/AdminContestPage';

const AuthCallbackHandler: React.FC = () => {
    const navigate = useNavigate();
    useEffect(() => {
        // Check if the hash contains Supabase auth tokens
        const hash = window.location.hash;
        // Supabase puts access_token, refresh_token, etc. in the hash for OAuth/MagicLink/Recovery
        const isAuthCallback = hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('error_description');

        if (!isAuthCallback) {
            // If not an auth callback and no route matched, redirect to home
            navigate('/', { replace: true });
        }
        // If it IS an auth callback, we stay here rendering "Processing..."
        // The onAuthStateChange listener in AppContent will handle the event and navigation.
    }, [navigate]);

    return (
        <div className="h-screen flex items-center justify-center flex-col gap-4">
             <div className="w-12 h-12 border-4 border-ucmas-blue border-t-transparent rounded-full animate-spin"></div>
             <div className="text-ucmas-blue font-bold">Đang xử lý thông tin...</div>
        </div>
    );
};

const AppContent: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
        const u = await backend.getCurrentUser();
        setUser(u);
        setLoading(false);
    };
    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth Event:", event);
        if (event === 'SIGNED_IN' && session?.user) {
             const u = await backend.fetchProfile(session.user.id);
             setUser(u);
        } else if (event === 'SIGNED_OUT') {
             setUser(null);
             navigate('/login');
        } else if (event === 'PASSWORD_RECOVERY') {
             // Handle password recovery event by redirecting to reset page
             navigate('/auth/resetpass', { replace: true });
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <Layout user={user} setUser={setUser}>
      <Routes>
        <Route path="/" element={<HomePage user={user} />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
        <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
        <Route path="/auth/resetpass" element={<UpdatePasswordPage />} />
        
        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/practice/:mode" element={user ? <PracticeSession user={user} /> : <Navigate to="/login" />} />
        <Route path="/activate" element={user ? <ActivatePage user={user} setUser={setUser} /> : <Navigate to="/login" />} />
        <Route path="/history" element={user ? <HistoryPage userId={user.id} /> : <Navigate to="/login" />} />
        
        {/* Admin Dashboard */}
        <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" />} />
        <Route path="/admin/contests" element={user?.role === 'admin' ? <AdminContestPage /> : <Navigate to="/dashboard" />} />

        {/* Contests */}
        <Route path="/contests" element={user ? <ContestListPage user={user} /> : <Navigate to="/login" />} />
        <Route path="/contests/:contestId" element={user ? <ContestLobbyPage user={user} /> : <Navigate to="/login" />} />
        <Route path="/contests/:contestId/exam/:mode" element={user ? <ContestExamPage user={user} /> : <Navigate to="/login" />} />

        {/* Catch-all for 404 and Auth Callbacks */}
        <Route path="*" element={<AuthCallbackHandler />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;