
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
        const { error: rpcError } = await supabase.rpc('ensure_profile');
        if (rpcError) console.error("[Auth] ensure_profile RPC failed:", rpcError);

        const { data: profileData, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !profileData) return null;

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
                    if (ent.scope[key] === true) allowedModes.add(key as Mode);
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
      options: { data: { full_name: fullName, role: role } },
    });

    if (error) return { user: null, error: error.message };
    if (data.user && !data.session) return { user: null, error: "Đăng ký thành công! Vui lòng kiểm tra email." };
    if (data.user && data.session) {
        const profile = await this._ensureAndFetchProfile(data.user.id, email);
        if (profile) return { user: profile, error: null };
    }
    return { user: null, error: "Lỗi tải thông tin người dùng." };
  }

  async login(email: string, password: string): Promise<{ user: UserProfile | null; error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: "Email hoặc mật khẩu không chính xác." };
    
    if (data.user && data.session) {
        const profile = await this._ensureAndFetchProfile(data.user.id, data.user.email || '');
        if (profile) return { user: profile, error: null };
    }
    return { user: null, error: "Đăng nhập thất bại." };
  }

  async logout() { await supabase.auth.signOut(); }

  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return this._ensureAndFetchProfile(session.user.id, session.user.email || '');
  }

  async fetchProfile(userId: string): Promise<UserProfile | null> {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!profileData) return null;
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
        const { data, error } = await supabase.rpc('activate_license', { p_code: codeStr });
        if (error) return { success: false, message: 'Lỗi kích hoạt: ' + error.message };
        const result = data as any;
        if (result && result.ok) {
             let dateStr = '---';
             try { dateStr = new Date(result.expires_at).toLocaleDateString('vi-VN'); } catch(e){}
             return { success: true, message: `Kích hoạt thành công! Hạn dùng đến ${dateStr}` };
        }
        return { success: false, message: result?.message || 'Có lỗi xảy ra.' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
  }

  // --- Attempts ---
  async saveAttempt(userId: string, config: ExamConfig, questions: Question[], stats: any, answers: Record<number, string>): Promise<void> {
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

    const { data: attempt, error } = await supabase.from('attempts').insert(attemptData).select().single();
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
    const { data } = await supabase.from('attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    return (data || []) as AttemptResult[];
  }

  async getAttemptAnswers(attemptId: string): Promise<Record<number, string>> {
      const { data } = await supabase.from('answers').select('question_no, user_answer').eq('attempt_id', attemptId);
      const answers: Record<number, string> = {};
      data?.forEach((row: any) => {
          if (row.user_answer !== null) answers[row.question_no - 1] = row.user_answer;
      });
      return answers;
  }

  // --- Exam Rules ---
  async getLatestExamRule(mode: Mode): Promise<DBExamRule | null> {
    const { data } = await supabase.from('exam_rules').select('*').eq('mode', mode).order('created_at', { ascending: false }).limit(1).single();
    return data as DBExamRule;
  }

  async saveExamRule(mode: Mode, rulesJson: any): Promise<{ success: boolean, error?: string }> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Unauthorized' };
      const { error } = await supabase.from('exam_rules').insert({
            mode: mode,
            version_name: `ver_${Date.now()}`,
            rules_json: rulesJson,
            created_by: user.id
        });
      return { success: !error, error: error?.message };
  }

  async getExamRuleHistory(mode: Mode): Promise<DBExamRule[]> {
      const { data } = await supabase.from('exam_rules').select('*').eq('mode', mode).order('created_at', { ascending: false }).limit(20);
      return (data || []) as DBExamRule[];
  }

  // --- CUSTOM EXAMS (UPDATED LOGIC) ---

  /**
   * Helper: Chuẩn hóa câu hỏi từ file JSON
   * - Tự động tính toán correctAnswer nếu thiếu
   * - Tự động tạo ID nếu thiếu
   */
  private _normalizeQuestions(questions: any[]): Question[] {
     if (!Array.isArray(questions)) return [];
     
     return questions.map((q, idx) => {
         let correctAnswer = q.correctAnswer;
         // Nếu file JSON không có đáp án, tự tính tổng các toán hạng
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
      questions: any[]; 
      is_public?: boolean;
  }): Promise<{ success: boolean, error?: string }> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Bạn cần đăng nhập để tải đề.' };

      // 1. Chuẩn hóa dữ liệu câu hỏi trước khi lưu
      const normalizedQuestions = this._normalizeQuestions(examData.questions);

      // 2. Insert vào DB
      const { error } = await supabase
        .from('custom_exams')
        .insert({
            name: examData.name,
            description: examData.description || '',
            mode: examData.mode,
            level: examData.level,
            time_limit: examData.time_limit,
            questions: normalizedQuestions, // Lưu mảng đã chuẩn hóa (có correctAnswer)
            is_public: examData.is_public ?? false, // Mặc định false (private)
            status: 'active', // Luôn set active khi mới upload
            created_by: user.id
        });

      if (error) return { success: false, error: error.message };
      return { success: true };
  }

  async getCustomExams(
      mode: Mode, 
      level?: number, 
      status: 'active' | 'disabled' | 'draft' | 'all' = 'all' // Mặc định lấy tất cả để dễ debug nếu không truyền tham số
  ): Promise<CustomExam[]> {
      let query = supabase
        .from('custom_exams')
        .select('*')
        .eq('mode', mode)
        .order('created_at', { ascending: false });
      
      if (level !== undefined) {
          query = query.eq('level', level);
      }

      // Filter status nếu không phải 'all'
      if (status && status !== 'all') {
          query = query.eq('status', status);
      }

      const { data, error } = await query;
      
      if (error) {
          console.error(`Error fetching exams [mode=${mode}, level=${level}, status=${status}]:`, error);
          return [];
      }
      
      // Map đảm bảo types
      return (data || []).map((exam: any) => ({
          ...exam,
          questions: Array.isArray(exam.questions) ? exam.questions : []
      })) as CustomExam[];
  }

  async deleteCustomExam(id: string): Promise<boolean> {
      const { error } = await supabase.from('custom_exams').delete().eq('id', id);
      return !error;
  }

  async getCustomExamById(id: string): Promise<CustomExam | null> {
      const { data, error } = await supabase.from('custom_exams').select('*').eq('id', id).single();
      if (error) return null;
      return data as CustomExam;
  }

  // --- Admin ---
  async getAllUsers(): Promise<UserProfile[]> {
    const { data } = await supabase.from('user_profile_aggregated').select('*');
    return data ? data.map((row: any) => ({
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        student_code: row.student_code,
        role: row.role,
        created_at: row.created_at,
        license_expiry: row.license_expiry,
        allowed_modes: row.allowed_modes || []
    })) : [];
  }

  async getAllAttempts(): Promise<AttemptResult[]> {
    const { data } = await supabase.from('attempts').select('*').order('created_at', { ascending: false }).limit(50); 
    return (data || []) as AttemptResult[];
  }
}

export const backend = new BackendService();
