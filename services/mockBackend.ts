import { createClient } from '@supabase/supabase-js';
import { UserProfile, AttemptResult, ActivationCode } from '../types';

// Configuration
const SUPABASE_URL = 'https://rwtpwdyoxirfpposmdcg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7ELQeXNcXhnsvD3aW6jgTg_Hq07B8mH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class BackendService {
  
  // --- Auth ---
  
  // Register new user
  async register(email: string, password: string, fullName: string): Promise<{ user: UserProfile | null; error: string | null }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) return { user: null, error: error.message };
    
    if (data.user) {
        // Manually create profile if no Trigger is set up in Supabase
        const newProfile: UserProfile = {
             id: data.user.id,
             email: email,
             full_name: fullName,
             role: 'user',
             created_at: new Date().toISOString(),
             allowed_modes: [],
             student_code: ''
        };
        
        // Try to insert profile. If it fails (duplicate because of trigger), we ignore.
        const { error: profileError } = await supabase.from('profiles').insert(newProfile);
        
        return { user: newProfile, error: null };
    }

    return { user: null, error: "Đăng ký không thành công." };
  }

  // Login with password
  async login(email: string, password: string): Promise<{ user: UserProfile | null; error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) return { user: null, error: "Email hoặc mật khẩu không chính xác." };
    
    if (data.user) {
        const profile = await this.fetchProfile(data.user.id);
        return { user: profile, error: null };
    }
    
    return { user: null, error: "Đăng nhập thất bại." };
  }

  // Helper to fetch profile after auth state change
  async fetchProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // Fallback: try to get metadata from auth user if profile missing
      const { data: user } = await supabase.auth.getUser();
      if (user.user && user.user.id === userId) {
           return {
             id: userId,
             email: user.user.email || '',
             full_name: user.user.user_metadata?.full_name || 'Học viên',
             role: 'user',
             created_at: new Date().toISOString(),
             allowed_modes: [],
             student_code: ''
           };
      }
      return null;
    }
    return data as UserProfile;
  }

  async logout() {
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return this.fetchProfile(session.user.id);
  }

  // --- License ---
  async activateLicense(userId: string, codeStr: string): Promise<{ success: boolean; message: string }> {
    // 1. Check code
    const { data: codes, error } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code', codeStr)
        .eq('is_active', true)
        .single();
        
    if (error || !codes) {
        return { success: false, message: 'Mã kích hoạt không hợp lệ hoặc đã hết hạn.' };
    }

    const code = codes as ActivationCode;
    
    // 2. Update user
    const profile = await this.fetchProfile(userId);
    if (!profile) return { success: false, message: 'Không tìm thấy người dùng.' };

    const currentExpiry = profile.license_expiry ? new Date(profile.license_expiry).getTime() : Date.now();
    const newExpiry = new Date(Math.max(currentExpiry, Date.now()));
    newExpiry.setDate(newExpiry.getDate() + code.duration_days);

    const currentModes = new Set(profile.allowed_modes || []);
    code.modes.forEach(m => currentModes.add(m));

    const { error: updateError } = await supabase
        .from('profiles')
        .update({
            license_expiry: newExpiry.toISOString(),
            allowed_modes: Array.from(currentModes)
        })
        .eq('id', userId);

    if (updateError) return { success: false, message: 'Lỗi kích hoạt.' };

    return { success: true, message: `Kích hoạt thành công! Hạn dùng đến ${newExpiry.toLocaleDateString('vi-VN')}` };
  }

  // --- Attempts ---
  async saveAttempt(attempt: AttemptResult): Promise<void> {
    await supabase.from('attempts').insert(attempt);
  }

  async getUserHistory(userId: string): Promise<AttemptResult[]> {
    const { data } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    return (data || []) as AttemptResult[];
  }

  // --- Admin ---
  async getAllUsers(): Promise<UserProfile[]> {
    const { data } = await supabase.from('profiles').select('*');
    return (data || []) as UserProfile[];
  }

  async getAllAttempts(): Promise<AttemptResult[]> {
    const { data } = await supabase
        .from('attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent 100 for performance
    return (data || []) as AttemptResult[];
  }
}

export const backend = new BackendService();