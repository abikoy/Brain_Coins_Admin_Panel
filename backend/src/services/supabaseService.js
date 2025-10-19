/**
 * BACKEND - Supabase Service
 * This file contains server-side Supabase operations
 * Used by backend API controllers
 * DO NOT use this in frontend - use frontend/src/lib/supabaseClient.js instead
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase Configuration (Backend - Server Side)
const supabaseUrl = process.env.SUPABASE_URL || "https://jgtjkqwephakgpxvvxsr.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client for backend (with service role key for admin operations)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Get all students from database
 * @returns {Promise<Array>} - List of students
 */
export const getAllStudents = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Backend] Get students error:', error);
    throw error;
  }
};

/**
 * Get student by ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Student data
 */
export const getStudentById = async (studentId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Backend] Get student error:', error);
    throw error;
  }
};

/**
 * Create new student
 * @param {Object} studentData - Student information
 * @returns {Promise<Object>} - Created student
 */
export const createStudent = async (studentData) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .insert([studentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Backend] Create student error:', error);
    throw error;
  }
};

/**
 * Update student
 * @param {string} studentId - Student ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated student
 */
export const updateStudent = async (studentId, updates) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Backend] Update student error:', error);
    throw error;
  }
};

/**
 * Delete student
 * @param {string} studentId - Student ID
 * @returns {Promise<void>}
 */
export const deleteStudent = async (studentId) => {
  try {
    const { error } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) throw error;
  } catch (error) {
    console.error('[Backend] Delete student error:', error);
    throw error;
  }
};

/**
 * Save generated questions to database
 * @param {Array} questions - Array of question objects
 * @returns {Promise<Array>} - Saved questions with IDs
 */
export const saveQuestions = async (questions) => {
  try {
    console.log('[Backend DB] Saving', questions.length, 'questions to database');

    // Prepare questions for database (only include fields that exist in table)
    const questionsToSave = questions.map(q => ({
      type: q.type,
      difficulty: q.difficulty || 'Intermediate',
      question: q.question,
      answer: q.answer,
      options: q.options || null,
      // Store metadata if available
      language: q.metadata?.language || null,
      grade: q.metadata?.grade || null,
      subject: q.metadata?.subject || null,
      topics: q.metadata?.topics || null
    }));

    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert(questionsToSave)
      .select();

    if (error) {
      console.error('[Backend DB] Save questions error:', error);
      throw error;
    }

    console.log('[Backend DB] Successfully saved', data.length, 'questions');
    return data;
  } catch (error) {
    console.error('[Backend DB] Save questions failed:', error);
    throw error;
  }
};

/**
 * Get all questions from database
 * @param {Object} filters - Optional filters (type, difficulty)
 * @returns {Promise<Array>} - List of questions
 */
export const getAllQuestions = async (filters = {}) => {
  try {
    let query = supabaseAdmin
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Backend DB] Get questions error:', error);
    throw error;
  }
};

/**
 * Update entire question
 * @param {string} questionId - Question ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated question
 */
export const updateQuestion = async (questionId, updates) => {
  try {
    console.log('[Backend DB] Updating question:', questionId, updates);

    const { data, error } = await supabaseAdmin
      .from('questions')
      .update(updates)
      .eq('id', questionId)
      .select()
      .single();

    if (error) {
      console.error('[Backend DB] Update question error:', error);
      throw error;
    }

    console.log('[Backend DB] Question updated successfully');
    return data;
  } catch (error) {
    console.error('[Backend DB] Update question failed:', error);
    throw error;
  }
};

/**
 * Update question difficulty (admin tagging)
 * @param {string} questionId - Question ID
 * @param {string} difficulty - New difficulty level
 * @returns {Promise<Object>} - Updated question
 */
export const updateQuestionDifficulty = async (questionId, difficulty) => {
  try {
    console.log('[Backend DB] Updating difficulty:', questionId, difficulty);

    const { data, error } = await supabaseAdmin
      .from('questions')
      .update({ difficulty })
      .eq('id', questionId)
      .select()
      .single();

    if (error) {
      console.error('[Backend DB] Update difficulty error:', error);
      throw error;
    }

    console.log('[Backend DB] Difficulty updated successfully');
    return data;
  } catch (error) {
    console.error('[Backend DB] Update difficulty failed:', error);
    throw error;
  }
};

/**
 * Delete question
 * @param {string} questionId - Question ID
 * @returns {Promise<void>}
 */
export const deleteQuestion = async (questionId) => {
  try {
    const { error } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) throw error;
  } catch (error) {
    console.error('[Backend DB] Delete question error:', error);
    throw error;
  }
};

export default supabaseAdmin;
