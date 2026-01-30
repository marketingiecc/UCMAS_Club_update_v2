import { supabase } from './mockBackend';

export const trainingService = {
  // Student queries
  async getLearningPaths() {
    const { data } = await supabase
      .from('learning_paths')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async getDailyChallenges() {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('is_published', true)
      .gte('challenge_date', today)
      .order('challenge_date', { ascending: true })
      .limit(7);
    return data || [];
  },

  async getGuidedModules() {
    const { data } = await supabase
      .from('guided_practice_modules')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async getPracticeTopics() {
    const { data } = await supabase
      .from('practice_topics')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async getSkillCategories() {
    const { data } = await supabase
      .from('skill_categories')
      .select('*')
      .order('created_at', { ascending: true });
    return data || [];
  },

  async getBadges() {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async getProgressReport(range: 'day' | 'week' | 'month') {
    const { data } = await supabase
      .from('progress_reports')
      .select('*')
      .eq('report_range', range)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();
    return data || null;
  },

  // Admin content creation
  async createLearningPath(payload: any) {
    const { error } = await supabase.from('learning_paths').insert(payload);
    return { success: !error, error: error?.message };
  },

  async createDailyChallenge(payload: any) {
    const { error } = await supabase.from('daily_challenges').insert(payload);
    return { success: !error, error: error?.message };
  },

  async createGuidedModule(payload: any) {
    const { error } = await supabase.from('guided_practice_modules').insert(payload);
    return { success: !error, error: error?.message };
  },

  async createPracticeTopic(payload: any) {
    const { error } = await supabase.from('practice_topics').insert(payload);
    return { success: !error, error: error?.message };
  },

  async createBadge(payload: any) {
    const { error } = await supabase.from('badges').insert(payload);
    return { success: !error, error: error?.message };
  },

  async saveSpeedTraining(payload: { mode: string; speed_target: number; score: number; duration_seconds: number }) {
    const { error } = await supabase.from('speed_training_sessions').insert(payload);
    return { success: !error, error: error?.message };
  },
};
