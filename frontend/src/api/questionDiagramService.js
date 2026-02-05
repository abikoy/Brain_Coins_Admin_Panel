import { uploadFile } from '../lib/supabaseStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Upload diagram for a question using backend API
 * @param {string} questionId - Question ID
 * @param {File} file - Image file
 * @returns {Promise<Object>} - Upload result
 */
export const uploadQuestionDiagram = async (questionId, file) => {
  try {
    console.log('[Frontend] Uploading diagram:', {
      questionId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileLastModified: file.lastModified
    });

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('diagram', file);
    
    console.log('[Frontend] FormData created, sending to backend...');
    
    // Upload via backend API (uses admin privileges)
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/diagram`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    console.log('[Frontend] Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Frontend] Backend error response:', errorData);
      throw new Error(errorData.message || 'Failed to upload diagram');
    }

    const result = await response.json();
    console.log('[Frontend] Upload successful:', result);
    return result.data;
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