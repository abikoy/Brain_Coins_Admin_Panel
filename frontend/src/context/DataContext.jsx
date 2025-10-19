import React, { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [students, setStudents] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', progress: 75, status: 'Active', score: 850 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', progress: 92, status: 'Active', score: 920 },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', progress: 45, status: 'Active', score: 650 },
    { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', progress: 88, status: 'Active', score: 880 },
    { id: 5, name: 'Tom Brown', email: 'tom@example.com', progress: 60, status: 'Inactive', score: 720 },
  ]);

  const [progressData, setProgressData] = useState([
    { name: 'Mon', score: 65 },
    { name: 'Tue', score: 72 },
    { name: 'Wed', score: 68 },
    { name: 'Thu', score: 85 },
    { name: 'Fri', score: 78 },
    { name: 'Sat', score: 90 },
    { name: 'Sun', score: 82 },
  ]);

  const [questions, setQuestions] = useState([
    { id: 1, type: 'MCQ', difficulty: 'Easy', question: 'What is the capital of France?', answer: 'Paris', generated: false },
    { id: 2, type: 'FIIB', difficulty: 'Intermediate', question: 'The process of photosynthesis occurs in ___', answer: 'chloroplasts', generated: false },
    { id: 3, type: 'TF', difficulty: 'Easy', question: 'Water boils at 100°C at sea level', answer: 'True', generated: false },
  ]);

  const [logs, setLogs] = useState([
    { type: 'error', message: 'Gemini API rate limit exceeded', timestamp: '2024-01-15 14:30:00' },
    { type: 'info', message: 'Manual override: Question #45 difficulty changed', timestamp: '2024-01-15 13:15:00' },
    { type: 'error', message: 'Failed to process PDF upload', timestamp: '2024-01-15 12:00:00' },
    { type: 'info', message: 'CSV export completed successfully', timestamp: '2024-01-15 11:45:00' },
  ]);

  return (
    <DataContext.Provider value={{
      students,
      setStudents,
      progressData,
      setProgressData,
      questions,
      setQuestions,
      logs,
      setLogs
    }}>
      {children}
    </DataContext.Provider>
  );
};
