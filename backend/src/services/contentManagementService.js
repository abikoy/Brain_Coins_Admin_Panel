// services/contentManagementService.js
import { createClient } from '@supabase/supabase-js';

class ContentManagementService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // GET ALL SUBJECTS
  async getSubjects(filters = {}) {
    try {
      let query = this.supabase
        .from('subjects')
        .select('*', { count: 'exact' })
        .order('display_order', { ascending: true });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,name_si.ilike.%${filters.search}%,name_ta.ilike.%${filters.search}%`);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.page && filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data: subjects, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: subjects,
        total: count
      };

    } catch (error) {
      console.error('Get Subjects Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // TOGGLE SUBJECT STATUS (Enable/Disable)
  async toggleSubjectStatus(id, isActive) {
    try {
      const { data: subject, error } = await this.supabase
        .from('subjects')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: subject,
        message: `Subject ${isActive ? 'enabled' : 'disabled'} successfully`
      };

    } catch (error) {
      console.error('Toggle Subject Status Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // GET ALL LEARNING PACKS
  async getLearningPacks(filters = {}) {
    try {
      let query = this.supabase
        .from('learning_packs')
        .select(`
          *,
          subjects(name, name_si, name_ta, color, icon)
        `, { count: 'exact' })
        .order('display_order', { ascending: true });

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,title_si.ilike.%${filters.search}%,title_ta.ilike.%${filters.search}%`);
      }

      if (filters.subject_id) {
        query = query.eq('subject_id', filters.subject_id);
      }

      if (filters.grade) {
        query = query.eq('grade', filters.grade);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.is_premium !== undefined) {
        query = query.eq('is_premium', filters.is_premium);
      }

      if (filters.page && filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data: packs, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: packs,
        total: count
      };

    } catch (error) {
      console.error('Get Learning Packs Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // TOGGLE LEARNING PACK STATUS (Enable/Disable)
  async toggleLearningPackStatus(id, isActive) {
    try {
      const { data: pack, error } = await this.supabase
        .from('learning_packs')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: pack,
        message: `Learning pack ${isActive ? 'enabled' : 'disabled'} successfully`
      };

    } catch (error) {
      console.error('Toggle Learning Pack Status Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // TOGGLE LEARNING PACK PREMIUM STATUS
  async toggleLearningPackPremium(id, isPremium) {
    try {
      const { data: pack, error } = await this.supabase
        .from('learning_packs')
        .update({
          is_premium: isPremium,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: pack,
        message: `Learning pack ${isPremium ? 'set as premium' : 'set as free'} successfully`
      };

    } catch (error) {
      console.error('Toggle Learning Pack Premium Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // GET ALL QUESTIONS
  async getQuestions(filters = {}) {
    try {
      let query = this.supabase
        .from('questions')
        .select(`
          *,
          learning_packs(title, title_si, title_ta, grade, subjects(name))
        `, { count: 'exact' })
        .order('display_order', { ascending: true });

      if (filters.search) {
        query = query.or(`question_text.ilike.%${filters.search}%,question_text_si.ilike.%${filters.search}%,question_text_ta.ilike.%${filters.search}%`);
      }

      if (filters.pack_id) {
        query = query.eq('pack_id', filters.pack_id);
      }

      if (filters.question_type) {
        query = query.eq('question_type', filters.question_type);
      }

      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.page && filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data: questions, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: questions,
        total: count
      };

    } catch (error) {
      console.error('Get Questions Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // TOGGLE QUESTION STATUS (Enable/Disable)
  async toggleQuestionStatus(id, isActive) {
    try {
      const { data: question, error } = await this.supabase
        .from('questions')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: question,
        message: `Question ${isActive ? 'enabled' : 'disabled'} successfully`
      };

    } catch (error) {
      console.error('Toggle Question Status Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // BULK TOGGLE QUESTIONS
  async bulkToggleQuestions(ids, isActive) {
    try {
      const { data: questions, error } = await this.supabase
        .from('questions')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: questions,
        message: `${questions.length} questions ${isActive ? 'enabled' : 'disabled'} successfully`
      };

    } catch (error) {
      console.error('Bulk Toggle Questions Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // BULK TOGGLE LEARNING PACKS
  async bulkToggleLearningPacks(ids, isActive) {
    try {
      const { data: packs, error } = await this.supabase
        .from('learning_packs')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: packs,
        message: `${packs.length} learning packs ${isActive ? 'enabled' : 'disabled'} successfully`
      };

    } catch (error) {
      console.error('Bulk Toggle Learning Packs Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // BULK TOGGLE LEARNING PACKS PREMIUM
  async bulkToggleLearningPacksPremium(ids, isPremium) {
    try {
      const { data: packs, error } = await this.supabase
        .from('learning_packs')
        .update({
          is_premium: isPremium,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: packs,
        message: `${packs.length} learning packs ${isPremium ? 'set as premium' : 'set as free'} successfully`
      };

    } catch (error) {
      console.error('Bulk Toggle Learning Packs Premium Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new ContentManagementService();