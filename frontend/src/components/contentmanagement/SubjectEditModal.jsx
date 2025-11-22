import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

const SubjectEditModal = ({ subject, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    name_si: '',
    name_ta: '',
    description: '',
    description_si: '',
    description_ta: '',
    color: '#06D6A0',
    is_active: true
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subject && isOpen) {
      setFormData({
        name: subject.name || '',
        name_si: subject.name_si || '',
        name_ta: subject.name_ta || '',
        description: subject.description || '',
        description_si: subject.description_si || '',
        description_ta: subject.description_ta || '',
        color: subject.color || '#06D6A0',
        is_active: subject.is_active !== undefined ? subject.is_active : true
      });
      setErrors({});
    }
  }, [subject, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Subject name (English) is required';
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
      await onSave(subject.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving subject:', error);
      setErrors({ general: error.message || 'Failed to save subject' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      name_si: '',
      name_ta: '',
      description: '',
      description_si: '',
      description_ta: '',
      color: '#06D6A0',
      is_active: true
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Subject
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
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

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Name (English) *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter subject name in English"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Name (Sinhala)
              </label>
              <input
                type="text"
                value={formData.name_si}
                onChange={(e) => handleInputChange('name_si', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="විෂය නම සිංහලෙන්"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Name (Tamil)
              </label>
              <input
                type="text"
                value={formData.name_ta}
                onChange={(e) => handleInputChange('name_ta', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="பாட பெயர் தமிழில்"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (English)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter subject description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Sinhala)
              </label>
              <textarea
                value={formData.description_si}
                onChange={(e) => handleInputChange('description_si', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="විෂය විස්තරය..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Tamil)
              </label>
              <textarea
                value={formData.description_ta}
                onChange={(e) => handleInputChange('description_ta', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="பாட விளக்கம்..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
              className="w-full h-10 px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
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
          </div>
        </div>

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

export default SubjectEditModal;