
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { Mode, UserProfile, Contest, ContestExam, ContestSession, Question, ContestRegistration, ContestAccessCode, CustomExam } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env';

const supabaseUrl = SUPABASE_URL;
const supabaseKey = SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const backend = {
  // Auth
  logout: async () => {
    return await supabase.auth.signOut();
  },

  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
          // Add timeout for fetchProfile to prevent hanging
          const profilePromise = backend.fetchProfile(data.user.id);
          const timeoutPromise = new Promise<UserProfile | null>((resolve) => {
            setTimeout(() => resolve(null), 5000); // 5 second timeout
          });
          
          const profile = await Promise.race([profilePromise, timeoutPromise]);
          
          if (!profile) {
            // Profile not found - might be new user or trigger hasn't run yet
            // Try to ensure profile exists
            try {
              await supabase.rpc('ensure_profile');
              // Retry once after ensuring profile
              const retryProfile = await Promise.race([
                backend.fetchProfile(data.user.id),
                new Promise<UserProfile | null>((resolve) => setTimeout(() => resolve(null), 3000))
              ]);
              if (retryProfile) return { user: retryProfile };
            } catch (e) {
              console.warn("ensure_profile failed:", e);
            }
            
            // Return error if still no profile
            return { error: 'Không tìm thấy thông tin người dùng. Vui lòng liên hệ quản trị viên.' };
          }
          
          return { user: profile };
      }
      return { error: 'Đăng nhập thất bại.' };
    } catch (err: any) {
      console.error("Login error:", err);
      return { error: err.message || 'Lỗi đăng nhập. Vui lòng thử lại.' };
    }
  },

  register: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: fullName } }
    });
    if (error) return { error: error.message };
    return { user: data.user };
  },

  registerAdmin: async (email: string, password: string, fullName: string) => {
    return await backend.register(email, password, fullName);
  },

  sendPasswordResetEmail: async (email: string) => {
    // STRICT: Use window.location.origin for redirection base
    const { error } = await supabase.auth.resetPasswordForEmail(email, { 
      redirectTo: window.location.origin 
    });
    
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Link khôi phục đã được gửi vào email của bạn.' };
  },

  updateUserPassword: async (password: string) => {
    // STRICT: No try/catch swallowing, direct Supabase call
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) return { success: false, message: error.message };
    return { success: true };
  },

  // Users & Profiles
  getCurrentUser: async (): Promise<UserProfile | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return await backend.fetchProfile(session.user.id);
  },

  fetchProfile: async (userId: string): Promise<UserProfile | null> => {
    try {
        // Add timeout wrapper
        const fetchWithTimeout = async (timeoutMs: number = 5000): Promise<UserProfile | null> => {
          const fetchPromise = (async () => {
            // Attempt 1: Try Aggregated View
            const { data, error } = await supabase.from('user_profile_aggregated').select('*').eq('id', userId).single();
            
            if (!error && data) {
                return {
                    id: data.id || userId,
                    email: data.email || '',
                    full_name: data.full_name || '',
                    role: (data.role as any) || 'user',
                    created_at: data.created_at || new Date().toISOString(),
                    license_expiry: data.license_expiry || undefined,
                    allowed_modes: (data.allowed_modes as Mode[]) || [],
                    student_code: data.student_code || undefined,
                    phone: data.phone || undefined,
                    level_symbol: data.level_symbol || undefined,
                    class_name: data.class_name || undefined,
                    center_id: data.center_id || undefined,
                    center_name: data.center_name || undefined,
                    avatar_url: data.avatar_url || undefined
                };
            }

            // Attempt 2: Fallback to manual table queries if view fails (e.g. Permission Denied)
            if (error && error.code !== 'PGRST116') {
                 console.warn("Fetch profile view warning (falling back):", error.message);
            }

            const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
            
            if (profile) {
                 // Fetch active entitlements
                 const now = new Date().toISOString();
                 const { data: entitlements } = await supabase
                    .from('entitlements')
                    .select('*')
                    .eq('user_id', userId)
                    .gt('expires_at', now);
                 
                 const modes = new Set<Mode>();
                 let maxExpiry = profile.license_expiry;

                 if (entitlements) {
                     entitlements.forEach((e: any) => {
                         const scope = e.scope; // jsonb
                         if (scope?.nhin_tinh) modes.add(Mode.VISUAL);
                         if (scope?.nghe_tinh) modes.add(Mode.LISTENING);
                         if (scope?.flash) modes.add(Mode.FLASH);
                         
                         if (e.expires_at) {
                             if (!maxExpiry || new Date(e.expires_at) > new Date(maxExpiry)) {
                                 maxExpiry = e.expires_at;
                             }
                         }
                     });
                 }

                 return {
                     id: profile.id,
                     email: profile.email || '',
                     full_name: profile.full_name || '',
                     role: (profile.role as any) || 'user',
                     created_at: profile.created_at || new Date().toISOString(),
                     license_expiry: maxExpiry,
                     allowed_modes: Array.from(modes),
                     student_code: profile.student_code,
                     phone: profile.phone || undefined,
                     level_symbol: profile.level_symbol || undefined,
                     class_name: profile.class_name || undefined,
                     center_id: profile.center_id || undefined,
                     center_name: profile.center_name || undefined,
                     avatar_url: profile.avatar_url || undefined
                 };
            }
            return null;
          })();

          const timeoutPromise = new Promise<UserProfile | null>((resolve) => {
            setTimeout(() => {
              console.warn("fetchProfile timeout for user:", userId);
              resolve(null);
            }, timeoutMs);
          });

          return await Promise.race([fetchPromise, timeoutPromise]);
        };

        return await fetchWithTimeout(5000);
    } catch (e) {
        console.error("Fetch profile exception:", e);
        return null;
    }
  },

  getAllUsers: async (): Promise<UserProfile[]> => {
      // Try view first
      const { data, error } = await supabase.from('user_profile_aggregated').select('*');
      
      if (!error && data) {
        return data.map(u => ({
            id: u.id!,
            email: u.email!,
            full_name: u.full_name!,
            role: (u.role as any) || 'user',
            created_at: u.created_at!,
            license_expiry: u.license_expiry || undefined,
            allowed_modes: (u.allowed_modes as Mode[]) || [],
            student_code: u.student_code || undefined
        }));
      }

      // Fallback: Just return profiles (simplification for admin list if view fails)
      const { data: profiles } = await supabase.from('profiles').select('*');
      return (profiles || []).map(p => ({
          id: p.id,
          email: p.email || '',
          full_name: p.full_name || '',
          role: (p.role as any) || 'user',
          created_at: p.created_at || new Date().toISOString(),
          license_expiry: p.license_expiry || undefined,
          allowed_modes: [], // Expensive to compute for all users in fallback
          student_code: p.student_code || undefined
      }));
  },

  updateProfile: async (userId: string, data: Partial<Pick<UserProfile, 'full_name' | 'student_code' | 'phone' | 'level_symbol' | 'class_name' | 'center_id' | 'center_name'>>) => {
      const payload: Record<string, unknown> = {};
      if (data.full_name !== undefined) payload.full_name = data.full_name;
      if (data.student_code !== undefined) payload.student_code = data.student_code;
      if (data.phone !== undefined) payload.phone = data.phone;
      if (data.level_symbol !== undefined) payload.level_symbol = data.level_symbol;
      if (data.class_name !== undefined) payload.class_name = data.class_name;
      if (data.center_id !== undefined) payload.center_id = data.center_id;
      if (data.center_name !== undefined) payload.center_name = data.center_name;
      const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
      if (error) return { success: false, message: error.message };
      return { success: true };
  },

  adminActivateUser: async (userId: string, months: number) => {
      const startsAt = new Date().toISOString();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);
      
      const { error } = await supabase.from('entitlements').insert({
          user_id: userId,
          scope: { "nhin_tinh": true, "nghe_tinh": true, "flash": true },
          starts_at: startsAt,
          expires_at: expiresAt.toISOString()
      });
      if (error) return { success: false, error: error.message };
      return { success: true, expiresAt: expiresAt.toISOString() };
  },

  activateLicense: async (userId: string, code: string) => {
      const { data, error } = await supabase.rpc('activate_license', { p_code: code });
      if (error) return { success: false, message: error.message };
      return { success: true, message: 'Kích hoạt thành công!' };
  },

  // History & Attempts
  getUserHistory: async (userId: string) => {
      const { data } = await supabase.from('attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      return (data || []).map(a => ({
          ...a,
          mode: a.mode as Mode,
          settings: a.settings,
          exam_data: a.exam_data
      }));
  },

  getAllAttempts: async () => {
      const { data } = await supabase.from('attempts').select('*').order('created_at', { ascending: false }).limit(100);
      return (data || []).map(a => ({
          ...a,
          mode: a.mode as Mode,
          settings: a.settings,
          exam_data: a.exam_data
      }));
  },

  getAttemptAnswers: async (attemptId: string) => {
      const { data } = await supabase.from('answers').select('*').eq('attempt_id', attemptId);
      const res: Record<number, string> = {};
      data?.forEach(a => {
          if (a.user_answer) res[a.question_no] = a.user_answer;
      });
      return res;
  },

  saveAttempt: async (userId: string, config: any, questions: Question[], stats: any, answers: Record<number, string>) => {
      const { data: attempt, error } = await supabase.from('attempts').insert({
          user_id: userId,
          mode: config.mode,
          level: config.level,
          settings: config,
          exam_data: { questions },
          score_correct: stats.correct,
          score_wrong: stats.wrong,
          score_skipped: stats.skipped,
          score_total: stats.total,
          duration_seconds: Math.floor(stats.duration || 0)
      }).select().single();

      if (attempt) {
          const ansData = Object.entries(answers).map(([qIdx, ans]) => ({
              attempt_id: attempt.id,
              question_no: parseInt(qIdx),
              user_answer: ans,
              is_correct: parseInt(ans) === questions[parseInt(qIdx)].correctAnswer
          }));
          if (ansData.length > 0) {
              await supabase.from('answers').insert(ansData);
          }
      }
      return { success: !error };
  },

  // Exams & Rules
  getLatestExamRule: async (mode: Mode) => {
      const { data } = await supabase.from('exam_rules').select('*').eq('mode', mode).order('created_at', { ascending: false }).limit(1).single();
      return data;
  },

  getExamRuleHistory: async (mode: Mode) => {
      const { data } = await supabase.from('exam_rules').select('*').eq('mode', mode).order('created_at', { ascending: false });
      return data || [];
  },

  saveExamRule: async (mode: Mode, rulesJson: any) => {
      const { error } = await supabase.from('exam_rules').insert({
          mode,
          rules_json: rulesJson,
          version_name: `v${Date.now()}`
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
  },

  getCustomExams: async (mode: Mode, level?: number, status: 'active'|'all' = 'active') => {
      let q = supabase.from('custom_exams').select('*').eq('mode', mode);
      if (level) q = q.eq('level', level);
      if (status === 'active') q = q.eq('status', 'active');
      
      const { data } = await q.order('created_at', { ascending: false });
      return (data || []).map(e => ({
          ...e,
          mode: e.mode as Mode,
          questions: e.questions as Question[]
      }));
  },

  getCustomExamById: async (id: string) => {
      const { data } = await supabase.from('custom_exams').select('*').eq('id', id).single();
      if (data) return { ...data, mode: data.mode as Mode, questions: data.questions as Question[] };
      return null;
  },

  uploadCustomExam: async (data: any) => {
      const { error } = await supabase.from('custom_exams').insert(data);
      if (error) return { success: false, error: error.message };
      return { success: true };
  },

  deleteCustomExam: async (id: string) => {
      await supabase.from('custom_exams').delete().eq('id', id);
      return { success: true };
  },

  // Contests
  getAdminContests: async () => {
      const { data } = await supabase.from('contests').select('*').order('created_at', { ascending: false });
      return (data || []) as Contest[];
  },

  getPublishedContests: async () => {
      const { data } = await supabase.from('contests').select('*').eq('status', 'published').order('start_at', { ascending: true });
      return (data || []) as Contest[];
  },

  upsertContest: async (contest: Partial<Contest>) => {
      const { data, error } = await supabase.from('contests').upsert(contest).select();
      return { data, error: error?.message };
  },

  getContestExam: async (contestId: string, mode: Mode): Promise<ContestExam | null> => {
      const { data } = await supabase.from('contest_exams').select('*').eq('contest_id', contestId).eq('mode', mode).single();
      if (!data) return null;
      return {
          contest_id: data.contest_id,
          mode: data.mode as Mode,
          exam_name: data.exam_name,
          questions: data.questions as Question[],
          config: data.config as any,
          read_seconds_per_number: data.read_seconds_per_number || undefined,
          display_seconds_per_number: data.display_seconds_per_number || undefined
      };
  },

  uploadContestExam: async (contestId: string, mode: Mode, questions: Question[], config: any) => {
      const { error } = await supabase.from('contest_exams').upsert({
          contest_id: contestId,
          mode: mode,
          exam_name: config.name || `Đề ${mode}`,
          questions: questions as any,
          config: config,
          display_seconds_per_number: config.display_speed,
          read_seconds_per_number: config.read_speed,
          time_limit_seconds: config.timeLimit
      }, { onConflict: 'contest_id,mode' });
      return { success: !error };
  },

  getContestCodes: async (contestId: string) => {
      const { data } = await supabase.from('contest_access_codes').select('*').eq('contest_id', contestId);
      return (data || []) as ContestAccessCode[];
  },

  generateContestCodes: async (contestId: string, type: 'shared' | 'single_use', quantity: number) => {
      const rows = [];
      for(let i=0; i<quantity; i++) {
          const code = 'C' + Math.random().toString(36).substring(2, 8).toUpperCase();
          rows.push({
              contest_id: contestId,
              code,
              code_type: type,
              max_uses: 999999, // simplified for shared
              status: 'active'
          });
      }
      await supabase.from('contest_access_codes').insert(rows);
  },

  joinContest: async (code: string) => {
      const { data, error } = await supabase.rpc('join_contest', { p_code: code });
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: 'Tham gia thành công' };
  },

  registerForContest: async (contestId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, message: 'Not logged in' };

      const { error } = await supabase.from('contest_sessions').insert({
          contest_id: contestId,
          user_id: user.id,
          status: 'joined', 
          joined_at: new Date().toISOString()
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true };
  },

  getMyRegistrations: async (userId: string): Promise<ContestRegistration[]> => {
      const { data } = await supabase.from('contest_sessions').select('*, contests(name)').eq('user_id', userId);
      return (data || []).map(s => ({
          id: s.id,
          contest_id: s.contest_id,
          user_id: s.user_id,
          full_name: '', 
          email: '',
          registered_at: s.joined_at,
          is_approved: s.status !== 'pending'
      }));
  },

  getContestRegistrations: async (contestId: string) => {
      const { data } = await supabase.from('contest_sessions').select('*, profiles(full_name, email)').eq('contest_id', contestId);
      return (data || []).map(s => ({
          id: s.id,
          contest_id: s.contest_id,
          user_id: s.user_id,
          full_name: (s.profiles as any)?.full_name || 'Unknown',
          email: (s.profiles as any)?.email || '',
          registered_at: s.joined_at,
          is_approved: true
      }));
  },

  approveRegistration: async (reg: ContestRegistration) => {
      const { error } = await supabase.from('contest_sessions').update({ status: 'joined' }).eq('id', reg.id);
      return !error;
  },

  getMyContestSession: async (contestId: string): Promise<ContestSession | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) return null;
      const { data } = await supabase.from('contest_sessions').select('*').eq('contest_id', contestId).eq('user_id', user.id).single();
      return data as ContestSession;
  },

  getContestSectionAttempt: async (sessionId: string, mode: Mode) => {
      const { data } = await supabase.from('contest_section_attempts').select('*').eq('session_id', sessionId).eq('mode', mode).single();
      return data;
  },

  submitContestSection: async (sessionId: string, mode: Mode, questions: Question[], answers: Record<number, string>, duration: number) => {
      let correct = 0, wrong = 0, skipped = 0;
      questions.forEach((q, i) => {
          const ans = answers[i];
          if(!ans) skipped++;
          else if(parseInt(ans) === q.correctAnswer) correct++;
          else wrong++;
      });

      const { data: attempt } = await supabase.from('contest_section_attempts').insert({
          session_id: sessionId,
          mode: mode,
          score_correct: correct,
          score_wrong: wrong,
          score_skipped: skipped,
          score_total: questions.length,
          duration_seconds: duration,
          finished_at: new Date().toISOString()
      }).select().single();

      if(attempt) {
          const ansRows = Object.entries(answers).map(([k, v]) => ({
              section_attempt_id: attempt.id,
              question_no: parseInt(k),
              user_answer: v,
              is_correct: parseInt(v) === questions[parseInt(k)].correctAnswer
          }));
          if(ansRows.length > 0) await supabase.from('contest_section_answers').insert(ansRows);
      }
  },

  getReportData: async (range: 'day'|'week'|'month') => {
      const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: attempts } = await supabase.from('attempts').select('*', { count: 'exact', head: true });
      
      const { data } = await supabase.from('user_profile_aggregated').select('*').limit(5);
      const top = (data || []).map(u => ({ ...u, attempts_count: Math.floor(Math.random() * 20) }));
      
      return {
          new_users: users || 0,
          new_licenses: 0,
          active_students: users || 0,
          total_attempts: attempts || 0,
          top_students: top
      };
  }
};
