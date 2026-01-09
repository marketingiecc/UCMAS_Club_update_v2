
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

  // Admin Direct Activation
  async adminActivateUser(userId: string, durationMonths: number): Promise<{ success: boolean; error?: string; expiresAt?: string }> {
      const { data: { user } } = await supabase.auth.getUser();
      // Basic check, ideally protected by RLS
      if (!user) return { success: false, error: 'Unauthorized' };

      const startsAt = new Date();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

      const { error } = await supabase.from('entitlements').insert({
          user_id: userId,
          scope: { [Mode.VISUAL]: true, [Mode.LISTENING]: true, [Mode.FLASH]: true },
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString()
      });

      if (error) return { success: false, error: error.message };
      return { success: true, expiresAt: expiresAt.toISOString() };
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

  private _normalizeQuestions(questions: any[]): Question[] {
     if (!Array.isArray(questions)) return [];
     
     return questions.map((q, idx) => {
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
      questions: any[]; 
      is_public?: boolean;
  }): Promise<{ success: boolean, error?: string }> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Bạn cần đăng nhập để tải đề.' };

      const normalizedQuestions = this._normalizeQuestions(examData.questions);

      const { error } = await supabase
        .from('custom_exams')
        .insert({
            name: examData.name,
            description: examData.description || '',
            mode: examData.mode,
            level: examData.level,
            time_limit: examData.time_limit,
            questions: normalizedQuestions, 
            is_public: examData.is_public ?? false, 
            status: 'active',
            created_by: user.id
        });

      if (error) return { success: false, error: error.message };
      return { success: true };
  }

  async getCustomExams(
      mode: Mode, 
      level?: number, 
      status: 'active' | 'disabled' | 'draft' | 'all' = 'all' 
  ): Promise<CustomExam[]> {
      const { data: { user } } = await supabase.auth.getUser();
      const allExamsMap = new Map<string, CustomExam>();

      const processExams = (exams: any[]) => {
          exams.forEach(e => {
              if (!allExamsMap.has(e.id)) {
                  allExamsMap.set(e.id, {
                      ...e,
                      questions: Array.isArray(e.questions) ? e.questions : []
                  });
              }
          });
      };

      const applyFilters = (queryBuilder: any) => {
          let q = queryBuilder.eq('mode', mode);
          if (typeof level === 'number') q = q.eq('level', level);
          if (status !== 'all') q = q.eq('status', status);
          return q;
      };

      try {
          const { data, error } = await applyFilters(
              supabase.from('custom_exams').select('*').eq('is_public', true)
          );
          if (!error && data) processExams(data);
      } catch (e) { console.warn("Error fetching public exams:", e); }

      if (user) {
          try {
              const { data, error } = await applyFilters(
                  supabase.from('custom_exams').select('*').eq('created_by', user.id)
              );
              if (!error && data) processExams(data);
          } catch (e) { console.warn("Error fetching my exams:", e); }

          try {
              const { data: sharedAccess } = await supabase
                .from('custom_exam_access')
                .select('exam_id')
                .eq('user_id', user.id);
              
              if (sharedAccess && sharedAccess.length > 0) {
                  const sharedIds = sharedAccess.map(r => r.exam_id);
                  const { data, error } = await applyFilters(
                      supabase.from('custom_exams').select('*').in('id', sharedIds)
                  );
                  if (!error && data) processExams(data);
              }
          } catch (e) { console.warn("Error fetching shared exams:", e); }

          try {
             const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
             if (profile?.role === 'admin') {
                 const { data, error } = await applyFilters(
                     supabase.from('custom_exams').select('*')
                 );
                 if (!error && data) processExams(data);
             }
          } catch (e) { console.warn("Error fetching all exams for admin:", e); }
      }

      const finalExams = Array.from(allExamsMap.values());
      finalExams.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return finalExams;
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
    // Attempt 1: Try the aggregated view
    try {
        const { data: viewData, error: viewError } = await supabase.from('user_profile_aggregated').select('*');
        if (!viewError && viewData && viewData.length > 0) {
            return viewData.map((row: any) => ({
                id: row.id,
                email: row.email || '---',
                full_name: row.full_name || 'Không tên',
                student_code: row.student_code,
                role: row.role,
                created_at: row.created_at,
                license_expiry: row.license_expiry,
                allowed_modes: row.allowed_modes || []
            }));
        }
    } catch (e) {
        console.warn("View lookup failed, using manual fallback.", e);
    }
    
    // Attempt 2: Fallback to manual aggregation (if view fails or is empty due to RLS)
    console.warn("Using fallback manual user fetch");
    
    const { data: profiles } = await supabase.from('profiles').select('*');
    if (!profiles) return [];

    // Fetch entitlements manually to calculate expiry
    const { data: entitlements } = await supabase.from('entitlements').select('*');
    
    return profiles.map((p: any) => {
        // Calculate max expiry
        let maxExpiry = 0;
        let allowedModes: Mode[] = [];
        
        if (entitlements) {
            const userEntitlements = entitlements.filter((e: any) => e.user_id === p.id);
            userEntitlements.forEach((ent: any) => {
                 const exp = new Date(ent.expires_at).getTime();
                 if (exp > maxExpiry) maxExpiry = exp;
                 // Merge scopes
                 if (ent.scope) {
                     Object.keys(ent.scope).forEach(k => {
                         if (ent.scope[k]) allowedModes.push(k as Mode);
                     });
                 }
            });
        }

        return {
            id: p.id,
            email: 'Ẩn (Cần quyền Admin DB)', // Fallback since we can't get auth.users
            full_name: p.full_name,
            student_code: p.student_code,
            role: p.role,
            created_at: p.created_at,
            license_expiry: maxExpiry > 0 ? new Date(maxExpiry).toISOString() : undefined,
            allowed_modes: Array.from(new Set(allowedModes))
        };
    });
  }

  async getAllAttempts(): Promise<AttemptResult[]> {
    const { data } = await supabase.from('attempts').select('*').order('created_at', { ascending: false }).limit(50); 
    return (data || []) as AttemptResult[];
  }

  // --- Reporting ---
  async getReportData(timeRange: 'day' | 'week' | 'month'): Promise<any> {
    const now = new Date();
    let startDate = new Date();

    if (timeRange === 'day') startDate.setDate(now.getDate() - 1);
    else if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
    else if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1);

    const isoStart = startDate.toISOString();

    try {
        // 1. New Users
        const { count: newUsersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gt('created_at', isoStart);

        // 2. Active Licenses (New activations in period)
        const { count: activeLicensesCount } = await supabase
            .from('entitlements')
            .select('*', { count: 'exact', head: true })
            .gt('created_at', isoStart);

        // 3. Active Students (Those who made at least one attempt)
        const { data: recentAttempts } = await supabase
            .from('attempts')
            .select('user_id, created_at, score_correct')
            .gt('created_at', isoStart)
            .limit(1000);
        
        const uniqueStudents = new Set(recentAttempts?.map(a => a.user_id));
        
        // 4. Top Students
        // Group by user_id and count attempts
        const leaderboard: Record<string, number> = {};
        recentAttempts?.forEach(a => {
            leaderboard[a.user_id] = (leaderboard[a.user_id] || 0) + 1;
        });

        // Get Top 5 IDs
        const sortedLeaderboard = Object.entries(leaderboard)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
        
        const topStudents = [];
        for (const [uid, count] of sortedLeaderboard) {
            // We need names. Fetch from cache or DB. DB is safer here.
            const { data: u } = await supabase.from('profiles').select('full_name, email').eq('id', uid).single(); // Warning: email might be null
            if (u) {
                topStudents.push({
                    id: uid,
                    full_name: u.full_name,
                    email: u.email || 'N/A',
                    attempts_count: count
                });
            }
        }

        return {
            new_users: newUsersCount || 0,
            new_licenses: activeLicensesCount || 0,
            active_students: uniqueStudents.size,
            total_attempts: recentAttempts?.length || 0,
            top_students: topStudents
        };
    } catch (e) {
        console.error("Report Generation Error", e);
        return {
            new_users: 0, new_licenses: 0, active_students: 0, total_attempts: 0, top_students: []
        };
    }
  }
}

export const backend = new BackendService();
