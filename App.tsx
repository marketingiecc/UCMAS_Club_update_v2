
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import PracticeSession from './pages/PracticeSession';
import ActivatePage from './pages/ActivatePage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import AdminContestPage from './pages/AdminContestPage';
import ContestListPage from './pages/ContestListPage';
import ContestLobbyPage from './pages/ContestLobbyPage';
import ContestExamPage from './pages/ContestExamPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import { backend, supabase } from './services/mockBackend';
import { UserProfile } from './types';

// Component to handle global auth events
const AuthEventHandler = () => {
    const navigate = useNavigate();
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            // When user clicks the email link, Supabase restores the session
            // and emits PASSWORD_RECOVERY
            if (event === 'PASSWORD_RECOVERY') {
                navigate('/auth/update-password', { replace: true });
            }
        });
        return () => { authListener.subscription.unsubscribe(); };
    }, [navigate]);
    return null;
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
        const currentUser = await backend.getCurrentUser();
        setUser(currentUser);
        setLoading(false);
    };
    initSession();
  }, []);

  if (loading) return (
      <div className="flex h-screen items-center justify-center bg-white">
          <div className="flex flex-col items-center animate-pulse">
              <img 
                 src="https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/sign/UCMAS/logo%20UCMAS.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84MzcyMmZjMi1kNTFiLTQzYWItYmQ5OC1kYjY5MTc1ZjAxYWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJVQ01BUy9sb2dvIFVDTUFTLnBuZyIsImlhdCI6MTc2Nzg2MDYzMiwiZXhwIjoxODU0MjYwNjMyfQ.-gXR6eggFwBAK-zmgXRHhB3rs8SNogaV2am-1V4GJro" 
                 alt="UCMAS" 
                 className="h-24 w-auto mb-4 object-contain"
              />
              <div className="text-blue-800 font-bold">Đang tải dữ liệu...</div>
          </div>
      </div>
  );

  return (
    <Router>
      <AuthEventHandler />
      <Routes>
        <Route path="*" element={
            <Layout user={user} setUser={setUser}>
                <Routes>
                <Route path="/" element={<HomePage user={user} />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
                <Route path="/register" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
                <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
                {/* Note: Update Password is public accessible because the user is technically logged in via the recovery link */}
                <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
                <Route path="/practice/:mode" element={user ? <PracticeSession user={user} /> : <Navigate to="/login" />} />
                <Route path="/activate" element={user ? <ActivatePage user={user} setUser={setUser} /> : <Navigate to="/login" />} />
                <Route path="/history" element={user ? <HistoryPage userId={user.id} /> : <Navigate to="/login" />} />
                
                {/* Contest Routes */}
                <Route path="/contests" element={user ? <ContestListPage user={user} /> : <Navigate to="/login" />} />
                <Route path="/contests/:contestId" element={user ? <ContestLobbyPage user={user} /> : <Navigate to="/login" />} />
                <Route path="/contests/:contestId/exam/:mode" element={user ? <ContestExamPage user={user} /> : <Navigate to="/login" />} />

                {/* Admin Routes */}
                <Route path="/admin" element={user && user.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" />} />
                <Route path="/admin/contests" element={user && user.role === 'admin' ? <AdminContestPage /> : <Navigate to="/dashboard" />} />
                
                </Routes>
            </Layout>
        } />
      </Routes>
    </Router>
  );
};

export default App;
