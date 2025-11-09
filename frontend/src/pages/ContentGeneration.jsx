import React, { useState, useEffect } from 'react';
import GlassCard from '../components/shared/GlassCard';
import UploadForm from '../components/shared/UploadForm';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import Input from '../components/ui/Input';
import { Upload, Sparkles, Edit, Plus, FileText, Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import {
  generateQuestionsFromFile,
  updateQuestion as updateQuestionAPI,
  updateQuestionDifficulty as updateQuestionDifficultyAPI,
  deleteQuestion as deleteQuestionAPI,
  createQuestion as createQuestionAPI,
  getSummaryByPack,
  upsertSummaryByPack,
  previewFromFile,
  approveFromPreview
} from '../api/questionService';
import { getSubjects } from '../api/subjectService';
import { analyzeDocument } from '../api/learningPackService';
import LearningPackSelector from '../components/LearningPackSelector';
import CreateLearningPackModal from '../components/CreateLearningPackModal';
import { useContentGeneration } from '../context/ContentGenerationContext';

const ContentGeneration = ({ questions, setQuestions }) => {
  // Use context for persistent state
  const {
    uploadedFile,
    setUploadedFile,
    uploadedFileUrl,
    setUploadedFileUrl,
    uploadedFileType,
    setUploadedFileType,
    suggestedPacks,
    setSuggestedPacks,
    selectedPackIndex,
    setSelectedPackIndex,
    detectedLanguage,
    setDetectedLanguage,
    preview,
    setPreview,
    summaryBullets,
    setSummaryBullets,
    isGenerating,
    setIsGenerating,
    isAnalyzing,
    setIsAnalyzing,
    generationError,
    setGenerationError,
    showUploadForm,
    setShowUploadForm,
    questionTypeCounts,
    setQuestionTypeCounts,
    questionTypeDifficulties,
    setQuestionTypeDifficulties,
    resetGenerationState
  } = useContentGeneration();

  // Local UI state (doesn't need to persist)
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGeneratingPacks, setIsGeneratingPacks] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [newQuestion, setNewQuestion] = useState({
    type: 'MCQ',
    difficulty: 'Easy',
    question: '',
    answer: ''
  });
  const languageMap = {
    'English': 'en',
    'english': 'en',
    'Sinhala': 'si',
    'sinhala': 'si',
    'sinhalese': 'si',
    'සිංහල': 'si',
    'Tamil': 'ta',
    'tamil': 'ta',
    'தமிழ்': 'ta'
  };

  // Add this helper function

  const getLanguageCode = (languageName) => {
    if (!languageName) return 'en';

    const normalized = String(languageName).trim().toLowerCase();

    // Direct mapping
    if (languageMap[normalized]) {
      return languageMap[normalized];
    }

    // Check if contains Sinhala/Tamil characters
    if (/[\u0D80-\u0DFF]/.test(languageName)) {
      return 'si'; // Sinhala Unicode range
    }
    if (/[\u0B80-\u0BFF]/.test(languageName)) {
      return 'ta'; // Tamil Unicode range
    }

    return 'en'; // default
  };
  // Generation options
  const [genLanguage, setGenLanguage] = useState('English');
  const [genBloom, setGenBloom] = useState('Understand');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isValidatingContent, setIsValidatingContent] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const data = await getSubjects();
        setSubjects(data);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  // Question type configuration with default values (only MCQ, FIIB, TF, HOQ)
  const [questionConfig, setQuestionConfig] = useState({
    MCQ: { count: 5, difficulty: 'Medium', enabled: true },
    FIIB: { count: 2, difficulty: 'Medium', enabled: false },
    TF: { count: 2, difficulty: 'Easy', enabled: false },
    HOQ: { count: 1, difficulty: 'Hard', enabled: false }
  });

  // preview is now from context
  const [selectedIds, setSelectedIds] = useState({});

  // Available options
  const languages = ['English', 'Sinhala', 'Tamil'];
  const grades = ['6', '7', '8', '9', '10', '11'];
  const difficulties = ['Easy', 'Medium', 'Hard'];
  const questionTypes = ['MCQ', 'FIIB', 'TF', 'HOQ'];

  // Learning pack selection & creation
  const [selectedPackId, setSelectedPackId] = useState('');
  const [createPackOpen, setCreatePackOpen] = useState(false);
  const [packRefreshToken, setPackRefreshToken] = useState(0);

  // Load persisted summary when pack changes
  React.useEffect(() => {
    const load = async () => {
      if (!selectedPackId) { setSummaryBullets([]); return; }
      try {
        const bullets = await getSummaryByPack(selectedPackId);
        setSummaryBullets(Array.isArray(bullets) ? bullets : []);
      } catch (e) {
        console.warn('[ContentManager] No summary for pack or fetch failed');
        setSummaryBullets([]);
      }
    };
    load();
  }, [selectedPackId]);

  const openAddSummary = () => {
    setSummaryDraft('');
    setIsSummaryModalOpen(true);
  };

  const openEditSummary = () => {
    setSummaryDraft((summaryBullets || []).join('\n'));
    setIsSummaryModalOpen(true);
  };

  const handleSaveSummary = async () => {
    try {
      if (!selectedPackId) { alert('Please select a learning pack first'); return; }
      const bullets = summaryDraft
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      // No strict count validation; backend will normalize
      const saved = await upsertSummaryByPack(selectedPackId, bullets);
      setSummaryBullets(saved);
      setIsSummaryModalOpen(false);
    } catch (e) {
      console.error('[ContentManager] Save summary error:', e);
      alert('Failed to save summary: ' + (e.message || 'Unknown error'));
    }
  };

  // Handle file upload completion
  const handleUploadComplete = (uploadData) => {
    setUploadedFile({
      fileUrl: uploadData.fileUrl,
      fileType: uploadData.fileType,
      name: uploadData.name || uploadData.fileUrl.split('/').pop(),
      file: uploadData.file
    });
    setSuggestedPacks([]);
    setShowUploadForm(false);
    setAnalysisError('');
  };

  // Generate learning packs from uploaded file
  const handleGenerateLearningPacks = async () => {
    if (!uploadedFile) {
      setAnalysisError('Please upload a file first');
      return;
    }

    try {
      setIsGeneratingPacks(true);
      setAnalysisError('');

      // Get the file object if available
      let fileObj = null;
      if (uploadedFile.file) {
        fileObj = uploadedFile.file;
      } else if (uploadedFile.fileUrl && uploadedFile.fileUrl.startsWith('blob:')) {
        // If we have a blob URL, fetch the file
        const response = await fetch(uploadedFile.fileUrl);
        const blob = await response.blob();
        fileObj = new File([blob], uploadedFile.name || 'document', { type: uploadedFile.fileType || 'application/octet-stream' });
      }

      const analysisResponse = await analyzeDocument(uploadedFile.fileUrl, uploadedFile.fileType, fileObj);
      const packs = analysisResponse.data || [];
      setSuggestedPacks(packs);

      // Auto-detect and update language in both local and context state
      if (packs.length > 0 && packs[0].language) {
        const detectedLang = packs[0].language;
        setGenLanguage(detectedLang);
        setDetectedLanguage(detectedLang);
        console.log(`[Frontend] Auto-detected language: ${detectedLang}`);
      }

    } catch (error) {
      console.error('Document analysis failed:', error);
      setAnalysisError(error.message || 'Failed to analyze document');
    } finally {
      setIsGeneratingPacks(false);
    }
  };

  // Toggle pack selection for question generation (card click)
  const togglePackForQuestions = (index) => {
    setSelectedPackIndex(prev => prev === index ? null : index);
  };

  // Validate content against selected parameters
  const validateContent = async (fileUrl, fileType) => {
    try {
      setIsValidatingContent(true);
      setValidationResults(null);

      // Basic frontend validation
      if (!fileUrl || !fileType) {
        throw new Error('No file selected');
      }

      if (!grade || !subject) {
        throw new Error('Please select both grade and subject');
      }

      // For now, we'll skip the backend validation and return true
      // Once the backend validation endpoint is ready, you can uncomment the code below
      // and remove this return true
      return true;

      /*
      // Backend validation (commented out until endpoint is ready)
      const response = await fetch('/api/validate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl,
          fileType,
          language: genLanguage,
          grade,
          subject,
          bloomLevel: genBloom
        })
      });
      
      if (!response.ok) {
        throw new Error('Validation failed');
      }
      
      const data = await response.json();
      setValidationResults(data);
      
      // If there are critical mismatches, show them to user
      if (data.criticalMismatches && data.criticalMismatches.length > 0) {
        const shouldContinue = window.confirm(
          `The content has some issues:\n${data.criticalMismatches.join('\n')}\n\nDo you want to continue anyway?`
        );
        
        if (!shouldContinue) {
          throw new Error('Content validation failed. Please check your selections.');
        }
      }
      
      return data.isValid;
      */
    } catch (error) {
      console.error('Validation error:', error);
      setGenerationError(error.message || 'Failed to validate content');
      return false;
    } finally {
      setIsValidatingContent(false);
    }
  };

  // Preview generation (no DB writes)
  const handlePreview = async () => {

    if (!uploadedFile) {
      setGenerationError('Please upload a file first');
      return;
    }

    if (!grade || !subject) {
      setGenerationError('Please select both grade and subject');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');

    try {
      const isValid = await validateContent(uploadedFile.fileUrl, uploadedFile.fileType);

      if (!isValid) {
        return;
      }

      // Get enabled question types with their counts AND difficulties
      const enabledQuestionTypes = Object.entries(questionConfig)
        .filter(([_, config]) => config.enabled && config.count > 0)
        .reduce((acc, [type, config]) => ({
          ...acc,
          [type]: config.count
        }), {});

      // Get difficulty for each type
      const typeDifficulties = Object.entries(questionConfig)
        .filter(([_, config]) => config.enabled && config.count > 0)
        .reduce((acc, [type, config]) => ({
          ...acc,
          [type]: config.difficulty
        }), {});

      const pv = await previewFromFile(uploadedFile.fileUrl, uploadedFile.fileType, {
        language: genLanguage,
        grade,
        subject,
        difficulty: Object.values(typeDifficulties)[0] || 'Medium', // Use first type's difficulty as default
        bloom_level: genBloom,
        questionTypes: enabledQuestionTypes,
        typeDifficulties: typeDifficulties // Pass per-type difficulties
      });

      // Check if we got any questions
      if (!pv.questions || pv.questions.length === 0) {
        setGenerationError('No questions were generated. Please try again or adjust your settings.');
        setPreview(null);
        return;
      }

      setPreview(pv);

      // Pre-select all questions by default
      const pre = {};
      (pv.questions || []).forEach((q, i) => { pre[q.id || i] = true; });
      setSelectedIds(pre);
    } catch (e) {
      console.error('[ContentManager] Preview error:', e);
      setGenerationError(e.message || 'Failed to preview');
      setPreview(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // Track the last action to show appropriate success message
  const [lastAction, setLastAction] = useState(null);

  // Approve selected items and persist
  const handleApprove = async () => {
    if (selectedPackIndex === null) {
      setGenerationError('Please select a learning pack by clicking on a card above');
      return;
    }
    if (!preview || !Array.isArray(preview.questions)) {
      setGenerationError('No preview to approve');
      return;
    }
    const chosen = preview.questions.filter((q, i) => selectedIds[q.id || i]);
    if (!chosen.length) {
      setGenerationError('Select at least one item to approve');
      return;
    }

    // STORE THE SELECTED INDEX BEFORE RESETTING
    const currentSelectedIndex = selectedPackIndex;

    // RESET IMMEDIATELY so admin can select another pack
    setSelectedPackIndex(null);
    setPreview(null);
    setSelectedIds({});

    setIsGenerating(true);
    setGenerationError('');

    try {
      // Use the stored index
      const selectedPack = suggestedPacks[currentSelectedIndex];
      const { createLearningPack: createLearningPackAPI } = await import('../api/learningPackService');

      const newPack = await createLearningPackAPI({
        title: selectedPack.title,
        description: selectedPack.content || selectedPack.description,
        subject_id: subject,
        grade: `Grade ${parseInt(grade)}`, // ← CHANGE THIS to "Grade 6", "Grade 7", etc.
        difficulty: 'Medium',
        language: getLanguageCode(selectedPack.language || genLanguage || 'English'),
        is_active: true
      });

      const packId = newPack.id;

      const { questions: saved, saved_summary } = await approveFromPreview({
        pack_id: packId,
        questions: chosen,
        summary_bullets: preview.summary_bullets,
        language: genLanguage,
        difficulty: 'Intermediate',
        bloom_level: genBloom
      });

      setQuestions([...questions, ...saved]);
      if (Array.isArray(saved_summary?.bullets)) setSummaryBullets(saved_summary.bullets);

      setLastAction({ type: 'approve', count: saved.length });
      setShowSuccessModal(true);

    } catch (e) {
      setGenerationError(e.message || 'Failed to approve');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate questions from uploaded file using Gemini API (direct-save)
  const handleGenerateQuestions = async () => {
    if (!uploadedFile) {
      setGenerationError('Please upload a file first');
      return;
    }
    if (selectedPackIndex === null) {
      setGenerationError('Please select a learning pack by clicking on a card above');
      return;
    }

    // STORE THE SELECTED INDEX BEFORE RESETTING
    const currentSelectedIndex = selectedPackIndex;

    // RESET IMMEDIATELY so admin can select another pack
    setSelectedPackIndex(null);

    setIsGenerating(true);
    setGenerationError('');

    try {
      // Use the stored index
      const selectedPack = suggestedPacks[currentSelectedIndex];
      const { createLearningPack: createLearningPackAPI } = await import('../api/learningPackService');

      const newPack = await createLearningPackAPI({
        title: selectedPack.title,
        description: selectedPack.content || selectedPack.description,
        subject_id: subject,
        grade: `Grade ${parseInt(grade)}`, // ← CHANGE THIS to "Grade 6", "Grade 7", etc.
        difficulty: 'Medium',
        language: getLanguageCode(selectedPack.language || genLanguage || 'English'),
        is_active: true
      });

      const packId = newPack.id;

      // Call backend API to generate questions
      const { questions: generatedQuestions, summary_bullets } = await generateQuestionsFromFile(
        uploadedFile.fileUrl,
        uploadedFile.fileType,
        {
          pack_id: packId,
          count: 5,
          difficulty: 'Intermediate',
          types: ['MCQ', 'FIIB', 'TF', 'HOQ'],
          language: genLanguage,
          bloom_level: genBloom
        }
      );

      setSummaryBullets(Array.isArray(summary_bullets) ? summary_bullets : []);
      setQuestions([...questions, ...generatedQuestions]);

      setLastAction({ type: 'generate', count: generatedQuestions.length });
      setShowSuccessModal(true);

    } catch (error) {
      console.error('[ContentManager] Generation error:', error);
      setGenerationError(error.message || 'Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Open edit modal with question data
  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setIsEditModalOpen(true);
  };

  // Delete question
  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      await deleteQuestionAPI(questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (error) {
      console.error('[ContentManager] Delete error:', error);
      alert('Failed to delete question: ' + error.message);
    }
  };

  const handleSaveEdit = async () => {
    try {
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
    } catch (error) {
      console.error('[ContentManager] Save edit error:', error);
      alert('Failed to save changes: ' + error.message);
    }
  };

  const handleAddQuestion = async () => {
    try {
      if (!selectedPackId) {
        alert('Please select a learning pack first');
        return;
      }
      const created = await createQuestionAPI({
        pack_id: selectedPackId,
        type: newQuestion.type,
        difficulty: newQuestion.difficulty,
        question: newQuestion.question, // This will be mapped to question_text in backend
        answer: newQuestion.answer,
        options: newQuestion.options || [],
        language: genLanguage,
        blooms_taxonomy: genBloom
      });
      setQuestions([...questions, created]);
      setIsAddModalOpen(false);
      setNewQuestion({ type: 'MCQ', difficulty: 'Easy', question: '', answer: '' });
    } catch (err) {
      console.error('[ContentManager] Create manual question error:', err);
      alert('Failed to create question: ' + (err.message || 'Unknown error'));
    }
  };

  const handleUpdateDifficulty = async (questionId, newDifficulty) => {
    try {
      // Call backend API to update in database
      const updatedQuestion = await updateQuestionDifficultyAPI(questionId, newDifficulty);

      // Update local state with response from server
      setQuestions(questions.map(q =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      ));
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

      {/* Generate Learning Packs Button */}
      {uploadedFile && suggestedPacks.length === 0 && !showUploadForm && (
        <div className="mb-6 text-center">
          <Button
            onClick={handleGenerateLearningPacks}
            disabled={isGeneratingPacks}
            className="flex items-center mx-auto"
          >
            {isGeneratingPacks ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Learning Packs...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Learning Packs
              </>
            )}
          </Button>
        </div>
      )}

      {/* Document Analysis Status */}
      {isGeneratingPacks && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
          <span>Analyzing document and generating learning packs...</span>
        </div>
      )}

      {analysisError && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="inline mr-2" />
          {analysisError}
        </div>
      )}

      {/* Suggested Learning Packs */}
      {suggestedPacks.length > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-green-100 to-blue-100 border-2 border-gray-300 rounded-lg">
          <h4 className="font-bold text-gray-800 mb-2 flex items-center">
            <span className="mr-2">🤖</span> AI Question Generation from File:
          </h4>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Step 1:</strong> Click on ONE learning pack card below to select it (card turns GREEN)</p>
            <p><strong>Step 2 Option A:</strong> Click "Preview" → Review questions → Select which to keep → Click GREEN "Approve & Save"</p>
            <p><strong>Step 2 Option B:</strong> Click "Generate Questions" → All questions saved automatically</p>
            <p className="text-xs text-gray-600 mt-2">💡 Tip: You can only select ONE pack at a time for question generation</p>
            <p className="text-xs font-semibold text-red-600 mt-2">⚠️ Note: The dropdown menu below is ONLY for manual question creation, NOT for AI generation!</p>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-4">
        {suggestedPacks.map((pack, index) => {
          // Clean up the title and description - preserve Unicode for Sinhala/Tamil
          const cleanText = (text) => {
            if (!text) return '';
            // Only remove control characters and excessive whitespace
            // Preserve all Unicode letters (including Sinhala, Tamil, etc.)
            return text
              .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters only
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
          };

          const cleanTitle = cleanText(pack.title || `Learning Pack ${index + 1}`);
          const cleanDescription = cleanText(pack.content || pack.description || 'No description available');


          const isSelectedForQuestions = selectedPackIndex === index;

          // Clean topics
          const cleanTopics = (pack.topics || [])
            .map(topic => cleanText(topic))
            .filter(topic => topic.length > 0 && topic.length < 50)
            .slice(0, 3);

          return (
            <div
              key={index}
              className={`
          group relative p-4 border-2 rounded-lg cursor-pointer transition-all
          hover:shadow-lg overflow-hidden h-full flex flex-col
          ${isSelectedForQuestions
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-300 shadow-md'
                  : 'border-gray-200 hover:border-gray-400 bg-white'
                }
        `}
              onClick={() => togglePackForQuestions(index)}
            >
              <div className="flex items-start">
                <div className="flex-1 min-w-0">
                  <h4
                    className="font-medium text-gray-900 text-sm sm:text-base break-words"
                    title={cleanTitle}
                  >
                    {cleanTitle}
                  </h4>

                  <p
                    className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2 break-words"
                    title={cleanDescription}
                  >
                    {cleanDescription}
                  </p>

                  <div className="mt-2 flex items-center flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600 whitespace-nowrap">
                      {pack.duration || 10} min
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600 whitespace-nowrap">
                      {pack.language || 'English'}
                    </span>
                  </div>

                  {cleanTopics.length > 0 && (
                    <div className="mt-2">
                      <h5 className="text-xs font-medium text-gray-500 mb-1">Topics:</h5>
                      <div className="flex flex-wrap gap-1">
                        {cleanTopics.map((topic, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full truncate max-w-full"
                            title={topic}
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visual indicator for question generation selection */}
                  {isSelectedForQuestions && (
                    <div className="mt-3 pt-3 border-t border-green-300">
                      <p className="text-xs font-semibold text-green-700 flex items-center">
                        <span className="mr-1">✓</span> Selected for Question Generation
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
              <p className="text-sm text-gray-600 mb-4">Select a learning pack, upload, choose options, then generate</p>

              {/* Pack selection and create */}
              <div className="mb-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-700">Learning Pack</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreatePackOpen(true)}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Create New
                  </Button>
                </div>
                <LearningPackSelector
                  selectedPackId={selectedPackId}
                  onSelect={setSelectedPackId}
                  refreshToken={packRefreshToken}
                />

                {/* Content Configuration */}
                <div className="space-y-4">
                  {/* Language, Grade, Subject */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Language *</label>
                      <select
                        className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-sm"
                        value={genLanguage}
                        onChange={(e) => setGenLanguage(e.target.value)}
                        required
                      >
                        <option value="">Select Language</option>
                        {languages.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Grade *</label>
                      <select
                        className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-sm"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        required
                      >
                        <option value="">Select Grade</option>
                        {grades.map(grade => (
                          <option key={grade} value={grade}>Grade {grade}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 relative">
                      <label className="block text-sm font-medium text-gray-700">Subject *</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                          className="w-full flex justify-between items-center rounded-md border border-gray-300 px-3 py-2 bg-white text-sm text-left"
                        >
                          <span className="truncate">{subjects.find(s => s.id === subject)?.name || 'Select Subject'}</span>
                          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isSubjectDropdownOpen ? 'transform rotate-180' : ''}`} />
                        </button>

                        {isSubjectDropdownOpen && (
                          <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg max-h-60 overflow-auto">
                            <div className="p-1">
                              {isLoadingSubjects ? (
                                <div className="px-4 py-2 text-sm text-gray-500">Loading subjects...</div>
                              ) : subjects.length > 0 ? (
                                subjects.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${subject === sub.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                                    onClick={() => {
                                      setSubject(sub.id);
                                      setIsSubjectDropdownOpen(false);
                                    }}
                                  >
                                    {sub.name}
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-2 text-sm text-gray-500">No subjects found</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bloom Level */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Bloom's Taxonomy Level</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-sm"
                      value={genBloom}
                      onChange={(e) => setGenBloom(e.target.value)}
                    >
                      {['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Question Type Configuration */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Question Types & Counts</label>
                    <div className="space-y-2">
                      {Object.entries(questionConfig).map(([type, config]) => (
                        <div key={type} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id={`enable-${type}`}
                            checked={config.enabled}
                            onChange={(e) => {
                              setQuestionConfig({
                                ...questionConfig,
                                [type]: { ...config, enabled: e.target.checked }
                              });
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label htmlFor={`enable-${type}`} className="text-sm text-gray-700 w-24">
                            {type}
                          </label>

                          <div className="flex-1 flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={config.count}
                              onChange={(e) => {
                                const value = Math.min(20, Math.max(0, parseInt(e.target.value) || 0));
                                setQuestionConfig({
                                  ...questionConfig,
                                  [type]: { ...config, count: value }
                                });
                              }}
                              disabled={!config.enabled}
                              className="w-16 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                            />
                            <span className="text-sm text-gray-500">questions</span>

                            <select
                              value={config.difficulty}
                              onChange={(e) => {
                                setQuestionConfig({
                                  ...questionConfig,
                                  [type]: { ...config, difficulty: e.target.value }
                                });
                              }}
                              disabled={!config.enabled}
                              className="ml-2 rounded-md border-gray-300 py-1 pl-2 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            >
                              {difficulties.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {generationError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 text-left">{generationError}</p>
                  </div>
                )}

                {/* Status Messages */}
                {!uploadedFile && !generationError && (
                  <p className="text-xs text-gray-500 mb-4">
                    ⚠️ Upload a file first to generate questions
                  </p>
                )}

                {uploadedFile && selectedPackIndex === null && !generationError && (
                  <p className="text-xs text-amber-600 mb-4 font-medium">
                    ⚠️ Click on learning pack cards above to select them for question generation (cards will turn GREEN)
                  </p>
                )}

                {selectedPackIndex !== null && !preview && (
                  <div className="mb-4 p-2 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-xs text-green-700 font-semibold">
                      ✓ Pack selected for question generation
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      You can now Preview or Generate Questions. After generation, you can select another pack.
                    </p>
                  </div>
                )}

                {preview && preview.questions && preview.questions.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm text-green-700 font-semibold">
                      ✓ Preview ready with {preview.questions.length} questions!
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Select questions (checkboxes) and click the GREEN "Approve & Save" button
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2">
                  <Button
                    onClick={handlePreview}
                    disabled={isGenerating || !uploadedFile || selectedPackIndex === null}
                    variant="outline"
                    title={selectedPackIndex === null ? 'Select at least one learning pack first' : 'Generate questions for review'}
                  >
                    {isGenerating ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⚡</span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={isGenerating || !preview || !preview.questions || preview.questions.length === 0}
                    className={`transition-all ${preview && preview.questions && preview.questions.length > 0
                      ? 'bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    title={!preview ? 'Click Generate first to create questions' : 'Save selected questions to database'}
                  >
                    {preview && preview.questions && preview.questions.length > 0 ? '✓ ' : ''}Approve & Save
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

      )}

      {/* Manual Creation Buttons */}
      {!showUploadForm && (
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4">Manual Creation</h3>
          <div className="flex flex-wrap gap-2">
            {['MCQ', 'FIIB', 'TF', 'HOQ'].map((type) => (
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
            <Button variant="outline" size="sm" onClick={openAddSummary}>
              <Plus className="h-4 w-4 mr-2" />
              Add Summary
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Summary Bullets */}
      {!showUploadForm && (
        <GlassCard>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Summary</h3>
            {summaryBullets.length > 0 && (
              <Button variant="outline" size="sm" onClick={openEditSummary}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
            )}
          </div>
          {summaryBullets.length > 0 ? (
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {summaryBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No summary yet. Click Add Summary to create one.</p>
          )}
        </GlassCard>
      )}

      {/* Preview Panel */}
      {preview && (
        <GlassCard>
          <h3 className="text-lg font-semibold mb-3">Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-sm">
            <div className="p-3 rounded border">
              <p className="font-medium mb-1">Detected Metadata</p>
              <p>Language: {preview.detected_metadata?.language || 'Unknown'}</p>
              <p>Grade: {preview.detected_metadata?.grade || 'Unknown'}</p>
              <p>Subject: {subjects.find(s => s.id === subject)?.name || preview.detected_metadata?.subject || 'Unknown'}</p>
            </div>
            <div className="p-3 rounded border md:col-span-2">
              <p className="font-medium mb-1">Summary</p>
              {Array.isArray(preview.summary_bullets) && preview.summary_bullets.length ? (
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {preview.summary_bullets.map((b, i) => (<li key={i}>{b}</li>))}
                </ul>
              ) : (<p className="text-gray-500">No summary</p>)}
            </div>
          </div>
          <div className="mb-2 text-sm text-gray-600">
            Requested: {preview.totals?.requested || 0}, Generated: {preview.totals?.generated || 0}, Selected: {Object.values(selectedIds).filter(Boolean).length}
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {preview.questions.map((q, i) => {
              const key = q.id || i;
              return (
                <label key={key} className="flex items-start gap-2 p-2 rounded border hover:border-royal-purple">
                  <input
                    type="checkbox"
                    checked={!!selectedIds[key]}
                    onChange={(e) => setSelectedIds({ ...selectedIds, [key]: e.target.checked })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">{q.type} · {q.difficulty || 'Intermediate'}</div>
                    <div className="font-medium mb-1">{q.question}</div>

                    {/* MCQ options */}
                    {q.type === 'MCQ' && Array.isArray(q.options) && q.options.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                        {q.options.map((o, j) => (
                          <li key={j} className={o === q.answer ? 'font-semibold text-green-700' : ''}>
                            {o} {o === q.answer && '✓'}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* FIIB draggable options */}
                    {q.type === 'FIIB' && Array.isArray(q.options) && q.options.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Drag options:</p>
                        <div className="flex flex-wrap gap-1">
                          {q.options.map((o, j) => (
                            <span key={j} className={`text-xs px-2 py-1 rounded border ${o === q.answer
                              ? 'bg-green-100 border-green-500 text-green-800 font-semibold'
                              : 'bg-blue-50 border-blue-300 text-blue-700'
                              }`}>
                              {o} {o === q.answer && '✓'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TF options */}
                    {q.type === 'TF' && (
                      <div className="mt-2">
                        <div className="flex gap-2">
                          <span className={`text-sm px-3 py-1 rounded border ${q.answer === 'True'
                            ? 'bg-green-100 border-green-500 text-green-800 font-semibold'
                            : 'bg-gray-50 border-gray-300 text-gray-700'
                            }`}>
                            True {q.answer === 'True' && '✓'}
                          </span>
                          <span className={`text-sm px-3 py-1 rounded border ${q.answer === 'False'
                            ? 'bg-green-100 border-green-500 text-green-800 font-semibold'
                            : 'bg-gray-50 border-gray-300 text-gray-700'
                            }`}>
                            False {q.answer === 'False' && '✓'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Answer for HOQ */}
                    {q.type === 'HOQ' && q.answer && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Answer:</span> {q.answer}
                      </p>
                    )}

                    {/* Explanation - Show for ALL question types */}
                    {q.explanation && (
                      <div className="mt-2 p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
                        <p className="text-xs font-semibold text-blue-800 mb-1">💡 Explanation:</p>
                        <p className="text-xs text-blue-700">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
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
              <div key={question.id} className="p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-royal-purple transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
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
                  <div className="flex space-x-2 self-end sm:self-auto">
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

                {/* Display MCQ and IMAGE_MCQ options if available */}
                {(question.type === 'MCQ' || question.type === 'IMAGE_MCQ') && question.options && question.options.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {question.options.map((option, index) => (
                      <div
                        key={index}
                        className={`text-sm px-3 py-1.5 rounded ${option === question.answer
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

                {/* FIIB type: show draggable options */}
                {question.type === 'FIIB' && question.options && question.options.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-2">Drag-and-drop options:</p>
                    <div className="flex flex-wrap gap-2">
                      {question.options.map((option, index) => (
                        <div
                          key={index}
                          draggable="true"
                          className={`text-sm px-3 py-1.5 rounded cursor-move border-2 ${option === question.answer
                            ? 'bg-green-100 border-green-500 text-green-800 font-medium'
                            : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                            }`}
                        >
                          {option}
                          {option === question.answer && ' ✓'}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 italic">
                      Students will drag these options to fill in the blank(s)
                    </p>
                  </div>
                )}

                {/* MATCH type: show pairs grid */}
            
                {/* Answer line - show for TF, HOQ, and FIIB if not already shown in options */}
                {question.answer && question.type !== 'MCQ' && question.type !== 'IMAGE_MCQ' && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Answer:</span> {question.answer}
                  </p>
                )}

                {/* Explanation - Show for ALL question types */}
                {(question.explanation || question.explanation_si || question.explanation_ta) && (
                  <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <p className="text-xs font-semibold text-blue-800 mb-1">💡 Explanation:</p>
                    <p className="text-sm text-blue-700">
                      {question.explanation || question.explanation_si || question.explanation_ta}
                    </p>
                  </div>
                )}
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
                  {['MCQ', 'FIIB', 'TF', 'HOQ'].map(type => (
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

      {/* Summary Modal */}
      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent onClose={() => setIsSummaryModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>{summaryBullets.length ? 'Edit Summary' : 'Add Summary'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <label className="block text-sm font-medium">Bullets (one per line)</label>
            <textarea
              className="w-full min-h-[160px] rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={summaryDraft}
              onChange={(e) => setSummaryDraft(e.target.value)}
              placeholder={'Enter bullet points, one per line'}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsSummaryModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSummary}>Save Summary</Button>
            </div>
          </div>
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

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-green-600">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{lastAction?.type === 'approve' ? 'Questions Approved!' : 'Generation Successful!'}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-semibold mb-2">
              ✅ {lastAction?.count || 0}
              {lastAction?.type === 'approve'
                ? 'Questions Approved & Saved Successfully!'
                : 'Questions Generated Successfully!'}
            </p>
            <p className="text-gray-600 text-sm">
              {lastAction?.type === 'approve'
                ? 'The selected questions have been saved to the database.'
                : 'Your questions have been added to the content library and are ready to use.'}
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setLastAction(null);
              }}
              className="px-8"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Learning Pack Modal */}
      <CreateLearningPackModal
        open={createPackOpen}
        onOpenChange={setCreatePackOpen}
        onCreated={(pack) => {
          setPackRefreshToken((t) => t + 1);
          setSelectedPackId(pack.id);
        }}
      />
    </div>
  );
};

export default ContentGeneration;
