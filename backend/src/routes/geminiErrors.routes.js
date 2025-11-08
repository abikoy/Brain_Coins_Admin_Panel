import express from 'express';
import { supabaseAdmin } from '../config/supabaseClient.js';
import { geminiErrorApiService, logGeminiError } from '../services/geminiErrorService.js';

const router = express.Router();

/**
 * GET /api/gemini-errors
 * Fetch Gemini errors with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      error_type,
      language,
      file_type,
      days = 7,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Calculate date range
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Build query
    let query = supabaseAdmin
      .from('gemini_error_logs')
      .select('*', { count: 'exact' })
      .gte('created_at', sinceDate)
      .order(sort_by, { ascending: sort_order === 'asc' });

    // Apply filters
    if (error_type) {
      query = query.eq('error_type', error_type);
    }

    if (language) {
      query = query.eq('language', language);
    }

    if (file_type) {
      query = query.eq('file_type', file_type);
    }

    if (search) {
      query = query.or(`error_message.ilike.%${search}%,endpoint.ilike.%${search}%,gemini_error_code.ilike.%${search}%`);
    }

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        pages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Error fetching Gemini errors:', error);
    await logGeminiError(error, req, '/api/gemini-errors');
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/gemini-errors/stats
 * Get error statistics and analytics
 */
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get error count by type
    const { data: typeStats, error: typeError } = await supabaseAdmin
      .from('gemini_error_logs')
      .select('error_type')
      .gte('created_at', sinceDate);

    if (typeError) throw typeError;

    // Get error count by day for timeline
    const { data: dailyStats, error: dailyError } = await supabaseAdmin
      .from('gemini_error_logs')
      .select('created_at, error_type')
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: true });

    if (dailyError) throw dailyError;

    // Get error count by endpoint
    const { data: endpointStats, error: endpointError } = await supabaseAdmin
      .from('gemini_error_logs')
      .select('endpoint')
      .gte('created_at', sinceDate);

    if (endpointError) throw endpointError;

    // Process statistics
    const errorCountByType = typeStats.reduce((acc, error) => {
      acc[error.error_type] = (acc[error.error_type] || 0) + 1;
      return acc;
    }, {});

    const errorCountByDay = dailyStats.reduce((acc, error) => {
      const day = error.created_at.split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const errorCountByEndpoint = endpointStats.reduce((acc, error) => {
      const endpoint = error.endpoint || 'unknown';
      acc[endpoint] = (acc[endpoint] || 0) + 1;
      return acc;
    }, {});

    // Get most common errors
    const { data: commonErrors, error: commonError } = await supabaseAdmin
      .from('gemini_error_logs')
      .select('error_message, error_type, count')
      .gte('created_at', sinceDate)
      .order('count', { ascending: false })
      .limit(10);

    if (commonError) throw commonError;

    const stats = {
      total: typeStats.length,
      byType: errorCountByType,
      byDay: errorCountByDay,
      byEndpoint: errorCountByEndpoint,
      commonErrors: commonErrors || [],
      timeRange: {
        days: parseInt(days),
        since: sinceDate
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching Gemini error stats:', error);
    await logGeminiError(error, req, '/api/gemini-errors/stats');
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/gemini-errors/:id
 * Get specific error by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('gemini_error_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false, 
          error: 'Error log not found' 
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching Gemini error:', error);
    await logGeminiError(error, req, '/api/gemini-errors/:id');
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/gemini-errors/filters/options
 * Get available filter options
 */
router.get('/filters/options', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get unique error types
    const { data: errorTypes, error: typesError } = await supabaseAdmin
      .from('gemini_error_logs')
      .select('error_type')
      .gte('created_at', sinceDate);

    if (typesError) throw typesError;

    // Get unique languages
    const { data: languages, error: langError } = await supabaseAdmin
      .from('gemini_error_logs')
      .select('language')
      .gte('created_at', sinceDate);

    if (langError) throw langError;

    // Get unique file types
    const { data: fileTypes, error: fileError } = await supabaseAdmin
      .from('gemini_error_logs')
      .select('file_type')
      .gte('created_at', sinceDate);

    if (fileError) throw fileError;

    // Get unique endpoints
    const { data: endpoints, error: endpointError } = await supabaseAdmin
      .from('gemini_error_logs')
      .select('endpoint')
      .gte('created_at', sinceDate);

    if (endpointError) throw endpointError;

    const filterOptions = {
      error_types: [...new Set(errorTypes.map(e => e.error_type).filter(Boolean))],
      languages: [...new Set(languages.map(l => l.language).filter(Boolean))],
      file_types: [...new Set(fileTypes.map(f => f.file_type).filter(Boolean))],
      endpoints: [...new Set(endpoints.map(e => e.endpoint).filter(Boolean))],
      time_ranges: [7, 30, 90, 365] // days
    };

    res.json({
      success: true,
      data: filterOptions
    });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    await logGeminiError(error, req, '/api/gemini-errors/filters/options');
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/gemini-errors/:id
 * Delete specific error log (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('gemini_error_logs')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Error log deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting Gemini error:', error);
    await logGeminiError(error, req, '/api/gemini-errors/:id');
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/gemini-errors/clear-old
 * Clear errors older than specified days
 */
router.post('/clear-old', async (req, res) => {
  try {
    const { days = 90 } = req.body;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('gemini_error_logs')
      .delete()
      .lt('created_at', cutoffDate)
      .select('count');

    if (error) {
      throw error;
    }

    const deletedCount = data?.length || 0;

    res.json({
      success: true,
      message: `Cleared ${deletedCount} error logs older than ${days} days`,
      deleted_count: deletedCount
    });

  } catch (error) {
    console.error('Error clearing old Gemini errors:', error);
    await logGeminiError(error, req, '/api/gemini-errors/clear-old');
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;