
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
      .select('*, assigned_practice_exams(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async getAssignedExams() {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('assigned_practice_exams' as any)
      .select('*')
      .gt('expiry_date', now)
      .order('created_at', { ascending: false });
    return data || [];
  },

  // Hàm mới: Lấy danh sách toàn bộ đề thi admin đã tạo (Lịch sử)
  async getAdminAllExams() {
    const { data } = await supabase
      .from('assigned_practice_exams' as any)
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  },

  // Hàm tạo đề: Fix lỗi bằng cách map đúng cột
  async adminCreateExam(data: any) {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
        return { success: false, error: "Phiên đăng nhập hết hạn." };
    }

    // Explicit Mapping: Chỉ lấy đúng các trường có trong bảng assigned_practice_exams
    const payload = {
        created_by: userData.user.id,
        name: data.name,
        mode: data.mode,
        exam_code: data.exam_code,
        expiry_date: data.expiry_date,
        questions: data.questions,
        config: data.config, // contestId sẽ nằm trong này
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase.from('assigned_practice_exams' as any).insert(payload);
    
    if (error) {
        console.error("Lỗi tạo đề:", error);
        return { success: false, error: error.message };
    }
    
    return { success: true };
  }
};
