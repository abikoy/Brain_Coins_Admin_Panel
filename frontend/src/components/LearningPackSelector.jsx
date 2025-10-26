import React, { useEffect, useState } from 'react';
import { getLearningPacks } from '../api/learningPackService';

const LearningPackSelector = ({ selectedPackId, onSelect, refreshToken }) => {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPacks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getLearningPacks();
      setPacks(data);
    } catch (e) {
      setError(e.message || 'Failed to load learning packs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Learning Pack</label>
      <select
        value={selectedPackId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
      >
        <option value="">Select a pack...</option>
        {packs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title} (Grade {p.grade})
          </option>
        ))}
      </select>
      {loading && <p className="text-xs text-gray-500">Loading packs...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!loading && !error && packs.length === 0 && (
        <p className="text-xs text-gray-500">No packs found. Create one to get started.</p>
      )}
    </div>
  );
};

export default LearningPackSelector;
