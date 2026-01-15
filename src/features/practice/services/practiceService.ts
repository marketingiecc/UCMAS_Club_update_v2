
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
    try {
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
        return { success: !error, error: error ? (error.message || JSON.stringify(error)) : null };
    } catch (e: any) {
        return { success: false, error: e.message || 'Unknown error' };
    }
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

  async getAdminAllExams() {
    const { data } = await supabase
      .from('assigned_practice_exams' as any)
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  },

  async adminCreateExam(data: any) {
    try {
        const { data: userData } = await supabase.auth.getUser();
        
        if (!userData.user) {
            return { success: false, error: "Phiên đăng nhập hết hạn." };
        }

        const contestId = data.config?.contestId || null;

        const payload = {
            created_by: userData.user.id,
            contest_id: contestId, 
            name: data.name,
            mode: data.mode,
            exam_code: data.exam_code,
            expiry_date: data.expiry_date,
            questions: data.questions || [],
            config: data.config || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data: insertedExam, error } = await supabase.from('assigned_practice_exams' as any).insert(payload).select().single();
        
        if (error) {
            console.error("Lỗi tạo đề:", error);
            return { success: false, error: error.message || JSON.stringify(error) };
        }

        if (insertedExam && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            const questionRows = data.questions.map((q: any) => {
                const maxOp = Math.max(...(q.operands || []).map((n: number) => Math.abs(n)));
                const digits = maxOp.toString().length;
                const rows = (q.operands || []).length;
                
                return {
                    exam_id: insertedExam.id,
                    mode: q.mode || Mode.VISUAL, 
                    digits: digits,
                    rows: rows,
                    content: { operands: q.operands },
                    correct_answer: q.correctAnswer
                };
            });

            const { error: qError } = await supabase.from('mixed_exam_questions' as any).insert(questionRows);
            if (qError) console.warn("Lỗi lưu mixed questions:", qError);
        }
        
        return { success: true };
    } catch (e: any) {
        console.error("Exception tạo đề:", e);
        return { success: false, error: e.message || 'Lỗi hệ thống không xác định' };
    }
  },

  async getRandomMixedQuestion(examId: string, criteria: { mode?: string | 'all', digits?: number, rows?: number }) {
      // Wrapper for backward compatibility if needed, using batch fetch of 1
      const batch = await practiceService.getMixedQuestionsBatch(examId, criteria, 1);
      return batch.length > 0 ? batch[0] : null;
  },

  async getMixedQuestionsBatch(examId: string, criteria: { mode?: string | 'all', digits?: number, rows?: number }, limit: number = 20) {
      // 1. Try fetching from mixed_exam_questions table
      let query = supabase.from('mixed_exam_questions' as any).select('*');
      query = query.eq('exam_id', examId);
      
      if (criteria.mode && criteria.mode !== 'all') query = query.eq('mode', criteria.mode);
      if (criteria.digits) query = query.eq('digits', criteria.digits);
      if (criteria.rows) query = query.eq('rows', criteria.rows);

      // Fetch a larger pool to shuffle from
      const { data, error } = await query.limit(100);

      if (data && data.length > 0) {
          const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, limit);
          return shuffled.map((q: any) => ({
              id: q.id,
              mode: q.mode,
              operands: q.content?.operands || [],
              correctAnswer: q.correct_answer
          }));
      }

      // 2. FALLBACK: Check JSON in `assigned_practice_exams`
      console.log("Fallback to JSON search for mixed questions...");
      const { data: parent } = await supabase.from('assigned_practice_exams' as any).select('questions').eq('id', examId).single();
      
      if (parent && parent.questions && Array.isArray(parent.questions)) {
          let candidates = parent.questions as any[];
          
          candidates = candidates.filter(q => {
             const m = q.mode || Mode.VISUAL;
             if (criteria.mode && criteria.mode !== 'all' && m !== criteria.mode) return false;
             
             const maxOp = Math.max(...(q.operands || []).map((n:number) => Math.abs(n)));
             const qDigits = maxOp.toString().length;
             const qRows = (q.operands || []).length;
             
             if (criteria.digits && qDigits !== criteria.digits) return false;
             if (criteria.rows && qRows !== criteria.rows) return false;
             
             return true;
          });
          
          const shuffled = candidates.sort(() => 0.5 - Math.random()).slice(0, limit);
          return shuffled.map(r => ({
              id: r.id || 'json-' + Math.random(),
              mode: r.mode || Mode.VISUAL,
              operands: r.operands,
              correctAnswer: r.correctAnswer
          }));
      }
      
      return [];
  }
};
