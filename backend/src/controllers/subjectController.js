import { getAllSubjects, getSubjectById } from '../services/subjectService.js';

const COMPULSORY_SUBJECT_TITLES = new Set([
  'Mathematics',
  'Science',
  'Social Studies',
  'Language & Literature (Sinhala)',
  'Language & Literature (Tamil)',
  'English Language',
  'Information & Communication Technology (ICT)',
  'Religion',
  'Health & Physical Education / Aesthetic Education'
]);

// GET /api/subjects
export const listSubjectsHandler = async (req, res) => {
  try {
    const subjects = await getAllSubjects();
    const { compulsory } = req.query;
    const filtered = compulsory === 'true'
      ? subjects.filter(s => COMPULSORY_SUBJECT_TITLES.has(s.name))
      : subjects;
    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('[Backend] List subjects error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list subjects' });
  }
};

// GET /api/subjects/:id
export const getSubjectHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await getSubjectById(id);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    res.json({ success: true, data: subject });
  } catch (error) {
    console.error(`[Backend] Get subject ${req.params.id} error:`, error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get subject' });
  }
};

export default { listSubjectsHandler, getSubjectHandler };
