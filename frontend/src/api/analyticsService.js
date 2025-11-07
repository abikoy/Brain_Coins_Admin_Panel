const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get real-time dashboard statistics
 * @returns {Promise<Object>} - Dashboard stats
 */
export const getDashboardStats = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to fetch dashboard stats');
    }
    
    const data = await res.json();
    return data.data || {};
  } catch (error) {
    console.error('[Analytics API] Get dashboard stats error:', error);
    throw error;
  }
};

/**
 * Get comprehensive dashboard analytics
 * @returns {Promise<Object>} - Complete dashboard data
 */
export const getDashboardAnalytics = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to fetch dashboard analytics');
    }
    
    const data = await res.json();
    return data.data || {};
  } catch (error) {
    console.error('[Analytics API] Get dashboard analytics error:', error);
    throw error;
  }
};

/**
 * Get student list with progress data
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {string} options.search - Search term
 * @param {boolean} options.premiumOnly - Filter premium students only
 * @returns {Promise<Object>} - Students data with pagination
 */
export const getStudents = async (options = {}) => {
  try {
    const { page = 1, limit = 50, search = '', premiumOnly = false } = options;
    
    const url = new URL(`${API_BASE_URL}/analytics/students`);
    url.searchParams.set('page', page);
    url.searchParams.set('limit', limit);
    if (search) url.searchParams.set('search', search);
    if (premiumOnly) url.searchParams.set('premium_only', 'true');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to fetch students');
    }
    
    const data = await res.json();
    return {
      students: data.data || [],
      total: data.total || 0,
      page: data.page || 1,
      totalPages: data.totalPages || 1
    };
  } catch (error) {
    console.error('[Analytics API] Get students error:', error);
    throw error;
  }
};

/**
 * Get student progress analytics
 * @param {string} timeRange - Time range filter (day, week, month)
 * @returns {Promise<Array>} - Progress data
 */
export const getStudentProgress = async (timeRange = 'week') => {
  try {
    const url = new URL(`${API_BASE_URL}/analytics/progress`);
    url.searchParams.set('timeRange', timeRange);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to fetch student progress');
    }
    
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('[Analytics API] Get student progress error:', error);
    throw error;
  }
};

/**
 * Get premium analytics and revenue data
 * @returns {Promise<Object>} - Premium analytics data
 */
export const getPremiumAnalytics = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/premium`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to fetch premium analytics');
    }
    
    const data = await res.json();
    return data.data || {};
  } catch (error) {
    console.error('[Analytics API] Get premium analytics error:', error);
    throw error;
  }
};
// Add these functions to your existing analyticsService.js

/**
 * Update student premium status
 */
export const updateStudentPremiumStatus = async (studentId, isPremium, premiumUntil = null) => {
  try {
    const payload = {
      is_premium: isPremium,
      ...(premiumUntil && { premium_until: premiumUntil })
    };

    const res = await fetch(`${API_BASE_URL}/analytics/students/${studentId}/premium`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to update premium status');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Analytics API] Update premium status error:', error);
    throw error;
  }
};

/**
 * Create manual subscription for student
 */
export const createManualSubscription = async (
  studentId, 
  amount, 
  currency = 'LKR', 
  plan_type = 'individual', 
  interval = 'monthly', 
  product_id
) => {
  try {
    const payload = {
      amount,
      currency,
      plan_type,
      interval,
      product_id
    };
    const res = await fetch(`${API_BASE_URL}/analytics/students/${studentId}/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to create subscription');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Analytics API] Create manual subscription error:', error);
    throw error;
  }
};

/**
 * Get student details
 */
export const getStudentDetails = async (studentId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/students/${studentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to fetch student details');
    }
    
    const data = await res.json();
    return data.data || {};
  } catch (error) {
    console.error('[Analytics API] Get student details error:', error);
    throw error;
  }
};

export const getSystemLogs = async (options = {}) => {
  try {
    const { type = '', limit = 100 } = options;
    
    const url = new URL(`${API_BASE_URL}/analytics/logs`);
    if (type) url.searchParams.set('type', type);
    url.searchParams.set('limit', limit);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to fetch system logs');
    }
    
    const data = await res.json();
    return data.logs || [];
  } catch (error) {
    console.error('[Analytics API] Get system logs error:', error);
    throw error;
  }
};

/**
 * Export analytics data
 * @param {string} format - Export format (csv, json)
 * @param {Object} filters - Export filters
 * @returns {Promise<Blob>} - Exported data blob
 */
export const exportAnalyticsData = async (format = 'csv', filters = {}) => {
  try {
    const url = new URL(`${API_BASE_URL}/analytics/export`);
    url.searchParams.set('format', format);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const res = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch {}
      throw new Error(err?.error || 'Failed to export analytics data');
    }
    
    return await res.blob();
  } catch (error) {
    console.error('[Analytics API] Export analytics error:', error);
    throw error;
  }
};

export default {
  getDashboardStats,
  getDashboardAnalytics,
  getStudents,
  getStudentProgress,
  getPremiumAnalytics,
  updateStudentPremiumStatus,
  createManualSubscription,
  getStudentDetails,
  getSystemLogs,
  exportAnalyticsData
};