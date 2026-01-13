// Centralized environment configuration
// Safely access import.meta.env to prevent crashes if env is undefined

const getEnv = (key: string, defaultValue: string = ''): string => {
  const val = (import.meta as any)?.env?.[key];
  return val || defaultValue;
};

export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', 'https://rwtpwdyoxirfpposmdcg.supabase.co');
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_7ELQeXNcXhnsvD3aW6jgTg_Hq07B8mH');
