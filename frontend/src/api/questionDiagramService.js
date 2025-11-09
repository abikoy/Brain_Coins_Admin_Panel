/**
 * FRONTEND - Question Diagram Service
 * Handles diagram upload/delete for questions
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Upload diagram for a question
 * @param {string} questionId - Question ID
 * @param {File} file - Image file
 * @returns {Promise<{diagramUrl: string}>}
 */
export const uploadQuestionDiagram = async (questionId, file) => {
  try {
    const formData = new FormData();
    formData.append('diagram', file);

    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/diagram`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload diagram');
    }

    const data = await response.json();
    return data.data;

  } catch (error) {
    console.error('[Frontend] Upload diagram error:', error);
    throw error;
  }
};

/**
 * Delete diagram from a question
 * @param {string} questionId - Question ID
 * @returns {Promise<void>}
 */
export const deleteQuestionDiagram = async (questionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/diagram`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete diagram');
    }

  } catch (error) {
    console.error('[Frontend] Delete diagram error:', error);
    throw error;
  }
};

export default {
  uploadQuestionDiagram,
  deleteQuestionDiagram
};
