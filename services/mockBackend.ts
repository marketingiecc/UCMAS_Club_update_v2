
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
    // 1. Sign up in Supabase Auth
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
    
    // 2. Ensure Profile Exists in Database
    // Ideally, a database trigger handles this. However, to be robust against trigger failures,
    // we perform a manual insert here. 'ON CONFLICT DO NOTHING' behavior is expected via logic/policy.
    if (data.user) {
        const profileData = {
            id: data.user.id,
            full_name: fullName,
            role: role,
            student_code: role === 'admin' ? 'ADMIN' : '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single();
        
        // If insert failed, it might be because the Trigger already created it (duplicate key).
        // We log it but proceed optimistically.
        if (insertError && !insertError.message.includes('duplicate')) {
             console.warn("Manual profile creation warning:", insertError);
        }

        // Return the profile object for UI
        const newProfile: UserProfile = {
             ...profileData,
             email: email || '',
             allowed_modes: []
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
        // Fetch full profile
        const profile = await this.fetchProfile(data.user.id);
        
        // If profile missing (rare edge case where reg worked but DB didn't), try to create it now
        if (!profile) {
            // Attempt auto-heal logic in frontend as last resort
            const fullName = data.user.user_metadata?.full_name || 'User';
            const { error: healError } = await supabase.from('profiles').insert({
                id: data.user.id,
                full_name: fullName,
                role: 'user',
                updated_at: new Date().toISOString()
            });
            
            if (!healError) {
                return this.login(email, password); // Retry login
            }
            return { user: null, error: "Lỗi dữ liệu tài khoản. Vui lòng liên hệ hỗ trợ." };
        }

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
        console.error("Fetch profile failed", error);
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

  // --- License ---
  async activateLicense(userId: string, codeStr: string): Promise<{ success: boolean; message: string }> {
    try {
        // Call the PostgreSQL Function `activate_license`
        // We try RPC first, if not available, we assume legacy or broken DB
        const { data, error } = await supabase.rpc('activate_license', { 
            p_code: codeStr 
        });

        if (error) {
            // Map SQL errors to user friendly messages
            const msg = error.message || '';
            if (msg.includes('Invalid code')) return { success: false, message: 'Mã kích hoạt không tồn tại.' };
            if (msg.includes('Code disabled')) return { success: false, message: 'Mã này đã bị vô hiệu hóa.' };
            if (msg.includes('Code used')) return { success: false, message: 'Mã này đã được sử dụng.' };
            console.error(error);
            return { success: false, message: 'Lỗi kích hoạt: ' + msg };
        }

        const result = data as any;
        if (result && result.ok) {
             // Safe date parsing
             let dateStr = '---';
             try { dateStr = new Date(result.expires_at).toLocaleDateString('vi-VN'); } catch(e){}
             return { success: true, message: `Kích hoạt thành công! Hạn dùng đến ${dateStr}` };
        }
        
        return { success: false, message: (result?.message) || 'Có lỗi xảy ra.' };

    } catch (e: any) {
        return { success: false, message: 'Lỗi kết nối hệ thống: ' + e.message };
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

  // --- Admin ---
  async getAllUsers(): Promise<UserProfile[]> {
    // Basic fetch for admin - view aggregation recommended for production but simple select works if view missing
    const { data, error } = await supabase
        .from('profiles')
        .select('*');

    if (error || !data) {
        console.error("Admin fetch error", error);
        return [];
    }
    
    return data.map((row: any) => ({
        id: row.id,
        email: '...', // Profiles table doesn't have email in this simple schema, would need join or view
        full_name: row.full_name,
        student_code: row.student_code,
        role: row.role,
        created_at: row.created_at,
        allowed_modes: []
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
