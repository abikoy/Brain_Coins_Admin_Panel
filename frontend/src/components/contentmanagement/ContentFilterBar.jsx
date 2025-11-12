import React, { useState, useEffect } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { getContentHierarchy } from '../../api/contentManagementService';

const ContentFilterBar = ({ filters, onFiltersChange, onApplyFilters }) => {
  const [hierarchyData, setHierarchyData] = useState({
    languages: [],
    grades: [],
    subjects: [],
    learningPacks: []
  });
  const [allLanguages, setAllLanguages] = useState([]); // Store all available languages
  const [loading, setLoading] = useState(false);

  // Fetch initial hierarchy data (all languages available)
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch updated hierarchy data when any filter changes (flexible filtering)
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      fetchHierarchyData(filters);
    }
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch all languages without any filters
      const data = await getContentHierarchy({});
      setAllLanguages(data.languages || []);
      setHierarchyData(data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHierarchyData = async (currentFilters = {}) => {
    try {
      setLoading(true);
      const data = await getContentHierarchy(currentFilters);
      setHierarchyData(data);
    } catch (error) {
      console.error('Error fetching hierarchy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters };
    
    // Set the new filter value (flexible filtering - no clearing of other filters)
    newFilters[filterType] = value;
    
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Content Filters</h3>
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {Object.keys(filters).filter(key => filters[key]).length} active
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Language Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Language
          </label>
          <div className="relative">
            <select
              value={filters.language || ''}
              onChange={(e) => handleFilterChange('language', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              disabled={loading}
            >
              <option value="">All Languages</option>
              {allLanguages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Grade Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Grade
          </label>
          <div className="relative">
            <select
              value={filters.grade || ''}
              onChange={(e) => handleFilterChange('grade', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              disabled={loading}
            >
              <option value="">All Grades</option>
              {hierarchyData.grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Subject Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Subject
          </label>
          <div className="relative">
            <select
              value={filters.subject_id || ''}
              onChange={(e) => handleFilterChange('subject_id', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              disabled={loading}
            >
              <option value="">All Subjects</option>
              {hierarchyData.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Learning Pack Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Learning Pack
          </label>
          <div className="relative">
            <select
              value={filters.pack_id || ''}
              onChange={(e) => handleFilterChange('pack_id', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              disabled={loading}
            >
              <option value="">All Learning Packs</option>
              {hierarchyData.learningPacks.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters.language && (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                Language: {filters.language}
                <button
                  onClick={() => handleFilterChange('language', undefined)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.grade && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                Grade: {filters.grade}
                <button
                  onClick={() => handleFilterChange('grade', undefined)}
                  className="hover:bg-green-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.subject_id && (
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
                Subject: {hierarchyData.subjects.find(s => s.id === filters.subject_id)?.name || 'Unknown'}
                <button
                  onClick={() => handleFilterChange('subject_id', undefined)}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.pack_id && (
              <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-sm px-3 py-1 rounded-full">
                Pack: {hierarchyData.learningPacks.find(p => p.id === filters.pack_id)?.title || 'Unknown'}
                <button
                  onClick={() => handleFilterChange('pack_id', undefined)}
                  className="hover:bg-orange-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-500">Updating filters...</span>
        </div>
      )}
    </div>
  );
};

export default ContentFilterBar;
