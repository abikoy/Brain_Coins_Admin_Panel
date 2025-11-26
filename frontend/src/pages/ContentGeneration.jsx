import React, { useState, useEffect } from 'react';
import GlassCard from '../components/shared/GlassCard';
import UploadForm from '../components/shared/UploadForm';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import Input from '../components/ui/Input';
import Toast from '../components/ui/Toast';
import { Upload, Sparkles, Edit, Plus, FileText, Trash2, AlertCircle, ChevronDown, Image, X } from 'lucide-react';
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
import { uploadQuestionDiagram, deleteQuestionDiagram } from '../api/questionDiagramService';
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
    selectedPackIndices,
    setSelectedPackIndices,
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
    answer: '',
    options: ['', '', '', ''], // 4 options for MCQ/FIIB, 2 for TF
    language: 'English',
    explanations: ''
  });
  const [diagramFile, setDiagramFile] = useState(null);
  const [diagramPreview, setDiagramPreview] = useState(null);
  const [editDiagramFile, setEditDiagramFile] = useState(null);
  const [editDiagramPreview, setEditDiagramPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const languageMap = {
    'English': 'en',
    'english': 'en',
    'en': 'en',
    'Sinhala': 'si',
    'sinhala': 'si',
    'sinhalese': 'si',
    '\u0dc3\u0dd2\u0d82\u0dc4\u0dbd': 'si',
    'si': 'si',
    'Tamil': 'ta',
    'tamil': 'ta',
    '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd': 'ta',
    'ta': 'ta'
  };

  // Helper: map any language string (name or code) to backend code en/si/ta
  const getLanguageCode = (languageName) => {
    if (!languageName) return 'en';

    const normalized = String(languageName).trim().toLowerCase();

    // Direct mapping (names or codes)
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

  // Helper: map backend value (en/si/ta or name) to dropdown display value
  const getDisplayLanguage = (value) => {
    if (!value) return 'English';
    const v = String(value).trim().toLowerCase();

    if (v === 'en' || v === 'english') return 'English';
    if (v === 'si' || v === 'sinhala' || /[\u0d80-\u0dff]/.test(value)) return 'Sinhala';
    if (v === 'ta' || v === 'tamil' || /[\u0b80-\u0bff]/.test(value)) return 'Tamil';

    return 'English';
  };
  // helper function fro language context
  const formatPackTitle = (originalTitle, language, index) => {
    if (!originalTitle || typeof originalTitle !== 'string') {
      originalTitle = `Pack ${index + 1}`;
    }

    // Extract the actual chapter title (remove any existing prefix)
    let chapterTitle = originalTitle.trim();

    // Remove ALL possible prefixes (more aggressive approach)
    const allPrefixPatterns = [
      /^(Learning Pack \d+:?\s*)/i,           // English
      /^(ඉගෙනුම් පැකේජය \d+:?\s*)/,          // Sinhala
      /^(கற்றல் தொகுப்பு \d+:?\s*)/           // Tamil
    ];

    // Remove any existing prefixes from any language
    allPrefixPatterns.forEach(pattern => {
      const match = chapterTitle.match(pattern);
      if (match) {
        chapterTitle = chapterTitle.replace(match[0], '').trim();
      }
    });

    // Additional cleanup: remove any remaining "Learning Pack X:" that might be embedded
    chapterTitle = chapterTitle.replace(/Learning Pack \d+:\s*/gi, '').trim();

    // If we removed everything, use a default title
    if (!chapterTitle || chapterTitle.length < 2) {
      const defaultTitles = {
        'English': 'Content',
        'Sinhala': 'අන්තර්ගතය',
        'Tamil': 'உள்ளடக்கம்'
      };
      chapterTitle = defaultTitles[detectedLanguage] || 'Content';
    }

    // Apply the correct prefix based on language
    const prefixes = {
      'English': 'Learning Pack',
      'Sinhala': 'ඉගෙනුම් පැකේජය',
      'Tamil': 'கற்றல் தொகுப்பு'
    };

    const prefix = prefixes[detectedLanguage] || 'Learning Pack';
    const packNumber = index + 1;

    return `${prefix} ${packNumber}: ${chapterTitle}`;
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
    MCQ: { count: 20, difficulty: 'Medium', enabled: true },
    FIIB: { count: 15, difficulty: 'Medium', enabled: false },
    TF: { count:10, difficulty: 'Easy', enabled: false },
    HOQ: { count: 3, difficulty: 'Hard', enabled: false }
  });

  // preview is now from context
  const [selectedIds, setSelectedIds] = useState({});
  const [activeTab, setActiveTab] = useState('0'); // For tabbed preview

  // Toggle selection function for preview questions
  const toggleSelection = (key) => {
    setSelectedIds(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Select all or deselect all questions
  const toggleSelectAll = () => {
    if (!preview?.questions) return;

    const allSelected = preview.questions.every((q, i) => selectedIds[q.id || i]);

    if (allSelected) {
      // Deselect all
      setSelectedIds({});
    } else {
      // Select all
      const newSelected = {};
      preview.questions.forEach((q, i) => {
        newSelected[q.id || i] = true;
      });
      setSelectedIds(newSelected);
    }
  };

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
    console.log(uploadData);
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

  // Generate learning packs from uploaded file (Background Job)
  const handleGenerateLearningPacks = async () => {
    if (!uploadedFile) {
      setAnalysisError('Please upload a file first');
      return;
    }

    try {
      setIsGeneratingPacks(true);
      setAnalysisError('');
      
      // Import job service
      const { startAnalysisJob, pollJobUntilComplete } = await import('../api/jobService.js');
      
      // Start background job
      const jobResponse = await startAnalysisJob(uploadedFile.fileUrl);
      const jobId = jobResponse.jobId;
      
      setToast({ message: `Analysis started (Job: ${jobId}). This may take up to 10 minutes...`, type: 'info' });
      
      // Poll for completion
      const result = await pollJobUntilComplete(jobId, (job) => {
        // Update progress
        if (job.status === 'processing') {
          setToast({ message: 'Document is being processed by AI...', type: 'info' });
        }
      });
      
      const packs = result.data || [];
      setSuggestedPacks(packs);

      // Auto-detect language
      if (packs.length > 0 && packs[0].language) {
        const rawDetectedLang = packs[0].language;
        const displayLanguage = getDisplayLanguage(rawDetectedLang);
        setGenLanguage(displayLanguage);
        setDetectedLanguage(displayLanguage);
      }
      
      setToast({ message: 'Document analysis completed successfully!', type: 'success' });

    } catch (error) {
      console.error('Document analysis failed:', error);
      setAnalysisError(error.message || 'Failed to analyze document');
      setToast({ message: error.message || 'Analysis failed', type: 'error' });
    } finally {
      setIsGeneratingPacks(false);
    }
  };

  // Toggle pack selection for question generation (card click) - support up to 5 packs
  const togglePackForQuestions = (index) => {
    setSelectedPackIndices(prev => {
      if (prev.includes(index)) {
        // Remove if already selected
        return prev.filter(i => i !== index);
      } else if (prev.length < 5) {
        // Add if less than 5 selected
        return [...prev, index];
      } else {
        // Show warning if trying to select more than 5
        setToast({ message: '⚠️ You can select up to 5 learning packs maximum', type: 'warning' });
        return prev;
      }
    });

    // Keep the old single selection for backward compatibility
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

    if (selectedPackIndices.length === 0) {
      setGenerationError('Please select at least one learning pack by clicking on pack cards above');
      return;
    }

    // Get all selected packs
    const selectedPacks = selectedPackIndices.map(index => suggestedPacks[index]).filter(Boolean);
    if (selectedPacks.length === 0) {
      setGenerationError('Selected learning packs not found. Please try selecting other packs.');
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

      // Generate questions for each pack separately
      const packResults = [];
      let totalQuestions = 0;

      for (let i = 0; i < selectedPacks.length; i++) {
        const pack = selectedPacks[i];
        const packIndex = selectedPackIndices[i];

        console.log(`[ContentGeneration] Generating preview for pack ${i + 1}/${selectedPacks.length}: ${pack.title}`);

        try {
          const pv = await previewFromFile(uploadedFile.fileUrl, uploadedFile.fileType, {
            language: genLanguage,
            grade,
            subject,
            difficulty: Object.values(typeDifficulties)[0] || 'Medium',
            bloom_level: genBloom,
            questionTypes: enabledQuestionTypes,
            typeDifficulties: typeDifficulties,
            packTitle: pack.title,
            packDescription: pack.content || pack.description
          });

          if (pv.questions && pv.questions.length > 0) {
            packResults.push({
              packIndex: packIndex,
              packTitle: pack.title,
              packDescription: pack.content || pack.description,
              questions: pv.questions,
              summary_bullets: pv.summary_bullets || []
            });
            totalQuestions += pv.questions.length;
          }
        } catch (packError) {
          console.error(`[ContentGeneration] Error generating for pack ${pack.title}:`, packError);
          // Continue with other packs
        }
      }

      // Check if we got any questions from any pack
      if (packResults.length === 0 || totalQuestions === 0) {
        setGenerationError('No questions were generated for any selected pack. Please try again or adjust your settings.');
        setPreview(null);
        return;
      }

      // Set preview with tabbed structure
      setPreview({
        packResults: packResults,
        totalQuestions: totalQuestions,
        selectedPacksCount: selectedPacks.length
      });

      // Pre-select all questions by default across all packs
      const pre = {};
      packResults.forEach(packResult => {
        packResult.questions.forEach((q, i) => {
          pre[q.id || `${packResult.packIndex}-${i}`] = true;
        });
      });
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
    if (!preview || (!preview.packResults && !Array.isArray(preview.questions))) {
      setGenerationError('No preview to approve');
      return;
    }

    // Require subject and grade before saving a new pack
    if (!subject || !grade) {
      setGenerationError('Please select both Grade and Subject before approving questions.');
      return;
    }

    // Handle both old single-pack format and new multi-pack format
    let allChosenQuestions = [];
    let packResultsToProcess = [];

    if (preview.packResults) {
      // New multi-pack format
      preview.packResults.forEach(packResult => {
        const packQuestions = packResult.questions.filter((q, i) =>
          selectedIds[q.id || `${packResult.packIndex}-${i}`]
        );
        if (packQuestions.length > 0) {
          allChosenQuestions.push(...packQuestions);
          packResultsToProcess.push({
            ...packResult,
            selectedQuestions: packQuestions
          });
        }
      });
    } else {
      // Old single-pack format (backward compatibility)
      allChosenQuestions = preview.questions.filter((q, i) => selectedIds[q.id || i]);
    }

    if (!allChosenQuestions.length) {
      setGenerationError('Select at least one question to approve');
      return;
    }

    // RESET IMMEDIATELY so admin can select another pack
    setSelectedPackIndex(null);
    setSelectedPackIndices([]); // Clear multiple pack selection
    setSelectedPackId(''); // Clear learning pack selector
    setPreview(null);
    setSelectedIds({});

    setIsGenerating(true);
    setGenerationError('');

    try {
      const { createLearningPack: createLearningPackAPI } = await import('../api/learningPackService');
      let totalSavedQuestions = [];
      let allSummaryBullets = [];

      if (preview.packResults) {
        // Process each pack separately
        for (const packResult of packResultsToProcess) {
          console.log(`[Frontend] Creating learning pack for: ${packResult.packTitle}`);

          const formattedTitle = formatPackTitle(
            packResult.packTitle,
            genLanguage,
            packResult.packIndex
          );

          const safeTitle = formattedTitle || packResult.packTitle || 'Learning Pack';
          const safeGrade = `Grade ${parseInt(grade)}`;

          const payload = {
            title: safeTitle,
            description: packResult.packDescription || '',
            subject_id: subject,
            grade: safeGrade,
            difficulty: 'Medium',
            language: getLanguageCode(genLanguage || 'English'),
            is_active: true
          };

          const newPack = await createLearningPackAPI(payload);

          const { questions: saved, saved_summary } = await approveFromPreview({
            pack_id: newPack.id,
            questions: packResult.selectedQuestions,
            summary_bullets: packResult.summary_bullets,
            language: genLanguage,
            difficulty: 'Intermediate',
            bloom_level: genBloom
          });

          totalSavedQuestions.push(...saved);
          if (Array.isArray(saved_summary?.bullets)) {
            allSummaryBullets.push(...saved_summary.bullets);
          }

          console.log(`[Frontend] Saved ${saved.length} questions for pack: ${packResult.packTitle}`);
        }
      } else {
        // Backward compatibility for single pack
        const selectedPack = suggestedPacks[selectedPackIndices[0] || 0];
        const formattedTitle = formatPackTitle(
          selectedPack.title,
          selectedPack.language || genLanguage,
          0
        );

        const safeTitle = formattedTitle || 'Learning Pack';
        const safeGrade = `Grade ${parseInt(grade)}`;

        const payload = {
          title: safeTitle,
          description: selectedPack.content || selectedPack.description || '',
          subject_id: subject,
          grade: safeGrade,
          difficulty: selectedPack.difficulty || 'Medium',
          language: getLanguageCode(selectedPack.language || genLanguage || 'English'),
          is_active: true
        };

        const newPack = await createLearningPackAPI(payload);

        const { questions: saved, saved_summary } = await approveFromPreview({
          pack_id: newPack.id,
          questions: allChosenQuestions,
          summary_bullets: preview.summary_bullets,
          language: genLanguage,
          difficulty: 'Intermediate',
          bloom_level: genBloom
        });

        totalSavedQuestions = saved;
        if (Array.isArray(saved_summary?.bullets)) {
          allSummaryBullets = saved_summary.bullets;
        }
      }

      // Upload any pending diagrams for questions that were edited in preview
      for (const savedQuestion of totalSavedQuestions) {
        const originalQuestion = allChosenQuestions.find(q =>
          (q.id && q.id.startsWith('gen-')) &&
          q.question === savedQuestion.question
        );

        if (originalQuestion && originalQuestion.pendingDiagram) {
          try {
            console.log('[Frontend] Uploading pending diagram for question:', savedQuestion.id);
            await uploadQuestionDiagram(savedQuestion.id, originalQuestion.pendingDiagram);
          } catch (diagramError) {
            console.error('[Frontend] Failed to upload pending diagram:', diagramError);
            // Don't fail the whole process for diagram upload errors
          }
        }
      }

      setQuestions([...questions, ...totalSavedQuestions]);
      if (allSummaryBullets.length > 0) setSummaryBullets(allSummaryBullets);

      setLastAction({
        type: 'approve',
        count: totalSavedQuestions.length,
        packs: packResultsToProcess.length || 1
      });
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
        grade: `Grade ${parseInt(grade)}`,
        difficulty: selectedPack.difficulty || 'Medium', // Use difficulty from pack (set by user via dropdown)
        language: getLanguageCode(selectedPack.language || genLanguage || 'English'),
        is_active: true
      });

      const packId = newPack.id;

      const { generateQuestionsFromFile } = await import('../api/questionService');
      const { generatedQuestions, summary_bullets } = await generateQuestionsFromFile(
        uploadedFile.url,
        uploadedFile.type,
        {
          pack_id: packId,
          count: genCount,
          difficulty: 'Intermediate',
          types: ['MCQ', 'FIIB', 'TF', 'HOQ'],
          language: genLanguage,
          bloom_level: genBloom,
          packTitle: selectedPack.title, // Add pack title for focused generation
          packDescription: selectedPack.content || selectedPack.description // Add pack description for context
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
      setToast({ message: '🗑️ Question deleted successfully!', type: 'success' });
    } catch (error) {
      console.error('[ContentManager] Delete error:', error);
      setToast({ message: 'Failed to delete question: ' + error.message, type: 'error' });
    }
  };

  const handleSaveEdit = async () => {
    try {
      setIsSavingEdit(true);

      // Check if this is a preview question (temporary ID) or a saved question (real UUID)
      const idValue = editingQuestion?.id;
      const idString = idValue != null ? String(idValue) : '';
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

      // Treat anything that is not a valid UUID (including 0, undefined, etc.) as a PREVIEW question
      const isPreviewQuestion = !uuidRegex.test(idString) || idString.startsWith('gen-');

      // Prepare options - for TF questions, ensure we have default values if empty
      let optionsToSave = editingQuestion.options || [];
      if (editingQuestion.type === 'TF') {
        optionsToSave = [
          (editingQuestion.options || [])[0] || 'True',
          (editingQuestion.options || [])[1] || 'False'
        ];
      }

      let updatedQuestion;

      if (isPreviewQuestion) {
        // For preview questions, just update the local preview data
        console.log('[Frontend] Updating preview question locally:', editingQuestion.id);
        updatedQuestion = {
          ...editingQuestion,
          type: editingQuestion.type,
          difficulty: editingQuestion.difficulty,
          question: editingQuestion.question,
          answer: editingQuestion.answer,
          options: optionsToSave,
          language: editingQuestion.language || 'English',
          explanation: editingQuestion.explanations,
          explanations: editingQuestion.explanations
        };

        // Update the preview questions array
        if (preview && preview.questions) {
          let questionIndex = -1;

          // Prefer the exact index we stored when opening the edit modal
          if (typeof editingQuestion.previewIndex === 'number') {
            questionIndex = editingQuestion.previewIndex;
          } else {
            // Fallback: try to locate by ID
            questionIndex = preview.questions.findIndex(q => {
              if (q.id != null && editingQuestion.id != null) {
                return String(q.id) === String(editingQuestion.id);
              }
              return false;
            });
          }
          if (questionIndex !== -1) {
            const updatedQuestions = [...preview.questions];
            updatedQuestions[questionIndex] = updatedQuestion;
            setPreview({
              ...preview,
              questions: updatedQuestions
            });
            console.log('[Frontend] Preview question updated at index:', questionIndex);
          } else {
            console.warn('[Frontend] Could not find preview question to update:', editingQuestion.id);
          }
        }
      } else {
        // For saved questions, call backend API to update in database
        console.log('[Frontend] Updating saved question in database:', editingQuestion.id);
        updatedQuestion = await updateQuestionAPI(editingQuestion.id, {
          type: editingQuestion.type,
          difficulty: editingQuestion.difficulty,
          question: editingQuestion.question,
          answer: editingQuestion.answer,
          options: optionsToSave,
          language: getLanguageCode(editingQuestion.language || 'English'),
          explanation: editingQuestion.explanations
        });
      }

      // Upload diagram if provided (only for saved questions, not preview questions)
      if (editDiagramFile && editingQuestion.id && !isPreviewQuestion) {
        try {
          const result = await uploadQuestionDiagram(editingQuestion.id, editDiagramFile);
          updatedQuestion.diagram_path = result.diagramPath;
          updatedQuestion.has_diagram = true;
        } catch (diagramError) {
          console.error('[ContentManager] Diagram upload error:', diagramError);
          alert('Question updated but diagram upload failed: ' + diagramError.message);
        }
      } else if (editDiagramFile && isPreviewQuestion) {
        // For preview questions, just store the diagram file locally for when the question is saved
        console.log('[Frontend] Diagram will be uploaded when question is saved to database');
        updatedQuestion.pendingDiagram = editDiagramFile;
      }

      // Update local state with response from server
      setQuestions(questions.map(q =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      ));

      setIsEditModalOpen(false);
      setEditingQuestion(null);
      setEditDiagramFile(null);
      setEditDiagramPreview(null);

      // Show appropriate success message
      const successMessage = isPreviewQuestion
        ? '✅ Preview question updated! Changes will be saved when you approve the questions.'
        : '✅ Question updated successfully in database!';
      setToast({ message: successMessage, type: 'success' });
    } catch (error) {
      console.error('[ContentManager] Save edit error:', error);
      setToast({ message: 'Failed to save changes: ' + error.message, type: 'error' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle option change for MCQ/FIIB
  const handleOptionChange = (index, value, isEdit = false) => {
    if (isEdit) {
      const newOptions = [...(editingQuestion.options || ['', '', '', ''])];
      newOptions[index] = value;
      setEditingQuestion({ ...editingQuestion, options: newOptions });
    } else {
      const newOptions = [...newQuestion.options];
      newOptions[index] = value;
      setNewQuestion({ ...newQuestion, options: newOptions });
    }
  };

  // Handle diagram file selection
  const handleDiagramChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload an image (PNG, JPG, GIF, SVG, WebP, BMP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (isEdit) {
        setEditDiagramFile(file);
        setEditDiagramPreview(reader.result);
      } else {
        setDiagramFile(file);
        setDiagramPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove diagram
  const handleRemoveDiagram = (isEdit = false) => {
    if (isEdit) {
      setEditDiagramFile(null);
      setEditDiagramPreview(null);
    } else {
      setDiagramFile(null);
      setDiagramPreview(null);
    }
  };

  const handleAddQuestion = async () => {
    try {
      if (!selectedPackId) {
        setToast({ message: '⚠️ Please select a learning pack first', type: 'warning' });
        return;
      }

      setIsAddingQuestion(true);

      // Prepare options - for TF questions, ensure we have default values if empty
      let optionsToSave = newQuestion.options || [];
      if (newQuestion.type === 'TF') {
        optionsToSave = [
          newQuestion.options[0] || 'True',
          newQuestion.options[1] || 'False'
        ];
      }

      const created = await createQuestionAPI({
        pack_id: selectedPackId,
        type: newQuestion.type,
        difficulty: newQuestion.difficulty,
        question: newQuestion.question,
        answer: newQuestion.answer,
        options: optionsToSave,
        language: getLanguageCode(newQuestion.language),
        blooms_taxonomy: genBloom,
        explanation: newQuestion.explanations
      });

      // Upload diagram if provided
      if (diagramFile && created.id) {
        try {
          const result = await uploadQuestionDiagram(created.id, diagramFile);
          created.diagram_path = result.diagramPath;
          created.has_diagram = true;
        } catch (diagramError) {
          console.error('[ContentManager] Diagram upload error:', diagramError);
          alert('Question created but diagram upload failed: ' + diagramError.message);
        }
      }

      setQuestions([...questions, created]);
      setIsAddModalOpen(false);
      setNewQuestion({
        type: 'MCQ',
        difficulty: 'Easy',
        question: '',
        answer: '',
        options: ['', '', '', ''],
        language: 'English',
        explanations: ''
      });
      setDiagramFile(null);
      setDiagramPreview(null);
      setToast({ message: '✨ Question created successfully!', type: 'success' });
    } catch (err) {
      console.error('[ContentManager] Create manual question error:', err);
      setToast({ message: 'Failed to create question: ' + (err.message || 'Unknown error'), type: 'error' });
    } finally {
      setIsAddingQuestion(false);
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

          // Generate single title in the detected language
          const getDisplayTitle = (pack, index) => {
            // If the pack already has a properly formatted title, use it
            if (pack.title && (
              pack.title.startsWith('Learning Pack') ||
              pack.title.startsWith('ඉගෙනුම් පැකේජය') ||
              pack.title.startsWith('கற்றல் தொகுப்பு')
            )) {
              return pack.title;
            }

            // Otherwise, format it for display
            return formatPackTitle(pack.title, pack.language, index);
          };
          const languageSpecificTitle = getDisplayTitle(pack, index);

          // Debug logging for language detection
          if (index === 0) {
            console.log('[Frontend] Pack language detected:', pack.language, 'for pack:', cleanTitle);
            console.log('[Frontend] Language-specific title:', languageSpecificTitle);
          }


          const isSelectedForQuestions = selectedPackIndices.includes(index);
          const selectionNumber = selectedPackIndices.indexOf(index) + 1;

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
                {isSelectedForQuestions && (
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                    {selectionNumber}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4
                    className="font-medium text-gray-900 text-sm sm:text-base break-words"
                    title={languageSpecificTitle}
                  >
                    {languageSpecificTitle}
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

                  {/* Difficulty Dropdown */}
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Difficulty:</label>
                    <select
                      value={pack.difficulty || 'Medium'}
                      onChange={(e) => {
                        e.stopPropagation();
                        const newPacks = [...suggestedPacks];
                        newPacks[index] = { ...newPacks[index], difficulty: e.target.value };
                        setSuggestedPacks(newPacks);
                      }}
                      className="text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 w-full"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
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

                {uploadedFile && selectedPackIndices.length === 0 && !generationError && (
                  <p className="text-xs text-amber-600 mb-4 font-medium">
                    ⚠️ Click on learning pack cards above to select them for question generation (up to 5 packs, cards will turn GREEN with numbers)
                  </p>
                )}

                {selectedPackIndices.length > 0 && !preview && (
                  <div className="mb-4 p-2 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-xs text-green-700 font-semibold">
                      ✓ {selectedPackIndices.length} pack{selectedPackIndices.length > 1 ? 's' : ''} selected for question generation
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      You can now Preview or Generate Questions. After generation, you can select another pack.
                    </p>
                  </div>
                )}

                {preview && ((preview.questions && preview.questions.length > 0) || (preview.packResults && preview.totalQuestions > 0)) && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm text-green-700 font-semibold">
                      ✓ Preview ready with {preview.totalQuestions || preview.questions?.length || 0} questions
                      {preview.packResults && ` from ${preview.packResults.length} learning packs`}!
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Select questions (checkboxes) and click the GREEN "Approve & Save" button
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2">
                  <Button
                    onClick={handlePreview}
                    disabled={isGenerating || !uploadedFile || selectedPackIndices.length === 0}
                    variant="outline"
                    title={selectedPackIndices.length === 0 ? 'Select at least one learning pack first' : `Generate questions for ${selectedPackIndices.length} selected pack${selectedPackIndices.length > 1 ? 's' : ''}`}
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
                    disabled={isGenerating || !preview || (!preview.questions?.length && !preview.totalQuestions)}
                    className={`transition-all ${preview && (preview.questions?.length > 0 || preview.totalQuestions > 0)
                      ? 'bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    title={!preview ? 'Click Generate first to create questions' : 'Save selected questions to database'}
                  >
                    {preview && (preview.questions?.length > 0 || preview.totalQuestions > 0) ? '✓ ' : ''}Approve & Save
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

          {preview.packResults ? (
            // Multi-pack tabbed interface
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 mb-4">
                {preview.packResults.map((packResult, index) => (
                  <TabsTrigger
                    key={index}
                    value={index.toString()}
                    className="text-xs p-2 truncate"
                    title={packResult.packTitle}
                  >
                    {packResult.packTitle.length > 20
                      ? `${packResult.packTitle.substring(0, 20)}...`
                      : packResult.packTitle}
                    <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">
                      {packResult.questions.length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {preview.packResults.map((packResult, index) => (
                <TabsContent key={index} value={index.toString()}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-sm">
                    <div className="p-3 rounded border">
                      <p className="font-medium mb-1">Pack Info</p>
                      <p className="font-semibold text-blue-700">{packResult.packTitle}</p>
                      <p className="text-xs text-gray-600 mt-1">{packResult.questions.length} questions</p>
                    </div>
                    <div className="p-3 rounded border">
                      <p className="font-medium mb-1">Description</p>
                      <p className="text-sm text-gray-700">{packResult.packDescription || 'No description'}</p>
                    </div>
                    <div className="p-3 rounded border">
                      <p className="font-medium mb-1">Summary</p>
                      {packResult.summary_bullets && packResult.summary_bullets.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          {packResult.summary_bullets.map((bullet, i) => (
                            <li key={i} className="text-sm">{bullet}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm">No summary available for this pack</p>
                      )}
                    </div>
                  </div>

                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Generated: {packResult.questions.length}, Selected: {packResult.questions.filter((q, i) => selectedIds[q.id || `${packResult.packIndex}-${i}`]).length}
                    </div>
                    <button
                      onClick={() => {
                        const newSelectedIds = { ...selectedIds };
                        const allSelected = packResult.questions.every((q, i) => selectedIds[q.id || `${packResult.packIndex}-${i}`]);

                        packResult.questions.forEach((q, i) => {
                          const key = q.id || `${packResult.packIndex}-${i}`;
                          newSelectedIds[key] = !allSelected;
                        });

                        setSelectedIds(newSelectedIds);
                      }}
                      className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      {packResult.questions.every((q, i) => selectedIds[q.id || `${packResult.packIndex}-${i}`]) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto">
                    {packResult.questions.map((q, i) => {
                      const key = q.id || `${packResult.packIndex}-${i}`;
                      return (
                        <div key={key} className="flex items-start gap-2 p-2 rounded border hover:border-royal-purple">
                          <input
                            type="checkbox"
                            checked={!!selectedIds[key]}
                            onChange={() => toggleSelection(key)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-xs text-gray-500">{q.type} · {q.difficulty || 'Intermediate'}</div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingQuestion({
                                    ...q,
                                    id: key,
                                    previewIndex: i,
                                    packIndex: packResult.packIndex,
                                    language: q.language || 'English',
                                    explanations: q.explanation || q.explanations || ''
                                  });
                                  setIsEditModalOpen(true);
                                }}
                                className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                                title="Edit this question before saving"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                            <div className="font-medium mb-1">{q.question}</div>

                            {/* Question type specific displays */}
                            {q.type === 'MCQ' && Array.isArray(q.options) && q.options.length > 0 && (
                              <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                                {q.options.map((o, j) => (
                                  <li key={j} className={o === q.answer ? 'font-semibold text-green-700' : ''}>
                                    {o} {o === q.answer && '✓'}
                                  </li>
                                ))}
                              </ul>
                            )}

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

                            {q.type === 'TF' && (
                              <div className="mt-2">
                                <div className="flex gap-2">
                                  {(() => {
                                    const options = q.options && q.options.length >= 2 ? q.options.slice(0, 2) : ['True', 'False'];
                                    return options.map((option, index) => {
                                      const letter = String.fromCharCode(65 + index);
                                      const isCorrect = q.answer === letter || q.answer === option;
                                      return (
                                        <span key={index} className={`text-sm px-3 py-1 rounded border ${isCorrect
                                          ? 'bg-green-100 border-green-500 text-green-800 font-semibold'
                                          : 'bg-gray-50 border-gray-300 text-gray-700'
                                          }`}>
                                          {option} {isCorrect && '✓'}
                                        </span>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            )}

                            {q.type === 'HOQ' && q.answer && (
                              <p className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">Answer:</span> {q.answer}
                              </p>
                            )}

                            {(q.explanation || q.explanations) && (
                              <div className="mt-2 p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
                                <p className="text-xs font-semibold text-blue-800 mb-1">💡 Explanation:</p>
                                <p className="text-xs text-blue-700">{q.explanation || q.explanations}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            // Single pack interface (backward compatibility)
            <>
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
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Requested: {preview.totals?.requested || 0}, Generated: {preview.totals?.generated || 0}, Selected: {Object.values(selectedIds).filter(Boolean).length}
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {preview.questions.every((q, i) => selectedIds[q.id || i]) ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {preview.questions.map((q, i) => {
                  const key = q.id || i;
                  return (
                    <div key={key} className="flex items-start gap-2 p-2 rounded border hover:border-royal-purple">
                      <input
                        type="checkbox"
                        checked={!!selectedIds[key]}
                        onChange={() => toggleSelection(key)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-xs text-gray-500">{q.type} · {q.difficulty || 'Intermediate'}</div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingQuestion({
                                ...q,
                                id: key,
                                previewIndex: i,
                                language: q.language || 'English',
                                explanations: q.explanation || q.explanations || ''
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                            title="Edit this question before saving"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                        <div className="font-medium mb-1">{q.question}</div>

                        {/* Single pack question displays - same as above */}
                        {q.type === 'MCQ' && Array.isArray(q.options) && q.options.length > 0 && (
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                            {q.options.map((o, j) => (
                              <li key={j} className={o === q.answer ? 'font-semibold text-green-700' : ''}>
                                {o} {o === q.answer && '✓'}
                              </li>
                            ))}
                          </ul>
                        )}

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

                        {q.type === 'TF' && (
                          <div className="mt-2">
                            <div className="flex gap-2">
                              {(() => {
                                const options = q.options && q.options.length >= 2 ? q.options.slice(0, 2) : ['True', 'False'];
                                return options.map((option, index) => {
                                  const letter = String.fromCharCode(65 + index);
                                  const isCorrect = q.answer === letter || q.answer === option;
                                  return (
                                    <span key={index} className={`text-sm px-3 py-1 rounded border ${isCorrect
                                      ? 'bg-green-100 border-green-500 text-green-800 font-semibold'
                                      : 'bg-gray-50 border-gray-300 text-gray-700'
                                      }`}>
                                      {option} {isCorrect && '✓'}
                                    </span>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}

                        {q.type === 'HOQ' && q.answer && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Answer:</span> {q.answer}
                          </p>
                        )}

                        {(q.explanation || q.explanations) && (
                          <div className="mt-2 p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
                            <p className="text-xs font-semibold text-blue-800 mb-1">💡 Explanation:</p>
                            <p className="text-xs text-blue-700">{q.explanation || q.explanations}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
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
                {(question.type === 'MCQ' || question.type === 'IMAGE_MCQ') && question.type !== 'TF' && question.options && question.options.length > 0 && (
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

                {/* TF type: show True/False options */}
                {question.type === 'TF' && (
                  <div className="mb-2">
                    <div className="flex gap-2">
                      {(() => {
                        // Ensure we always have exactly 2 options for TF
                        const options = question.options && question.options.length >= 2
                          ? question.options.slice(0, 2)
                          : ['True', 'False'];

                        return options.map((option, index) => {
                          const letter = String.fromCharCode(65 + index);
                          const isCorrect = question.answer === letter || question.answer === option;
                          return (
                            <span key={index} className={`text-sm px-3 py-1.5 rounded border ${isCorrect
                              ? 'bg-green-100 border-green-500 text-green-800 font-semibold'
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                              }`}>
                              {option} {isCorrect && '✓'}
                            </span>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* MATCH type: show pairs grid */}

                {/* Answer line - show for HOQ and FIIB if not already shown in options */}
                {question.answer && question.type !== 'MCQ' && question.type !== 'IMAGE_MCQ' && question.type !== 'TF' && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Answer:</span> {question.answer}
                  </p>
                )}

                {/* Explanation - Show for ALL question types */}
                {(question.explanation || question.explanations || question.explanation_si || question.explanation_ta) && (
                  <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <p className="text-xs font-semibold text-blue-800 mb-1">💡 Explanation:</p>
                    <p className="text-sm text-blue-700">
                      {question.explanation || question.explanations || question.explanation_si || question.explanation_ta}
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-green-50 to-blue-50" onClose={() => {
          setIsEditModalOpen(false);
          setEditDiagramFile(null);
          setEditDiagramPreview(null);
        }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">Edit Question</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Type</label>
                  <select
                    value={editingQuestion.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      let newOptions = editingQuestion.options || [];

                      // Set default options based on question type
                      if (newType === 'TF') {
                        newOptions = ['True', 'False'];
                      } else if (newType === 'MCQ' || newType === 'FIIB') {
                        newOptions = ['', '', '', ''];
                      } else {
                        newOptions = [];
                      }

                      setEditingQuestion({ ...editingQuestion, type: newType, options: newOptions });
                    }}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  >
                    {['MCQ', 'FIIB', 'TF', 'HOQ'].map(type => (
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
                    {['Easy', 'Intermediate', 'Hard'].map(diff => (
                      <option key={diff} value={diff}>{diff}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Language Selection */}
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

              {/* Diagram Upload */}
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                  <Image className="h-5 w-5 text-green-600" />
                  Diagram (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-3">Upload an image if this question requires a diagram (Max 5MB)</p>

                {!editDiagramPreview ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDiagramChange(e, true)}
                      className="hidden"
                      id="edit-diagram-upload"
                    />
                    <label
                      htmlFor="edit-diagram-upload"
                      className="cursor-pointer bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Choose Image
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={editDiagramPreview}
                      alt="Diagram preview"
                      className="max-w-full h-auto max-h-64 rounded-lg border-2 border-gray-200"
                    />
                    <button
                      onClick={() => handleRemoveDiagram(true)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Question</label>
                <textarea
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none"
                />
              </div>

              {/* Options for MCQ and FIIB */}
              {(editingQuestion.type === 'MCQ' || editingQuestion.type === 'FIIB') && (
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">Options (4 required)</label>
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 w-8">{String.fromCharCode(65 + index)}.</span>
                        <input
                          type="text"
                          value={(editingQuestion.options || ['', '', '', ''])[index] || ''}
                          onChange={(e) => handleOptionChange(index, e.target.value, true)}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Options for True/False */}
              {editingQuestion.type === 'TF' && (
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">True/False Options</label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 w-8">A.</span>
                      <input
                        type="text"
                        value={(editingQuestion.options || [])[0] || ''}
                        onChange={(e) => handleOptionChange(0, e.target.value, true)}
                        placeholder="True"
                        className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 w-8">B.</span>
                      <input
                        type="text"
                        value={(editingQuestion.options || [])[1] || ''}
                        onChange={(e) => handleOptionChange(1, e.target.value, true)}
                        placeholder="False"
                        className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {editingQuestion.type === 'MCQ' || editingQuestion.type === 'FIIB' ? 'Correct Answer (A, B, C, or D)' :
                    editingQuestion.type === 'TF' ? 'Correct Answer (A or B)' : 'Answer'}
                </label>
                <textarea
                  value={editingQuestion.answer}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                  placeholder={
                    editingQuestion.type === 'MCQ' || editingQuestion.type === 'FIIB' ? 'Enter the correct answer value (e.g., if A is correct, enter the value of option A)' :
                      editingQuestion.type === 'TF' ? 'Enter the correct answer value (e.g., if A is correct, enter the value of option A)' : 'Enter the answer'
                  }
                  rows={editingQuestion.type === 'MCQ' || editingQuestion.type === 'FIIB' || editingQuestion.type === 'TF' ? 1 : 3}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none"
                />
              </div>

              {/* Explanations Field */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Explanations (Optional)</label>
                <textarea
                  value={editingQuestion.explanations || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanations: e.target.value })}
                  placeholder="Provide detailed explanations for the answer (optional)"
                  rows={3}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">This will help students understand why the answer is correct</p>
              </div>
              <Button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="w-full py-3 text-lg font-semibold bg-green-600 hover:bg-green-700"
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-purple-50" onClose={() => {
          setIsAddModalOpen(false);
          setDiagramFile(null);
          setDiagramPreview(null);
          setNewQuestion({
            type: 'MCQ',
            difficulty: 'Easy',
            question: '',
            answer: '',
            options: ['', '', '', ''],
            language: 'English',
            explanations: ''
          });
        }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">Add New Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Type</label>
                <select
                  value={newQuestion.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    let newOptions = newQuestion.options;

                    // Set default options based on question type
                    if (newType === 'TF') {
                      newOptions = ['True', 'False'];
                    } else if (newType === 'MCQ' || newType === 'FIIB') {
                      newOptions = ['', '', '', ''];
                    } else {
                      newOptions = [];
                    }

                    setNewQuestion({ ...newQuestion, type: newType, options: newOptions });
                  }}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  {['MCQ', 'FIIB', 'TF', 'HOQ'].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Difficulty</label>
                <select
                  value={newQuestion.difficulty}
                  onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  {['Easy', 'Intermediate', 'Hard'].map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Language</label>
              <select
                value={newQuestion.language}
                onChange={(e) => setNewQuestion({ ...newQuestion, language: e.target.value })}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Diagram Upload */}
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
              <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <Image className="h-5 w-5 text-blue-600" />
                Diagram (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">Upload an image if this question requires a diagram (Max 5MB)</p>

              {!diagramPreview ? (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleDiagramChange(e, false)}
                    className="hidden"
                    id="diagram-upload"
                  />
                  <label
                    htmlFor="diagram-upload"
                    className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
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
                    onClick={() => handleRemoveDiagram(false)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Question</label>
              <textarea
                value={newQuestion.question}
                onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                placeholder="Enter your question"
                rows={4}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
              />
            </div>
            {/* Options for MCQ and FIIB */}
            {(newQuestion.type === 'MCQ' || newQuestion.type === 'FIIB') && (
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <label className="block text-sm font-semibold mb-3 text-gray-700">Options (4 required)</label>
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 w-8">{String.fromCharCode(65 + index)}.</span>
                      <input
                        type="text"
                        value={newQuestion.options[index] || ''}
                        onChange={(e) => handleOptionChange(index, e.target.value, false)}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Options for True/False */}
            {newQuestion.type === 'TF' && (
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <label className="block text-sm font-semibold mb-3 text-gray-700">True/False Options</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-8">A.</span>
                    <input
                      type="text"
                      value={newQuestion.options[0] || ''}
                      onChange={(e) => handleOptionChange(0, e.target.value, false)}
                      placeholder="True"
                      className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-8">B.</span>
                    <input
                      type="text"
                      value={newQuestion.options[1] || ''}
                      onChange={(e) => handleOptionChange(1, e.target.value, false)}
                      placeholder="False"
                      className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                {newQuestion.type === 'MCQ' || newQuestion.type === 'FIIB' ? 'Correct Answer (A, B, C, or D)' :
                  newQuestion.type === 'TF' ? 'Correct Answer (A or B)' : 'Answer'}
              </label>
              <textarea
                value={newQuestion.answer}
                onChange={(e) => setNewQuestion({ ...newQuestion, answer: e.target.value })}
                placeholder={
                  newQuestion.type === 'MCQ' || newQuestion.type === 'FIIB' ? 'Enter the correct answer value (e.g., if A is correct, enter the value of option A)' :
                    newQuestion.type === 'TF' ? 'Enter the correct answer value (e.g., if A is correct, enter the value of option A)' : 'Enter the answer'
                }
                rows={newQuestion.type === 'MCQ' || newQuestion.type === 'FIIB' || newQuestion.type === 'TF' ? 1 : 3}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
              />
            </div>

            {/* Explanations Field */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Explanations (Optional)</label>
              <textarea
                value={newQuestion.explanations}
                onChange={(e) => setNewQuestion({ ...newQuestion, explanations: e.target.value })}
                placeholder="Provide detailed explanations for the answer (optional)"
                rows={3}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">This will help students understand why the answer is correct</p>
            </div>
            <Button
              onClick={handleAddQuestion}
              disabled={isAddingQuestion}
              className="w-full py-3 text-lg font-semibold"
            >
              {isAddingQuestion ? 'Adding...' : 'Add Question'}
            </Button>
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
                ? lastAction?.packs > 1
                  ? `Questions approved and saved for ${lastAction.packs} learning packs.`
                  : 'The selected questions have been saved to the database.'
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

      {/* Toast Notification */}
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

export default ContentGeneration;
