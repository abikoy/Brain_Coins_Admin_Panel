import { supabaseAdmin } from '../config/supabaseClient.js';
import crypto from 'crypto';

/**
 * Log Gemini AI specific errors
 * @param {Object} errorInfo - Gemini error information
 */
export const logGeminiError = async (errorInfo) => {
  try {
    const {
      errorType = 'api_error',
      errorMessage,
      stack,
      geminiModel = 'gemini-2.5-flash',
      apiEndpoint,
      prompt,
      fileType,
      language,
      questionTypes = [],
      questionCount,
      httpStatus,
      geminiErrorCode,
      retryAttempt = 0,
      userId = null,
      endpoint,
      metadata = {}
    } = errorInfo;

    // Create prompt hash for tracking duplicate errors
    const promptHash = prompt ? 
      crypto.createHash('sha256').update(prompt.substring(0, 1000)).digest('hex') : null;

    const { error } = await supabaseAdmin
      .from('gemini_error_logs')
      .insert([{
        error_type: errorType,
        error_message: errorMessage?.substring(0, 2000) || 'Unknown Gemini error',
        stack_trace: stack?.substring(0, 10000) || null,
        gemini_model: geminiModel,
        api_endpoint: apiEndpoint,
        prompt_hash: promptHash,
        prompt_length: prompt?.length || 0,
        response_length: metadata.responseLength || null,
        file_type: fileType,
        language: language,
        question_types: questionTypes,
        question_count: questionCount,
        http_status: httpStatus,
        gemini_error_code: geminiErrorCode,
        retry_attempt: retryAttempt,
        user_id: userId,
        endpoint: endpoint,
        metadata: metadata
      }]);

    if (error) {
      console.error('❌ Failed to log Gemini error to database:', error);
    } else {
      console.log('✅ Gemini error logged successfully');
    }
  } catch (loggingError) {
    console.error('❌ Gemini error logging failed:', loggingError);
    console.error('Original Gemini error:', errorInfo.errorMessage);
  }
};

/**
 * Log Gemini API errors
 */
export const logGeminiApiError = async (error, context = {}) => {
  const errorInfo = {
    errorType: getGeminiErrorType(error),
    errorMessage: error.message,
    stack: error.stack,
    geminiModel: context.model || 'gemini-2.5-flash',
    apiEndpoint: context.apiEndpoint || 'generateContent',
    prompt: context.prompt,
    fileType: context.fileType,
    language: context.language,
    questionTypes: context.questionTypes,
    questionCount: context.questionCount,
    httpStatus: error.status || error.code,
    geminiErrorCode: error.statusText || error.error?.code,
    retryAttempt: context.retryAttempt || 0,
    endpoint: context.endpoint,
    metadata: {
      responseLength: context.responseLength,
      promptTokens: context.promptTokens,
      totalTokens: context.totalTokens,
      temperature: context.temperature,
      maxTokens: context.maxTokens
    }
  };

  await logGeminiError(errorInfo);
};

/**
 * Log Gemini parsing errors (JSON parsing, invalid format)
 */
export const logGeminiParsingError = async (error, context = {}) => {
  const errorInfo = {
    errorType: 'parsing_error',
    errorMessage: `Parsing error: ${error.message}`,
    stack: error.stack,
    geminiModel: context.model || 'gemini-2.5-flash',
    apiEndpoint: context.apiEndpoint || 'parseResponse',
    prompt: context.prompt,
    fileType: context.fileType,
    language: context.language,
    responseText: context.responseText,
    endpoint: context.endpoint,
    metadata: {
      responseTextSample: context.responseText?.substring(0, 500),
      expectedFormat: context.expectedFormat
    }
  };

  await logGeminiError(errorInfo);
};

/**
 * Log Gemini validation errors (garbage characters, invalid content)
 */
export const logGeminiValidationError = async (message, context = {}) => {
  const errorInfo = {
    errorType: 'validation_error',
    errorMessage: `Validation error: ${message}`,
    geminiModel: context.model || 'gemini-2.5-flash',
    apiEndpoint: context.apiEndpoint,
    prompt: context.prompt,
    fileType: context.fileType,
    language: context.language,
    endpoint: context.endpoint,
    metadata: {
      garbagePatterns: context.garbagePatterns,
      contentSample: context.contentSample?.substring(0, 500),
      validationRules: context.validationRules
    }
  };

  await logGeminiError(errorInfo);
};

/**
 * Log Gemini rate limit errors
 */
export const logGeminiRateLimitError = async (error, context = {}) => {
  const errorInfo = {
    errorType: 'rate_limit',
    errorMessage: `Rate limit exceeded: ${error.message}`,
    stack: error.stack,
    geminiModel: context.model || 'gemini-2.5-flash',
    apiEndpoint: context.apiEndpoint,
    retryAttempt: context.retryAttempt || 0,
    endpoint: context.endpoint,
    metadata: {
      retryAfter: error.retryAfter,
      quotaLimit: context.quotaLimit
    }
  };

  await logGeminiError(errorInfo);
};

/**
 * Determine Gemini error type from error object
 */
const getGeminiErrorType = (error) => {
  if (error.status === 429) return 'rate_limit';
  if (error.status >= 400 && error.status < 500) return 'client_error';
  if (error.status >= 500) return 'server_error';
  if (error.message?.includes('JSON')) return 'parsing_error';
  if (error.message?.includes('timeout')) return 'timeout';
  return 'api_error';
};

/**
 * Get Gemini error statistics
 */
export const getGeminiErrorStats = async (days = 7) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gemini_error_logs')
      .select('error_type, created_at')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const stats = {
      total: data.length,
      byType: data.reduce((acc, error) => {
        acc[error.error_type] = (acc[error.error_type] || 0) + 1;
        return acc;
      }, {}),
      byDay: data.reduce((acc, error) => {
        const day = error.created_at.split('T')[0];
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {})
    };

    return stats;
  } catch (error) {
    console.error('Error getting Gemini error stats:', error);
    return null;
  }
};
export const geminiErrorApiService = {
  /**
   * Get Gemini errors with filters
   */
  getErrors: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/gemini-errors?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Gemini errors:', error);
      throw error;
    }
  },

  /**
   * Get error statistics
   */
  getErrorStats: async (days = 30) => {
    try {
      const response = await fetch(`/api/gemini-errors/stats?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Gemini error stats:', error);
      throw error;
    }
  },

  /**
   * Get specific error by ID
   */
  getErrorById: async (id) => {
    try {
      const response = await fetch(`/api/gemini-errors/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Gemini error:', error);
      throw error;
    }
  },

  /**
   * Get filter options
   */
  getFilterOptions: async (days = 30) => {
    try {
      const response = await fetch(`/api/gemini-errors/filters/options?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching filter options:', error);
      throw error;
    }
  },

  /**
   * Delete error log
   */
  deleteError: async (id) => {
    try {
      const response = await fetch(`/api/gemini-errors/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting Gemini error:', error);
      throw error;
    }
  },

  /**
   * Clear old errors
   */
  clearOldErrors: async (days = 90) => {
    try {
      const response = await fetch('/api/gemini-errors/clear-old', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ days })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing old errors:', error);
      throw error;
    }
  }
};
export default {
  logGeminiError,
  logGeminiApiError,
  logGeminiParsingError,
  logGeminiValidationError,
  logGeminiRateLimitError,
  getGeminiErrorStats,
  geminiErrorApiService,
};