import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import AdminLoginPage from './pages/AdminLoginPage';
import Dashboard from './pages/Dashboard';
import PracticeSession from './pages/PracticeSession';
import ActivatePage from './pages/ActivatePage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
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
              <div className="text-4xl font-black text-red-600 tracking-tight mb-2">UCMAS</div>
              <div className="text-blue-800 font-bold">Đang tải dữ liệu...</div>
          </div>
      </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="*" element={
            <Layout user={user} setUser={setUser}>
                <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
                
                <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
                
                <Route path="/practice/:mode" element={user ? <PracticeSession userId={user.id} userName={user.full_name} studentCode={user.student_code} /> : <Navigate to="/login" />} />
                
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