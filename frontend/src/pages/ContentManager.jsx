import React, { useState } from 'react';
import GlassCard from '../components/shared/GlassCard';
import UploadForm from '../components/shared/UploadForm';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import Input from '../components/ui/Input';
import { Upload, Sparkles, Edit, Plus, FileText, Trash2, AlertCircle } from 'lucide-react';
import { 
  generateQuestionsFromFile,
  updateQuestion as updateQuestionAPI,
  updateQuestionDifficulty as updateQuestionDifficultyAPI,
  deleteQuestion as deleteQuestionAPI
} from '../api/questionService';

const ContentManager = ({ questions, setQuestions }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [generationError, setGenerationError] = useState('');
  const [newQuestion, setNewQuestion] = useState({
    type: 'MCQ',
    difficulty: 'Easy',
    question: '',
    answer: ''
  });

  // Handle file upload completion
  const handleUploadComplete = (filePath, fileType, fileUrl) => {
    console.log('File uploaded:', { filePath, fileType, fileUrl });
    setUploadedFile({ filePath, fileType, fileUrl });
    setShowUploadForm(false);
  };

  // Generate questions from uploaded file using Gemini API
  const handleGenerateQuestions = async () => {
    if (!uploadedFile) {
      setGenerationError('Please upload a file first');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    
    try {
      console.log('[ContentManager] Generating questions from file:', uploadedFile);

      // Call backend API to generate questions
      const generatedQuestions = await generateQuestionsFromFile(
        uploadedFile.fileUrl,
        uploadedFile.fileType,
        {
          count: 5,
          difficulty: 'Intermediate',
          types: ['MCQ', 'FIIB', 'TF', 'HOQ', 'Summary']
        }
      );

      console.log('[ContentManager] Questions generated:', generatedQuestions);

      // Add generated questions to existing questions
      setQuestions([...questions, ...generatedQuestions]);
      
      // Clear uploaded file after successful generation
      setUploadedFile(null);

    } catch (error) {
      console.error('[ContentManager] Generation error:', error);
      setGenerationError(error.message || 'Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion({ ...question });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      console.log('[ContentManager] Saving question edits:', editingQuestion);

      // Call backend API to update in database
      const updatedQuestion = await updateQuestionAPI(editingQuestion.id, {
        type: editingQuestion.type,
        difficulty: editingQuestion.difficulty,
        question: editingQuestion.question,
        answer: editingQuestion.answer,
        options: editingQuestion.options
      });

      // Update local state with response from server
      setQuestions(questions.map(q => 
        q.id === updatedQuestion.id ? updatedQuestion : q
      ));

      setIsEditModalOpen(false);
      setEditingQuestion(null);

      console.log('[ContentManager] Question updated successfully');
    } catch (error) {
      console.error('[ContentManager] Save edit error:', error);
      alert('Failed to save changes: ' + error.message);
    }
  };

  const handleAddQuestion = () => {
    const question = {
      id: Date.now(),
      ...newQuestion,
      generated: false
    };
    setQuestions([...questions, question]);
    setIsAddModalOpen(false);
    setNewQuestion({ type: 'MCQ', difficulty: 'Easy', question: '', answer: '' });
  };

  const handleDeleteQuestion = async (id) => {
    try {
      if (!confirm('Are you sure you want to delete this question?')) {
        return;
      }

      console.log('[ContentManager] Deleting question:', id);

      // Call backend API to delete from database
      await deleteQuestionAPI(id);

      // Update local state
      setQuestions(questions.filter(q => q.id !== id));

      console.log('[ContentManager] Question deleted successfully');
    } catch (error) {
      console.error('[ContentManager] Delete error:', error);
      alert('Failed to delete question: ' + error.message);
    }
  };

  const handleUpdateDifficulty = async (questionId, newDifficulty) => {
    try {
      console.log('[ContentManager] Updating difficulty:', { questionId, newDifficulty });

      // Call backend API to update in database
      const updatedQuestion = await updateQuestionDifficultyAPI(questionId, newDifficulty);

      // Update local state with response from server
      setQuestions(questions.map(q => 
        q.id === updatedQuestion.id ? updatedQuestion : q
      ));

      console.log('[ContentManager] Difficulty updated successfully');
    } catch (error) {
      console.error('[ContentManager] Update difficulty error:', error);
      alert('Failed to update difficulty: ' + error.message);
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'Easy': 'success',
      'Intermediate': 'warning',
      'Hard': 'danger'
    };
    return colors[difficulty] || 'default';
  };

  const getTypeColor = (type) => {
    const colors = {
      'MCQ': 'default',
      'FIIB': 'secondary',
      'TF': 'outline',
      'HOQ': 'default',
      'Summary': 'secondary'
    };
    return colors[type] || 'default';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Content Management
        </h2>
        <p className="text-gray-600">Generate and manage educational content</p>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="mb-6">
          <UploadForm onUploadComplete={handleUploadComplete} />
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => setShowUploadForm(false)}>
              Cancel Upload
            </Button>
          </div>
        </div>
      )}

      {/* Upload & Generate Section */}
      {!showUploadForm && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard hover>
            <div className="text-center py-8">
              <Upload className="h-12 w-12 mx-auto mb-4 text-royal-purple" />
              <h3 className="text-lg font-semibold mb-2">Upload Materials</h3>
              <p className="text-sm text-gray-600 mb-4">Upload PDFs or Images for processing</p>
              {uploadedFile ? (
                <div className="mb-4">
                  <Badge variant="success">File Uploaded</Badge>
                  <p className="text-xs text-gray-500 mt-2">{uploadedFile.fileType}</p>
                </div>
              ) : null}
              <Button variant="outline" onClick={() => setShowUploadForm(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            </div>
          </GlassCard>

        <GlassCard hover>
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-electric-cyan" />
            <h3 className="text-lg font-semibold mb-2">AI Generation</h3>
            <p className="text-sm text-gray-600 mb-4">Generate questions using Gemini API</p>
            
            {/* Error Message */}
            {generationError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 text-left">{generationError}</p>
              </div>
            )}

            {/* Status Message */}
            {!uploadedFile && !generationError && (
              <p className="text-xs text-gray-500 mb-4">
                ⚠️ Upload a file first to generate questions
              </p>
            )}

            <Button 
              onClick={handleGenerateQuestions}
              disabled={isGenerating || !uploadedFile}
              className="bg-electric-cyan hover:bg-electric-cyan/90"
            >
              {isGenerating ? (
                <>
                  <span className="inline-block animate-spin mr-2">⚡</span>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Questions
                </>
              )}
            </Button>
          </div>
        </GlassCard>
        </div>
      )}

      {/* Manual Creation Buttons */}
      {!showUploadForm && (
      <GlassCard>
        <h3 className="text-lg font-semibold mb-4">Manual Creation</h3>
        <div className="flex flex-wrap gap-2">
          {['MCQ', 'FIIB', 'TF', 'HOQ', 'Summary'].map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => {
                setNewQuestion({ ...newQuestion, type });
                setIsAddModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {type}
            </Button>
          ))}
        </div>
      </GlassCard>
      )}

      {/* Questions List */}
      {!showUploadForm && (
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Generated Content ({questions.length})</h3>
          <Badge variant="secondary">{questions.filter(q => q.generated).length} AI Generated</Badge>
        </div>

        <div className="space-y-3">
          {questions.map((question) => (
            <div key={question.id} className="p-4 rounded-lg border border-gray-200 hover:border-royal-purple transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-wrap">
                  <Badge variant={getTypeColor(question.type)}>{question.type}</Badge>
                  
                  {/* Difficulty Selector - Admin can change */}
                  <select
                    value={question.difficulty}
                    onChange={(e) => handleUpdateDifficulty(question.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 focus:border-royal-purple focus:ring-1 focus:ring-royal-purple"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Hard">Hard</option>
                  </select>
                  
                  {question.generated && <Badge variant="outline">AI</Badge>}
                  
                  {/* Display AI-extracted metadata */}
                  {question.language && (
                    <Badge variant="secondary" className="text-xs">
                      {question.language}
                    </Badge>
                  )}
                  {question.grade && (
                    <Badge variant="secondary" className="text-xs">
                      Grade {question.grade}
                    </Badge>
                  )}
                  {question.subject && (
                    <Badge variant="secondary" className="text-xs">
                      {question.subject}
                    </Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditQuestion(question)}
                    className="p-2 hover:bg-gradient-glass rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4 text-royal-purple" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
              <p className="font-medium mb-2">{question.question}</p>
              
              {/* Display MCQ options if available */}
              {question.type === 'MCQ' && question.options && question.options.length > 0 && (
                <div className="mb-2 space-y-1">
                  {question.options.map((option, index) => (
                    <div 
                      key={index} 
                      className={`text-sm px-3 py-1.5 rounded ${
                        option === question.answer 
                          ? 'bg-green-100 text-green-800 font-medium' 
                          : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}. {option}
                      {option === question.answer && ' ✓'}
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-sm text-gray-600">
                <span className="font-medium">Answer:</span> {question.answer}
              </p>
            </div>
          ))}

          {questions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No questions yet. Generate or add manually.</p>
            </div>
          )}
        </div>
      </GlassCard>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent onClose={() => setIsEditModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  value={editingQuestion.type}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, type: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  {['MCQ', 'FIIB', 'TF', 'HOQ', 'Summary'].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <select
                  value={editingQuestion.difficulty}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  {['Easy', 'Intermediate', 'Hard'].map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Question</label>
                <Input
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Answer</label>
                <Input
                  value={editingQuestion.answer}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                />
              </div>
              <Button onClick={handleSaveEdit} className="w-full">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent onClose={() => setIsAddModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={newQuestion.type}
                onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {['MCQ', 'FIIB', 'TF', 'HOQ', 'Summary'].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Difficulty</label>
              <select
                value={newQuestion.difficulty}
                onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {['Easy', 'Intermediate', 'Hard'].map(diff => (
                  <option key={diff} value={diff}>{diff}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Question</label>
              <Input
                value={newQuestion.question}
                onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                placeholder="Enter your question"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Answer</label>
              <Input
                value={newQuestion.answer}
                onChange={(e) => setNewQuestion({ ...newQuestion, answer: e.target.value })}
                placeholder="Enter the answer"
              />
            </div>
            <Button onClick={handleAddQuestion} className="w-full">Add Question</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManager;
