
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import PracticeSession from './pages/PracticeSession';
import ActivatePage from './pages/ActivatePage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage'; // Import new page
import { backend } from './services/mockBackend';
import { UserProfile } from './types';

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
      <Routes>
        <Route path="*" element={
            <Layout user={user} setUser={setUser}>
                <Routes>
                <Route path="/" element={<HomePage user={user} />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
                <Route path="/register" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
                <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
                <Route path="/practice/:mode" element={user ? <PracticeSession user={user} /> : <Navigate to="/login" />} />
                <Route path="/activate" element={user ? <ActivatePage user={user} setUser={setUser} /> : <Navigate to="/login" />} />
                <Route path="/history" element={user ? <HistoryPage userId={user.id} /> : <Navigate to="/login" />} />
                <Route path="/admin" element={user && user.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" />} />
                
                </Routes>
            </Layout>
        } />
      </Routes>
    </Router>
  );
};

export default App;
