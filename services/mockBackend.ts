
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

  createTeacherAccount: async (payload: { email: string; password: string; full_name: string; phone?: string }) => {
    // Bắt buộc làm mới phiên và chỉ dùng token từ refresh — tránh gửi token hết hạn (401 Invalid JWT).
    const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr) {
      return { success: false, message: `Phiên hết hạn hoặc lỗi: ${refreshErr.message}. Vui lòng đăng xuất rồi đăng nhập lại bằng tài khoản Admin.` };
    }
    const session = refreshData?.session;
    const accessToken = session?.access_token;
    if (!accessToken) {
      return {
        success: false,
        message: 'Không lấy được token sau khi làm mới phiên. Vui lòng đăng xuất rồi đăng nhập lại bằng tài khoản Admin.',
      };
    }

    // Call Edge Function via fetch so we always get response body (useful for 401 root-cause).
    const endpoint = `${SUPABASE_URL}/functions/v1/invite-teacher`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        full_name: payload.full_name,
        phone: payload.phone ?? null,
      }),
    });

    const text = await resp.text().catch(() => '');
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!resp.ok) {
      const detail = parsed ? JSON.stringify(parsed) : text;
      // 401: gateway trả {"code":401,"message":"Invalid JWT"} khi token hết hạn; function trả { error, details }
      if (resp.status === 401) {
        const isJwtError = (parsed?.message || parsed?.error || parsed?.details || '').toString().toLowerCase().includes('jwt');
        const shortDetail = parsed?.error || parsed?.message || parsed?.details || '';
        const serverHint = parsed?.hint;
        const hint = serverHint || (isJwtError
          ? ' Đăng xuất, đăng nhập lại bằng tài khoản Admin. Nếu vẫn lỗi: kiểm tra app dùng đúng Supabase project (cùng URL với Edge Function, đúng VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY).'
          : (shortDetail ? ` Chi tiết: ${shortDetail}.` : ' Đăng xuất rồi đăng nhập lại.'));
        return {
          success: false,
          message: `Lỗi xác thực (401).${shortDetail ? ` ${shortDetail}.` : ''} ${hint}`,
        };
      }
      return { success: false, message: `(${resp.status}) ${detail || resp.statusText}` };
    }

    const data = parsed;
    if (!data?.ok) return { success: false, message: data?.error || 'Tạo giáo viên thất bại' };
    return { success: true, user: data.user as { id: string; email?: string } };
  },

  sendPasswordResetEmail: async (email: string) => {
    // STRICT: Use window.location.origin for redirection base
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/resetpass`
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

  // --- Teacher management (Admin) ---
  getTeachers: async (): Promise<UserProfile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((p: any) => ({
      id: p.id,
      email: p.email || '',
      full_name: p.full_name || '',
      role: (p.role as any) || 'teacher',
      created_at: p.created_at || new Date().toISOString(),
      license_expiry: p.license_expiry || undefined,
      allowed_modes: [],
      student_code: p.student_code || undefined,
      phone: p.phone || undefined,
      level_symbol: p.level_symbol || undefined,
      class_name: p.class_name || undefined,
      center_id: p.center_id || undefined,
      center_name: p.center_name || undefined,
      avatar_url: p.avatar_url || undefined,
    }));
  },

  getClasses: async (): Promise<Array<{ id: string; name: string; center_id?: string | null }>> => {
    // Prefer extended columns; fall back if DB/schema cache doesn't have them yet.
    const full = await supabase
      .from('classes')
      .select('id, name, center_id, start_date, end_date')
      .order('name', { ascending: true });
    if (!full.error) return (full.data || []) as any;

    const msg = full.error.message || '';
    const missingCol =
      msg.includes("column classes.start_date does not exist") ||
      msg.includes("column classes.end_date does not exist") ||
      msg.includes("Could not find the 'start_date' column") ||
      msg.includes("Could not find the 'end_date' column");
    if (!missingCol) throw full.error;

    const basic = await supabase
      .from('classes')
      .select('id, name, center_id')
      .order('name', { ascending: true });
    if (basic.error) throw basic.error;
    return (basic.data || []) as any;
  },

  // --- Centers (Info management) ---
  getCenters: async (): Promise<Array<{ id: string; name: string; address?: string | null; hotline?: string | null; google_map_url?: string | null; facebook_url?: string | null }>> => {
    // Prefer full projection; if schema cache isn't updated (missing columns), fall back to base columns
    const full = await supabase
      .from('centers')
      .select('id, name, address, hotline, google_map_url, facebook_url')
      .order('name', { ascending: true });

    if (!full.error) return (full.data || []) as any;

    const msg = full.error.message || '';
    const missingCol =
      msg.includes("Could not find the 'hotline' column") ||
      msg.includes("Could not find the 'google_map_url' column") ||
      msg.includes("Could not find the 'facebook_url' column");

    if (!missingCol) throw full.error;

    const basic = await supabase
      .from('centers')
      .select('id, name, address')
      .order('name', { ascending: true });
    if (basic.error) throw basic.error;
    return (basic.data || []) as any;
  },

  adminCreateCenter: async (payload: { name: string; hotline?: string; google_map_url?: string; address?: string; facebook_url?: string }) => {
    // Insert and return the created row for immediate UI update.
    const inserted = await supabase
      .from('centers')
      .insert({
        name: payload.name,
        hotline: payload.hotline || null,
        google_map_url: payload.google_map_url || null,
        address: payload.address || null,
        facebook_url: payload.facebook_url || null,
      } as any)
      .select('id, name, address, hotline, google_map_url, facebook_url')
      .single();

    if (inserted.error) return { success: false, message: inserted.error.message };
    return { success: true, center: inserted.data as any };
  },

  adminUpdateCenter: async (centerId: string, payload: { name?: string; hotline?: string; google_map_url?: string; address?: string; facebook_url?: string }) => {
    const updatePayload: any = {};
    if (payload.name !== undefined) updatePayload.name = payload.name;
    if (payload.hotline !== undefined) updatePayload.hotline = payload.hotline || null;
    if (payload.google_map_url !== undefined) updatePayload.google_map_url = payload.google_map_url || null;
    if (payload.address !== undefined) updatePayload.address = payload.address || null;
    if (payload.facebook_url !== undefined) updatePayload.facebook_url = payload.facebook_url || null;

    const updated = await supabase
      .from('centers')
      .update(updatePayload)
      .eq('id', centerId)
      .select('id, name, address, hotline, google_map_url, facebook_url')
      .single();

    if (updated.error) return { success: false, message: updated.error.message };
    return { success: true, center: updated.data as any };
  },

  adminCreateClass: async (payload: {
    name: string;
    center_id?: string | null;
    start_date?: string | null; // YYYY-MM-DD
    end_date?: string | null;   // YYYY-MM-DD
    schedule: Array<{ day_of_week: number; start_time: string; end_time: string }>;
  }) => {
    const insertFull = await supabase
      .from('classes')
      .insert({
        name: payload.name,
        center_id: payload.center_id || null,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
      } as any)
      .select('id')
      .single();

    let created = insertFull.data as any;
    let error = insertFull.error as any;

    // If date columns not present yet, retry without them.
    if (error) {
      const msg = error.message || '';
      const missingCol =
        msg.includes("column classes.start_date does not exist") ||
        msg.includes("column classes.end_date does not exist") ||
        msg.includes("Could not find the 'start_date' column") ||
        msg.includes("Could not find the 'end_date' column");

      if (missingCol) {
        const insertBasic = await supabase
          .from('classes')
          .insert({
            name: payload.name,
            center_id: payload.center_id || null,
          } as any)
          .select('id')
          .single();
        created = insertBasic.data as any;
        error = insertBasic.error as any;
      }
    }

    if (error) return { success: false, message: error.message };
    const classId = (created as any)?.id as string | undefined;
    if (!classId) return { success: false, message: 'Không tạo được lớp (missing id)' };

    if (payload.schedule.length > 0) {
      const { error: schedErr } = await supabase.from('class_schedules').insert(
        payload.schedule.map((s) => ({
          class_id: classId,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        })),
      );
      if (schedErr) {
        const msg = schedErr.message || '';
        const missingTable =
          msg.includes("Could not find the table 'public.class_schedules'") ||
          msg.includes("relation \"public.class_schedules\" does not exist") ||
          msg.includes("relation \"class_schedules\" does not exist");
        if (!missingTable) return { success: false, message: schedErr.message };

        // If schedule table isn't available yet, still succeed creating the class.
        return {
          success: true,
          id: classId,
          warning:
            "Lớp đã được tạo nhưng chưa lưu được lịch học vì bảng `class_schedules` chưa tồn tại hoặc schema cache chưa reload. Hãy chạy SQL tạo bảng và reload schema cache.",
        };
      }
    }

    return { success: true, id: classId };
  },

  adminUpdateClass: async (classId: string, payload: {
    name: string;
    center_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    schedule: Array<{ day_of_week: number; start_time: string; end_time: string }>;
  }) => {
    // Update class (prefer with dates; fall back if columns missing)
    const updateFull = await supabase
      .from('classes')
      .update({
        name: payload.name,
        center_id: payload.center_id || null,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
      } as any)
      .eq('id', classId)
      .select('id')
      .single();

    let error = updateFull.error as any;
    if (error) {
      const msg = error.message || '';
      const missingCol =
        msg.includes("column classes.start_date does not exist") ||
        msg.includes("column classes.end_date does not exist") ||
        msg.includes("Could not find the 'start_date' column") ||
        msg.includes("Could not find the 'end_date' column");
      if (missingCol) {
        const updateBasic = await supabase
          .from('classes')
          .update({
            name: payload.name,
            center_id: payload.center_id || null,
          } as any)
          .eq('id', classId)
          .select('id')
          .single();
        error = updateBasic.error as any;
      }
    }
    if (error) return { success: false, message: error.message };

    // Replace schedules (best-effort)
    if (payload.schedule) {
      // If table missing, return warning but keep class update success
      const del = await supabase.from('class_schedules').delete().eq('class_id', classId);
      if (del.error) {
        const msg = del.error.message || '';
        const missingTable =
          msg.includes("Could not find the table 'public.class_schedules'") ||
          msg.includes("relation \"public.class_schedules\" does not exist") ||
          msg.includes("relation \"class_schedules\" does not exist");
        if (!missingTable) return { success: false, message: del.error.message };
        return {
          success: true,
          warning:
            "Đã cập nhật lớp nhưng chưa lưu được lịch học vì bảng `class_schedules` chưa tồn tại hoặc schema cache chưa reload.",
        };
      }

      if (payload.schedule.length > 0) {
        const ins = await supabase.from('class_schedules').insert(
          payload.schedule.map((s) => ({
            class_id: classId,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
          })),
        );
        if (ins.error) return { success: false, message: ins.error.message };
      }
    }

    return { success: true };
  },

  adminUpdateTeacherProfile: async (teacherId: string, payload: { full_name: string; phone?: string | null }) => {
    const updated = await supabase
      .from('profiles')
      .update({ full_name: payload.full_name, phone: payload.phone || null } as any)
      .eq('id', teacherId)
      .select('id')
      .single();
    if (updated.error) return { success: false, message: updated.error.message };
    return { success: true };
  },

  // --- Admin helper queries (for dashboard lists) ---
  getActiveClassStudentsRows: async (classIds: string[]): Promise<Array<{ class_id: string; student_id: string }>> => {
    if (!classIds.length) return [];
    const { data, error } = await supabase
      .from('class_students')
      .select('class_id, student_id, left_at')
      .in('class_id', classIds)
      .is('left_at', null);
    if (error) {
      const msg = error.message || '';
      const missingTable =
        msg.includes("Could not find the table 'public.class_students'") ||
        msg.includes("relation \"public.class_students\" does not exist") ||
        msg.includes("relation \"class_students\" does not exist");
      if (missingTable) return [];
      throw error;
    }
    return (data || []).map((r: any) => ({ class_id: r.class_id, student_id: r.student_id }));
  },

  getClassSchedulesByClassIds: async (classIds: string[]): Promise<Array<{ class_id: string; day_of_week: number; start_time: string; end_time: string }>> => {
    if (!classIds.length) return [];
    const { data, error } = await supabase
      .from('class_schedules')
      .select('class_id, day_of_week, start_time, end_time')
      .in('class_id', classIds);
    if (error) {
      const msg = error.message || '';
      const missingTable =
        msg.includes("Could not find the table 'public.class_schedules'") ||
        msg.includes("relation \"public.class_schedules\" does not exist") ||
        msg.includes("relation \"class_schedules\" does not exist");
      if (missingTable) return [];
      throw error;
    }
    return (data || []) as any;
  },

  getActiveTeacherClassLinksByClassIds: async (classIds: string[]): Promise<Array<{ class_id: string; teacher_id: string }>> => {
    if (!classIds.length) return [];
    const { data, error } = await supabase
      .from('teacher_classes')
      .select('class_id, teacher_id, unassigned_at')
      .in('class_id', classIds)
      .is('unassigned_at', null);
    if (error) throw error;
    return (data || []).map((r: any) => ({ class_id: r.class_id, teacher_id: r.teacher_id }));
  },

  getTeacherNamesByIds: async (teacherIds: string[]): Promise<Array<{ id: string; full_name: string; email?: string }>> => {
    if (!teacherIds.length) return [];
    // Prefer full_name + email; fall back to just full_name if email column doesn't exist.
    const full = await supabase.from('profiles').select('id, full_name, email').in('id', teacherIds);
    if (!full.error) return (full.data || []) as any;

    const msg = full.error.message || '';
    const missingEmail = msg.includes('column "email" does not exist') || msg.includes("Could not find the 'email' column");
    if (!missingEmail) throw full.error;

    const basic = await supabase.from('profiles').select('id, full_name').in('id', teacherIds);
    if (basic.error) throw basic.error;
    return (basic.data || []) as any;
  },

  getTeacherActiveClassIds: async (teacherId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('teacher_classes')
      .select('class_id, unassigned_at')
      .eq('teacher_id', teacherId)
      .is('unassigned_at', null);
    if (error) throw error;
    return (data || []).map((r: any) => r.class_id);
  },

  setTeacherClasses: async (teacherId: string, classIds: string[]) => {
    const now = new Date().toISOString();
    const current = await backend.getTeacherActiveClassIds(teacherId);
    const toAdd = classIds.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !classIds.includes(id));

    if (toAdd.length > 0) {
      const { error } = await supabase.from('teacher_classes').insert(
        toAdd.map((class_id) => ({
          class_id,
          teacher_id: teacherId,
          assigned_at: now,
        })),
      );
      if (error) return { success: false, message: error.message };
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('teacher_classes')
        .update({ unassigned_at: now })
        .eq('teacher_id', teacherId)
        .in('class_id', toRemove)
        .is('unassigned_at', null);
      if (error) return { success: false, message: error.message };
    }

    return { success: true };
  },

  // --- Class roster helpers ---
  getClassStudentIds: async (classId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('class_students')
      .select('student_id, left_at')
      .eq('class_id', classId)
      .is('left_at', null);
    if (error) throw error;
    return (data || []).map((r: any) => r.student_id);
  },

  getTeacherActiveClassIdsOnly: async (teacherId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('teacher_classes')
      .select('class_id, unassigned_at')
      .eq('teacher_id', teacherId)
      .is('unassigned_at', null);
    if (error) throw error;
    return (data || []).map((r: any) => r.class_id);
  },

  getTeacherStudentIds: async (teacherId: string): Promise<string[]> => {
    const classIds = await backend.getTeacherActiveClassIdsOnly(teacherId);
    if (classIds.length === 0) return [];
    const { data, error } = await supabase
      .from('class_students')
      .select('student_id, class_id, left_at')
      .in('class_id', classIds)
      .is('left_at', null);
    if (error) throw error;
    return Array.from(new Set((data || []).map((r: any) => r.student_id)));
  },

  getStudentsByFilter: async (filters: { classId?: string; teacherId?: string; search?: string }) => {
    const search = (filters.search || '').trim();

    let ids: string[] | null = null;
    if (filters.classId) ids = await backend.getClassStudentIds(filters.classId);
    if (filters.teacherId) ids = await backend.getTeacherStudentIds(filters.teacherId);

    let q = supabase.from('profiles').select('*').neq('role', 'admin');
    if (ids) {
      if (ids.length === 0) return [];
      q = q.in('id', ids);
    }
    if (search) {
      const s = `%${search}%`;
      q = q.or(`full_name.ilike.${s},student_code.ilike.${s},phone.ilike.${s}`);
    }

    const { data, error } = await q.order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return (data || []).map((p: any) => ({
      id: p.id,
      email: p.email || '',
      full_name: p.full_name || '',
      role: (p.role as any) || 'student',
      created_at: p.created_at || new Date().toISOString(),
      license_expiry: p.license_expiry || undefined,
      allowed_modes: [],
      student_code: p.student_code || undefined,
      phone: p.phone || undefined,
      level_symbol: p.level_symbol || undefined,
      class_name: p.class_name || undefined,
      center_id: p.center_id || undefined,
      center_name: p.center_name || undefined,
      avatar_url: p.avatar_url || undefined,
    })) as UserProfile[];
  },

  getStudentsProgressSummary: async (filters: {
    classId?: string;
    teacherId?: string;
    search?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const { data, error } = await supabase.rpc('rpc_get_students_progress_summary', {
      p_class_id: filters.classId || null,
      p_teacher_id: filters.teacherId || null,
      p_search: filters.search || null,
      p_from: filters.from || null,
      p_to: filters.to || null,
      p_limit: filters.limit ?? 50,
      p_offset: filters.offset ?? 0,
    });
    if (error) return { success: false, message: error.message, data: null as any };
    return { success: true, data: (data || []) as any[] };
  },

  /**
   * Batch cups counts for many users.
   * This mirrors the logic used in the Header Avatar (count rows in `user_collected_cups`).
   */
  getCupsCountsByUserIds: async (userIds: string[]): Promise<Record<string, number>> => {
    try {
      const ids = Array.from(new Set((userIds || []).filter(Boolean)));
      if (!ids.length) return {};

      const { data, error } = await supabase
        .from('user_collected_cups' as any)
        .select('user_id')
        .in('user_id', ids as any);

      if (error) {
        const msg = error.message || '';
        const missingTable =
          msg.includes("Could not find the table 'public.user_collected_cups'") ||
          msg.includes("relation \"public.user_collected_cups\" does not exist") ||
          msg.toLowerCase().includes('user_collected_cups') && msg.toLowerCase().includes('does not exist');
        if (missingTable) return {};
        console.warn('getCupsCountsByUserIds error:', error);
        return {};
      }

      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const id = String(r.user_id || '');
        if (!id) return;
        map[id] = (map[id] || 0) + 1;
      });
      return map;
    } catch (e) {
      return {};
    }
  },

  getAdminInfoStats: async () => {
    const { data, error } = await supabase.rpc('rpc_get_admin_info_stats');
    if (error) {
      console.warn("getAdminInfoStats failed:", error);
      // Return null to allow fallback in UI
      return null;
    }
    return data as any;
  },

  getStudentProgressSnapshot: async (studentId: string) => {
    // Attempts/Practice summary (merge multiple sources, so it matches dashboard summary)
    type AttemptLikeRow = {
      mode: string;
      score_correct: number;
      score_total: number;
      duration_seconds: number;
      created_at: string;
    };

    const isMissingTableError = (msg: string) => {
      const m = (msg || '').toLowerCase();
      return m.includes('does not exist') || m.includes('could not find the table');
    };

    const all: AttemptLikeRow[] = [];

    // 1) Legacy/main attempts
    const { data: attempts, error: attemptsErr } = await supabase
      .from('attempts')
      .select('mode, score_correct, score_total, duration_seconds, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (attemptsErr) throw attemptsErr;
    (attempts || []).forEach((r: any) => {
      all.push({
        mode: String(r.mode || 'unknown'),
        score_correct: Number(r.score_correct || 0),
        score_total: Number(r.score_total || 0),
        duration_seconds: Number(r.duration_seconds || 0),
        created_at: String(r.created_at || new Date().toISOString()),
      });
    });

    // 2) New practice module attempts (if table exists)
    try {
      const { data: pa, error: paErr } = await supabase
        .from('practice_attempts' as any)
        .select('mode, score_correct, score_total, duration_seconds, created_at')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (paErr) {
        if (!isMissingTableError(paErr.message || '')) console.warn('practice_attempts query error:', paErr);
      } else {
        (pa || []).forEach((r: any) => {
          all.push({
            mode: String(r.mode || 'unknown'),
            score_correct: Number(r.score_correct || 0),
            score_total: Number(r.score_total || 0),
            duration_seconds: Number(r.duration_seconds || 0),
            created_at: String(r.created_at || new Date().toISOString()),
          });
        });
      }
    } catch (e: any) {
      if (!isMissingTableError(e?.message || '')) console.warn('practice_attempts exception:', e);
    }

    // 3) Older practice history table (if exists)
    try {
      const { data: ph, error: phErr } = await supabase
        .from('practice_history' as any)
        .select('mode, correct_count, question_count, duration_seconds, created_at')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (phErr) {
        if (!isMissingTableError(phErr.message || '')) console.warn('practice_history query error:', phErr);
      } else {
        (ph || []).forEach((r: any) => {
          all.push({
            mode: String(r.mode || 'unknown'),
            score_correct: Number(r.correct_count || 0),
            score_total: Number(r.question_count || 0),
            duration_seconds: Number(r.duration_seconds || 0),
            created_at: String(r.created_at || new Date().toISOString()),
          });
        });
      }
    } catch (e: any) {
      if (!isMissingTableError(e?.message || '')) console.warn('practice_history exception:', e);
    }

    // 4) Contest section attempts (if exists)
    try {
      const { data: sessions, error: sErr } = await supabase
        .from('contest_sessions' as any)
        .select('id')
        .eq('user_id', studentId)
        .order('joined_at', { ascending: false })
        .limit(200);
      if (sErr) {
        if (!isMissingTableError(sErr.message || '')) console.warn('contest_sessions query error:', sErr);
      } else {
        const sessionIds = (sessions || []).map((r: any) => String(r.id)).filter(Boolean);
        if (sessionIds.length > 0) {
          const { data: csa, error: cErr } = await supabase
            .from('contest_section_attempts' as any)
            .select('mode, score_correct, score_total, duration_seconds, finished_at, created_at, session_id')
            .in('session_id', sessionIds as any)
            .order('finished_at', { ascending: false })
            .limit(500);
          if (cErr) {
            if (!isMissingTableError(cErr.message || '')) console.warn('contest_section_attempts query error:', cErr);
          } else {
            (csa || []).forEach((r: any) => {
              const ts = r.finished_at || r.created_at || new Date().toISOString();
              all.push({
                mode: String(r.mode || 'unknown'),
                score_correct: Number(r.score_correct || 0),
                score_total: Number(r.score_total || 0),
                duration_seconds: Number(r.duration_seconds || 0),
                created_at: String(ts),
              });
            });
          }
        }
      }
    } catch (e: any) {
      if (!isMissingTableError(e?.message || '')) console.warn('contest section exception:', e);
    }

    // Normalize & aggregate
    const sorted = all
      .filter(r => r && r.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const attemptCount = sorted.length;
    const totalCorrect = sorted.reduce((a, r) => a + (Number(r.score_correct) || 0), 0);
    const totalQuestions = sorted.reduce((a, r) => a + (Number(r.score_total) || 0), 0);
    const totalTime = sorted.reduce((a, r) => a + (Number(r.duration_seconds) || 0), 0);
    const lastAttemptAt = sorted[0]?.created_at as string | undefined;
    const normalizeModeKey = (m: unknown) => {
      const s = String(m || '').toLowerCase();
      if (!s) return 'unknown';
      if (s === 'nhin_tinh' || s === 'visual' || s === 'elite_visual') return 'nhin_tinh';
      if (s === 'nghe_tinh' || s === 'audio' || s === 'elite_audio') return 'nghe_tinh';
      if (s === 'flash' || s === 'elite_flash') return 'flash';
      if (s === 'hon_hop' || s === 'mixed') return 'hon_hop';
      return s;
    };

    const byMode = sorted.reduce((acc: any, r: any) => {
      const m = normalizeModeKey(r.mode);
      acc[m] = acc[m] || { attempts: 0, correct: 0, total: 0, time: 0 };
      acc[m].attempts += 1;
      acc[m].correct += r.score_correct || 0;
      acc[m].total += r.score_total || 0;
      acc[m].time += r.duration_seconds || 0;
      return acc;
    }, {});

    // Training track progress
    const { data: dayResults, error: dayErr } = await supabase
      .from('training_day_results')
      .select('is_completed, completed_at, day_id')
      .eq('user_id', studentId);
    if (dayErr) throw dayErr;
    const completedDays = (dayResults || []).filter((d: any) => d.is_completed).length;
    const lastCompletedAt = (dayResults || [])
      .filter((d: any) => d.completed_at)
      .sort((a: any, b: any) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
      ?.completed_at as string | undefined;

    // Learning path progress (current_level)
    const { data: enrollments, error: enrollErr } = await supabase
      .from('learning_path_enrollments')
      .select('path_id, current_level, updated_at, started_at')
      .eq('user_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(5);
    if (enrollErr) throw enrollErr;

    // Speed training sessions (recent)
    const { data: speedSessions, error: speedErr } = await supabase
      .from('speed_training_sessions')
      .select('mode, speed_target, score, duration_seconds, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (speedErr) throw speedErr;

    return {
      attempts: {
        count: attemptCount,
        accuracy_pct: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 1000) / 10 : 0,
        total_time_seconds: totalTime,
        last_attempt_at: lastAttemptAt,
        by_mode: byMode,
      },
      training_track: {
        completed_days: completedDays,
        last_completed_at: lastCompletedAt,
      },
      learning_paths: enrollments || [],
      speed_training: speedSessions || [],
    };
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

  getCustomExams: async (mode: Mode, level?: number, status: 'active' | 'all' = 'active') => {
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
    for (let i = 0; i < quantity; i++) {
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
    if (!user) return null;
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
      if (!ans) skipped++;
      else if (parseInt(ans) === q.correctAnswer) correct++;
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

    if (attempt) {
      const ansRows = Object.entries(answers).map(([k, v]) => ({
        section_attempt_id: attempt.id,
        question_no: parseInt(k),
        user_answer: v,
        is_correct: parseInt(v) === questions[parseInt(k)].correctAnswer
      }));
      if (ansRows.length > 0) await supabase.from('contest_section_answers').insert(ansRows);
    }
  },

  getReportData: async (range: 'day' | 'week' | 'month') => {
    type ReportRange = 'day' | 'week' | 'month';
    type ReportModeKey = 'nhin_tinh' | 'nghe_tinh' | 'flash' | 'hon_hop' | 'unknown';

    type AdminReportTopStudent = {
      user_id: string;
      full_name?: string;
      email?: string;
      student_code?: string;
      attempts_count: number;
      accuracy_pct: number; // 0-100
      total_time_seconds: number;
      last_attempt_at?: string;
    };

    type AdminReportData = {
      range: ReportRange;
      from: string;
      to: string;
      totals: {
        total_students: number;
        new_students: number;
        active_students: number;
        activated_students: number; // currently active entitlement
        new_activations: number;
        total_attempts: number;
        avg_accuracy_pct: number;
        total_time_seconds: number;
      };
      by_mode: Record<
        ReportModeKey,
        {
          attempts: number;
          active_students: number;
          accuracy_pct: number;
          total_time_seconds: number;
        }
      >;
      top_students: AdminReportTopStudent[];
      meta: {
        attempts_rows_used: number;
        attempts_rows_capped: boolean;
      };
    };

    const now = new Date();
    const toIso = now.toISOString();
    const fromDate = new Date(now);
    if (range === 'day') fromDate.setDate(fromDate.getDate() - 1);
    else if (range === 'week') fromDate.setDate(fromDate.getDate() - 7);
    else fromDate.setDate(fromDate.getDate() - 30);
    const fromIso = fromDate.toISOString();

    const modeKey = (m: unknown): ReportModeKey => {
      if (m === 'nhin_tinh' || m === 'nghe_tinh' || m === 'flash' || m === 'hon_hop') return m;
      return 'unknown';
    };

    const round1 = (n: number) => Math.round(n * 10) / 10;

    const baseByMode: AdminReportData['by_mode'] = {
      nhin_tinh: { attempts: 0, active_students: 0, accuracy_pct: 0, total_time_seconds: 0 },
      nghe_tinh: { attempts: 0, active_students: 0, accuracy_pct: 0, total_time_seconds: 0 },
      flash: { attempts: 0, active_students: 0, accuracy_pct: 0, total_time_seconds: 0 },
      hon_hop: { attempts: 0, active_students: 0, accuracy_pct: 0, total_time_seconds: 0 },
      unknown: { attempts: 0, active_students: 0, accuracy_pct: 0, total_time_seconds: 0 },
    };

    // --- Counts: students (exclude admins) ---
    const { count: totalStudentsCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'admin');

    const { count: newStudentsCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'admin')
      .gte('created_at', fromIso)
      .lt('created_at', toIso);

    // --- Entitlements ---
    const { data: activeEntRows } = await supabase
      .from('entitlements')
      .select('user_id, expires_at')
      .gt('expires_at', toIso);

    const activatedUserIds = new Set<string>();
    (activeEntRows || []).forEach(r => {
      if (r?.user_id) activatedUserIds.add(r.user_id);
    });

    const { data: newEntRows } = await supabase
      .from('entitlements')
      .select('user_id, created_at')
      .gte('created_at', fromIso)
      .lt('created_at', toIso);

    const newActivationUserIds = new Set<string>();
    (newEntRows || []).forEach(r => {
      if (r?.user_id) newActivationUserIds.add(r.user_id);
    });

    // --- Attempts (paged for aggregation) ---
    const MAX_ATTEMPT_ROWS = 5000;
    const PAGE_SIZE = 1000;
    const attemptsRows: Array<{
      user_id: string;
      mode: string;
      score_correct: number;
      score_total: number;
      duration_seconds: number;
      created_at: string;
    }> = [];

    for (let offset = 0; offset < MAX_ATTEMPT_ROWS; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('attempts')
        .select('user_id, mode, score_correct, score_total, duration_seconds, created_at')
        .gte('created_at', fromIso)
        .lt('created_at', toIso)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.warn('getReportData attempts query error:', error.message);
        break;
      }

      if (data && data.length > 0) attemptsRows.push(...(data as any));
      if (!data || data.length < PAGE_SIZE) break;
    }

    const attemptsRowsCapped = attemptsRows.length >= MAX_ATTEMPT_ROWS;

    // Aggregations
    const activeUsersAll = new Set<string>();
    const activeUsersByMode: Record<ReportModeKey, Set<string>> = {
      nhin_tinh: new Set(),
      nghe_tinh: new Set(),
      flash: new Set(),
      hon_hop: new Set(),
      unknown: new Set(),
    };

    let sumCorrect = 0;
    let sumTotal = 0;
    let sumDuration = 0;

    const byModeCorrect: Record<ReportModeKey, number> = {
      nhin_tinh: 0,
      nghe_tinh: 0,
      flash: 0,
      hon_hop: 0,
      unknown: 0,
    };
    const byModeTotal: Record<ReportModeKey, number> = {
      nhin_tinh: 0,
      nghe_tinh: 0,
      flash: 0,
      hon_hop: 0,
      unknown: 0,
    };

    const perUser = new Map<
      string,
      { attempts: number; correct: number; total: number; duration: number; last?: string }
    >();

    attemptsRows.forEach(a => {
      if (!a?.user_id) return;
      const m = modeKey(a.mode);
      activeUsersAll.add(a.user_id);
      activeUsersByMode[m].add(a.user_id);

      baseByMode[m].attempts += 1;
      baseByMode[m].total_time_seconds += a.duration_seconds || 0;

      const c = Number(a.score_correct || 0);
      const t = Number(a.score_total || 0);
      const d = Number(a.duration_seconds || 0);

      sumCorrect += c;
      sumTotal += t;
      sumDuration += d;

      byModeCorrect[m] += c;
      byModeTotal[m] += t;

      const prev = perUser.get(a.user_id) ?? { attempts: 0, correct: 0, total: 0, duration: 0, last: undefined };
      prev.attempts += 1;
      prev.correct += c;
      prev.total += t;
      prev.duration += d;
      if (!prev.last || new Date(a.created_at) > new Date(prev.last)) prev.last = a.created_at;
      perUser.set(a.user_id, prev);
    });

    (Object.keys(baseByMode) as ReportModeKey[]).forEach(m => {
      baseByMode[m].active_students = activeUsersByMode[m].size;
      const t = byModeTotal[m];
      const c = byModeCorrect[m];
      baseByMode[m].accuracy_pct = t > 0 ? round1((c / t) * 100) : 0;
    });

    const avgAccuracyPct = sumTotal > 0 ? round1((sumCorrect / sumTotal) * 100) : 0;

    // Top students in period
    const topUserAgg = Array.from(perUser.entries())
      .map(([user_id, s]) => {
        const acc = s.total > 0 ? (s.correct / s.total) * 100 : 0;
        return {
          user_id,
          attempts_count: s.attempts,
          accuracy_pct: round1(acc),
          total_time_seconds: s.duration,
          last_attempt_at: s.last,
        };
      })
      .sort((a, b) => b.attempts_count - a.attempts_count || b.accuracy_pct - a.accuracy_pct)
      .slice(0, 10);

    let topStudents: AdminReportTopStudent[] = topUserAgg;
    if (topUserAgg.length > 0) {
      const ids = topUserAgg.map(x => x.user_id);
      const { data: profiles } = await supabase
        .from('user_profile_aggregated')
        .select('id, full_name, email, student_code')
        .in('id', ids as any);

      const profileById = new Map<string, any>();
      (profiles || []).forEach(p => {
        if (p?.id) profileById.set(p.id, p);
      });

      topStudents = topUserAgg.map(s => {
        const p = profileById.get(s.user_id);
        return {
          ...s,
          full_name: p?.full_name ?? undefined,
          email: p?.email ?? undefined,
          student_code: p?.student_code ?? undefined,
        };
      });
    }

    const result: AdminReportData = {
      range,
      from: fromIso,
      to: toIso,
      totals: {
        total_students: totalStudentsCount || 0,
        new_students: newStudentsCount || 0,
        active_students: activeUsersAll.size,
        activated_students: activatedUserIds.size,
        new_activations: newActivationUserIds.size,
        total_attempts: attemptsRows.length,
        avg_accuracy_pct: avgAccuracyPct,
        total_time_seconds: sumDuration,
      },
      by_mode: baseByMode,
      top_students: topStudents,
      meta: {
        attempts_rows_used: attemptsRows.length,
        attempts_rows_capped: attemptsRowsCapped,
      },
    };

    return result;
  }
};
