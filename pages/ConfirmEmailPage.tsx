
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/mockBackend';
import { EmailOtpType } from '@supabase/supabase-js';

const ConfirmEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('Đang xác thực thông tin...');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      // Parse query parameters from the hash route (e.g., /#/auth/confirm?token_hash=...)
      const searchParams = new URLSearchParams(location.search);
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type') as EmailOtpType | null;

      if (!token_hash || !type) {
        // Missing parameters
        navigate('/login?confirm=missing', { replace: true });
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type,
        });

        if (error) {
          console.error('Email verification failed:', error.message);
          navigate(`/login?confirm=fail&message=${encodeURIComponent(error.message)}`, { replace: true });
        } else {
          // Verification successful
          // Note: verifyOtp automatically establishes a session in the client
          navigate('/login?confirm=ok', { replace: true });
        }
      } catch (err: any) {
        console.error('Unexpected error during verification:', err);
        navigate('/login?confirm=fail', { replace: true });
      }
    };

    handleEmailConfirmation();
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-6">
      <div className="bg-white p-5 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 text-center max-w-sm w-full">
        <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-ucmas-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Đang xác thực email</h2>
        <p className="text-gray-500 text-xs sm:text-sm">{status}</p>
      </div>
    </div>
  );
};

export default ConfirmEmailPage;
