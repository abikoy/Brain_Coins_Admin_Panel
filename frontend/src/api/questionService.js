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
      pack_id,
      count = 5,
      difficulty = 'Intermediate',
      types = ['MCQ', 'FIIB', 'TF', 'HOQ', 'MATCH', 'DIAGRAM', 'IMAGE_MCQ'],
      language = 'English',
      bloom_level = 'Understand'
    } = options;

    if (!pack_id) {
      throw new Error('Please select a learning pack');
    }

    console.log('[Frontend API] Calling backend to generate questions:', {
      fileUrl,
      fileType,
      pack_id,
      count,
      difficulty
    });

    const response = await fetch(`${API_BASE_URL}/questions/generate-from-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        fileUrl,
        fileType,
        pack_id,
        count,
        difficulty,
        types,
        language,
        bloom_level
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate questions');
    }

    const data = await response.json();

    console.log('[Frontend API] Questions generated:', data.count);

    // Normalize to UI shape
    const normalized = (data.questions || []).map(q => ({
      ...q,
      type: q.type || q.question_type || 'MCQ',
      question: q.question || q.question_text || q.question_text_si || q.question_text_ta || '',
      answer: q.answer || q.correct_answer || '',
      options: Array.isArray(q.options) ? q.options : [],
      pairs: Array.isArray(q.pairs) ? q.pairs : [],
      diagram: q.diagram || undefined,
      reasoning: q.reasoning || undefined,
    }));

    return {
      questions: normalized,
      summary_bullets: Array.isArray(data.summary_bullets) ? data.summary_bullets : []
    };
  } catch (error) {
    console.error('[Frontend API] Generate questions error:', error);
    throw error;
  }
};

/**
 * Get summary by pack_id
 */
export const getSummaryByPack = async (pack_id) => {
  try {
    const res = await fetch(`${API_BASE_URL}/questions/summaries/${pack_id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch summary');
    }
    const data = await res.json();
    const bullets = data?.data?.bullets || [];
    return Array.isArray(bullets) ? bullets : [];
  } catch (e) {
    console.error('[Frontend API] Get summary error:', e);
    throw e;
  }
};

/**
 * Upsert summary bullets by pack_id
 */
export const upsertSummaryByPack = async (pack_id, bullets) => {
  try {
    const res = await fetch(`${API_BASE_URL}/questions/summaries/${pack_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bullets })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save summary');
    }
    const data = await res.json();
    const bulletsOut = data?.data?.bullets || bullets || [];
    return Array.isArray(bulletsOut) ? bulletsOut : [];
  } catch (e) {
    console.error('[Frontend API] Upsert summary error:', e);
    throw e;
  }
};

/**
 * Create a single manual question
 * @param {Object} payload - { pack_id, type, difficulty, question, answer, options, language, blooms_taxonomy }
 * @returns {Promise<Object>} - Created question (UI shape)
 */
export const createQuestion = async (payload) => {
  try {
    console.log('[Frontend API] Creating question:', payload);

    const response = await fetch(`${API_BASE_URL}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create question');
    }

    const data = await response.json();
    const q = data.question || {};
    const normalized = {
      ...q,
      id: q.id,
      type: q.type || q.question_type || 'MCQ',
      question: q.question || q.question_text || q.question_text_si || q.question_text_ta || '',
      answer: q.answer || q.correct_answer || '',
      options: Array.isArray(q.options) ? q.options : [],
      pairs: Array.isArray(q.pairs) ? q.pairs : [],
      diagram: q.diagram || undefined,
      reasoning: q.reasoning || undefined,
      generated: q.generated !== undefined ? q.generated : false,
    };
    return normalized;
  } catch (error) {
    console.error('[Frontend API] Create question error:', error);
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

    const q = data.question || {};
    // Normalize to UI shape
    const normalized = {
      ...q,
      id: q.id,
      type: q.type || q.question_type || 'MCQ',
      question: q.question || q.question_text || q.question_text_si || q.question_text_ta || '',
      answer: q.answer || q.correct_answer || '',
      options: Array.isArray(q.options) ? q.options : [],
      pairs: Array.isArray(q.pairs) ? q.pairs : [],
      diagram: q.diagram || undefined,
      reasoning: q.reasoning || undefined,
      generated: q.generated !== undefined ? q.generated : true,
    };
    return normalized;
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

    const q = data.question || {};
    // Normalize to UI shape
    const normalized = {
      ...q,
      id: q.id,
      type: q.type || q.question_type || 'MCQ',
      question: q.question || q.question_text || q.question_text_si || q.question_text_ta || '',
      answer: q.answer || q.correct_answer || '',
      options: Array.isArray(q.options) ? q.options : [],
      pairs: Array.isArray(q.pairs) ? q.pairs : [],
      diagram: q.diagram || undefined,
      reasoning: q.reasoning || undefined,
      generated: q.generated !== undefined ? q.generated : true,
    };
    return normalized;
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
