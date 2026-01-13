// Centralized environment configuration
// Safely access import.meta.env to prevent crashes if env is undefined

const getEnv = (key: string): string => {
  return (import.meta as any)?.env?.[key] || '';
};

export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');
