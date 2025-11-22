// pages/Dashboard.jsx (simplified)
import React, { useState } from 'react';
import Header from '../components/shared/Header';
import Sidebar from '../components/shared/Sidebar';
import Analytics from './Analytics';
import { BarChart3, FileText, Settings, AlertCircle, Layers, Edit3 } from 'lucide-react';
import ContentGeneration from './ContentGeneration';
import ContentManagement from './ContentManagement';
import QuestionEditor from './QuestionEditor';
import SystemLogs from './system_logs'; 

const Dashboard = ({ onLogout, user, students, progressData, questions, setQuestions, logs }) => {
  const [activeTab, setActiveTab] = useState('analytics');

  const MobileTabNav = () => (
    <div className="lg:hidden glass-card mb-6 p-2 flex space-x-2">
      {[
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          description: 'Performance metrics and insights'
        },
        {
          id: 'contentgeneration',
          label: 'AI Generation',
          icon: FileText,
          description: 'Generate questions and materials'
        },
        {
          id: 'contentmanagement',
          label: 'Content Management',
          icon: Layers,
          description: 'Manage questions and learning packs'
        },
        {
          id: 'questioneditor',
          label: 'Question Editor',
          icon: Edit3,
          description: 'Enhanced question editing interface'
        },
        {
          id: 'configuration',
          label: 'Configuration',
          icon: AlertCircle,
          description: 'System settings and error logs'
        },
      ].map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-primary text-white'
                : 'text-gray-700 hover:bg-gradient-glass'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-cyan-50 to-purple-50">
      <Header onLogout={onLogout} adminName={user?.name} />

      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-4 lg:p-8">
          <MobileTabNav />

          {activeTab === 'analytics' && (
            <Analytics students={students} progressData={progressData} />
          )}

          {activeTab === 'contentgeneration' && (
            <ContentGeneration questions={questions} setQuestions={setQuestions} />
          )}

          {activeTab === 'contentmanagement' && (
            <ContentManagement onNavigate={setActiveTab} />
          )}

          {activeTab === 'questioneditor' && (
            <QuestionEditor />
          )}

          {activeTab === 'systemlogs' && (
            <SystemLogs />
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;