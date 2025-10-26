import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StudentProgressChart = ({ data, timeFilter }) => {
  return (
    <div className="w-full h-64 sm:h-80 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.8}/>
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
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.9)', 
              border: '1px solid rgba(124, 58, 237, 0.3)',
              borderRadius: '8px',
              fontSize: '12px'
            }} 
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="score" fill="url(#colorProgress)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StudentProgressChart;
