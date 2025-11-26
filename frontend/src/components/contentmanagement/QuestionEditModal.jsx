import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Plus, Image as ImageIcon } from 'lucide-react';
import Button from '../ui/Button';
import { uploadQuestionDiagram } from '../../api/questionDiagramService';

const QuestionEditModal = ({ question, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    question_text: '',
    question_text_si: '',
    question_text_ta: '',
    question_type: 'MCQ',
    difficulty: 'Medium',
    blooms_taxonomy: 'Remember',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    explanation_si: '',
    explanation_ta: '',
    is_active: true
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [diagramFile, setDiagramFile] = useState(null);
  const [diagramPreview, setDiagramPreview] = useState(null);

  // Initialize form data when question changes
  useEffect(() => {
    if (question && isOpen) {
      setFormData({
        question_text: question.question_text || '',
        question_text_si: question.question_text_si || '',
        question_text_ta: question.question_text_ta || '',
        question_type: question.question_type || 'MCQ',
        difficulty: question.difficulty || 'Medium',
        blooms_taxonomy: question.blooms_taxonomy || question.bloom_level || 'Remember',
        options: question.options || ['', '', '', ''],
        correct_answer: question.correct_answer || '',
        explanation: question.explanation || '',
        explanation_si: question.explanation_si || '',
        explanation_ta: question.explanation_ta || '',
        is_active: question.is_active !== undefined ? question.is_active : true
      });
      setErrors({});
    }
  }, [question, isOpen]);

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

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.question_text.trim()) {
      newErrors.question_text = 'Question text is required';
    }

    if (!formData.question_type) {
      newErrors.question_type = 'Question type is required';
    }

    if (formData.question_type === 'MCQ') {
      const filledOptions = formData.options.filter(opt => opt.trim());
      if (filledOptions.length < 2) {
        newErrors.options = 'At least 2 options are required for MCQ';
      }
      if (!formData.correct_answer.trim()) {
        newErrors.correct_answer = 'Correct answer is required for MCQ';
      }
    }

    if (formData.question_type === 'FIIB' && !formData.correct_answer.trim()) {
      newErrors.correct_answer = 'Correct answer is required for Fill in the Blanks';
    }

    if (formData.question_type === 'TF' && !['True', 'False'].includes(formData.correct_answer)) {
      newErrors.correct_answer = 'Correct answer must be "True" or "False" for True/False questions';
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
      await onSave(question.id, formData);
      
      // Upload diagram if provided
      if (diagramFile) {
        try {
          await uploadQuestionDiagram(question.id, diagramFile);
        } catch (diagramError) {
          console.error('Diagram upload error:', diagramError);
          setErrors({ general: 'Question updated but diagram upload failed' });
          return;
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving question:', error);
      setErrors({ general: error.message || 'Failed to save question' });
    } finally {
      setSaving(false);
    }
  };

  const handleDiagramChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setErrors({ diagram: 'Invalid file type. Please upload an image.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ diagram: 'File size exceeds 5MB limit' });
      return;
    }

    setDiagramFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setDiagramPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeDiagram = () => {
    setDiagramFile(null);
    setDiagramPreview(null);
  };

  const handleClose = () => {
    setFormData({
      question_text: '',
      question_text_si: '',
      question_text_ta: '',
      question_type: 'MCQ',
      difficulty: 'Medium',
      blooms_taxonomy: 'Remember',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      explanation_si: '',
      explanation_ta: '',
      is_active: true
    });
    setErrors({});
    setDiagramFile(null);
    setDiagramPreview(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Question
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

          {/* Question Text */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text *
              </label>
              <textarea
                value={formData.question_text}
                onChange={(e) => handleInputChange('question_text', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.question_text ? 'border-red-300' : 'border-gray-300'
                }`}
                rows={3}
                placeholder="Enter the question text..."
              />
              {errors.question_text && (
                <p className="mt-1 text-sm text-red-600">{errors.question_text}</p>
              )}
            </div>

       

          </div>

          {/* Diagram Upload */}
          <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-blue-600" />
              Diagram (Optional)
            </label>
            {!diagramPreview ? (
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDiagramChange}
                  className="hidden"
                  id="diagram-upload"
                />
                <label
                  htmlFor="diagram-upload"
                  className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Choose Image
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={diagramPreview}
                  alt="Diagram preview"
                  className="max-w-full h-auto max-h-64 rounded-lg border-2 border-gray-200"
                />
                <button
                  onClick={removeDiagram}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {errors.diagram && (
              <p className="mt-1 text-sm text-red-600">{errors.diagram}</p>
            )}
          </div>

          {/* Question Properties */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type *
              </label>
              <select
                value={formData.question_type}
                onChange={(e) => handleInputChange('question_type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.question_type ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="FIIB">Fill in the Blanks (FIIB)</option>
                <option value="TF">True/False (TF)</option>
                <option value="HOQ">Higher Order (HOQ)</option>
              </select>
              {errors.question_type && (
                <p className="mt-1 text-sm text-red-600">{errors.question_type}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bloom's Level
              </label>
              <select
                value={formData.blooms_taxonomy}
                onChange={(e) => handleInputChange('blooms_taxonomy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Remember">Remember</option>
                <option value="Understand">Understand</option>
                <option value="Apply">Apply</option>
                <option value="Analyze">Analyze</option>
                <option value="Evaluate">Evaluate</option>
                <option value="Create">Create</option>
              </select>
            </div>
          </div>

          {/* Options (for MCQ) */}
          {formData.question_type === 'MCQ' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Answer Options *
              </label>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500 w-8">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                  </div>
                ))}
              </div>
              {errors.options && (
                <p className="mt-1 text-sm text-red-600">{errors.options}</p>
              )}
            </div>
          )}

          {/* Correct Answer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answer *
            </label>
            {formData.question_type === 'TF' ? (
              <select
                value={formData.correct_answer}
                onChange={(e) => handleInputChange('correct_answer', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.correct_answer ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select answer...</option>
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            ) : (
              <input
                type="text"
                value={formData.correct_answer}
                onChange={(e) => handleInputChange('correct_answer', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.correct_answer ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={
                  formData.question_type === 'MCQ' 
                    ? 'Enter the correct option (A, B, C, or D)' 
                    : 'Enter the correct answer'
                }
              />
            )}
            {errors.correct_answer && (
              <p className="mt-1 text-sm text-red-600">{errors.correct_answer}</p>
            )}
          </div>

          {/* Explanation */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => handleInputChange('explanation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Explain why this is the correct answer..."
              />
            </div>

           
          </div>

          {/* Status */}
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

export default QuestionEditModal;
