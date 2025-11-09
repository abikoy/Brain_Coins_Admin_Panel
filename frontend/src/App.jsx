import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ContentGenerationProvider } from './context/ContentGenerationContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const AppContent = () => {
  const { user, isLoggedIn, loading, login, logout } = useAuth();
  const { students, progressData, questions, setQuestions, logs } = useData();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
          <p className="text-white text-lg font-semibold">Loading Brain Coins...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={login} />;
  }

  return (
    <Dashboard
      onLogout={logout}
      user={user}
      students={students}
      progressData={progressData}
      questions={questions}
      setQuestions={setQuestions}
      logs={logs}
    />
  );
};

const App = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <ContentGenerationProvider>
          <AppContent />
        </ContentGenerationProvider>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
