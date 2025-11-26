import { uploadFile } from '../lib/supabaseStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Upload diagram for a question
 * @param {string} questionId - Question ID
 * @param {File} file - Image file
 * @returns {Promise<Object>} - Upload result
 */
export const uploadQuestionDiagram = async (questionId, file) => {
  try {
    // Upload file to Supabase storage
    const uploadResult = await uploadFile(file);
    
    // Update question with diagram path
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/diagram`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        diagram_path: uploadResult.filePath,
        has_diagram: true
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update question with diagram');
    }

    return uploadResult;
  } catch (error) {
    console.error('Error uploading question diagram:', error);
    throw error;
  }
};

/**
 * Delete question diagram
 * @param {string} questionId - Question ID
 * @returns {Promise<void>}
 */
export const deleteQuestionDiagram = async (questionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/diagram`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to delete question diagram');
    }
  } catch (error) {
    console.error('Error deleting question diagram:', error);
    throw error;
  }
};