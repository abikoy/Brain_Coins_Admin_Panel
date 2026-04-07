import React from 'react';
import { ToggleLeft, ToggleRight, Book, Edit } from 'lucide-react';

const SubjectsTable = ({ subjects, onToggleStatus, onEditSubject }) => {
  console.log('Subjects passed:', subjects);  // Added console.log to log the passed subjects

  if (!subjects || !subjects.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Book className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No subjects found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-600">Subject</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Languages</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr key={subject.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium">
                    {subject.name || 'No name'}
                  </p>
                  {subject.description && (
                    <p className="text-sm text-gray-500 truncate max-w-xs">
                      {subject.description}
                    </p>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="text-sm text-gray-600">
                  {subject.name && <span>English</span>}
                  {subject.name_si && <span>{subject.name ? ', ' : ''}Sinhala</span>}
                  {subject.name_ta && <span>{(subject.name || subject.name_si) ? ', ' : ''}Tamil</span>}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  subject.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {subject.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleStatus(subject.id, !subject.is_active)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {subject.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-gray-400" />
                    )}
                    {subject.is_active ? 'Disable' : 'Enable'}
                  </button>
                  
                  <button
                    onClick={() => onEditSubject(subject)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    title="Edit Subject"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubjectsTable;