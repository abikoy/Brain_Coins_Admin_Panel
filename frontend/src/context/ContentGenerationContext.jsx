import React, { createContext, useContext, useState, useEffect } from 'react';

const ContentGenerationContext = createContext();

export const useContentGeneration = () => {
  const context = useContext(ContentGenerationContext);
  if (!context) {
    throw new Error('useContentGeneration must be used within ContentGenerationProvider');
  }
  return context;
};

export const ContentGenerationProvider = ({ children }) => {
  // File upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [uploadedFileType, setUploadedFileType] = useState('');
  
  // Learning packs state
  const [suggestedPacks, setSuggestedPacks] = useState(() => {
    const savedPacks = localStorage.getItem('suggestedPacks');
    return savedPacks ? JSON.parse(savedPacks) : [];
  });
  // Use localStorage to persist selectedPackIndex
  const [selectedPackIndex, setSelectedPackIndex] = useState(() => {
    const savedIndex = localStorage.getItem('selectedPackIndex');
    return savedIndex !== null ? parseInt(savedIndex, 10) : null;
  });
  // Use localStorage to persist selectedPackIndices
  const [selectedPackIndices, setSelectedPackIndices] = useState(() => {
    const savedIndices = localStorage.getItem('selectedPackIndices');
    return savedIndices ? JSON.parse(savedIndices) : [];
  });
  const [detectedLanguage, setDetectedLanguage] = useState('English');
  
  // Update localStorage when selectedPackIndex changes
  useEffect(() => {
    if (selectedPackIndex === null) {
      localStorage.removeItem('selectedPackIndex');
    } else {
      localStorage.setItem('selectedPackIndex', selectedPackIndex.toString());
    }
  }, [selectedPackIndex]);
  
  // Update localStorage when suggestedPacks changes
  useEffect(() => {
    localStorage.setItem('suggestedPacks', JSON.stringify(suggestedPacks));
  }, [suggestedPacks]);
  
  // Update localStorage when selectedPackIndices changes
  useEffect(() => {
    localStorage.setItem('selectedPackIndices', JSON.stringify(selectedPackIndices));
  }, [selectedPackIndices]);
  
  // Question generation state
  const [preview, setPreview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [summaryBullets, setSummaryBullets] = useState([]);
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  // Question type configuration
  const [questionTypeCounts, setQuestionTypeCounts] = useState({
    MCQ: 5,
    FIIB: 5,
    TF: 5,
    HOQ: 5
  });
  
  const [questionTypeDifficulties, setQuestionTypeDifficulties] = useState({
    MCQ: 'Medium',
    FIIB: 'Medium',
    TF: 'Medium',
    HOQ: 'Medium'
  });

  // Reset all state (useful when starting fresh)
  const resetAllState = () => {
    // Clear state
    setUploadedFile(null);
    setUploadedFileUrl('');
    setUploadedFileType('');
    setSuggestedPacks([]);
    setSelectedPackIndex(null);
    setSelectedPackIndices([]);
    setDetectedLanguage('English');
    setPreview(null);
    setQuestions([]);
    setSummaryBullets([]);
    setIsGenerating(false);
    setIsAnalyzing(false);
    setGenerationError('');
    setShowUploadForm(false);
    
    // Clear localStorage
    localStorage.removeItem('selectedPackIndex');
    localStorage.removeItem('selectedPackIndices');
    localStorage.removeItem('suggestedPacks');
  };

  // Reset only generation state (keep file and packs)
  const resetGenerationState = () => {
    setPreview(null);
    setQuestions([]);
    setSummaryBullets([]);
    setIsGenerating(false);
    setGenerationError('');
  };

  return (
    <ContentGenerationContext.Provider value={{
      // File upload
      uploadedFile,
      setUploadedFile,
      uploadedFileUrl,
      setUploadedFileUrl,
      uploadedFileType,
      setUploadedFileType,
      
      // Learning packs
      suggestedPacks,
      setSuggestedPacks,
      selectedPackIndex,
      setSelectedPackIndex,
      selectedPackIndices,
      setSelectedPackIndices,
      detectedLanguage,
      setDetectedLanguage,
      
      // Question generation
      preview,
      setPreview,
      questions,
      setQuestions,
      summaryBullets,
      setSummaryBullets,
      
      // UI state
      isGenerating,
      setIsGenerating,
      isAnalyzing,
      setIsAnalyzing,
      generationError,
      setGenerationError,
      showUploadForm,
      setShowUploadForm,
      
      // Question configuration
      questionTypeCounts,
      setQuestionTypeCounts,
      questionTypeDifficulties,
      setQuestionTypeDifficulties,
      
      // Helper functions
      resetAllState,
      resetGenerationState
    }}>
      {children}
    </ContentGenerationContext.Provider>
  );
};
