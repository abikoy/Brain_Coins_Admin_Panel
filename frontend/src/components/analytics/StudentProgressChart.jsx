import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import analyticsService from '../../api/analyticsService.js';

const StudentProgressChart = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch progress data for week only
  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Always fetch week data using the service
        const progressData = await analyticsService.getStudentProgress('week');

        console.log('📈 Progress data received:', progressData);

        // Transform data for chart
        const transformedData = progressData.map(item => ({
          name: item.studentName.length > 12 ? item.studentName.substring(0, 12) + '...' : item.studentName,
          fullName: item.studentName,
          progress: item.progress,
          completed: item.completedSections,
          total: item.totalSections,
          subject: item.subject,
          grade: item.grade
        }));

        console.log('📈 Transformed chart data:', transformedData);
        setChartData(transformedData.slice(0, 10)); // Limit to top 10 for better visualization
      } catch (error) {
        console.error('Error fetching progress data:', error);
        setError(error.message);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, []); // Empty dependency array - fetch once on mount

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.fullName}</p>
          <p className="text-sm text-gray-600">Grade: {data.grade}</p>
          <p className="text-sm text-gray-600">Subject: {data.subject}</p>
          <p className="text-sm text-royal-purple font-medium">
            Progress: {data.progress}%
          </p>
          <p className="text-xs text-gray-500">
            Completed: {data.completed}/{data.total} sections
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="w-full h-64 sm:h-80 md:h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-purple"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-64 sm:h-80 md:h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Error loading progress data</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="w-full h-64 sm:h-80 md:h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No progress data available this week</p>
          <p className="text-gray-400 text-sm">Student activity will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-64 sm:h-80 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(124, 58, 237, 0.1)" />
          <XAxis
            dataKey="name"
            stroke="#7C3AED"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#7C3AED"
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              fontSize: '12px',
              paddingTop: '10px'
            }}
          />
          <Bar
            dataKey="progress"
            name="Progress %"
            fill="url(#colorProgress)"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StudentProgressChart;