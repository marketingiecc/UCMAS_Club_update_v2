
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase, backend } from './services/mockBackend';
import { UserProfile } from './types';
import Layout from './components/Layout';

import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import PracticeSession from './pages/PracticeSession';
import PracticeSessionExam from './pages/PracticeSession_exam';
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
import AdminPracticeManager from './pages/AdminPracticeManager';
import PracticeMixedSession from './pages/PracticeMixedSession';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Khắc phục lỗi đứng màn hình Loading: Tự động refresh nếu init quá lâu (do cache cũ)
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Detection of long loading session. Clearing local storage, cookies and refreshing...");
        localStorage.clear();
        sessionStorage.clear();
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.reload();
      }
    }, 5000);

    const initAuth = async () => {
        try {
          const u = await backend.getCurrentUser();
          setUser(u);
        } catch (e) {
          console.error("Auth init error:", e);
        } finally {
          setLoading(false);
          clearTimeout(timeout);
        }
    };
    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
             const u = await backend.fetchProfile(session.user.id);
             setUser(u);
        } else if (event === 'SIGNED_OUT') {
             setUser(null);
        } else if (event === 'PASSWORD_RECOVERY') {
             navigate('/auth/resetpass', { replace: true });
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
        clearTimeout(timeout);
    };
  }, [navigate]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-ucmas-blue border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500 font-medium animate-pulse">Đang tải ứng dụng...</p>
    </div>
  );

  return (
    <Layout user={user} setUser={setUser}>
      <Routes>
        <Route path="/" element={<HomePage user={user} />} />
        
        <Route path="/login" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
        <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
        <Route path="/auth/resetpass" element={<UpdatePasswordPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/practice/:mode" element={user ? <PracticeSession user={user} /> : <Navigate to="/login" />} />
        <Route path="/practice-exam/:mode" element={user ? <PracticeSessionExam user={user} /> : <Navigate to="/login" />} />
        
        {/* NEW ROUTE FOR MIXED PRACTICE */}
        <Route path="/practice-mixed/:examId" element={user ? <PracticeMixedSession user={user} /> : <Navigate to="/login" />} />

        <Route path="/activate" element={user ? <ActivatePage user={user} setUser={setUser} /> : <Navigate to="/login" />} />
        <Route path="/history" element={user ? <HistoryPage userId={user.id} /> : <Navigate to="/login" />} />
        
        <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" />} />
        <Route path="/admin/contests" element={user?.role === 'admin' ? <AdminContestPage /> : <Navigate to="/dashboard" />} />
        <Route path="/admin/practice" element={user?.role === 'admin' ? <AdminPracticeManager /> : <Navigate to="/dashboard" />} />

        <Route path="/contests" element={user ? <ContestListPage user={user} /> : <Navigate to="/login" />} />
        <Route path="/contests/:contestId" element={user ? <ContestLobbyPage user={user} /> : <Navigate to="/login" />} />
        <Route path="/contests/:contestId/exam/:mode" element={user ? <ContestExamPage user={user} /> : <Navigate to="/login" />} />

        <Route path="*" element={<Navigate to="/" />} />
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
