import { supabaseAdmin } from './supabaseService.js';

/**
 * Get all learning packs for a subject
 * @param {string} subjectId - Subject ID
 * @returns {Promise<Array>} - List of learning packs
 */
export const getLearningPacksBySubject = async (subjectId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('learning_packs')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`[Backend] Get learning packs for subject ${subjectId} error:`, error);
    throw error;
  }
};

/**
 * Create a new learning pack
 * @param {Object} packData - Learning pack data
 * @returns {Promise<Object>} - Created learning pack
 */
export const createLearningPack = async (packData) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('learning_packs')
      .insert([{
        subject_id: packData.subject_id,
        grade: packData.grade,
        title: packData.title,
        title_si: packData.title_si || null,
        title_ta: packData.title_ta || null,
        difficulty: packData.difficulty || 'Medium',
        description: packData.description || '',
        language: packData.language || 'English',
        is_active: packData.is_active !== false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Backend] Create learning pack error:', error);
    throw error;
  }
};

/**
 * Get learning pack by ID with subject details
 * @param {string} packId - Learning pack ID
 * @returns {Promise<Object>} - Learning pack with subject details
 */
export const getLearningPackWithSubject = async (packId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('learning_packs')
      .select(`
        *,
        subjects (
          id,
          name,
          name_si,
          name_ta,
          icon,
          color
        )
      `)
      .eq('id', packId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`[Backend] Get learning pack ${packId} error:`, error);
    throw error;
  }
};

/**
 * Update a learning pack
 * @param {string} packId - Learning pack ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated learning pack
 */
export const updateLearningPack = async (packId, updates) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('learning_packs')
      .update(updates)
      .eq('id', packId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`[Backend] Update learning pack ${packId} error:`, error);
    throw error;
  }
};

/**
 * Delete a learning pack (soft delete)
 * @param {string} packId - Learning pack ID
 * @returns {Promise<void>}
 */
export const deleteLearningPack = async (packId) => {
  try {
    const { error } = await supabaseAdmin
      .from('learning_packs')
      .update({ is_active: false })
      .eq('id', packId);

    if (error) throw error;
  } catch (error) {
    console.error(`[Backend] Delete learning pack ${packId} error:`, error);
    throw error;
  }
};

