import { supabaseAdmin } from '../config/supabaseClient.js';

/**
 * Get all active subjects
 * @returns {Promise<Array>} - List of subjects
 */
export const getAllSubjects = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Backend] Get subjects error:', error);
    throw error;
  }
};

/**
 * Get subject by ID
 * @param {string} subjectId - Subject ID
 * @returns {Promise<Object>} - Subject details
 */
export const getSubjectById = async (subjectId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`[Backend] Get subject ${subjectId} error:`, error);
    throw error;
  }
};

/**
 * Create a new subject
 * @param {Object} subjectData - Subject data
 * @returns {Promise<Object>} - Created subject
 */
export const createSubject = async (subjectData) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .insert([{
        name: subjectData.name,
        name_si: subjectData.name_si || null,
        name_ta: subjectData.name_ta || null,
        description: subjectData.description || null,
        icon: subjectData.icon || 'book',
        color: subjectData.color || '#4CAF50',
        display_order: subjectData.display_order ?? 0,
        is_active: subjectData.is_active !== false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Backend] Create subject error:', error);
    throw error;
  }
};

/**
 * Update a subject
 * @param {string} subjectId - Subject ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated subject
 */
export const updateSubject = async (subjectId, updates) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .update(updates)
      .eq('id', subjectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`[Backend] Update subject ${subjectId} error:`, error);
    throw error;
  }
};

/**
 * Delete a subject (soft delete)
 * @param {string} subjectId - Subject ID
 * @returns {Promise<void>}
 */
export const deleteSubject = async (subjectId) => {
  try {
    const { error } = await supabaseAdmin
      .from('subjects')
      .update({ is_active: false })
      .eq('id', subjectId);

    if (error) throw error;
  } catch (error) {
    console.error(`[Backend] Delete subject ${subjectId} error:`, error);
    throw error;
  }
};

export default {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject
};
