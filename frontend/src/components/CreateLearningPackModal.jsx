import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import Input from './ui/Input';
import Button from './ui/Button';
import { getSubjects } from '../api/subjectService';
import { createLearningPack } from '../api/learningPackService';

const CreateLearningPackModal = ({ open, onOpenChange, onCreated }) => {
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    language: 'English',
    subject_id: '',
    grade: '',
    title: '',
    difficulty: 'Medium',
    description: ''
  });

  // Map display language names to codes expected by backend
  const languageMap = {
    English: 'en',
    Sinhala: 'si',
    Tamil: 'ta'
  };

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        setLoadingSubjects(true);
        setError('');
        // Load ALL subjects so manual packs can be created for any subject
        const list = await getSubjects();
        setSubjects(list);
      } catch (e) {
        setError(e.message || 'Failed to load subjects');
      } finally {
        setLoadingSubjects(false);
      }
    };
    load();
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject_id || !form.grade || !form.title) {
      setError('Subject, grade, and title are required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      
      // Convert grade to "Grade 6", "Grade 7", etc. format
      const formattedGrade = `Grade ${form.grade}`;

      // Convert language display name to backend code (en/si/ta)
      const languageCode = languageMap[form.language] || 'en';
      
      const created = await createLearningPack({
        subject_id: form.subject_id,
        grade: formattedGrade, 
        title: form.title,
        difficulty: form.difficulty,
        description: form.description,
        language: languageCode
      });
      
      onCreated?.(created);
      onOpenChange(false);
      setForm({ language: 'English', subject_id: '', grade: '', title: '', difficulty: 'Medium', description: '' });
    } catch (e) {
      setError(e.message || 'Failed to create learning pack');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Learning Pack</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
            >
              {['English', 'Sinhala', 'Tamil'].map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <select
              value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
            >
              <option value="">Select subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {loadingSubjects && <p className="text-xs text-gray-500 mt-1">Loading subjects...</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Grade</label>
            <Input 
              type="number" 
              min="6" 
              max="11" 
              value={form.grade} 
              onChange={(e) => {
                const value = parseInt(e.target.value);
                // Only allow values between 6 and 11
                if (value >= 6 && value <= 11) {
                  setForm({ ...form, grade: value });
                } else if (e.target.value === '') {
                  setForm({ ...form, grade: '' });
                }
              }}
              onBlur={(e) => {
                // On blur, ensure value is within range
                const value = parseInt(e.target.value);
                if (isNaN(value) || value < 6) {
                  setForm({ ...form, grade: 6 });
                } else if (value > 11) {
                  setForm({ ...form, grade: 11 });
                }
              }}
              placeholder="Enter 6-11"
            />
            <p className="text-xs text-gray-500 mt-1">Will be stored as "Grade {form.grade || '6'}"</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
            >
              {['Easy', 'Medium', 'Hard'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Pack'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLearningPackModal;