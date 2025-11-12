// api/contentManagementService.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// SUBJECTS API
export const getSubjects = async (options = {}) => {
  try {
    const { page, limit, search = '', is_active, language, subject_id } = options;
    
    const url = new URL(`${API_BASE_URL}/content-management/subjects`);
    // Only add pagination if explicitly requested
    if (page && limit) {
      url.searchParams.set('page', page);
      url.searchParams.set('limit', limit);
    }
    if (search) url.searchParams.set('search', search);
    if (is_active !== undefined) url.searchParams.set('is_active', is_active);
    if (language) url.searchParams.set('language', language);
    if (subject_id) url.searchParams.set('subject_id', subject_id);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to fetch subjects');
    }
    
    const data = await res.json();
    return {
      subjects: data.subjects || [],
      total: data.total || 0,
      page: data.page || 1,
      totalPages: data.totalPages || 1
    };
  } catch (error) {
    console.error('[Content Management API] Get subjects error:', error);
    throw error;
  }
};

export const toggleSubjectStatus = async (subjectId, isActive) => {
  try {
    const res = await fetch(`${API_BASE_URL}/content-management/subjects/${subjectId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_active: isActive }),
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to toggle subject status');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Content Management API] Toggle subject status error:', error);
    throw error;
  }
};

// HIERARCHICAL CONTENT API
export const getContentHierarchy = async (filters = {}) => {
  try {
    const { language, grade, subject_id } = filters;
    
    const url = new URL(`${API_BASE_URL}/content-management/hierarchy`);
    if (language) url.searchParams.set('language', language);
    if (grade) url.searchParams.set('grade', grade);
    if (subject_id) url.searchParams.set('subject_id', subject_id);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to fetch content hierarchy');
    }
    
    const data = await res.json();
    return data.data || {};
  } catch (error) {
    console.error('[Content Management API] Get content hierarchy error:', error);
    throw error;
  }
};

// LEARNING PACKS API
export const getLearningPacks = async (options = {}) => {
  try {
    const { 
      page, 
      limit, 
      search = '', 
      subject_id, 
      grade, 
      language,
      is_active, 
      is_premium 
    } = options;
    
    const url = new URL(`${API_BASE_URL}/content-management/learning-packs`);
    // Only add pagination if explicitly requested
    if (page && limit) {
      url.searchParams.set('page', page);
      url.searchParams.set('limit', limit);
    }
    if (search) url.searchParams.set('search', search);
    if (subject_id) url.searchParams.set('subject_id', subject_id);
    if (grade) url.searchParams.set('grade', grade);
    if (language) url.searchParams.set('language', language);
    if (is_active !== undefined) url.searchParams.set('is_active', is_active);
    if (is_premium !== undefined) url.searchParams.set('is_premium', is_premium);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to fetch learning packs');
    }
    
    const data = await res.json();
    return {
      learningPacks: data.data || [],
      total: data.total || 0,
      page: data.page || 1,
      totalPages: data.totalPages || 1
    };
  } catch (error) {
    console.error('[Content Management API] Get learning packs error:', error);
    throw error;
  }
};

export const toggleLearningPackStatus = async (packId, isActive) => {
  try {
    const res = await fetch(`${API_BASE_URL}/content-management/learning-packs/${packId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_active: isActive }),
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to toggle learning pack status');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Content Management API] Toggle learning pack status error:', error);
    throw error;
  }
};

export const toggleLearningPackPremium = async (packId, isPremium) => {
  try {
    const res = await fetch(`${API_BASE_URL}/content-management/learning-packs/${packId}/premium`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_premium: isPremium }),
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to toggle learning pack premium status');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Content Management API] Toggle learning pack premium error:', error);
    throw error;
  }
};

export const updateLearningPack = async (packId, packData) => {
  try {
    const res = await fetch(`${API_BASE_URL}/content-management/learning-packs/${packId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(packData),
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to update learning pack');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Content Management API] Update learning pack error:', error);
    throw error;
  }
};

export const deleteLearningPack = async (packId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/content-management/learning-packs/${packId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to delete learning pack');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Content Management API] Delete learning pack error:', error);
    throw error;
  }
};

// QUESTIONS API
export const getQuestions = async (options = {}) => {
  try {
    const { 
      page, 
      limit, 
      search = '', 
      pack_id, 
      question_type, 
      difficulty, 
      is_active,
      language,
      subject_id,
      grade
    } = options;
    
    const url = new URL(`${API_BASE_URL}/content-management/questions`);
    // Only add pagination if explicitly requested
    if (page && limit) {
      url.searchParams.set('page', page);
      url.searchParams.set('limit', limit);
    }
    if (search) url.searchParams.set('search', search);
    if (pack_id) url.searchParams.set('pack_id', pack_id);
    if (question_type) url.searchParams.set('question_type', question_type);
    if (difficulty) url.searchParams.set('difficulty', difficulty);
    if (is_active !== undefined) url.searchParams.set('is_active', is_active);
    if (language) url.searchParams.set('language', language);
    if (subject_id) url.searchParams.set('subject_id', subject_id);
    if (grade) url.searchParams.set('grade', grade);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to fetch questions');
    }
    
    const data = await res.json();
    return {
      questions: data.questions || [],
      total: data.total || 0,
      page: data.page || 1,
      totalPages: data.totalPages || 1
    };
  } catch (error) {
    console.error('[Content Management API] Get questions error:', error);
    throw error;
  }
};

export const toggleQuestionStatus = async (questionId, isActive) => {
  try {
    const res = await fetch(`${API_BASE_URL}/content-management/questions/${questionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_active: isActive }),
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to toggle question status');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Content Management API] Toggle question status error:', error);
    throw error;
  }
};

export const updateQuestion = async (questionId, questionData) => {
  try {
    const res = await fetch(`${API_BASE_URL}/content-management/questions/${questionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(questionData),
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to update question');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Content Management API] Update question error:', error);
    throw error;
  }
};

export const deleteQuestion = async (questionId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/content-management/questions/${questionId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to delete question');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Content Management API] Delete question error:', error);
    throw error;
  }
};

// BULK OPERATIONS API
export const bulkToggleQuestions = async (questionIds, isActive) => {
  try {
    const res = await fetch(`${API_BASE_URL}/content-management/questions/bulk/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids: questionIds, is_active: isActive }),
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to bulk toggle questions');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Content Management API] Bulk toggle questions error:', error);
    throw error;
  }
};

export const bulkToggleLearningPacks = async (packIds, isActive) => {
  try {
    const res = await fetch(`${API_BASE_URL}/content-management/learning-packs/bulk/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids: packIds, is_active: isActive }),
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to bulk toggle learning packs');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Content Management API] Bulk toggle learning packs error:', error);
    throw error;
  }
};

export const bulkToggleLearningPacksPremium = async (packIds, isPremium) => {
  try {
    const res = await fetch(`${API_BASE_URL}/content-management/learning-packs/bulk/premium`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids: packIds, is_premium: isPremium }),
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to bulk toggle learning packs premium');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Content Management API] Bulk toggle learning packs premium error:', error);
    throw error;
  }
};

export default {
  getSubjects,
  toggleSubjectStatus,
  getLearningPacks,
  toggleLearningPackStatus,
  toggleLearningPackPremium,
  getQuestions,
  toggleQuestionStatus,
  bulkToggleQuestions,
  bulkToggleLearningPacks,
  bulkToggleLearningPacksPremium
};