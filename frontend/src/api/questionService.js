/**
 * FRONTEND - Question API Service
 * Handles API calls to backend for question generation
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Generate questions from uploaded file
 * @param {string} fileUrl - Public URL of uploaded file
 * @param {string} fileType - File type (image, pdf, document)
 * @param {Object} options - Generation options
 * @returns {Promise<Array>} - Generated questions
 */
export const generateQuestionsFromFile = async (fileUrl, fileType, options = {}) => {
  try {
    const {
      count = 5,
      difficulty = 'Intermediate',
      types = ['MCQ', 'FIIB', 'TF', 'HOQ', 'Summary']
    } = options;

    console.log('[Frontend API] Calling backend to generate questions:', {
      fileUrl,
      fileType,
      count,
      difficulty
    });

    const response = await fetch(`${API_BASE_URL}/questions/generate-from-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileUrl,
        fileType,
        count,
        difficulty,
        types
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate questions');
    }

    const data = await response.json();

    console.log('[Frontend API] Questions generated:', data.count);

    return data.questions;

  } catch (error) {
    console.error('[Frontend API] Generate questions error:', error);
    throw error;
  }
};

/**
 * Generate questions from text content
 * @param {string} content - Text content
 * @param {Object} options - Generation options
 * @returns {Promise<Array>} - Generated questions
 */
export const generateQuestionsFromText = async (content, options = {}) => {
  try {
    const {
      count = 5,
      difficulty = 'Intermediate',
      types = ['MCQ', 'FIIB', 'TF', 'HOQ', 'Summary']
    } = options;

    console.log('[Frontend API] Generating questions from text');

    const response = await fetch(`${API_BASE_URL}/questions/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        count,
        difficulty,
        types
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate questions');
    }

    const data = await response.json();

    console.log('[Frontend API] Questions generated:', data.count);

    return data.questions;

  } catch (error) {
    console.error('[Frontend API] Generate questions error:', error);
    throw error;
  }
};

/**
 * Update question
 * @param {string} questionId - Question ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated question
 */
export const updateQuestion = async (questionId, updates) => {
  try {
    console.log('[Frontend API] Updating question:', questionId, updates);

    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update question');
    }

    const data = await response.json();
    console.log('[Frontend API] Question updated successfully');
    
    return data.question;
  } catch (error) {
    console.error('[Frontend API] Update question error:', error);
    throw error;
  }
};

/**
 * Update question difficulty
 * @param {string} questionId - Question ID
 * @param {string} difficulty - New difficulty
 * @returns {Promise<Object>} - Updated question
 */
export const updateQuestionDifficulty = async (questionId, difficulty) => {
  try {
    console.log('[Frontend API] Updating difficulty:', questionId, difficulty);

    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/difficulty`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ difficulty })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update difficulty');
    }

    const data = await response.json();
    console.log('[Frontend API] Difficulty updated successfully');
    
    return data.question;
  } catch (error) {
    console.error('[Frontend API] Update difficulty error:', error);
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
    console.log('[Frontend API] Deleting question:', questionId);

    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete question');
    }

    console.log('[Frontend API] Question deleted successfully');
  } catch (error) {
    console.error('[Frontend API] Delete question error:', error);
    throw error;
  }
};

export default {
  generateQuestionsFromFile,
  generateQuestionsFromText,
  updateQuestion,
  updateQuestionDifficulty,
  deleteQuestion
};
