import { supabase } from './mockBackend';

type ModeKey = 'visual' | 'audio' | 'flash';

export type TrackExercise = {
  /** training_day_exercises.id */
  id: string;
  /** training_track_days.id */
  day_id: string;
  level_symbol: string;
  day_no: number;
  order_no: number;
  mode: ModeKey;
  question_count: number;
  difficulty: string;
  digits: number;
  rows: number;
  speed_seconds: number;
  source: 'generated' | 'json_upload';
  questions?: Array<{ id: string; operands: number[]; correctAnswer: number }>;
  created_at: string;
};

export type TrackSnapshot = {
  track_id: string;
  level_symbol: string;
  total_days: number;
  dayIdByNo: Record<number, string>;
  exercises: TrackExercise[];
};

function asModeKey(m: unknown): ModeKey {
  return m === 'audio' || m === 'flash' ? m : 'visual';
}

function clampInt(n: unknown, min: number, max: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.floor(x)));
}

function clampSpeedSeconds(n: unknown) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 1.2;
  return Math.max(0.1, Math.min(1.5, x));
}

async function getLatestPublishedTrack(levelSymbol: string) {
  const { data, error } = await supabase
    .from('training_tracks' as any)
    .select('*')
    .eq('level_symbol', levelSymbol)
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as any | null;
}

async function ensureTrackDays(trackId: string, totalDays: number) {
  const { data, error } = await supabase
    .from('training_track_days' as any)
    .select('id, day_no')
    .eq('track_id', trackId)
    .order('day_no', { ascending: true });

  if (error) throw new Error(error.message);

  const existing = new Set<number>((data || []).map((r: any) => Number(r.day_no)));
  const missing: Array<{ track_id: string; day_no: number }> = [];
  for (let d = 1; d <= totalDays; d++) {
    if (!existing.has(d)) missing.push({ track_id: trackId, day_no: d });
  }

  if (missing.length > 0) {
    const { error: insErr } = await supabase.from('training_track_days' as any).insert(missing);
    if (insErr) throw new Error(insErr.message);
  }

  // Re-fetch full mapping
  const { data: days2, error: err2 } = await supabase
    .from('training_track_days' as any)
    .select('id, day_no')
    .eq('track_id', trackId)
    .order('day_no', { ascending: true });

  if (err2) throw new Error(err2.message);
  const dayIdByNo: Record<number, string> = {};
  (days2 || []).forEach((r: any) => {
    const no = Number(r.day_no);
    if (Number.isFinite(no)) dayIdByNo[no] = String(r.id);
  });
  return dayIdByNo;
}

async function fetchExercisesForDayIds(dayIds: string[], levelSymbol: string, dayNoById: Record<string, number>) {
  if (dayIds.length === 0) return [];
  const { data, error } = await supabase
    .from('training_day_exercises' as any)
    .select('*')
    .in('day_id', dayIds as any)
    .order('day_id', { ascending: true })
    .order('order_no', { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((r: any) => {
    const payload = r.exercise_payload || {};
    const qs = Array.isArray(payload?.questions) ? payload.questions : undefined;
    const dayId = String(r.day_id);
    return {
      id: String(r.id),
      day_id: dayId,
      level_symbol: levelSymbol,
      day_no: dayNoById[dayId] ?? 0,
      order_no: Number(r.order_no ?? 0),
      mode: asModeKey(r.mode),
      question_count: clampInt(r.question_count ?? 20, 1, 200),
      difficulty: String(r.difficulty ?? 'basic'),
      digits: clampInt(r.digits ?? 2, 1, 10),
      rows: clampInt(r.rows ?? 5, 1, 100),
      speed_seconds: clampSpeedSeconds(r.speed_seconds ?? 1.2),
      source: (r.source === 'json_upload' ? 'json_upload' : 'generated') as 'generated' | 'json_upload',
      questions: qs,
      created_at: String(r.created_at ?? new Date().toISOString()),
    } satisfies TrackExercise;
  });
}

export const trainingTrackService = {
  /**
   * Get or create a published track for a level, ensure all days exist,
   * then return full exercises snapshot.
   */
  async getPublishedTrackSnapshot(levelSymbol: string, totalDays: number = 96): Promise<TrackSnapshot | null> {
    const track = await getLatestPublishedTrack(levelSymbol);
    if (!track) return null;

    const dayIdByNo = await ensureTrackDays(track.id, totalDays);
    const dayIds = Object.values(dayIdByNo);
    const dayNoById: Record<string, number> = {};
    Object.entries(dayIdByNo).forEach(([no, id]) => {
      dayNoById[id] = Number(no);
    });
    const exercises = await fetchExercisesForDayIds(dayIds, levelSymbol, dayNoById);

    return {
      track_id: String(track.id),
      level_symbol: String(track.level_symbol),
      total_days: clampInt(track.total_days ?? totalDays, 1, 365),
      dayIdByNo,
      exercises,
    };
  },

  /**
   * Admin: ensure a published track exists, and ensure day rows.
   * Returns the track_id.
   */
  async ensurePublishedTrack(levelSymbol: string, totalDays: number = 96): Promise<{ track_id: string; dayIdByNo: Record<number, string> }> {
    let track = await getLatestPublishedTrack(levelSymbol);

    if (!track) {
      const { data: userData, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw new Error(uErr.message);
      if (!userData.user) throw new Error('Phiên đăng nhập hết hạn.');

      const payload = {
        title: `Lộ trình luyện tập ${levelSymbol}`,
        description: null,
        level_symbol: levelSymbol,
        total_days: totalDays,
        is_published: true,
        created_by: userData.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabase
        .from('training_tracks' as any)
        .insert(payload)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      track = inserted;
    } else {
      // Keep track updated to reflect edits
      await supabase
        .from('training_tracks' as any)
        .update({ updated_at: new Date().toISOString(), is_published: true })
        .eq('id', track.id);
    }

    const dayIdByNo = await ensureTrackDays(String(track.id), totalDays);
    return { track_id: String(track.id), dayIdByNo };
  },

  async adminUpsertExercise(input: {
    level_symbol: string;
    day_no: number;
    mode: ModeKey;
    question_count: number;
    difficulty: string;
    digits: number;
    rows: number;
    speed_seconds: number;
    source: 'generated' | 'json_upload';
    questions?: Array<{ id: string; operands: number[]; correctAnswer: number }>;
    /** existing training_day_exercises.id if editing */
    id?: string | null;
    /** optional: override order number (editing keeps current) */
    order_no?: number | null;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const totalDays = 96;
      const { dayIdByNo } = await trainingTrackService.ensurePublishedTrack(input.level_symbol, totalDays);
      const dayNo = clampInt(input.day_no, 1, totalDays);
      const dayId = dayIdByNo[dayNo];
      if (!dayId) return { success: false, error: 'Không tìm thấy day_id cho ngày này.' };

      const payloadQuestions = input.source === 'json_upload' && input.questions?.length ? { questions: input.questions } : null;

      let orderNo = input.order_no ?? null;
      if (!input.id) {
        // New exercise: assign next order_no within the day.
        const { data: maxRow, error: maxErr } = await supabase
          .from('training_day_exercises' as any)
          .select('order_no')
          .eq('day_id', dayId)
          .order('order_no', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (maxErr) throw new Error(maxErr.message);
        const maxOrder = maxRow?.order_no != null ? Number(maxRow.order_no) : 0;
        orderNo = maxOrder + 1;
      }

      const row = {
        day_id: dayId,
        order_no: orderNo ?? 1,
        mode: input.mode,
        question_count: clampInt(input.question_count, 1, 200),
        difficulty: String(input.difficulty || 'basic'),
        digits: clampInt(input.digits, 1, 10),
        rows: clampInt(input.rows, 1, 100),
        speed_seconds: clampSpeedSeconds(input.speed_seconds),
        source: input.source,
        exercise_payload: payloadQuestions,
        json_url: null,
        language: 'vi-VN',
      };

      if (input.id) {
        const { error } = await supabase.from('training_day_exercises' as any).update(row).eq('id', input.id);
        if (error) throw new Error(error.message);
        return { success: true, id: String(input.id) };
      }

      const { data, error } = await supabase
        .from('training_day_exercises' as any)
        .insert(row)
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      return { success: true, id: String(data?.id) };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định' };
    }
  },

  async adminDeleteExercise(exerciseId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('training_day_exercises' as any).delete().eq('id', exerciseId);
      if (error) throw new Error(error.message);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định' };
    }
  },

  async getUserExerciseAttempts(params: { userId: string; dayIds: string[] }): Promise<{
    /** latest attempt per exercise_id */
    attemptsByExerciseId: Record<
      string,
      { exercise_id: string; correct_count: number; score: number; duration_seconds: number; completed_at: string }
    >;
    /** day completion: true if at least 1 attempt exists for every exercise in that day */
    completedDayIds: Set<string>;
  }> {
    const { userId, dayIds } = params;
    if (!dayIds.length) return { attemptsByExerciseId: {}, completedDayIds: new Set() };

    // 1) results rows
    const { data: results, error: rErr } = await supabase
      .from('training_day_results' as any)
      .select('id, day_id')
      .eq('user_id', userId)
      .in('day_id', dayIds as any);
    if (rErr) throw new Error(rErr.message);

    const resultIds = (results || []).map((r: any) => String(r.id));
    const resultIdToDayId = new Map<string, string>();
    (results || []).forEach((r: any) => {
      resultIdToDayId.set(String(r.id), String(r.day_id));
    });

    if (!resultIds.length) return { attemptsByExerciseId: {}, completedDayIds: new Set() };

    // 2) attempts rows
    const { data: attempts, error: aErr } = await supabase
      .from('training_day_exercise_attempts' as any)
      .select('exercise_id, result_id, correct_count, score, duration_seconds, completed_at')
      .in('result_id', resultIds as any)
      .order('completed_at', { ascending: false });
    if (aErr) throw new Error(aErr.message);

    // latest per exercise
    const attemptsByExerciseId: Record<string, any> = {};
    const dayIdToExercisesAttempted = new Map<string, Set<string>>();
    (attempts || []).forEach((a: any) => {
      const exId = String(a.exercise_id);
      if (!attemptsByExerciseId[exId]) {
        attemptsByExerciseId[exId] = {
          exercise_id: exId,
          correct_count: clampInt(a.correct_count ?? 0, 0, 9999),
          score: clampInt(a.score ?? a.correct_count ?? 0, 0, 9999),
          duration_seconds: clampInt(a.duration_seconds ?? 0, 0, 999999),
          completed_at: String(a.completed_at ?? new Date().toISOString()),
        };
      }

      const dayId = resultIdToDayId.get(String(a.result_id));
      if (dayId) {
        if (!dayIdToExercisesAttempted.has(dayId)) dayIdToExercisesAttempted.set(dayId, new Set());
        dayIdToExercisesAttempted.get(dayId)!.add(exId);
      }
    });

    // Determine day completion based on configured exercises count for that day.
    const { data: exRows, error: eErr } = await supabase
      .from('training_day_exercises' as any)
      .select('id, day_id')
      .in('day_id', dayIds as any);
    if (eErr) throw new Error(eErr.message);

    const dayIdToExerciseIds = new Map<string, Set<string>>();
    (exRows || []).forEach((r: any) => {
      const dayId = String(r.day_id);
      const exId = String(r.id);
      if (!dayIdToExerciseIds.has(dayId)) dayIdToExerciseIds.set(dayId, new Set());
      dayIdToExerciseIds.get(dayId)!.add(exId);
    });

    const completedDayIds = new Set<string>();
    dayIdToExerciseIds.forEach((exerciseIds, dayId) => {
      const attempted = dayIdToExercisesAttempted.get(dayId) || new Set<string>();
      // complete if every exercise has at least one attempt
      let ok = true;
      exerciseIds.forEach((exId) => {
        if (!attempted.has(exId)) ok = false;
      });
      if (ok && exerciseIds.size > 0) completedDayIds.add(dayId);
    });

    return { attemptsByExerciseId, completedDayIds };
  },

  async recordExerciseAttempt(params: {
    userId: string;
    dayId: string;
    exerciseId: string;
    correctCount: number;
    totalCount: number;
    durationSeconds: number;
    answers?: Record<number, string>;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Ensure day result row
      const { data: existing, error: selErr } = await supabase
        .from('training_day_results' as any)
        .select('id')
        .eq('user_id', params.userId)
        .eq('day_id', params.dayId)
        .maybeSingle();
      if (selErr) throw new Error(selErr.message);

      let resultId = existing?.id ? String(existing.id) : null;
      if (!resultId) {
        const { data: ins, error: insErr } = await supabase
          .from('training_day_results' as any)
          .insert({
            user_id: params.userId,
            day_id: params.dayId,
            is_completed: false,
            completed_at: null,
          })
          .select('id')
          .single();
        if (insErr) throw new Error(insErr.message);
        resultId = String(ins?.id);
      }

      const now = new Date().toISOString();
      const score = clampInt(params.correctCount, 0, 9999);
      const { error: aErr } = await supabase.from('training_day_exercise_attempts' as any).insert({
        result_id: resultId,
        exercise_id: params.exerciseId,
        score,
        correct_count: score,
        duration_seconds: clampInt(params.durationSeconds, 0, 999999),
        answers: params.answers ?? null,
        completed_at: now,
      });
      if (aErr) throw new Error(aErr.message);

      // Optionally mark day completed when all exercises have attempts.
      // This is a best-effort; UI computes completion anyway.
      const { completedDayIds } = await trainingTrackService.getUserExerciseAttempts({
        userId: params.userId,
        dayIds: [params.dayId],
      });
      if (completedDayIds.has(params.dayId)) {
        await supabase
          .from('training_day_results' as any)
          .update({ is_completed: true, completed_at: now })
          .eq('id', resultId);
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định' };
    }
  },

  async getCollectedCups(userId: string): Promise<Set<number>> {
    try {
      const { data, error } = await supabase
        .from('user_collected_cups' as any)
        .select('week_index')
        .eq('user_id', userId);
      if (error) {
        // Table might not exist yet if migration wasn't run, handle gracefully
        console.warn('getCollectedCups error (ignore if table missing):', error.message);
        return new Set();
      }
      return new Set((data || []).map((r: any) => Number(r.week_index)));
    } catch (e) {
      return new Set();
    }
  },

  async getTotalCups(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_collected_cups' as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.warn('getTotalCups error:', error.message);
        return 0;
      }
      return count || 0;
    } catch (e) {
      return 0;
    }
  },

  async claimCup(userId: string, weekIndex: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_collected_cups' as any)
        .insert({ user_id: userId, week_index: weekIndex });
      if (error) throw new Error(error.message);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi khi nhận Cup' };
    }
  },
};

