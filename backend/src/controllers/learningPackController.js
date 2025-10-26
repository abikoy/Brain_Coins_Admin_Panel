import { 
  getLearningPacksBySubject,
  getLearningPackWithSubject,
  createLearningPack
} from '../services/learningPackService.js';

// GET /api/learning-packs
// Optional query: subject_id
export const listLearningPacksHandler = async (req, res) => {
  try {
    const { subject_id } = req.query;

    if (subject_id) {
      const packs = await getLearningPacksBySubject(subject_id);
      return res.json({ success: true, data: packs });
    }

    // If no filter, list all active packs
    // Reuse service via subject filter is not possible; query directly via supabaseAdmin here
    // but to keep layering, we'll call getLearningPacksBySubject only when provided.
    // For all packs, we fetch via subject_id wildcard using RPC is overkill; do a direct query here.
    // Import supabaseAdmin lazily to avoid circular refs.
    const { supabaseAdmin } = await import('../config/supabaseClient.js');
    const { data, error } = await supabaseAdmin
      .from('learning_packs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[Backend] List learning packs error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list learning packs' });
  }
};

// GET /api/learning-packs/:id
export const getLearningPackHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const pack = await getLearningPackWithSubject(id);
    if (!pack) {
      return res.status(404).json({ success: false, error: 'Learning pack not found' });
    }
    res.json({ success: true, data: pack });
  } catch (error) {
    console.error(`[Backend] Get learning pack ${req.params.id} error:`, error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get learning pack' });
  }
};

// POST /api/learning-packs
export const createLearningPackHandler = async (req, res) => {
  try {
    const { subject_id, grade, title, title_si, title_ta, difficulty, description, is_active } = req.body;

    if (!subject_id || !grade || !title) {
      return res.status(400).json({ success: false, error: 'subject_id, grade, and title are required' });
    }

    const gradeNum = Number(grade);
    if (!Number.isInteger(gradeNum) || gradeNum < 6 || gradeNum > 11) {
      return res.status(400).json({ success: false, error: 'grade must be an integer between 6 and 11' });
    }

    const pack = await createLearningPack({
      subject_id,
      grade: gradeNum,
      title,
      title_si,
      title_ta,
      difficulty: difficulty || 'Medium',
      description: description || '',
      is_active: is_active !== false
    });

    res.status(201).json({ success: true, data: pack });
  } catch (error) {
    console.error('[Backend] Create learning pack error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create learning pack' });
  }
};

export default {
  listLearningPacksHandler,
  getLearningPackHandler,
  createLearningPackHandler
};
