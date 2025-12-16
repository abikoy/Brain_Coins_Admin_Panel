import React, { useState, useEffect } from 'react';
import GlassCard from '../components/shared/GlassCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toast from '../components/ui/Toast';
import { 
  Edit, 
  Trash2, 
  AlertCircle, 
  X, 
  Search,
  Filter,
  Save,
  Eye,
  EyeOff,
  Plus,
  Image as ImageIcon
} from 'lucide-react';
import contentManagementService, { updateQuestion, deleteQuestion } from '../api/contentManagementService';
import { getSubjects } from '../api/subjectService';
import { getLearningPacks } from '../api/learningPackService';
import { uploadQuestionDiagram } from '../api/questionDiagramService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';

const QuestionEditor = () => {
  // Data state
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [learningPacks, setLearningPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    subject: '',
    pack: '',
    type: '',
    difficulty: '',
    language: '',
    grade: '',
    status: 'all'
  });
  
  // UI state
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  

  
  // Diagram state
  const [diagramFile, setDiagramFile] = useState(null);
  const [diagramPreview, setDiagramPreview] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [currentPage, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build API filters
      const apiFilters = {
        page: currentPage,
        limit: itemsPerPage,
        ...(filters.search && { search: filters.search }),
        ...(filters.subject && { subject_id: filters.subject }),
        ...(filters.pack && { pack_id: filters.pack }),
        ...(filters.type && { question_type: filters.type }),
        ...(filters.difficulty && { difficulty: filters.difficulty }),
        ...(filters.language && { 
          language: filters.language === 'English' ? 'en' : 
                   filters.language === 'Sinhala' ? 'si' : 
                   filters.language === 'Tamil' ? 'ta' : filters.language 
        }),
        ...(filters.grade && { grade: filters.grade }),
        ...(filters.status !== 'all' && { is_active: filters.status === 'active' })
      };

      const [questionsResult, subjectsResult, packsResult] = await Promise.all([
        contentManagementService.getQuestions(apiFilters),
        getSubjects(),
        getLearningPacks()
      ]);

      setQuestions(questionsResult.questions || []);
      setTotalPages(questionsResult.totalPages || 1);
      setSubjects(subjectsResult || []);
      setLearningPacks(packsResult || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setToast({ message: 'Failed to load questions', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle question editing
  const handleEditQuestion = (question) => {
    setEditingQuestion({
      ...question,
      question_text: question.question_text || question.question || '',
      options: question.options || ['', '', '', ''],
      correct_answer: question.correct_answer || question.answer || '',
      explanation: question.explanation || question.explanations || '',
      language: question.language || 'English',
      blooms_taxonomy: question.blooms_taxonomy || question.bloom_level || 'Remember'
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);

      // Prepare data for API
      const updateData = {
        question_text: editingQuestion.question_text,
        question_text_si: editingQuestion.question_text_si || '',
        question_text_ta: editingQuestion.question_text_ta || '',
        question_type: editingQuestion.question_type,
        difficulty: editingQuestion.difficulty,
        blooms_taxonomy: editingQuestion.blooms_taxonomy || editingQuestion.bloom_level || 'Remember',
        options: editingQuestion.options,
        correct_answer: editingQuestion.correct_answer,
        explanation: editingQuestion.explanation,
        explanation_si: editingQuestion.explanation_si || '',
        explanation_ta: editingQuestion.explanation_ta || '',
        is_active: editingQuestion.is_active
      };

      await updateQuestion(editingQuestion.id, updateData);

      // Upload diagram if provided
      if (diagramFile) {
        try {
          await uploadQuestionDiagram(editingQuestion.id, diagramFile);
        } catch (diagramError) {
          console.error('Diagram upload error:', diagramError);
          setToast({ message: 'Question updated but diagram upload failed', type: 'warning' });
        }
      }

      setIsEditModalOpen(false);
      setEditingQuestion(null);
      setDiagramFile(null);
      setDiagramPreview(null);
      setToast({ message: 'Question updated successfully!', type: 'success' });
      fetchData();
    } catch (error) {
      console.error('Error updating question:', error);
      setToast({ message: 'Failed to update question', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await deleteQuestion(questionId);
      setToast({ message: 'Question deleted successfully!', type: 'success' });
      fetchData();
    } catch (error) {
      console.error('Error deleting question:', error);
      setToast({ message: 'Failed to delete question', type: 'error' });
    }
  };



  // Handle diagram upload
  const handleDiagramChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setToast({ message: 'Invalid file type. Please upload an image.', type: 'error' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'File size exceeds 5MB limit', type: 'error' });
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

  // Handle option changes
  const handleOptionChange = (index, value) => {
    const newOptions = [...editingQuestion.options];
    newOptions[index] = value;
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  // Get question type color
  const getTypeColor = (type) => {
    const colors = {
      'MCQ': 'default',
      'FIIB': 'secondary',
      'TF': 'outline',
      'HOQ': 'default'
    };
    return colors[type] || 'default';
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    const colors = {
      'Easy': 'success',
      'Medium': 'warning',
      'Hard': 'danger'
    };
    return colors[difficulty] || 'default';
  };

  // Filter options
  const questionTypes = ['MCQ', 'FIIB', 'TF', 'HOQ'];
  const difficulties = ['Easy', 'Medium', 'Hard'];
  const languages = ['English', 'Sinhala', 'Tamil'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Question Editor
        </h2>
        <p className="text-gray-600">Edit and manage questions with modern interface</p>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search questions..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value, pack: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>

            {/* Learning Pack */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Learning Pack</label>
              <select
                value={filters.pack}
                onChange={(e) => setFilters({ ...filters, pack: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!filters.subject && !filters.grade && !filters.language && learningPacks.length === 0}
              >
                <option value="">All Learning Packs</option>
                {learningPacks
                  .filter(pack => {
                    // Filter by subject
                    if (filters.subject && pack.subject_id !== filters.subject) {
                      return false;
                    }
                    // Filter by grade
                    if (filters.grade && !pack.grade.includes(`Grade ${filters.grade}`)) {
                      return false;
                    }
                    // Filter by language
                    if (filters.language) {
                      const packLanguage = pack.language === 'en' ? 'English' : 
                                         pack.language === 'si' ? 'Sinhala' : 
                                         pack.language === 'ta' ? 'Tamil' : pack.language;
                      if (packLanguage !== filters.language) {
                        return false;
                      }
                    }
                    return true;
                  })
                  .map(pack => (
                    <option key={pack.id} value={pack.id}>{pack.title}</option>
                  ))}
              </select>
            </div>

            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {questionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Difficulties</option>
                {difficulties.map(diff => (
                  <option key={diff} value={diff}>{diff}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Grade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <select
                value={filters.grade}
                onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Grades</option>
                {[6, 7, 8, 9, 10, 11].map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>
            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                value={filters.language}
                onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Languages</option>
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({
                  search: '', subject: '', pack: '', type: '', 
                  difficulty: '', language: '', grade: '', status: 'all'
                })}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Questions Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-purple"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map((question) => (
            <GlassCard key={question.id} hover className="h-full">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <Badge variant={getTypeColor(question.question_type)}>
                      {question.question_type}
                    </Badge>
                    <Badge variant={getDifficultyColor(question.difficulty)}>
                      {question.difficulty}
                    </Badge>
                    {question.language && (
                      <Badge variant="secondary" className="text-xs">
                        {question.language}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    {question.is_active ? (
                      <Eye className="h-4 w-4 text-green-500" title="Active" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" title="Inactive" />
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div className="flex-1 mb-4">
                  <p className="font-medium text-gray-900 mb-2 line-clamp-3">
                    {question.question_text || question.question}
                  </p>

                  {/* Options Preview for MCQ */}
                  {question.question_type === 'MCQ' && question.options && (
                    <div className="space-y-1">
                      {question.options.slice(0, 2).map((option, index) => (
                        <div key={index} className="text-xs text-gray-600 truncate">
                          {String.fromCharCode(65 + index)}. {option}
                        </div>
                      ))}
                      {question.options.length > 2 && (
                        <div className="text-xs text-gray-400">
                          +{question.options.length - 2} more options
                        </div>
                      )}
                    </div>
                  )}

                  {/* Answer Preview */}
                  <div className="mt-2 text-xs text-gray-600">
                    <span className="font-medium">Answer:</span> {
                      (question.correct_answer || question.answer || '').length > 50
                        ? (question.correct_answer || question.answer || '').substring(0, 50) + '...'
                        : (question.correct_answer || question.answer || '')
                    }
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    {question.pack_title && (
                      <span className="truncate">{question.pack_title}</span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditQuestion(question)}
                      className="p-2 hover:bg-gradient-glass rounded-lg transition-colors"
                      title="Edit Question"
                    >
                      <Edit className="h-4 w-4 text-royal-purple" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 py-2 text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-green-50 to-blue-50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">Edit Question</DialogTitle>
          </DialogHeader>
          
          {editingQuestion && (
            <div className="space-y-6 mt-6">
              {/* Question Type and Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Type</label>
                  <select
                    value={editingQuestion.question_type}
                    onChange={(e) => setEditingQuestion({ 
                      ...editingQuestion, 
                      question_type: e.target.value,
                      options: e.target.value === 'TF' ? ['True', 'False'] : 
                               (e.target.value === 'MCQ' || e.target.value === 'FIIB') ? ['', '', '', ''] : []
                    })}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  >
                    {questionTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Difficulty</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  >
                    {difficulties.map(diff => (
                      <option key={diff} value={diff}>{diff}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Language, Bloom's Level and Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Language</label>
                  <select
                    value={editingQuestion.language || 'English'}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, language: e.target.value })}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  >
                    {languages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Bloom's Level</label>
                  <select
                    value={editingQuestion.blooms_taxonomy || 'Remember'}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, blooms_taxonomy: e.target.value })}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  >
                    {['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingQuestion.is_active}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              {/* Diagram Upload */}
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-green-600" />
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
                      className="cursor-pointer bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Question</label>
                <textarea
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none"
                />
              </div>

              {/* Options for MCQ and FIIB */}
              {(editingQuestion.question_type === 'MCQ' || editingQuestion.question_type === 'FIIB') && (
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">Options</label>
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 w-8">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <input
                          type="text"
                          value={(editingQuestion.options || [])[index] || ''}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Options for True/False */}
              {editingQuestion.question_type === 'TF' && (
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">True/False Options</label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 w-8">A.</span>
                      <input
                        type="text"
                        value={(editingQuestion.options || [])[0] || 'True'}
                        onChange={(e) => handleOptionChange(0, e.target.value)}
                        className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 w-8">B.</span>
                      <input
                        type="text"
                        value={(editingQuestion.options || [])[1] || 'False'}
                        onChange={(e) => handleOptionChange(1, e.target.value)}
                        className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Correct Answer */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {editingQuestion.question_type === 'MCQ' || editingQuestion.question_type === 'FIIB' ? 
                    'Correct Answer (A, B, C, or D)' :
                    editingQuestion.question_type === 'TF' ? 
                    'Correct Answer (A or B)' : 
                    'Answer'
                  }
                </label>
                <textarea
                  value={editingQuestion.correct_answer}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value })}
                  rows={editingQuestion.question_type === 'HOQ' ? 3 : 1}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none"
                />
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Explanation (Optional)</label>
                <textarea
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none"
                />
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="w-full py-3 text-lg font-semibold bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default QuestionEditor;