/**
 * Session Debugger Component
 * Use this to verify Supabase session is working
 * Add this temporarily to your Dashboard to debug
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

const SessionDebugger = () => {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    setLoading(true);
    try {
      // Check session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      // Check buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      // Check if content-uploads exists
      const hasContentUploads = buckets?.some(b => b.name === 'content-uploads');

      setSessionInfo({
        hasSession: !!sessionData?.session,
        user: sessionData?.session?.user?.email || 'Not logged in',
        userId: sessionData?.session?.user?.id,
        sessionError: sessionError?.message,
        buckets: buckets?.map(b => b.name) || [],
        hasContentUploads,
        bucketsError: bucketsError?.message,
        accessToken: sessionData?.session?.access_token ? 
          sessionData.session.access_token.substring(0, 20) + '...' : 
          'No token'
      });
    } catch (error) {
      setSessionInfo({
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const testUpload = async () => {
    try {
      const testFile = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      const { data, error } = await supabase.storage
        .from('content-uploads')
        .upload(`test/${Date.now()}.txt`, testFile);

      if (error) {
        alert('Upload failed: ' + error.message);
      } else {
        alert('Upload successful! Path: ' + data.path);
      }
    } catch (error) {
      alert('Upload error: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-600">Loading session info...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border-2 border-dashed border-gray-300 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">🔍 Session Debugger</h3>
        <Button size="sm" variant="outline" onClick={checkSession}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Session Status */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          {sessionInfo?.hasSession ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="font-semibold">
            Session: {sessionInfo?.hasSession ? 'Active ✅' : 'Not Found ❌'}
          </span>
        </div>

        {sessionInfo?.hasSession && (
          <>
            <p className="text-sm text-gray-600">
              <strong>User:</strong> {sessionInfo.user}
            </p>
            <p className="text-sm text-gray-600">
              <strong>User ID:</strong> {sessionInfo.userId}
            </p>
            <p className="text-sm text-gray-600 break-all">
              <strong>Access Token:</strong> {sessionInfo.accessToken}
            </p>
          </>
        )}

        {sessionInfo?.sessionError && (
          <p className="text-sm text-red-600">
            <strong>Error:</strong> {sessionInfo.sessionError}
          </p>
        )}
      </div>

      {/* Buckets Status */}
      <div className="space-y-2 pt-4 border-t">
        <div className="flex items-center space-x-2">
          {sessionInfo?.hasContentUploads ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="font-semibold">
            Bucket 'content-uploads': {sessionInfo?.hasContentUploads ? 'Exists ✅' : 'Missing ❌'}
          </span>
        </div>

        <p className="text-sm text-gray-600">
          <strong>All Buckets:</strong> {sessionInfo?.buckets?.join(', ') || 'None'}
        </p>

        {sessionInfo?.bucketsError && (
          <p className="text-sm text-red-600">
            <strong>Error:</strong> {sessionInfo.bucketsError}
          </p>
        )}
      </div>

      {/* Test Upload Button */}
      <div className="pt-4 border-t">
        <Button 
          onClick={testUpload}
          disabled={!sessionInfo?.hasSession || !sessionInfo?.hasContentUploads}
          className="w-full"
        >
          Test Upload
        </Button>
        {!sessionInfo?.hasContentUploads && (
          <p className="text-xs text-red-600 mt-2">
            ⚠️ Cannot test: 'content-uploads' bucket doesn't exist
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="pt-4 border-t bg-blue-50 p-4 rounded">
        <p className="text-xs text-blue-800 font-semibold mb-2">
          📋 What to check:
        </p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>✅ Session should be "Active"</li>
          <li>✅ User email should match your login</li>
          <li>✅ Access token should exist</li>
          <li>✅ Bucket 'content-uploads' should exist</li>
          <li>✅ Test upload should succeed</li>
        </ul>
      </div>

      {/* Quick Fixes */}
      {(!sessionInfo?.hasSession || !sessionInfo?.hasContentUploads) && (
        <div className="pt-4 border-t bg-yellow-50 p-4 rounded">
          <p className="text-xs text-yellow-800 font-semibold mb-2">
            🔧 Quick Fixes:
          </p>
          <ul className="text-xs text-yellow-700 space-y-1">
            {!sessionInfo?.hasSession && (
              <li>❌ Session missing → Logout and login again</li>
            )}
            {!sessionInfo?.hasContentUploads && (
              <li>❌ Bucket missing → Create 'content-uploads' bucket in Supabase Dashboard</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SessionDebugger;
