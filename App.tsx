import React, { useEffect, useState, useRef } from 'react';
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
import AdminExerciseRepository from './pages/AdminExerciseRepository';
import PracticeMixedSession from './pages/PracticeMixedSession';
import TrainingHub from './pages/TrainingHub';
import AdminTrainingPage from './pages/AdminTrainingPage';
import SpeedTrainingPage from './pages/SpeedTrainingPage';
import AdminTeacherManagerPage from './pages/AdminTeacherManagerPage';
import AdminStudentProgressPage from './pages/AdminStudentProgressPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import AdminInfoManagerPage from './pages/AdminInfoManagerPage';
import AdminSeoSetupPage from './pages/AdminSeoSetupPage';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Đang khởi động...');
  const navigate = useNavigate();
  const mounted = useRef(true);
  const userRef = useRef<UserProfile | null>(null);

  // Sync userRef with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    mounted.current = true;

    // SAFETY: Force stop loading after 10 seconds to prevent infinite loading
    const safetyTimer = setTimeout(() => {
      if (mounted.current && loading) {
        console.warn("Auth initialization timed out. Forcing UI render.");
        setLoading(false);
        setStatusText('Đã sẵn sàng');
      }
    }, 10000);

    const initAuth = async () => {
      try {
        setStatusText('Đang kiểm tra kết nối...');

        // Add timeout for getCurrentUser call
        const userPromise = backend.getCurrentUser();
        const timeoutPromise = new Promise<UserProfile | null>((resolve) => {
          setTimeout(() => resolve(null), 8000);
        });

        setStatusText('Đang xác thực...');
        const u = await Promise.race([userPromise, timeoutPromise]);

        if (mounted.current) {
          setUser(u);
          setStatusText('Đã sẵn sàng');
        }
      } catch (e) {
        console.error("Critical Auth Init Error:", e);
        // Continue even if auth fails - user can still access public pages
        if (mounted.current) {
          setUser(null);
          setStatusText('Đã sẵn sàng');
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
        clearTimeout(safetyTimer);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted.current) return;

      try {
        if (event === 'SIGNED_IN' && session?.user) {
          // Only fetch if we don't have user yet to avoid double fetch on load
          if (!userRef.current) {
            const u = await backend.fetchProfile(session.user.id);
            if (mounted.current) {
              setUser(u);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted.current) {
            setUser(null);
          }
        } else if (event === 'PASSWORD_RECOVERY') {
          navigate('/auth/resetpass', { replace: true });
        }
      } catch (err) {
        console.error("Auth state change error:", err);
      }
    });

    return () => {
      mounted.current = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      clearTimeout(safetyTimer);
    };
  }, [navigate]); // Removed 'user' from dependencies to prevent infinite loop

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="w-16 h-16 border-4 border-ucmas-blue border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-gray-700 font-heading font-semibold text-lg mb-2 animate-pulse">{statusText}</p>
        <p className="text-xs text-gray-500 font-medium">Vui lòng đợi trong giây lát...</p>
        <button
          onClick={() => {
            setLoading(false);
            setStatusText('Đã sẵn sàng');
          }}
          className="mt-6 px-6 py-2 bg-ucmas-red text-white font-heading-bold rounded-lg hover:bg-ucmas-blue transition-all shadow-md"
        >
          Bỏ qua
        </button>
      </div>
    );
  }

  return (
    <Layout user={user} setUser={setUser}>
      <Routes>
        <Route path="/" element={<HomePage user={user} />} />

        <Route path="/login" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
        <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
        <Route path="/auth/resetpass" element={<UpdatePasswordPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route path="/dashboard" element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/login" />} />
        <Route path="/training" element={user ? <TrainingHub user={user} /> : <Navigate to="/login" />} />
        <Route path="/training/speed" element={user ? <SpeedTrainingPage /> : <Navigate to="/login" />} />
        <Route path="/practice/:mode" element={user ? <PracticeSession user={user} /> : <Navigate to="/login" />} />

        {/* NEW ROUTES */}
        <Route path="/practice-exam/:mode" element={user ? <PracticeSessionExam user={user} /> : <Navigate to="/login" />} />
        <Route path="/practice-mixed/:examId" element={user ? <PracticeMixedSession user={user} /> : <Navigate to="/login" />} />
        <Route path="/admin/repository" element={user?.role === 'admin' ? <AdminExerciseRepository /> : <Navigate to="/dashboard" />} />
        <Route path="/admin/practice" element={user?.role === 'admin' ? <AdminPracticeManager /> : <Navigate to="/dashboard" />} />

        <Route path="/activate" element={user ? <ActivatePage user={user} setUser={setUser} /> : <Navigate to="/login" />} />
        <Route path="/history" element={user ? <HistoryPage userId={user.id} /> : <Navigate to="/login" />} />

        <Route path="/teacher" element={user?.role === 'teacher' ? <TeacherDashboardPage user={user} /> : <Navigate to="/dashboard" />} />

        <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" />} />
        <Route path="/admin/contests" element={user?.role === 'admin' ? <AdminContestPage /> : <Navigate to="/dashboard" />} />
        <Route path="/admin/training" element={user?.role === 'admin' ? <AdminTrainingPage /> : <Navigate to="/dashboard" />} />
        <Route path="/admin/teachers" element={user?.role === 'admin' ? <AdminTeacherManagerPage /> : <Navigate to="/dashboard" />} />
        <Route path="/admin/progress" element={user?.role === 'admin' ? <AdminStudentProgressPage /> : <Navigate to="/dashboard" />} />
        <Route path="/admin/info" element={user?.role === 'admin' ? <AdminInfoManagerPage /> : <Navigate to="/dashboard" />} />
        <Route path="/admin/seo" element={user?.role === 'admin' ? <AdminSeoSetupPage /> : <Navigate to="/dashboard" />} />


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