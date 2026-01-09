
import { createClient } from '@supabase/supabase-js';
import { UserProfile, AttemptResult, DBEntitlement, DBAnswer, Mode, ExamConfig, Question, DBExamRule, CustomExam } from '../types';

// Configuration
const SUPABASE_URL = 'https://rwtpwdyoxirfpposmdcg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7ELQeXNcXhnsvD3aW6jgTg_Hq07B8mH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class BackendService {
  
  // =========================================================================
  // CORE HELPER: Ensure Profile Exists -> Fetch Data -> Calculate Entitlements
  // =========================================================================
  private async _ensureAndFetchProfile(userId: string, userEmail: string): Promise<UserProfile | null> {
    try {
        console.log(`[Auth] Ensuring profile for ${userId} (${userEmail})...`);

        const { error: rpcError } = await supabase.rpc('ensure_profile');
        
        if (rpcError) {
            console.error("[Auth] ensure_profile RPC failed:", rpcError);
        }

        const { data: profileData, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !profileData) {
            console.error("[Auth] Fatal: Profile not found even after ensure_profile.", fetchError);
            return null;
        }

        const now = new Date().toISOString();
        const { data: entitlements } = await supabase
            .from('entitlements')
            .select('*')
            .eq('user_id', userId)
            .gt('expires_at', now); 

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

        return {
            id: profileData.id,
            email: userEmail,
            full_name: profileData.full_name,
            student_code: profileData.student_code,
            role: profileData.role,
            created_at: profileData.created_at,
            license_expiry: maxExpiry > 0 ? new Date(maxExpiry).toISOString() : undefined,
            allowed_modes: Array.from(allowedModes)
        };

    } catch (e) {
        console.error("[Auth] Unexpected error in _ensureAndFetchProfile:", e);
        return null;
    }
  }

  // --- Auth API ---
  
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

    if (data.user && !data.session) {
        return { user: null, error: "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản." };
    }
    
    if (data.user && data.session) {
        const profile = await this._ensureAndFetchProfile(data.user.id, email);
        if (profile) return { user: profile, error: null };
    }

    return { user: null, error: "Đăng ký thành công nhưng không thể tải thông tin người dùng. Vui lòng đăng nhập lại." };
  }

  async login(email: string, password: string): Promise<{ user: UserProfile | null; error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) return { user: null, error: "Email hoặc mật khẩu không chính xác." };
    
    if (data.user && data.session) {
        const profile = await this._ensureAndFetchProfile(data.user.id, data.user.email || '');
        if (profile) return { user: profile, error: null };
        return { user: null, error: "Lỗi dữ liệu: Không tìm thấy hồ sơ người dùng. Vui lòng thử lại sau." };
    }
    
    return { user: null, error: "Đăng nhập thất bại." };
  }

  async logout() {
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return this._ensureAndFetchProfile(session.user.id, session.user.email || '');
  }

  async fetchProfile(userId: string): Promise<UserProfile | null> {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !profileData) return null;

      return {
          id: profileData.id,
          email: '', 
          full_name: profileData.full_name,
          student_code: profileData.student_code,
          role: profileData.role,
          created_at: profileData.created_at,
          allowed_modes: []
      };
  }

  async activateLicense(userId: string, codeStr: string): Promise<{ success: boolean; message: string }> {
    try {
        const { data, error } = await supabase.rpc('activate_license', { 
            p_code: codeStr 
        });

        if (error) {
            const msg = error.message || '';
            if (msg.includes('Invalid code')) return { success: false, message: 'Mã kích hoạt không tồn tại.' };
            if (msg.includes('Code disabled')) return { success: false, message: 'Mã này đã bị vô hiệu hóa.' };
            if (msg.includes('Code used')) return { success: false, message: 'Mã này đã được sử dụng.' };
            if (msg.includes('Code expired')) return { success: false, message: 'Mã này đã hết hạn.' };
            return { success: false, message: 'Lỗi kích hoạt: ' + msg };
        }

        const result = data as any;
        if (result && result.ok) {
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
    const attemptData = {
        user_id: userId,
        mode: config.mode,
        level: config.level,
        settings: config,
        exam_data: { questions },
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

    if (error || !attempt) throw new Error("Lỗi lưu kết quả bài thi.");

    const answersData: DBAnswer[] = questions.map((q, idx) => {
        const userAns = answers[idx];
        const isCorrect = userAns ? parseInt(userAns) === q.correctAnswer : false;
        
        return {
            attempt_id: attempt.id,
            question_no: idx + 1,
            user_answer: userAns || null,
            is_correct: userAns ? isCorrect : null,
            answered_at: now
        };
    });

    await supabase.from('answers').insert(answersData);
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

  async getAttemptAnswers(attemptId: string): Promise<Record<number, string>> {
      const { data, error } = await supabase
        .from('answers')
        .select('question_no, user_answer')
        .eq('attempt_id', attemptId);
      
      if (error || !data) return {};

      const answers: Record<number, string> = {};
      data.forEach((row: any) => {
          if (row.user_answer !== null) {
              answers[row.question_no - 1] = row.user_answer;
          }
      });
      return answers;
  }

  // --- Exam Rules Management ---
  async getLatestExamRule(mode: Mode): Promise<DBExamRule | null> {
    const { data, error } = await supabase
        .from('exam_rules')
        .select('*')
        .eq('mode', mode)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    if (error) return null;
    return data as DBExamRule;
  }

  async saveExamRule(mode: Mode, rulesJson: any): Promise<{ success: boolean, error?: string }> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Unauthorized' };

      const { error } = await supabase
        .from('exam_rules')
        .insert({
            mode: mode,
            version_name: `ver_${Date.now()}`,
            rules_json: rulesJson,
            created_by: user.id
        });

      if (error) return { success: false, error: error.message };
      return { success: true };
  }

  async getExamRuleHistory(mode: Mode): Promise<DBExamRule[]> {
      const { data, error } = await supabase
        .from('exam_rules')
        .select('*')
        .eq('mode', mode)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return [];
      return data as DBExamRule[];
  }

  // --- Custom Exams (DB Implementation) ---

  /**
   * Helper to normalize questions from uploaded JSON.
   * Ensures every question has an ID and a correct Answer.
   */
  private _normalizeQuestions(questions: any[]): Question[] {
     if (!Array.isArray(questions)) return [];
     
     return questions.map((q, idx) => {
         // Calculate sum if correctAnswer is missing
         let correctAnswer = q.correctAnswer;
         if (correctAnswer === undefined || correctAnswer === null) {
             if (Array.isArray(q.operands)) {
                 correctAnswer = q.operands.reduce((a: number, b: number) => a + b, 0);
             } else {
                 correctAnswer = 0;
             }
         }

         return {
             id: q.id || `q-${Date.now()}-${idx}`,
             operands: Array.isArray(q.operands) ? q.operands : [],
             correctAnswer: parseInt(correctAnswer)
         };
     });
  }

  async uploadCustomExam(examData: {
      name: string;
      description?: string;
      mode: Mode;
      level: number;
      time_limit: number;
      questions: any[]; // Raw input, normalized inside
      is_public?: boolean;
  }): Promise<{ success: boolean, error?: string }> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Unauthorized' };

      const normalizedQuestions = this._normalizeQuestions(examData.questions);

      const { error } = await supabase
        .from('custom_exams')
        .insert({
            name: examData.name,
            description: examData.description || '',
            mode: examData.mode,
            level: examData.level,
            time_limit: examData.time_limit,
            questions: normalizedQuestions, // Stored as JSONB
            is_public: examData.is_public ?? true, // Default public for now
            status: 'active',
            created_by: user.id
        });

      if (error) return { success: false, error: error.message };
      return { success: true };
  }

  async getCustomExams(mode: Mode, level?: number): Promise<CustomExam[]> {
      let query = supabase
        .from('custom_exams')
        .select('*')
        .eq('mode', mode)
        .eq('status', 'active') // Only show active exams
        .order('created_at', { ascending: false });
      
      if (level !== undefined) {
          query = query.eq('level', level);
      }

      const { data, error } = await query;
      if (error) {
          console.error("Error fetching exams:", error);
          return [];
      }
      return data as CustomExam[];
  }

  async deleteCustomExam(id: string): Promise<boolean> {
      // Logic deletion (set status to disabled) is safer, but hard delete for now per prompt implies clean up
      const { error } = await supabase
        .from('custom_exams')
        .delete()
        .eq('id', id);
      return !error;
  }

  async getCustomExamById(id: string): Promise<CustomExam | null> {
      const { data, error } = await supabase
        .from('custom_exams')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) return null;
      return data as CustomExam;
  }

  // --- Share Exam (Requirement G) ---
  async shareExamWithUser(examId: string, targetUserId: string): Promise<{ success: boolean, error?: string }> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Unauthorized' };

      const { error } = await supabase
        .from('custom_exam_access')
        .insert({
            exam_id: examId,
            user_id: targetUserId,
            granted_by: user.id
        });

      if (error) return { success: false, error: error.message };
      return { success: true };
  }

  // --- Admin ---
  async getAllUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase.from('user_profile_aggregated').select('*');
    if (!error && data) {
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
    const { data: profiles } = await supabase.from('profiles').select('*');
    if (!profiles) return [];
    return profiles.map((row: any) => ({
        id: row.id,
        email: '...', 
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
