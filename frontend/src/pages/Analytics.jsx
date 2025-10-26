import React, { useState } from 'react';
import GlassCard from '../components/shared/GlassCard';
import StudentProgressChart from '../components/analytics/StudentProgressChart';
import StudentListTable from '../components/analytics/StudentListTable';
import Button from '../components/ui/Button';
import { Calendar, Users, TrendingUp, Award } from 'lucide-react';

const Analytics = ({ students, progressData }) => {
  const [timeFilter, setTimeFilter] = useState('week');

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-blue-500' },
    { label: 'Avg Progress', value: '67%', icon: TrendingUp, color: 'text-green-500' },
    { label: 'Active Today', value: '24', icon: Calendar, color: 'text-purple-500' },
    { label: 'Completed', value: '156', icon: Award, color: 'text-cyan-500' },
  ];

  const recentActivity = [
    { student: 'John Doe', action: 'Completed MCQ Test', time: '5 mins ago', score: 85 },
    { student: 'Jane Smith', action: 'Answered 10 questions', time: '12 mins ago', score: 92 },
    { student: 'Mike Johnson', action: 'Started new module', time: '25 mins ago', score: 78 },
    { student: 'Sarah Williams', action: 'Completed Summary', time: '1 hour ago', score: 88 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Analytics Dashboard
        </h2>
        <p className="text-gray-600">Monitor student performance and progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={index} hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-gradient-glass ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Progress Chart */}
      <GlassCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h3 className="text-xl font-semibold mb-4 sm:mb-0">Student Performance</h3>
          <div className="flex space-x-2">
            {['day', 'week', 'month'].map((filter) => (
              <Button
                key={filter}
                variant={timeFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter(filter)}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <StudentProgressChart data={progressData} timeFilter={timeFilter} />
      </GlassCard>

      {/* Student List */}
      <GlassCard>
        <h3 className="text-xl font-semibold mb-4">Registered Students</h3>
        <StudentListTable students={students} />
      </GlassCard>

      {/* Recent Activity */}
      <GlassCard>
        <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg hover:bg-gradient-glass transition-colors gap-2">
              <div className="flex-1">
                <p className="font-medium">{activity.student}</p>
                <p className="text-sm text-gray-600">{activity.action}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-sm font-semibold text-royal-purple">Score: {activity.score}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

export default Analytics;
