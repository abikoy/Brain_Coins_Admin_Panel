import React, { useState, useEffect } from 'react';
import GlassCard from '../components/shared/GlassCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  getGeminiErrors,
  getGeminiErrorStats,
  getGeminiErrorFilterOptions,
  deleteGeminiError,
  clearOldGeminiErrors
} from '../api/geminierrorservices';
import { Filter, Download, Trash2, RefreshCw, ChevronDown, ChevronUp, AlertCircle, AlertTriangle } from 'lucide-react';

const SystemLogs = () => {
  const [geminiErrors, setGeminiErrors] = useState([]);
  const [errorStats, setErrorStats] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    error_type: '',
    language: '',
    file_type: '',
    days: 7,
    search: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [expandedError, setExpandedError] = useState(null);

  // Fetch Gemini errors
  const fetchGeminiErrors = async (filterParams = filters) => {
    try {
      setLoading(true);
      const response = await getGeminiErrors(filterParams);
      setGeminiErrors(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch Gemini errors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch error statistics
  const fetchErrorStats = async () => {
    try {
      const response = await getGeminiErrorStats(30);
      setErrorStats(response.data);
    } catch (error) {
      console.error('Failed to fetch error stats:', error);
    }
  };

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const response = await getGeminiErrorFilterOptions(30);
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    fetchGeminiErrors();
    fetchErrorStats();
    fetchFilterOptions();
  }, []);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    fetchGeminiErrors(newFilters);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    const newFilters = { ...filters, page: newPage };
    setFilters(newFilters);
    fetchGeminiErrors(newFilters);
  };

  // Delete error
  const handleDeleteError = async (errorId) => {
    if (!confirm('Are you sure you want to delete this error log?')) return;

    try {
      await deleteGeminiError(errorId);
      fetchGeminiErrors(); // Refresh the list
      fetchErrorStats(); // Refresh stats
    } catch (error) {
      console.error('Failed to delete error:', error);
      alert('Failed to delete error: ' + error.message);
    }
  };

  // Clear old errors
  const handleClearOldErrors = async () => {
    if (!confirm('Are you sure you want to clear errors older than 90 days?')) return;

    try {
      const result = await clearOldGeminiErrors(90);
      alert(result.message);
      fetchGeminiErrors(); // Refresh the list
      fetchErrorStats(); // Refresh stats
    } catch (error) {
      console.error('Failed to clear old errors:', error);
      alert('Failed to clear old errors: ' + error.message);
    }
  };

  // Toggle error details
  const toggleErrorDetails = (errorId) => {
    setExpandedError(expandedError === errorId ? null : errorId);
  };

  // Get error type color
  const getErrorTypeColor = (errorType) => {
    const colors = {
      'api_error': 'danger',
      'parsing_error': 'warning',
      'validation_error': 'secondary',
      'rate_limit': 'outline',
      'client_error': 'default',
      'server_error': 'danger'
    };
    return colors[errorType] || 'default';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Configuration & Logs
        </h2>
        <p className="text-gray-600">Manage system settings and view AI error logs</p>
      </div>

      {/* Error Statistics */}
      {errorStats && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Gemini AI Error Statistics (30 days)</h3>
            <Badge variant={errorStats.total > 0 ? 'danger' : 'success'}>
              {errorStats.total} Total Errors
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {Object.entries(errorStats.byType).map(([type, count]) => (
              <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">{count}</div>
                <div className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearOldErrors}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Old Errors
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchGeminiErrors();
                fetchErrorStats();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Error Logs */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Gemini AI Error Logs</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && filterOptions && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Error Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Error Type</label>
                <select
                  value={filters.error_type}
                  onChange={(e) => handleFilterChange('error_type', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All Types</option>
                  {filterOptions.error_types.map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <select
                  value={filters.language}
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All Languages</option>
                  {filterOptions.languages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              {/* File Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">File Type</label>
                <select
                  value={filters.file_type}
                  onChange={(e) => handleFilterChange('file_type', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All File Types</option>
                  {filterOptions.file_types.map(fileType => (
                    <option key={fileType} value={fileType}>{fileType}</option>
                  ))}
                </select>
              </div>

              {/* Time Range Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Time Range</label>
                <select
                  value={filters.days}
                  onChange={(e) => handleFilterChange('days', parseInt(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {filterOptions.time_ranges.map(days => (
                    <option key={days} value={days}>Last {days} days</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search error messages, endpoints..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Loading error logs...</p>
          </div>
        )}

        {/* Error List */}
        {!loading && (
          <div className="space-y-4">
            {geminiErrors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No error logs found for the selected filters.</p>
              </div>
            ) : (
              <>
                {geminiErrors.map((error) => (
                  <div
                    key={error.id}
                    className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => toggleErrorDetails(error.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant={getErrorTypeColor(error.error_type)}>
                              {error.error_type?.replace('_', ' ') || 'unknown'}
                            </Badge>
                            {error.language && (
                              <Badge variant="outline">{error.language}</Badge>
                            )}
                            {error.file_type && (
                              <Badge variant="secondary">{error.file_type}</Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(error.created_at).toLocaleString()}
                            </span>
                          </div>

                          <p className="font-medium text-gray-900 mb-1">
                            {error.error_message}
                          </p>

                          {error.endpoint && (
                            <p className="text-sm text-gray-600">
                              Endpoint: {error.endpoint}
                            </p>
                          )}

                          {error.gemini_error_code && (
                            <p className="text-sm text-gray-600">
                              Error Code: {error.gemini_error_code}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteError(error.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {expandedError === error.id ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedError === error.id && (
                      <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium mb-2">Error Details</h4>
                            {error.stack_trace && (
                              <div className="mb-3">
                                <p className="font-medium text-gray-700 mb-1">Stack Trace:</p>
                                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                                  {error.stack_trace}
                                </pre>
                              </div>
                            )}

                            {error.prompt_length && (
                              <p><span className="font-medium">Prompt Length:</span> {error.prompt_length} chars</p>
                            )}

                            {error.retry_attempt > 0 && (
                              <p><span className="font-medium">Retry Attempt:</span> {error.retry_attempt}</p>
                            )}
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Context</h4>
                            {error.api_endpoint && (
                              <p><span className="font-medium">API Endpoint:</span> {error.api_endpoint}</p>
                            )}

                            {error.gemini_model && (
                              <p><span className="font-medium">Gemini Model:</span> {error.gemini_model}</p>
                            )}

                            {error.question_types && error.question_types.length > 0 && (
                              <p><span className="font-medium">Question Types:</span> {error.question_types.join(', ')}</p>
                            )}

                            {error.question_count && (
                              <p><span className="font-medium">Question Count:</span> {error.question_count}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex justify-center items-center space-x-4 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page === 1}
                      onClick={() => handlePageChange(filters.page - 1)}
                    >
                      Previous
                    </Button>

                    <span className="text-sm text-gray-600">
                      Page {filters.page} of {pagination.pages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page === pagination.pages}
                      onClick={() => handlePageChange(filters.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default SystemLogs;