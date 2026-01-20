import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AlertTriangle, CheckCircle, Clock, User, MessageSquare, Calendar } from 'lucide-react';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, resolved, dismissed

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // First fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Then fetch questions for all unique question_ids
      if (reportsData && reportsData.length > 0) {
        const uniqueQuestionIds = [...new Set(reportsData.map(r => r.question_id))];
        
        // Filter out any invalid UUIDs and ensure proper format
        const validQuestionIds = uniqueQuestionIds.filter(id => {
          if (!id) return false;
          // Basic UUID validation - check if it looks like a UUID
          return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        });
        
        if (validQuestionIds.length === 0) {
          // No valid question IDs, set reports without questions
          const reportsWithQuestions = reportsData.map(report => ({
            ...report,
            questions: null
          }));
          setReports(reportsWithQuestions);
          return;
        }
        
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('id, question_text, question_text_si, question_text_ta, question_type, options, correct_answer')
          .in('id', validQuestionIds);

        if (questionsError) throw questionsError;

        // Create a map of questions by ID for easy lookup
        const questionMap = {};
        questionsData?.forEach(question => {
          questionMap[question.id] = question;
        });

        // Combine reports with their questions
        const reportsWithQuestions = reportsData.map(report => ({
          ...report,
          questions: questionMap[report.question_id] || null
        }));

        setReports(reportsWithQuestions);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId, newStatus) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, status: newStatus, updated_at: new Date().toISOString() }
            : report
        )
      );
    } catch (err) {
      console.error('Error updating report status:', err);
      setError('Failed to update report status');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'yellow', icon: Clock, text: 'Pending' },
      resolved: { color: 'green', icon: CheckCircle, text: 'Resolved' },
      dismissed: { color: 'gray', icon: AlertTriangle, text: 'Dismissed' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.color} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  const getQuestionText = (question) => {
    if (!question) return 'Question not found';
    
    // Try to get question text in order of preference: English, Sinhala, Tamil
    return question.question_text || 
           question.question_text_si || 
           question.question_text_ta || 
           'No question text available';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reported Questions</h1>
          <p className="text-gray-600 mt-1">Review and manage user-reported questions</p>
        </div>
        <Button onClick={fetchReports} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {reports.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-600">
                {reports.filter(r => r.status === 'resolved').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Dismissed</p>
              <p className="text-2xl font-bold text-gray-600">
                {reports.filter(r => r.status === 'dismissed').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-gray-500" />
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg w-fit">
        {['all', 'pending', 'resolved', 'dismissed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${
              filter === status
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {status} ({status === 'all' ? reports.length : reports.filter(r => r.status === status).length})
          </button>
        ))}
      </div>

      {/* Reports Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reported By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No reports found for the selected filter
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {getQuestionText(report.questions)}
                        </div>
                        {report.questions?.question_type && (
                          <Badge variant="gray" className="text-xs">
                            {report.questions.question_type}
                          </Badge>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {report.question_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {report.full_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {report.user_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={report.report_reason}>
                        {report.report_reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="blue" className="text-xs">
                        {report.report_type || 'General'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        {formatDate(report.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {report.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="green"
                              onClick={() => updateReportStatus(report.id, 'resolved')}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="gray"
                              onClick={() => updateReportStatus(report.id, 'dismissed')}
                            >
                              Dismiss
                            </Button>
                          </>
                        )}
                        {report.status !== 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReportStatus(report.id, 'pending')}
                          >
                            Reopen
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
