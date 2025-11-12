// services/contentManagementService.js
import { createClient } from '@supabase/supabase-js';
import { detectLanguageFromText } from './geminiService.js';

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
      // If filtering by grade, first get subjects that have learning packs for that grade
      let subjectIds = null;
      if (filters.grade) {
        // Database stores grades as "Grade 11", "Grade 10", etc.
        const gradeFormatted = `Grade ${filters.grade}`;
        
        let packsQuery = this.supabase
          .from('learning_packs')
          .select('subject_id, grade, is_active')
          .eq('grade', gradeFormatted);
          // Don't filter by is_active here - we want subjects that have ANY learning packs for this grade

        const { data: matchingPacks, error: packsError } = await packsQuery;
        if (packsError) throw packsError;

        subjectIds = [...new Set(matchingPacks.map(p => p.subject_id))];
        
        // If no subjects have learning packs for this grade, return empty result
        if (subjectIds.length === 0) {
          return {
            success: true,
            subjects: [],
            total: 0
          };
        }
      }
      
      let query = this.supabase
        .from('subjects')
        .select('*', { count: 'exact' })
        .order('display_order', { ascending: true });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,name_si.ilike.%${filters.search}%,name_ta.ilike.%${filters.search}%`);
      }

      // Filter by specific subject_id if provided
      if (filters.subject_id) {
        query = query.eq('id', filters.subject_id);
      }

      // Filter by subjects that have learning packs for the specified grade
      if (subjectIds) {
        query = query.in('id', subjectIds);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      // Show both active and inactive subjects by default

      if (filters.page && filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data: subjects, error, count } = await query;
      

      if (error) throw error;

      // Apply language filtering if specified
      let filteredSubjects = subjects || [];
      if (filters.language) {
        filteredSubjects = subjects.filter(subject => {
          // Check if subject has content in the requested language
          if (filters.language === 'en') {
            // For English, check if name exists and is primarily English
            return subject.name && detectLanguageFromText(subject.name) === 'English';
          } else if (filters.language === 'si') {
            // For Sinhala, check if name_si exists and has Sinhala content
            return subject.name_si && detectLanguageFromText(subject.name_si) === 'Sinhala';
          } else if (filters.language === 'ta') {
            // For Tamil, check if name_ta exists and has Tamil content
            return subject.name_ta && detectLanguageFromText(subject.name_ta) === 'Tamil';
          }
          return false;
        });
      }

      // Get overall statistics for subjects (not just current page)
      let statsQuery = this.supabase
        .from('subjects')
        .select('is_active');

      // Apply same filters as main query (except pagination and status filters)
      if (filters.search) {
        statsQuery = statsQuery.or(`name.ilike.%${filters.search}%,name_si.ilike.%${filters.search}%,name_ta.ilike.%${filters.search}%`);
      }
      if (filters.subject_id) {
        statsQuery = statsQuery.eq('id', filters.subject_id);
      }
      if (subjectIds) {
        statsQuery = statsQuery.in('id', subjectIds);
      }
      // DON'T apply is_active filter to stats query - we want to count all items

      const { data: allSubjectsStats, error: statsError } = await statsQuery;
      if (statsError) {
        console.error('Subjects stats query error:', statsError);
      }
      
      const activeCount = allSubjectsStats?.filter(s => s.is_active === true)?.length || 0;
      const totalCount = allSubjectsStats?.length || 0;
      const inactiveCount = totalCount - activeCount;

      return {
        success: true,
        subjects: filteredSubjects,
        total: filteredSubjects.length,
        overallStats: {
          total: totalCount,
          active: activeCount,
          inactive: inactiveCount
        }
      };

    } catch (error) {
      console.error('Get Subjects Error:', error);
      return {
        success: false,
        error: error.message,
        subjects: [],
        total: 0
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
        // Database stores grades as "Grade 11", "Grade 10", etc.
        const gradeFormatted = `Grade ${filters.grade}`;
        query = query.eq('grade', gradeFormatted);
      }

      // Add language filtering
      if (filters.language) {
        query = query.eq('language', filters.language);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      // Show both active and inactive learning packs by default

      if (filters.is_premium !== undefined) {
        query = query.eq('is_premium', filters.is_premium);
      }

      if (filters.page && filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data: packs, error, count } = await query;

      if (error) throw error;

      // Get overall statistics for learning packs (not just current page)
      let statsQuery = this.supabase
        .from('learning_packs')
        .select('is_active, is_premium');

      // Apply same filters as main query (except pagination and status filters)
      if (filters.search) {
        statsQuery = statsQuery.or(`title.ilike.%${filters.search}%,title_si.ilike.%${filters.search}%,title_ta.ilike.%${filters.search}%`);
      }
      if (filters.subject_id) {
        statsQuery = statsQuery.eq('subject_id', filters.subject_id);
      }
      if (filters.grade) {
        const gradeFormatted = `Grade ${filters.grade}`;
        statsQuery = statsQuery.eq('grade', gradeFormatted);
      }
      if (filters.language) {
        statsQuery = statsQuery.eq('language', filters.language);
      }
      // DON'T apply is_active or is_premium filters to stats query - we want to count all items

      const { data: allPacksStats, error: statsError } = await statsQuery;
      if (statsError) {
        console.error('Learning packs stats query error:', statsError);
      }
      
      const activeCount = allPacksStats?.filter(p => p.is_active === true)?.length || 0;
      const premiumCount = allPacksStats?.filter(p => p.is_premium === true)?.length || 0;
      const totalCount = allPacksStats?.length || 0;
      const inactiveCount = totalCount - activeCount;

      return {
        success: true,
        learningPacks: packs || [],
        total: count || 0,
        overallStats: {
          total: totalCount,
          active: activeCount,
          inactive: inactiveCount,
          premium: premiumCount
        }
      };

    } catch (error) {
      console.error('Get Learning Packs Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // GET HIERARCHICAL CONTENT DATA FOR FILTERING
  async getContentHierarchy(filters = {}) {
    try {
      // Get ALL subjects first (not just those with learning packs)
      let subjectsQuery = this.supabase
        .from('subjects')
        .select('id, name, name_si, name_ta, color, icon')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      const { data: allSubjects, error: subjectsError } = await subjectsQuery;
      if (subjectsError) throw subjectsError;

      // Build base query for learning packs to get languages, grades, and learning packs
      let packsQuery = this.supabase
        .from('learning_packs')
        .select(`
          id,
          title,
          grade,
          language,
          subject_id,
          is_active,
          subjects(id, name, name_si, name_ta, color, icon)
        `)
        .eq('is_active', true);

      // Apply filters step by step
      if (filters.language) {
        // Convert display language to database code
        const langCode = filters.language === 'English' ? 'en' : 
                        filters.language === 'Sinhala' ? 'si' : 
                        filters.language === 'Tamil' ? 'ta' : filters.language;
        packsQuery = packsQuery.eq('language', langCode);
      }

      if (filters.grade) {
        packsQuery = packsQuery.eq('grade', filters.grade);
      }

      if (filters.subject_id) {
        packsQuery = packsQuery.eq('subject_id', filters.subject_id);
      }

      const { data: packs, error: packsError } = await packsQuery;
      if (packsError) throw packsError;

      // Extract unique values for dropdown options
      const languages = [...new Set(packs.map(p => {
        // Convert database codes back to display names
        return p.language === 'en' ? 'English' : 
               p.language === 'si' ? 'Sinhala' : 
               p.language === 'ta' ? 'Tamil' : p.language;
      }))].sort();

      // Show ALL possible grades (6-11), not just grades with learning packs
      const grades = [6, 7, 8, 9, 10, 11];
      
      // Use ALL subjects, not just those with learning packs
      let subjects = allSubjects;

      // Apply language filtering to subjects if specified
      if (filters.language) {
        const langCode = filters.language === 'English' ? 'en' : 
                        filters.language === 'Sinhala' ? 'si' : 
                        filters.language === 'Tamil' ? 'ta' : filters.language;
        
        subjects = subjects.filter(subject => {
          if (!subject) return false;
          
          // Check if subject has content in the requested language
          if (langCode === 'en') {
            // For English, check if name exists and is primarily English
            return subject.name && detectLanguageFromText(subject.name) === 'English';
          } else if (langCode === 'si') {
            // For Sinhala, check if name_si exists and has Sinhala content
            return subject.name_si && detectLanguageFromText(subject.name_si) === 'Sinhala';
          } else if (langCode === 'ta') {
            // For Tamil, check if name_ta exists and has Tamil content
            return subject.name_ta && detectLanguageFromText(subject.name_ta) === 'Tamil';
          }
          return false;
        });
      }

      const learningPacks = packs.map(p => ({
        id: p.id,
        title: p.title,
        subject_id: p.subject_id,
        grade: p.grade,
        language: p.language === 'en' ? 'English' : 
                 p.language === 'si' ? 'Sinhala' : 
                 p.language === 'ta' ? 'Tamil' : p.language
      }));

      return {
        success: true,
        data: {
          languages,
          grades,
          subjects,
          learningPacks,
          totalPacks: packs.length
        }
      };

    } catch (error) {
      console.error('Get Content Hierarchy Error:', error);
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

  // UPDATE LEARNING PACK
  async updateLearningPack(id, packData) {
    try {
      const { data: pack, error } = await this.supabase
        .from('learning_packs')
        .update({
          ...packData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: pack,
        message: 'Learning pack updated successfully'
      };

    } catch (error) {
      console.error('Update Learning Pack Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // DELETE LEARNING PACK
  async deleteLearningPack(id) {
    try {
      const { data: pack, error } = await this.supabase
        .from('learning_packs')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: pack,
        message: 'Learning pack deleted successfully'
      };

    } catch (error) {
      console.error('Delete Learning Pack Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // GET ALL QUESTIONS
  async getQuestions(filters = {}) {
    try {
      // If we need to filter by subject_id or grade, first get the matching learning pack IDs
      let packIds = null;
      if (filters.subject_id || filters.grade) {
        let packsQuery = this.supabase
          .from('learning_packs')
          .select('id');
          // Don't filter by is_active here - we want questions from ANY learning packs that match the criteria

        if (filters.subject_id) {
          packsQuery = packsQuery.eq('subject_id', filters.subject_id);
        }

        if (filters.grade) {
          // Database stores grades as "Grade 11", "Grade 10", etc.
          const gradeFormatted = `Grade ${filters.grade}`;
          packsQuery = packsQuery.eq('grade', gradeFormatted);
        }

        const { data: matchingPacks, error: packsError } = await packsQuery;
        if (packsError) throw packsError;

        packIds = matchingPacks.map(p => p.id);
        // If no matching packs found, return empty result
        if (packIds.length === 0) {
          return {
            success: true,
            data: [],
            total: 0
          };
        }
      }

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

      // Filter by pack IDs if we found matching packs
      if (packIds) {
        query = query.in('pack_id', packIds);
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
      // Show both active and inactive questions by default

      if (filters.page && filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data: questions, error, count } = await query;

      if (error) throw error;

      // Apply language filtering if specified
      let filteredQuestions = questions || [];
      if (filters.language) {
        filteredQuestions = questions.filter(question => {
          // Detect language from question text
          const questionText = question.question_text || question.question_text_si || question.question_text_ta || '';
          const detectedLanguage = detectLanguageFromText(questionText);
          const languageMap = {
            'English': 'en',
            'Sinhala': 'si',
            'Tamil': 'ta'
          };
          return languageMap[detectedLanguage] === filters.language;
        });
      }

      // Get overall statistics for questions (not just current page)
      let statsQuery = this.supabase
        .from('questions')
        .select('is_active');

      // Apply same filters as main query (except pagination and status filters)
      if (packIds) {
        statsQuery = statsQuery.in('pack_id', packIds);
      }
      if (filters.search) {
        statsQuery = statsQuery.or(`question_text.ilike.%${filters.search}%,question_text_si.ilike.%${filters.search}%,question_text_ta.ilike.%${filters.search}%`);
      }
      if (filters.pack_id) {
        statsQuery = statsQuery.eq('pack_id', filters.pack_id);
      }
      if (filters.question_type) {
        statsQuery = statsQuery.eq('question_type', filters.question_type);
      }
      if (filters.difficulty) {
        statsQuery = statsQuery.eq('difficulty', filters.difficulty);
      }
      // DON'T apply is_active filter to stats query - we want to count all items

      const { data: allQuestionsStats, error: statsError } = await statsQuery;
      if (statsError) {
        console.error('Questions stats query error:', statsError);
      }
      
      const activeCount = allQuestionsStats?.filter(q => q.is_active === true)?.length || 0;
      const totalCount = allQuestionsStats?.length || 0;
      const inactiveCount = totalCount - activeCount;

      return {
        success: true,
        questions: filteredQuestions,
        total: count || filteredQuestions.length,
        overallStats: {
          total: totalCount,
          active: activeCount,
          inactive: inactiveCount
        }
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

  // UPDATE QUESTION
  async updateQuestion(id, questionData) {
    try {
      const { data: question, error } = await this.supabase
        .from('questions')
        .update({
          ...questionData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: question,
        message: 'Question updated successfully'
      };

    } catch (error) {
      console.error('Update Question Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // DELETE QUESTION
  async deleteQuestion(id) {
    try {
      const { data: question, error } = await this.supabase
        .from('questions')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: question,
        message: 'Question deleted successfully'
      };

    } catch (error) {
      console.error('Delete Question Error:', error);
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