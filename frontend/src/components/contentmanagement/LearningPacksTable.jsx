import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Package, Crown, Edit, Trash2 } from 'lucide-react';

const LearningPacksTable = ({ 
  learningPacks, 
  onToggleStatus, 
  onTogglePremium, 
  onBulkToggleStatus, 
  onBulkTogglePremium, 
  onEditPack, 
  onDeletePack 
}) => {
  const [selectedPacks, setSelectedPacks] = useState([]);

  if (!learningPacks.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No learning packs found</p>
      </div>
    );
  }

  const toggleSelectAll = () => {
    if (selectedPacks.length === learningPacks.length) {
      setSelectedPacks([]);
    } else {
      setSelectedPacks(learningPacks.map(pack => pack.id));
    }
  };

  const toggleSelectPack = (packId) => {
    setSelectedPacks(prev =>
      prev.includes(packId)
        ? prev.filter(id => id !== packId)
        : [...prev, packId]
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-600">
              <input
                type="checkbox"
                checked={selectedPacks.length === learningPacks.length && learningPacks.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-300"
              />
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Learning Pack</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Subject</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Grade</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Premium</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {learningPacks.map((pack) => (
            <tr key={pack.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <input
                  type="checkbox"
                  checked={selectedPacks.includes(pack.id)}
                  onChange={() => toggleSelectPack(pack.id)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium">{pack.title || 'No title'}</p>
                  <p className="text-sm text-gray-500">{pack.difficulty || 'No difficulty'}</p>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-600">
                  {pack.subjects?.name || 'No subject'}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-600">{pack.grade || 'Not set'}</span>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  pack.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {pack.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  pack.is_premium 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {pack.is_premium ? 'Premium' : 'Free'}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => onToggleStatus(pack.id, !pack.is_active)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {pack.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-gray-400" />
                    )}
                    {pack.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => onTogglePremium(pack.id, !pack.is_premium)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-amber-600 transition-colors"
                  >
                    <Crown className="h-4 w-4" />
                    {pack.is_premium ? 'Free' : 'Premium'}
                  </button>
                  
                  {onEditPack && (
                    <button
                      onClick={() => onEditPack(pack)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      title="Edit Learning Pack"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                  
                  {onDeletePack && (
                    <button
                      onClick={() => onDeletePack(pack.id)}
                      className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 transition-colors"
                      title="Delete Learning Pack"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LearningPacksTable;