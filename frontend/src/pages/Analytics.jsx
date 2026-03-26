import React, { useState, useEffect } from 'react';
import GlassCard from '../components/shared/GlassCard';
import StudentProgressChart from '../components/analytics/StudentProgressChart';
import StudentListTable from '../components/analytics/StudentListTable';
import Button from '../components/ui/Button';
import { Calendar, Users, TrendingUp, Crown, RefreshCw, Plus } from 'lucide-react';
import analyticsService from '../api/analyticsService';
import PremiumManagementDialog from '../components/analytics/PremiumManagementDialog';
import StudentEditModal from '../components/analytics/StudentEditModal';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [students, setStudents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year
  const [premiumDialog, setPremiumDialog] = useState({
    isOpen: false,
    student: null
  });
  const [studentEditModal, setStudentEditModal] = useState({
    isOpen: false,
    student: null
  });
  // Fetch analytics data using the service
  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch all data in parallel using the service
      const [statsResult, studentsResult, progressResult] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getStudents({ limit: 50 }),
        analyticsService.getStudentProgress(timeRange) // Use selected timeRange
      ]);

      setAnalyticsData(statsResult);
      setStudents(studentsResult.students || []);

      // Transform progress data into recent activity
      const transformedActivity = progressResult.slice(0, 5).map(progress => ({
        student: progress.studentName,
        action: `Progress in ${progress.subject}`,
        time: formatTimeAgo(progress.lastUpdated),
        score: progress.progress
      }));
      setRecentActivity(transformedActivity);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
    // Handle premium management
  const handleManagePremium = (student) => {
    setPremiumDialog({
      isOpen: true,
      student: student
    });
  };

  const handlePremiumSuccess = () => {
    // Refresh data to show updated premium status
    fetchAnalyticsData();
  };

  const closePremiumDialog = () => {
    setPremiumDialog({
      isOpen: false,
      student: null
    });
  };

  const handleAddStudent = () => {
    setStudentEditModal({ isOpen: true, student: null });
  };

  const handleEditStudent = (student) => {
    setStudentEditModal({ isOpen: true, student });
  };

  const handleSaveStudent = async (studentId, studentData) => {
    try {
      if (studentId) {
        await analyticsService.updateStudent(studentId, studentData);
      } else {
        await analyticsService.createStudent(studentData);
      }
      fetchAnalyticsData();
    } catch (error) {
      throw error;
    }
  };

  const closeStudentEditModal = () => {
    setStudentEditModal({ isOpen: false, student: null });
  };
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]); // Re-fetch when timeRange changes

  // Format time ago function
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  // Stats data from real API
  const stats = analyticsData ? [
    { 
      label: 'Total Students', 
      value: analyticsData.totalStudents || 0, 
      icon: Users, 
      color: 'text-[rgb(147,51,234)]' 
    },
    { 
      label: 'Avg Progress', 
      value: `${analyticsData.averageProgress || 0}%`, 
      icon: TrendingUp, 
      color: 'text-[rgb(147,51,234)]' 
    },
    { 
      label: 'Active Today', 
      value: analyticsData.activeToday || 0, 
      icon: Calendar, 
      color: 'text-[rgb(147,51,234)]' 
    },
    { 
      label: 'Premium Students', 
      value: analyticsData.premiumStudents || 0, 
      icon: Crown, 
      color: 'text-[rgb(147,51,234)]' 
    },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(147,51,234)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-[rgb(147,51,234)] mb-2">
            Analytics Dashboard
          </h2>
          <p className="text-gray-900">Monitor student performance and weekly progress</p>
        </div>
        <Button
          onClick={fetchAnalyticsData}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={index} hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Progress Chart with Time Filter Buttons */}
      <GlassCard>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h3 className="text-xl font-semibold text-gray-900">Student Progress</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-4 py-2 text-sm rounded-md font-medium transition-all duration-200 ${
                timeRange === 'week'
                  ? 'bg-[rgb(147,51,234)] text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-4 py-2 text-sm rounded-md font-medium transition-all duration-200 ${
                timeRange === 'month'
                  ? 'bg-[rgb(147,51,234)] text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-4 py-2 text-sm rounded-md font-medium transition-all duration-200 ${
                timeRange === 'year'
                  ? 'bg-[rgb(147,51,234)] text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Year
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600 mb-4">
          {timeRange === 'week' && 'Last 7 days'}
          {timeRange === 'month' && 'Last 30 days'}
          {timeRange === 'year' && 'Last 365 days'}
        </div>
        <StudentProgressChart />
      </GlassCard>

      {/* Student List */}
      <GlassCard>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Registered Students</h3>
          <Button onClick={handleAddStudent} className="flex items-center gap-2 bg-[rgb(147,51,234)] hover:bg-[rgb(120,41,187)]">
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        </div>
        <StudentListTable 
          students={students} 
          onManagePremium={handleManagePremium}
          onEditStudent={handleEditStudent}
        />
      </GlassCard>

      {/* Recent Activity */}
      <GlassCard>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors gap-2">
                <div className="flex-1">
                  <p className="font-medium">{activity.student}</p>
                  <p className="text-sm text-gray-700">{activity.action}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-semibold text-[rgb(147,51,234)]">
                    Progress: {activity.score}%
                  </p>
                  <p className="text-xs text-gray-600">{activity.time}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-700 text-center py-4">No recent activity this week</p>
          )}
        </div>
      </GlassCard>
      <PremiumManagementDialog
        student={premiumDialog.student}
        isOpen={premiumDialog.isOpen}
        onClose={closePremiumDialog}
        onSuccess={handlePremiumSuccess}
      />
      
      <StudentEditModal
        student={studentEditModal.student}
        isOpen={studentEditModal.isOpen}
        onClose={closeStudentEditModal}
        onSave={handleSaveStudent}
      />
    </div>
  );
};

export default Analytics;