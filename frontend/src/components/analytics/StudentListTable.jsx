import React from 'react';
import Badge from '../ui/Badge';
import { User, TrendingUp } from 'lucide-react';

const StudentListTable = ({ students }) => {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Student</th>
              <th className="hidden md:table-cell px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Email</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Progress</th>
              <th className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Status</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Score</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-gray-100 hover:bg-gradient-glass transition-colors">
                <td className="px-3 sm:px-4 py-3">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-sm sm:text-base block truncate">{student.name}</span>
                      <span className="md:hidden text-xs text-gray-600 block truncate">{student.email}</span>
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600">{student.email}</td>
                <td className="px-3 sm:px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-16 sm:w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-primary transition-all duration-300"
                        style={{ width: `${student.progress}%` }}
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{student.progress}%</span>
                  </div>
                </td>
                <td className="hidden sm:table-cell px-3 sm:px-4 py-3">
                  <Badge variant={student.status === 'Active' ? 'success' : 'secondary'}>
                    {student.status}
                  </Badge>
                </td>
                <td className="px-3 sm:px-4 py-3">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                    <span className="font-semibold text-royal-purple text-sm sm:text-base">{student.score}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentListTable;
