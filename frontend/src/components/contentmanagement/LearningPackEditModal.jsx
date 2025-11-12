import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

const LearningPackEditModal = ({ learningPack, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    title_si: '',
    title_ta: '',
    description: '',
    difficulty: 'Medium',
    language: 'en',
    is_active: true,
    is_premium: false
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Initialize form data when learning pack changes
  useEffect(() => {
    if (learningPack && isOpen) {
      setFormData({
        title: learningPack.title || '',
        title_si: learningPack.title_si || '',
        title_ta: learningPack.title_ta || '',
        description: learningPack.description || '',
        difficulty: learningPack.difficulty || 'Medium',
        language: learningPack.language || 'en',
        is_active: learningPack.is_active !== undefined ? learningPack.is_active : true,
        is_premium: learningPack.is_premium !== undefined ? learningPack.is_premium : false
      });
      setErrors({});
    }
  }, [learningPack, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.language) {
      newErrors.language = 'Language is required';
    }

    if (!formData.difficulty) {
      newErrors.difficulty = 'Difficulty is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      await onSave(learningPack.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving learning pack:', error);
      setErrors({ general: error.message || 'Failed to save learning pack' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      title_si: '',
      title_ta: '',
      description: '',
      difficulty: 'Medium',
      language: 'en',
      is_active: true,
      is_premium: false
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Learning Pack
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          {/* Title Fields */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title (English) *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter learning pack title..."
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title (Sinhala)
              </label>
              <input
                type="text"
                value={formData.title_si}
                onChange={(e) => handleInputChange('title_si', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="සිංහල මාතෘකාව..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title (Tamil)
              </label>
              <input
                type="text"
                value={formData.title_ta}
                onChange={(e) => handleInputChange('title_ta', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="தமிழ் தலைப்பு..."
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter description..."
            />
          </div>

          {/* Properties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty *
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.difficulty ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              {errors.difficulty && (
                <p className="mt-1 text-sm text-red-600">{errors.difficulty}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language *
              </label>
              <select
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.language ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="en">English</option>
                <option value="si">Sinhala</option>
                <option value="ta">Tamil</option>
              </select>
              {errors.language && (
                <p className="mt-1 text-sm text-red-600">{errors.language}</p>
              )}
            </div>
          </div>

          {/* Status Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Active (visible to students)
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_premium}
                onChange={(e) => handleInputChange('is_premium', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Premium content
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LearningPackEditModal;
