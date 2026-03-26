import React from 'react';
import Badge from '../ui/Badge';
import { User, TrendingUp, Crown, Edit3, Edit } from 'lucide-react';
import Button from '../ui/Button';

const StudentListTable = ({ students, onManagePremium, onEditStudent }) => {
  // Format progress percentage
  const formatProgress = (progress) => {
    return Math.round(progress || 0);
  };

  // Calculate score based on progress and streak
  const calculateScore = (student) => {
    const progressScore = student.progress || 0;
    const streakBonus = (student.streak || 0) * 2;
    const xpBonus = Math.min((student.totalXP || 0) / 100, 50); // Cap XP bonus at 50
    return Math.min(progressScore + streakBonus + xpBonus, 100);
  };

  // Determine status based on activity and premium status
  const getStudentStatus = (student) => {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = student.streakLastUpdated || student.lastActive;

    if (student.isPremium) return 'Premium';
    if (lastActive === today) return 'Active';
    return 'Inactive';
  };

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Student</th>
              <th className="hidden md:table-cell px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Contact</th>

              <th className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Status</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Score</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students && students.length > 0 ? (
              students.map((student) => {
                const progress = formatProgress(student.progress);
                const score = calculateScore(student);
                const status = getStudentStatus(student);

                return (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-gradient-glass transition-colors">
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[rgb(147,51,234)] flex items-center justify-center flex-shrink-0">
                        
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                         
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-sm sm:text-base block truncate">
                              {student.name || 'Unknown Student'}
                            </span>
                            {student.isPremium && (
                              <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-gray-600 block truncate">
                            {student.grade || 'No Grade'} • {student.school || 'No School'}
                          </span>
                          <span className="md:hidden text-xs text-gray-600 block truncate">
                            {student.phone || 'No Phone'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-4 py-3">
                      <div className="text-xs sm:text-sm text-gray-600">
                        <div className="truncate">{student.phone || 'No Phone'}</div>
                        <div className="text-xs text-gray-500 truncate">
                          Streak: {student.streak || 0} days
                        </div>
                      </div>
                    </td>

                    <td className="hidden sm:table-cell px-3 sm:px-4 py-3">
                      <Badge
                        variant={
                          status === 'Premium' ? 'premium' :
                            status === 'Active' ? 'success' : 'secondary'
                        }
                      >
                        {status}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        XP: {student.totalXP || 0}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                        <span className="font-semibold text-[rgb(147,51,234)] text-sm sm:text-base">
                          {Math.round(score)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Streak: {student.streak || 0}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditStudent?.(student)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={student.isPremium ? "outline" : "primary"}
                          onClick={() => onManagePremium?.(student)}
                          className="flex items-center gap-1"
                        >
                          {student.isPremium ? (
                            <>
                              <Edit3 className="h-3 w-3" />
                              Manage
                            </>
                          ) : (
                            <>
                              <Crown className="h-3 w-3" />
                              Premium
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentListTable;