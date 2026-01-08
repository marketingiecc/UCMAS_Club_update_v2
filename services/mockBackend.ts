import { createClient } from '@supabase/supabase-js';
import { UserProfile, AttemptResult, ActivationCode } from '../types';

// Configuration
const SUPABASE_URL = 'https://rwtpwdyoxirfpposmdcg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7ELQeXNcXhnsvD3aW6jgTg_Hq07B8mH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class BackendService {
  
  // --- Auth ---
  
  // Register new user (Student)
  async register(email: string, password: string, fullName: string): Promise<{ user: UserProfile | null; error: string | null }> {
    return this._registerUser(email, password, fullName, 'user');
  }

  // Register new Admin (Requires check on frontend or secure environment)
  async registerAdmin(email: string, password: string, fullName: string): Promise<{ user: UserProfile | null; error: string | null }> {
    return this._registerUser(email, password, fullName, 'admin');
  }

  // Internal helper for registration
  private async _registerUser(email: string, password: string, fullName: string, role: 'user' | 'admin'): Promise<{ user: UserProfile | null; error: string | null }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role // Save to metadata as well
        },
      },
    });

    if (error) return { user: null, error: error.message };
    
    if (data.user) {
        // Create profile object
        const newProfile: UserProfile = {
             id: data.user.id,
             email: email || '',
             full_name: fullName,
             role: role,
             created_at: new Date().toISOString(),
             allowed_modes: [],
             student_code: role === 'admin' ? 'ADMIN' : ''
        };
        
        // FIX: Use UPSERT instead of INSERT.
        // This handles cases where a trigger might have partially created the user, 
        // or allows retry without duplicate key errors.
        const { error: profileError } = await supabase.from('profiles').upsert(newProfile);
        
        if (profileError) {
             console.error("Registration DB Sync Warning:", profileError);
             // Note: We do NOT fail here. If RLS blocks the insert (e.g. email not confirmed yet),
             // we still return the user. The `fetchProfile` method (called on login)
             // contains a fix to save the profile to DB if it's missing.
        }
        
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
  // FIX: Implemented Auto-Healing
  async fetchProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // If profile is missing in DB but User exists in Auth (e.g. failed insert during register)
    if (error || !data) {
      // 1. Get Auth Metadata
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.id === userId) {
           const metaRole = user.user_metadata?.role || 'user';
           
           // 2. Construct Profile from Metadata
           const fallbackProfile: UserProfile = {
             id: userId,
             email: user.email || '',
             full_name: user.user_metadata?.full_name || 'Người dùng',
             role: metaRole,
             created_at: new Date().toISOString(),
             allowed_modes: [],
             student_code: metaRole === 'admin' ? 'ADMIN' : ''
           };

           // 3. AUTO-HEAL: Save this profile to DB immediately
           // This ensures subsequent fetches (and Admin view) will see this user.
           const { error: saveError } = await supabase
              .from('profiles')
              .upsert(fallbackProfile);
            
           if (saveError) {
               console.error("Auto-healing profile failed:", saveError);
           } else {
               console.log("Profile auto-healed successfully");
           }

           return fallbackProfile;
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
    // Ensure we have a profile to update
    let profile = await this.fetchProfile(userId);
    if (!profile) return { success: false, message: 'Không tìm thấy hồ sơ người dùng.' };

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

    if (updateError) return { success: false, message: 'Lỗi cập nhật hồ sơ.' };

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
        .limit(100); 
    return (data || []) as AttemptResult[];
  }
}

export const backend = new BackendService();