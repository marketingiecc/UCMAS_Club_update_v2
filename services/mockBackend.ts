
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
    if (data.user) {
        // Return a temporary profile state. The real data comes from DB next fetch.
        const newProfile: UserProfile = {
             id: data.user.id,
             email: email || '',
             full_name: fullName,
             role: role,
             created_at: new Date().toISOString(),
             allowed_modes: [],
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
    // We can now query the aggregated view directly for richer data, 
    // or keep the robust manual join. Let's use the robust join for the specific user
    // to ensure we handle the 'missing profile' case via auto-healing if needed.

    // 1. Fetch Profile
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profileData) {
        // RPC: Ensure profile exists (Auto-heal)
        const { data: rpcProfile, error: rpcError } = await supabase.rpc('ensure_profile');
        if (!rpcError && rpcProfile) {
             // Retry fetch recursively once
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
        .gt('expires_at', now); 

    // 3. Aggregate Permissions
    let maxExpiry = 0;
    const allowedModes = new Set<Mode>();

    if (entitlements) {
        (entitlements as DBEntitlement[]).forEach(ent => {
            const expTime = new Date(ent.expires_at).getTime();
            if (expTime > maxExpiry) maxExpiry = expTime;

            Object.keys(ent.scope || {}).forEach(key => {
                if (ent.scope[key] === true) {
                    allowedModes.add(key as Mode);
                }
            });
        });
    }

    // 4. Construct UI Profile
    const { data: { user } } = await supabase.auth.getUser();

    return {
        id: profileData.id,
        email: user?.email || '',
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
    return this.fetchProfile(session.user.id);
  }

  // --- License (UPDATED: Uses RPC) ---
  async activateLicense(userId: string, codeStr: string): Promise<{ success: boolean; message: string }> {
    try {
        // Call the PostgreSQL Function `activate_license`
        const { data, error } = await supabase.rpc('activate_license', { 
            p_code: codeStr 
        });

        if (error) {
            // Map SQL errors to user friendly messages
            if (error.message.includes('Invalid code')) return { success: false, message: 'Mã kích hoạt không tồn tại.' };
            if (error.message.includes('Code disabled')) return { success: false, message: 'Mã này đã bị vô hiệu hóa.' };
            if (error.message.includes('Code already used')) return { success: false, message: 'Mã này đã được sử dụng.' };
            if (error.message.includes('Code expired')) return { success: false, message: 'Mã này đã hết hạn.' };
            console.error(error);
            return { success: false, message: 'Lỗi kích hoạt: ' + error.message };
        }

        const result = data as any;
        if (result && result.ok) {
             const expiryDate = new Date(result.expires_at).toLocaleDateString('vi-VN');
             return { success: true, message: `Kích hoạt thành công! Hạn dùng đến ${expiryDate}` };
        }
        
        return { success: false, message: 'Có lỗi xảy ra.' };

    } catch (e) {
        return { success: false, message: 'Lỗi kết nối hệ thống.' };
    }
  }

  // --- Attempts ---
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
        settings: config, // JSONB
        exam_data: { questions }, // JSONB
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
            question_no: idx + 1, // SQL is 1-based usually, matching DB constraint check(question_no >= 1)
            user_answer: userAns || null,
            is_correct: userAns ? isCorrect : null,
            answered_at: now
        };
    });

    const { error: ansError } = await supabase
        .from('answers')
        .insert(answersData);

    if (ansError) {
        console.error("Failed to save answers", ansError);
    }
  }

  async getUserHistory(userId: string): Promise<AttemptResult[]> {
    const { data, error } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) return [];
    return data as AttemptResult[];
  }

  // --- Admin (UPDATED: Uses View) ---
  async getAllUsers(): Promise<UserProfile[]> {
    // Use the SQL VIEW `user_profile_aggregated` which pre-calculates expiry and modes
    const { data, error } = await supabase
        .from('user_profile_aggregated')
        .select('*');

    if (error || !data) {
        console.error("Admin fetch error", error);
        return [];
    }
    
    // Map View result to UserProfile interface
    // The view columns match our interface almost exactly
    return data.map((row: any) => ({
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        student_code: row.student_code,
        role: row.role,
        created_at: row.created_at,
        license_expiry: row.license_expiry,
        allowed_modes: row.allowed_modes || []
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
