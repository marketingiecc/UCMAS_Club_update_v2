
import { createClient } from '@supabase/supabase-js';
import { UserProfile, AttemptResult, DBEntitlement, DBAnswer, Mode, ExamConfig, Question } from '../types';

// Configuration
const SUPABASE_URL = 'https://rwtpwdyoxirfpposmdcg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7ELQeXNcXhnsvD3aW6jgTg_Hq07B8mH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class BackendService {
  
  // --- Auth ---
  
  async register(email: string, password: string, fullName: string): Promise<{ user: UserProfile | null; error: string | null }> {
    return this._registerUser(email, password, fullName, 'user');
  }

  async registerAdmin(email: string, password: string, fullName: string): Promise<{ user: UserProfile | null; error: string | null }> {
    return this._registerUser(email, password, fullName, 'admin');
  }

  private async _registerUser(email: string, password: string, fullName: string, role: 'user' | 'admin'): Promise<{ user: UserProfile | null; error: string | null }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        },
      },
    });

    if (error) return { user: null, error: error.message };
    
    // The Database Trigger `on_auth_user_created` handles insertion into `public.profiles`.
    // We just return the constructed profile for the UI state.
    if (data.user) {
        const newProfile: UserProfile = {
             id: data.user.id,
             email: email || '',
             full_name: fullName,
             role: role,
             created_at: new Date().toISOString(),
             allowed_modes: [], // New users have no entitlements
             student_code: role === 'admin' ? 'ADMIN' : ''
        };
        return { user: newProfile, error: null };
    }

    return { user: null, error: "Đăng ký không thành công." };
  }

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

  // Gets Profile + Calculates Permissions from Entitlements
  async fetchProfile(userId: string): Promise<UserProfile | null> {
    // 1. Fetch Profile
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profileData) {
        // Fallback for auto-healing if trigger failed or latent
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId) {
            // Try to auto-create profile if missing
             await supabase.from('profiles').upsert({
                id: userId,
                full_name: user.user_metadata?.full_name || '',
                role: user.user_metadata?.role || 'user'
             });
             // Retry fetch
             return this.fetchProfile(userId);
        }
        return null;
    }

    // 2. Fetch Active Entitlements
    const now = new Date().toISOString();
    const { data: entitlements } = await supabase
        .from('entitlements')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', now); // Only get valid licenses

    // 3. Aggregate Permissions
    let maxExpiry = 0;
    const allowedModes = new Set<Mode>();

    if (entitlements) {
        (entitlements as DBEntitlement[]).forEach(ent => {
            const expTime = new Date(ent.expires_at).getTime();
            if (expTime > maxExpiry) maxExpiry = expTime;

            // Parse scope jsonb: {"nhin_tinh": true}
            Object.keys(ent.scope || {}).forEach(key => {
                if (ent.scope[key] === true) {
                    allowedModes.add(key as Mode);
                }
            });
        });
    }

    // 4. Construct UI Profile
    return {
        id: profileData.id,
        email: '', // Supabase profiles table usually doesn't store email, getting from auth context usually better but keeping simplified here
        full_name: profileData.full_name,
        student_code: profileData.student_code,
        role: profileData.role,
        created_at: profileData.created_at,
        license_expiry: maxExpiry > 0 ? new Date(maxExpiry).toISOString() : undefined,
        allowed_modes: Array.from(allowedModes)
    };
  }

  async logout() {
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const { data: { user } } = await supabase.auth.getUser(); // Refresh to ensure valid session
    if (!user) return null;
    
    // Merge email from auth into profile result
    const profile = await this.fetchProfile(user.id);
    if (profile) profile.email = user.email || '';
    return profile;
  }

  // --- License (Activates Code -> Creates Entitlement) ---
  async activateLicense(userId: string, codeStr: string): Promise<{ success: boolean; message: string }> {
    // 1. Find Code
    const { data: codeData, error } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code', codeStr)
        .eq('status', 'active')
        .single();
        
    if (error || !codeData) {
        return { success: false, message: 'Mã kích hoạt không hợp lệ, đã hết hạn hoặc đã được sử dụng.' };
    }

    // Check strict expiry if exists
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return { success: false, message: 'Mã này đã hết hạn sử dụng.' };
    }

    // Check if single use and already used (Database logic rule)
    if (codeData.used_by) {
        return { success: false, message: 'Mã này đã được sử dụng.' };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (codeData.duration_days * 24 * 60 * 60 * 1000));

    // 2. Perform updates (Ideally RPC, doing Client-side transaction simulation)
    
    // A. Mark code as used
    const { error: updateError } = await supabase
        .from('activation_codes')
        .update({
            status: 'disabled', // Disable after use if single-use
            used_by: userId,
            used_at: now.toISOString(),
            updated_at: now.toISOString()
        })
        .eq('id', codeData.id)
        .eq('status', 'active'); // Optimistic locking

    if (updateError) {
         return { success: false, message: 'Mã đã bị người khác sử dụng.' };
    }

    // B. Insert Entitlement
    const { error: insertError } = await supabase
        .from('entitlements')
        .insert({
            user_id: userId,
            activation_code_id: codeData.id,
            scope: codeData.scope,
            starts_at: now.toISOString(),
            expires_at: expiresAt.toISOString()
        });

    if (insertError) {
        console.error("Entitlement error", insertError);
        return { success: false, message: 'Lỗi hệ thống khi gán quyền.' };
    }

    return { success: true, message: `Kích hoạt thành công! Hạn dùng đến ${expiresAt.toLocaleDateString('vi-VN')}` };
  }

  // --- Attempts (Split into Attempts + Answers tables) ---
  async saveAttempt(
    userId: string, 
    config: ExamConfig, 
    questions: Question[],
    stats: { correct: number, wrong: number, skipped: number, total: number, duration: number },
    answers: Record<number, string>
  ): Promise<void> {
    
    const now = new Date().toISOString();

    // 1. Insert Attempt Header
    const attemptData = {
        user_id: userId,
        mode: config.mode,
        level: config.level,
        settings: config, // Save full config JSON
        exam_data: { questions }, // Save generated questions JSON
        started_at: new Date(Date.now() - stats.duration * 1000).toISOString(),
        finished_at: now,
        score_correct: stats.correct,
        score_wrong: stats.wrong,
        score_skipped: stats.skipped,
        score_total: stats.total,
        duration_seconds: stats.duration
    };

    const { data: attempt, error } = await supabase
        .from('attempts')
        .insert(attemptData)
        .select()
        .single();

    if (error || !attempt) {
        console.error("Failed to save attempt header", error);
        throw new Error("Lỗi lưu kết quả bài thi.");
    }

    // 2. Insert Answers Details
    const answersData: DBAnswer[] = questions.map((q, idx) => {
        const userAns = answers[idx];
        const isCorrect = userAns ? parseInt(userAns) === q.correctAnswer : false;
        
        return {
            attempt_id: attempt.id,
            question_no: idx + 1,
            user_answer: userAns || null,
            is_correct: userAns ? isCorrect : null, // null if skipped
            answered_at: now // In real app, track individual times
        };
    });

    const { error: ansError } = await supabase
        .from('answers')
        .insert(answersData);

    if (ansError) {
        console.error("Failed to save answers", ansError);
        // We don't rollback attempt here in simple mock, but implies data inconsistency risk without transaction
    }
  }

  async getUserHistory(userId: string): Promise<AttemptResult[]> {
    // This is a simplified fetch. Real apps might need pagination.
    const { data, error } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) return [];
    return data as AttemptResult[];
  }

  // --- Admin ---
  async getAllUsers(): Promise<UserProfile[]> {
    // Admin needs raw profiles + derived entitlement info. 
    // Simplified: Just returning profiles for now.
    const { data } = await supabase.from('profiles').select('*');
    if (!data) return [];
    
    // Map to UserProfile format (missing entitlement calc for bulk users to save perf in this demo)
    return data.map(p => ({
        ...p,
        email: 'Hidden', // Email is in Auth, needs function/rpc to get
        allowed_modes: [],
        license_expiry: undefined
    }));
  }

  async getAllAttempts(): Promise<AttemptResult[]> {
    const { data } = await supabase
        .from('attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); 
    return (data || []) as AttemptResult[];
  }
}

export const backend = new BackendService();
