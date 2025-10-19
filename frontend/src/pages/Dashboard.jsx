import React, { useState } from 'react';
import Header from '../components/shared/Header';
import Sidebar from '../components/shared/Sidebar';
import Analytics from './Analytics';
import ContentManager from './ContentManager';
import { BarChart3, FileText, Settings } from 'lucide-react';
import GlassCard from '../components/shared/GlassCard';
import Switch from '../components/ui/Switch';
import Button from '../components/ui/Button';
import { Download, Upload, AlertCircle } from 'lucide-react';

const Dashboard = ({ onLogout, user, students, progressData, questions, setQuestions, logs }) => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [config, setConfig] = useState({
    languages: true,
    grades: true,
    subjects: true,
    packs: false,
    items: true
  });

  const ConfigurationTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Configuration & Logs
        </h2>
        <p className="text-gray-600">Manage system settings and view logs</p>
      </div>

      {/* Configuration Toggles */}
      <GlassCard>
        <h3 className="text-lg font-semibold mb-4">Feature Configuration</h3>
        <div className="space-y-4">
          {Object.entries(config).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gradient-glass transition-colors">
              <div>
                <p className="font-medium capitalize">{key}</p>
                <p className="text-sm text-gray-600">
                  {value ? 'Currently enabled' : 'Currently disabled'}
                </p>
              </div>
              <Switch
                checked={value}
                onCheckedChange={(checked) => setConfig({ ...config, [key]: checked })}
              />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Data Tools */}
      <GlassCard>
        <h3 className="text-lg font-semibold mb-4">Data Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" className="justify-start">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" className="justify-start">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </GlassCard>

      {/* Error Logs */}
      <GlassCard>
        <h3 className="text-lg font-semibold mb-4">System Logs</h3>
        <div className="space-y-2">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                log.type === 'error' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className={`h-5 w-5 mt-0.5 ${
                  log.type === 'error' ? 'text-red-500' : 'text-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="font-medium">{log.message}</p>
                  <p className="text-sm text-gray-600">{log.timestamp}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );

  // Mobile Tab Navigation
  const MobileTabNav = () => (
    <div className="lg:hidden glass-card mb-6 p-2 flex space-x-2">
      {[
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'content', label: 'Content', icon: FileText },
        { id: 'config', label: 'Config', icon: Settings },
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
          
          {activeTab === 'content' && (
            <ContentManager questions={questions} setQuestions={setQuestions} />
          )}
          
          {activeTab === 'config' && <ConfigurationTab />}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
