
import { createClient } from '@supabase/supabase-js';
import { UserProfile, AttemptResult, DBEntitlement, DBAnswer, Mode, ExamConfig, Question, DBExamRule, CustomExam, Contest, ContestExam, ContestAccessCode, ContestSession, ContestRegistration } from '../types';

const SUPABASE_URL = 'https://rwtpwdyoxirfpposmdcg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7ELQeXNcXhnsvD3aW6jgTg_Hq07B8mH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class BackendService {
  private async _ensureAndFetchProfile(userId: string, userEmail: string): Promise<UserProfile | null> {
    try {
        const { error: rpcError } = await supabase.rpc('ensure_profile');
        if (rpcError) console.error("[Auth] ensure_profile RPC failed:", rpcError);
        const { data: profileData, error: fetchError } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (fetchError || !profileData) return null;
        const now = new Date().toISOString();
        const { data: entitlements } = await supabase.from('entitlements').select('*').eq('user_id', userId).gt('expires_at', now); 
        let maxExpiry = 0;
        const allowedModes = new Set<Mode>();
        if (entitlements) {
            (entitlements as DBEntitlement[]).forEach(ent => {
                const expTime = new Date(ent.expires_at).getTime();
                if (expTime > maxExpiry) maxExpiry = expTime;
                Object.keys(ent.scope || {}).forEach(key => { if (ent.scope[key] === true) allowedModes.add(key as Mode); });
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
    } catch (e) { return null; }
  }

  async register(email: string, password: string, fullName: string): Promise<{ user: UserProfile | null; error: string | null }> {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role: 'user' } } });
    if (error) return { user: null, error: error.message };
    if (data.user && data.session) {
        const profile = await this._ensureAndFetchProfile(data.user.id, email);
        if (profile) return { user: profile, error: null };
    }
    return { user: null, error: "Đăng ký thành công! Vui lòng xác thực email." };
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

  // Added missing fetchProfile for AdminLoginPage
  async fetchProfile(userId: string): Promise<UserProfile | null> {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profileData) return null;
    return this._ensureAndFetchProfile(userId, profileData.email || '');
  }

  // Added missing registerAdmin for AdminLoginPage
  async registerAdmin(email: string, password: string, fullName: string): Promise<{ user: UserProfile | null; error: string | null }> {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role: 'admin' } } });
    if (error) return { user: null, error: error.message };
    if (data.user) {
        const profile = await this._ensureAndFetchProfile(data.user.id, email);
        if (profile) return { user: profile, error: null };
    }
    return { user: null, error: "Lỗi đăng ký admin." };
  }

  async activateLicense(userId: string, codeStr: string): Promise<{ success: boolean; message: string }> {
    try {
        const { data, error } = await supabase.rpc('activate_license', { p_code: codeStr });
        if (error) return { success: false, message: 'Lỗi kích hoạt: ' + error.message };
        const result = data as any;
        if (result && result.ok) return { success: true, message: `Kích hoạt thành công!` };
        return { success: false, message: result?.message || 'Có lỗi xảy ra.' };
    } catch (e: any) { return { success: false, message: e.message }; }
  }

  // Added missing adminActivateUser for AdminPage
  async adminActivateUser(userId: string, months: number): Promise<{ success: boolean; error?: string; expiresAt?: string }> {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);
    const { error } = await supabase.from('entitlements').insert({
      user_id: userId,
      scope: { [Mode.VISUAL]: true, [Mode.LISTENING]: true, [Mode.FLASH]: true },
      expires_at: expiresAt.toISOString(),
      starts_at: new Date().toISOString()
    });
    if (error) return { success: false, error: error.message };
    return { success: true, expiresAt: expiresAt.toISOString() };
  }

  async saveAttempt(userId: string, config: ExamConfig, questions: Question[], stats: any, answers: Record<number, string>): Promise<void> {
    const now = new Date().toISOString();
    const { data: attempt, error } = await supabase.from('attempts').insert({
        user_id: userId, mode: config.mode, level: config.level, settings: config, exam_data: { questions },
        started_at: new Date(Date.now() - stats.duration * 1000).toISOString(), finished_at: now,
        score_correct: stats.correct, score_wrong: stats.wrong, score_skipped: stats.skipped, score_total: stats.total, duration_seconds: stats.duration
    }).select().single();
    if (error || !attempt) throw new Error("Lỗi lưu kết quả bài luyện tập.");
    const answersData: DBAnswer[] = questions.map((q, idx) => ({
        attempt_id: attempt.id, question_no: idx + 1, user_answer: answers[idx] || null,
        is_correct: answers[idx] ? parseInt(answers[idx]) === q.correctAnswer : null, answered_at: now
    }));
    await supabase.from('answers').insert(answersData);
  }

  // Added missing getUserHistory for HistoryPage
  async getUserHistory(userId: string): Promise<AttemptResult[]> {
    const { data } = await supabase.from('attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data || []) as AttemptResult[];
  }

  // Added missing getAttemptAnswers for HistoryPage
  async getAttemptAnswers(attemptId: string): Promise<Record<number, string>> {
    const { data } = await supabase.from('answers').select('*').eq('attempt_id', attemptId);
    const result: Record<number, string> = {};
    (data || []).forEach((ans: DBAnswer) => {
      if (ans.user_answer !== null) {
        result[ans.question_no - 1] = ans.user_answer;
      }
    });
    return result;
  }

  async getAdminContests(): Promise<Contest[]> {
      const { data } = await supabase.from('contests').select('*').order('created_at', { ascending: false });
      return (data || []) as Contest[];
  }

  async upsertContest(contestData: Partial<Contest>): Promise<{ data: Contest | null, error: string | null }> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Unauthorized' };
      const { data, error } = await supabase.from('contests').upsert({ ...contestData, created_by: user.id }).select().single();
      return { data: data as Contest, error: error?.message || null };
  }

  async uploadContestExam(contestId: string, mode: Mode, questions: any[]): Promise<{ success: boolean, error?: string }> {
      const { error } = await supabase.from('contest_exams').upsert({ contest_id: contestId, mode: mode, questions }, { onConflict: 'contest_id, mode' });
      return { success: !error, error: error?.message };
  }

  async generateContestCodes(contestId: string, type: 'single_use' | 'shared', quantity: number): Promise<{ success: boolean }> {
     const codes = Array.from({ length: quantity }).map(() => ({
         contest_id: contestId, code: `C-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
         code_type: type, max_uses: type === 'single_use' ? 1 : 100, status: 'active'
     }));
     const { error } = await supabase.from('contest_access_codes').insert(codes);
     return { success: !error };
  }
  
  async getContestCodes(contestId: string): Promise<ContestAccessCode[]> {
      const { data } = await supabase.from('contest_access_codes').select('*').eq('contest_id', contestId);
      return (data || []) as ContestAccessCode[];
  }

  async getPublishedContests(): Promise<Contest[]> {
      const { data } = await supabase.from('contests').select('*').in('status', ['open', 'closed']).order('start_at', { ascending: true });
      return (data || []) as Contest[];
  }

  async registerForContest(contestId: string): Promise<{ ok: boolean, message: string }> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, message: 'Vui lòng đăng nhập.' };
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const { error } = await supabase.from('contest_registrations').insert({
          contest_id: contestId, user_id: user.id, full_name: profile?.full_name || 'Học viên', email: user.email, is_approved: false
      });
      if (error) return { ok: false, message: 'Bạn đã đăng ký cuộc thi này rồi.' };
      return { ok: true, message: 'Đăng ký thành công! Chờ Admin phê duyệt.' };
  }

  async getContestRegistrations(contestId: string): Promise<ContestRegistration[]> {
      const { data } = await supabase.from('contest_registrations').select('*').eq('contest_id', contestId).order('registered_at', { ascending: false });
      return (data || []) as ContestRegistration[];
  }

  async approveRegistration(reg: ContestRegistration): Promise<boolean> {
      const { error: updError } = await supabase.from('contest_registrations').update({ is_approved: true }).eq('id', reg.id);
      if (updError) return false;
      const { error: sessError } = await supabase.from('contest_sessions').insert({
          contest_id: reg.contest_id, user_id: reg.user_id, status: 'joined', joined_at: new Date().toISOString()
      });
      return !sessError;
  }

  async joinContest(code: string): Promise<{ ok: boolean, message?: string, session?: any }> {
      const { data, error } = await supabase.rpc('join_contest', { p_code: code });
      if (error) return { ok: false, message: error.message };
      return { ok: true, session: data };
  }

  async getMyContestSession(contestId: string): Promise<ContestSession | null> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('contest_sessions').select('*').eq('contest_id', contestId).eq('user_id', user.id).single();
      return data as ContestSession;
  }

  async getContestExam(contestId: string, mode: Mode): Promise<ContestExam | null> {
      const { data } = await supabase.from('contest_exams').select('*').eq('contest_id', contestId).eq('mode', mode).single();
      return data as ContestExam;
  }

  async getContestSectionAttempt(sessionId: string, mode: Mode): Promise<any> {
      const { data } = await supabase.from('contest_section_attempts').select('*').eq('session_id', sessionId).eq('mode', mode).single();
      return data;
  }

  async submitContestSection(sessionId: string, mode: Mode, questions: Question[], answers: Record<number, string>, durationSecs: number): Promise<boolean> {
      let correct = 0;
      questions.forEach((q, idx) => { if (parseInt(answers[idx]) === q.correctAnswer) correct++; });
      const { data: attempt, error } = await supabase.from('contest_section_attempts').insert({
          session_id: sessionId, mode: mode, score_correct: correct, score_total: questions.length, duration_seconds: durationSecs, finished_at: new Date().toISOString()
      }).select().single();
      if (error) return false;
      await supabase.rpc('update_contest_score', { p_session_id: sessionId, p_add_score: correct });
      return true;
  }

  async getLatestExamRule(mode: Mode): Promise<DBExamRule | null> {
    const { data } = await supabase.from('exam_rules').select('*').eq('mode', mode).order('created_at', { ascending: false }).limit(1).single();
    return data as DBExamRule;
  }

  // Added missing getExamRuleHistory for AdminPage
  async getExamRuleHistory(mode: Mode): Promise<DBExamRule[]> {
    const { data } = await supabase.from('exam_rules').select('*').eq('mode', mode).order('created_at', { ascending: false });
    return (data || []) as DBExamRule[];
  }

  // Added missing saveExamRule for AdminPage
  async saveExamRule(mode: Mode, rulesJson: any): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('exam_rules').insert({
      mode,
      rules_json: rulesJson,
      created_by: user?.id,
      version_name: `v${new Date().getTime()}`
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async getCustomExams(mode: Mode, level?: number, status?: string): Promise<CustomExam[]> {
      let query = supabase.from('custom_exams').select('*').eq('mode', mode);
      if (level !== undefined) query = query.eq('level', level);
      if (status && status !== 'all') query = query.eq('status', status);
      const { data } = await query;
      return (data || []) as CustomExam[];
  }

  // Added missing uploadCustomExam for AdminPage
  async uploadCustomExam(examData: Partial<CustomExam>): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('custom_exams').insert({
      ...examData,
      created_by: user?.id,
      status: 'active'
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // Added missing deleteCustomExam for AdminPage
  async deleteCustomExam(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase.from('custom_exams').delete().eq('id', id);
    return { success: !error };
  }

  async getCustomExamById(id: string): Promise<CustomExam | null> {
      const { data } = await supabase.from('custom_exams').select('*').eq('id', id).single();
      return data as CustomExam;
  }

  async getAllUsers(): Promise<UserProfile[]> {
      const { data } = await supabase.from('profiles').select('*');
      return (data || []) as UserProfile[];
  }

  async getAllAttempts(): Promise<AttemptResult[]> {
      const { data } = await supabase.from('attempts').select('*').order('created_at', { ascending: false }).limit(50);
      return (data || []) as AttemptResult[];
  }

  async getReportData(range: string): Promise<any> {
      return { new_users: 19, new_licenses: 11, active_students: 9, total_attempts: 32, top_students: [] };
  }
}

export const backend = new BackendService();
