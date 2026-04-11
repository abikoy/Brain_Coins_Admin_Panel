import React, { useState } from 'react';
import { Search, Trash2, AlertTriangle, CheckCircle, XCircle, User, Phone, Calendar } from 'lucide-react';
import supabase from '../lib/supabaseClient';

const UserAccountDeletion = () => {
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const searchUsers = async () => {
    if (!searchPhone.trim()) {
      showMessage('error', 'Please enter a phone number');
      return;
    }

    setLoading(true);
    try {
      // Search for user by phone number in profiles table
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          phone,
          created_at,
          family_profiles!family_profiles_parent_id_fkey (
            id,
            full_name,
            total_xp,
            total_coins,
            is_premium,
            current_streak,
            last_active
          )
        `)
        .ilike('phone', `%${searchPhone}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults(profiles || []);
      if (profiles.length === 0) {
        showMessage('info', 'No users found with this phone number');
      }
    } catch (error) {
      console.error('Search error:', error);
      showMessage('error', 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const deleteUserAccount = async () => {
    if (!selectedUser) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete this user account?\n\n` +
      `Phone: ${selectedUser.phone}\n` +
      `Name: ${selectedUser.family_profiles?.full_name || 'N/A'}\n\n` +
      `This will permanently delete:\n` +
      `- User profile data\n` +
      `- Learning progress and quiz history\n` +
      `- Daily usage records\n` +
      `- Family profile data\n` +
      `- OTP codes\n\n` +
      `This action cannot be undone!`
    );

    if (!confirmDelete) return;

    setDeleting(true);
    try {
      // Call the Supabase RPC function to delete user data
      const { error } = await supabase.rpc('delete_user_account_data', {
        user_id_to_delete: selectedUser.id
      });

      if (error) throw error;

      showMessage('success', 'User account and all associated data deleted successfully');
      setSearchResults([]);
      setSelectedUser(null);
      setSearchPhone('');
    } catch (error) {
      console.error('Deletion error:', error);
      showMessage('error', `Failed to delete user: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Account Deletion</h1>
        <p className="text-gray-600">Search for users by phone number and permanently delete their accounts</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Enter phone number..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={searchUsers}
            disabled={loading}
            className="px-6 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message.type === 'success' && <CheckCircle className="h-5 w-5" />}
          {message.type === 'error' && <XCircle className="h-5 w-5" />}
          {message.type === 'info' && <AlertTriangle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Search Results ({searchResults.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedUser?.id === user.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.family_profiles?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {user.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.family_profiles?.is_premium && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Premium</span>
                    )}
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      XP: {user.family_profiles?.total_xp || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected User Details & Deletion */}
      {selectedUser && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">User Details</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Profile Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{selectedUser.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-mono text-sm">{selectedUser.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member Since:</span>
                    <span className="font-medium">{formatDate(selectedUser.created_at)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Family Profile</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Full Name:</span>
                    <span className="font-medium">{selectedUser.family_profiles?.full_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total XP:</span>
                    <span className="font-medium">{selectedUser.family_profiles?.total_xp || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Coins:</span>
                    <span className="font-medium">{selectedUser.family_profiles?.total_coins || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Streak:</span>
                    <span className="font-medium">{selectedUser.family_profiles?.current_streak || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedUser.family_profiles?.is_premium 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedUser.family_profiles?.is_premium ? 'Premium' : 'Free'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Section */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 mb-2">Warning: Permanent Deletion</h4>
                  <p className="text-red-800 text-sm mb-3">
                    This action will permanently delete the following data:
                  </p>
                  <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
                    <li>User profile and authentication data</li>
                    <li>All learning progress and quiz history</li>
                    <li>Daily usage records and statistics</li>
                    <li>Family profile information</li>
                    <li>OTP codes and verification data</li>
                  </ul>
                  <p className="text-red-800 text-sm mt-3 font-medium">
                    This action cannot be undone!
                  </p>
                </div>
              </div>
            </div>

            {/* Delete Button */}
            <div className="flex justify-end">
              <button
                onClick={deleteUserAccount}
                disabled={deleting}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete User Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAccountDeletion;
