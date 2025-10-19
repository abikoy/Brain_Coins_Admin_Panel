import React from 'react';
import Badge from '../ui/Badge';
import { User, TrendingUp } from 'lucide-react';

const StudentListTable = ({ students }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Progress</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Score</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="border-b border-gray-100 hover:bg-gradient-glass transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">{student.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
              <td className="px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-primary transition-all duration-300"
                      style={{ width: `${student.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{student.progress}%</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={student.status === 'Active' ? 'success' : 'secondary'}>
                  {student.status}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-semibold text-royal-purple">{student.score}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentListTable;
