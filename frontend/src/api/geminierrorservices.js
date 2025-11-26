const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const getGeminiErrors = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add all filter parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const response = await fetch(`${API_BASE_URL}/gemini-errors?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch errors: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch errors');
    }

    return data;
  } catch (error) {
    console.error('Error fetching Gemini errors:', error);
    throw error;
  }
};

/**
 * Fetch Gemini error statistics
 */
export const getGeminiErrorStats = async (days = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/gemini-errors/stats?days=${days}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch error stats: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch error stats');
    }

    return data;
  } catch (error) {
    console.error('Error fetching Gemini error stats:', error);
    throw error;
  }
};

/**
 * Fetch filter options
 */
export const getGeminiErrorFilterOptions = async (days = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/gemini-errors/filters/options?days=${days}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch filter options: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch filter options');
    }

    return data;
  } catch (error) {
    console.error('Error fetching filter options:', error);
    throw error;
  }
};

/**
 * Delete specific error log
 */
export const deleteGeminiError = async (errorId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/gemini-errors/${errorId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete error');
    }

    return data;
  } catch (error) {
    console.error('Error deleting Gemini error:', error);
    throw error;
  }
};

/**
 * Clear old errors
 */
export const clearOldGeminiErrors = async (days = 90) => {
  try {
    const response = await fetch(`${API_BASE_URL}/gemini-errors/clear-old`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ days })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear old errors: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to clear old errors');
    }

    return data;
  } catch (error) {
    console.error('Error clearing old errors:', error);
    throw error;
  }
};

export default {
  getGeminiErrors,
  getGeminiErrorStats,
  getGeminiErrorFilterOptions,
  deleteGeminiError,
  clearOldGeminiErrors
};