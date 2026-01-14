
import { supabase } from '../../../services/mockBackend';
import { Mode } from '../../../types';

export const practiceService = {
  async savePracticeAttempt(data: {
    userId: string;
    examId?: string;
    mode: Mode;
    config: any;
    score: { correct: number; total: number };
    duration: number;
    isCreative: boolean;
  }) {
    const { error } = await supabase.from('practice_attempts' as any).insert({
      user_id: data.userId,
      exam_id: data.examId,
      mode: data.mode,
      config: data.config,
      score_correct: data.score.correct,
      score_total: data.score.total,
      duration_seconds: data.duration,
      is_custom_creative: data.isCreative,
      created_at: new Date().toISOString()
    });
    return { success: !error, error };
  },

  async getPracticeHistory(userId: string) {
    const { data, error } = await supabase
      .from('practice_attempts' as any)
      .select('*, practice_exams(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async getAssignedExams() {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('practice_exams' as any)
      .select('*')
      .gt('expiry_date', now)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async adminCreateExam(data: any) {
    const { error } = await supabase.from('practice_exams' as any).insert(data);
    return { success: !error, error };
  }
};
