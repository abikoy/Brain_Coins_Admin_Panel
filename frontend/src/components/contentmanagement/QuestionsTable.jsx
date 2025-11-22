import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, HelpCircle } from 'lucide-react';

const QuestionsTable = ({ questions, onToggleStatus, onBulkToggleStatus }) => {
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  if (!questions.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No questions found</p>
      </div>
    );
  }

  const toggleSelectAll = () => {
    if (selectedQuestions.length === questions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(questions.map(question => question.id));
    }
  };

  const toggleSelectQuestion = (questionId) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleBulkToggle = (isActive) => {
    if (selectedQuestions.length > 0) {
      onBulkToggleStatus(selectedQuestions, isActive);
      setSelectedQuestions([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedQuestions.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">
            {selectedQuestions.length} question(s) selected
          </span>
          <button
            onClick={() => handleBulkToggle(true)}
            className="text-sm text-green-600 hover:text-green-800 transition-colors"
          >
            Enable All
          </button>
          <button
            onClick={() => handleBulkToggle(false)}
            className="text-sm text-red-600 hover:text-red-800 transition-colors"
          >
            Disable All
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedQuestions.length === questions.length && questions.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Question</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Difficulty</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Learning Pack</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr key={question.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(question.id)}
                    onChange={() => toggleSelectQuestion(question.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium line-clamp-2 max-w-md">
                      {question.question_text || 'No question text'}
                    </p>
                    {question.explanation && (
                      <p className="text-sm text-gray-500 line-clamp-1 max-w-md">
                        {question.explanation}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600 capitalize">
                    {question.question_type || 'Unknown'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    question.difficulty === 'Hard' ? 'bg-red-100 text-red-800' :
                    question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {question.difficulty || 'Easy'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600">
                    {question.learning_packs?.title || 'No pack'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    question.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {question.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleStatus(question.id, !question.is_active)}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {question.is_active ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                      )}
                      {question.is_active ? 'Disable' : 'Enable'}
                    </button>
                    

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

export default QuestionsTable;