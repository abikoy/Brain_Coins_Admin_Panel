/**
 * FRONTEND - Supabase Storage Service
 * Handles file uploads from the browser to Supabase Storage
 * Buckets: content-uploads, diagrams
 */

import { supabase } from './supabaseClient';

const BUCKET_NAME = 'content-uploads';
const DIAGRAMS_BUCKET_NAME = 'diagrams';
/**
 * Check and refresh session if token is expired
 * @private
 * @returns {Promise<{session: any, error: Error}>}
 */
const checkAndRefreshSession = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data?.session) {
    console.error('[Auth] No valid session found:', error);
    return { session: null, error: error || new Error('No active session') };
  }

  // Check if token is expired or about to expire in the next 60 seconds
  const expiresAt = data.session.expires_at * 1000; // Convert to milliseconds
  const now = Date.now();
  const buffer = 60 * 1000; // 60 seconds buffer

  if (expiresAt < now + buffer) {
    console.log('[Auth] Token expired or about to expire, refreshing...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      console.error('[Auth] Failed to refresh session:', refreshError);
      return { session: null, error: refreshError };
    }

    console.log('[Auth] Session refreshed successfully');
    return { session: refreshData.session, error: null };
  }

  return { session: data.session, error: null };
};

/**
 * Upload file to Supabase Storage with automatic session refresh
 * @param {File} file - File object from input element
 * @returns {Promise<{filePath: string, fileUrl: string, fileType: string}>}
 * @throws {Error} - Upload error including RLS failures
 */
export const uploadFile = async (file) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file selected');
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 50MB limit');
    }

    // Check and refresh session if needed
    const { session, error: sessionError } = await checkAndRefreshSession();

    if (sessionError || !session) {
      console.error('[Frontend Storage] Session check failed:', sessionError);
      throw new Error('Your session has expired. Please refresh the page and log in again.');
    }

    console.log('[Frontend Storage] Session verified:', {
      user: session.user?.email,
      expiresAt: new Date(session.expires_at * 1000).toISOString()
    });

    // Generate unique file name
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${timestamp}_${randomString}.${fileExtension}`;

    // Determine file path in bucket
    const filePath = `uploads/${uniqueFileName}`;

    console.log('[Frontend Storage] Uploading file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      path: filePath,
      authenticatedAs: session.user.email
    });

    // Upload to Supabase Storage with retry on token expiration
    let uploadAttempts = 0;
    const maxUploadAttempts = 2;
    let data = null;
    let error = null;

    while (uploadAttempts < maxUploadAttempts) {
      const uploadResult = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      data = uploadResult.data;
      error = uploadResult.error;

      // If it's a token expiration error and we have retries left, refresh and retry
      if (error && (error.message?.includes('exp') || error.message?.includes('claim') || error.statusCode === 401) && uploadAttempts < maxUploadAttempts - 1) {
        console.log(`[Upload] Token error detected, refreshing and retrying (attempt ${uploadAttempts + 1})`);
        uploadAttempts++;

        // Refresh session
        const refreshResult = await checkAndRefreshSession();
        if (refreshResult.error) {
          console.error('[Upload] Failed to refresh session for retry:', refreshResult.error);
          break; // Can't refresh, exit loop
        }

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      // Either success or non-token error, exit loop
      break;
    }

    if (error) {
      // Check for RLS (Row Level Security) errors
      if (error.message.includes('row-level security') ||
        error.message.includes('policy') ||
        error.message.includes('new row violates') ||
        error.statusCode === 403 ||
        error.statusCode === 401) {
        console.error('[Frontend Storage] RLS Error - Unauthorized upload:', error);
        throw new Error('Unauthorized: You must be logged in to upload files. Please sign in and try again.');
      }

      // Check for bucket not found
      if (error.message.includes('Bucket not found')) {
        console.error('[Frontend Storage] Bucket Error:', error);
        throw new Error(`Storage bucket "${BUCKET_NAME}" not found. Please contact administrator.`);
      }

      // Check for duplicate file
      if (error.message.includes('already exists')) {
        console.error('[Frontend Storage] Duplicate file:', error);
        throw new Error('A file with this name already exists. Please try again.');
      }

      console.error('[Frontend Storage] Upload error:', error);
      throw new Error(error.message || 'Failed to upload file');
    }

    // Get signed URL (1 year)
    const { data: urlData, error: urlError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year in seconds

    if (urlError) {
      console.error('[Frontend Storage] Signed URL error:', urlError);
      throw new Error(urlError.message || 'Failed to generate file URL');
    }

    const fileUrl = urlData.signedUrl;

    // Determine file type
    const fileType = getFileType(file.name);

    console.log('[Frontend Storage] Upload successful:', {
      filePath: data.path,
      fileUrl,
      fileType
    });

    return {
      filePath: data.path,
      fileUrl,
      fileType,
      fileName: file.name,
      fileSize: file.size
    };

  } catch (error) {
    console.error('[Frontend Storage] Upload failed:', error);
    throw error;
  }
};

/**
 * Upload diagram image to Supabase Storage diagrams bucket
 * @param {File} file - Image file for diagram
 * @returns {Promise<{filePath: string, fileUrl: string, fileType: string}>}
 * @throws {Error} - Upload error including RLS failures
 */
export const uploadDiagram = async (file) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file selected');
    }

    // Validate file type - only images for diagrams
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only image files (JPG, PNG, GIF, WebP, SVG) are allowed for diagrams');
    }

    // Validate file size (max 10MB for diagrams)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Diagram file size exceeds 10MB limit');
    }

    // Check and refresh session if needed
    const { session, error: sessionError } = await checkAndRefreshSession();

    if (sessionError || !session) {
      console.error('[Frontend Storage] Session check failed:', sessionError);
      throw new Error('Your session has expired. Please refresh the page and log in again.');
    }

    console.log('[Frontend Storage] Diagram upload session verified:', {
      user: session.user?.email,
      expiresAt: new Date(session.expires_at * 1000).toISOString()
    });

    // Generate unique file name
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${timestamp}_${randomString}.${fileExtension}`;

    // Determine file path in diagrams bucket
    const filePath = `diagrams/${uniqueFileName}`;

    console.log('[Frontend Storage] Uploading diagram:', {
      name: file.name,
      size: file.size,
      type: file.type,
      path: filePath,
      authenticatedAs: session.user.email
    });

    // Upload to Supabase Storage diagrams bucket with retry on token expiration
    let uploadAttempts = 0;
    const maxUploadAttempts = 2;
    let data = null;
    let error = null;

    while (uploadAttempts < maxUploadAttempts) {
      const uploadResult = await supabase
        .storage
        .from(DIAGRAMS_BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      data = uploadResult.data;
      error = uploadResult.error;

      // If it's a token expiration error and we have retries left, refresh and retry
      if (error && (error.message?.includes('exp') || error.message?.includes('claim') || error.statusCode === 401) && uploadAttempts < maxUploadAttempts - 1) {
        console.log(`[Diagram Upload] Token error detected, refreshing and retrying (attempt ${uploadAttempts + 1})`);
        uploadAttempts++;

        // Refresh session
        const refreshResult = await checkAndRefreshSession();
        if (refreshResult.error) {
          console.error('[Diagram Upload] Failed to refresh session for retry:', refreshResult.error);
          break; // Can't refresh, exit loop
        }

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      // Either success or non-token error, exit loop
      break;
    }

    if (error) {
      // Check for RLS (Row Level Security) errors
      if (error.message.includes('row-level security') ||
        error.message.includes('policy') ||
        error.message.includes('new row violates') ||
        error.statusCode === 403 ||
        error.statusCode === 401) {
        console.error('[Frontend Storage] Diagram RLS Error - Unauthorized upload:', error);
        throw new Error('Unauthorized: You must be logged in to upload diagrams. Please sign in and try again.');
      }

      // Check for bucket not found
      if (error.message.includes('Bucket not found')) {
        console.error('[Frontend Storage] Diagram Bucket Error:', error);
        throw new Error(`Storage bucket "${DIAGRAMS_BUCKET_NAME}" not found. Please contact administrator.`);
      }

      // Check for duplicate file
      if (error.message.includes('already exists')) {
        console.error('[Frontend Storage] Duplicate diagram file:', error);
        throw new Error('A diagram file with this name already exists. Please try again.');
      }

      console.error('[Frontend Storage] Diagram upload error:', error);
      throw new Error(error.message || 'Failed to upload diagram');
    }

    // Get signed URL (1 year)
    const { data: urlData, error: urlError } = await supabase
      .storage
      .from(DIAGRAMS_BUCKET_NAME)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year in seconds

    if (urlError) {
      console.error('[Frontend Storage] Diagram signed URL error:', urlError);
      throw new Error(urlError.message || 'Failed to generate diagram URL');
    }

    const fileUrl = urlData.signedUrl;

    // Determine file type
    const fileType = getFileType(file.name);

    console.log('[Frontend Storage] Diagram upload successful:', {
      filePath: data.path,
      fileUrl,
      fileType
    });

    return {
      filePath: data.path,
      fileUrl,
      fileType,
      fileName: file.name,
      fileSize: file.size
    };

  } catch (error) {
    console.error('[Frontend Storage] Diagram upload failed:', error);
    throw error;
  }
};

/**
 * Delete diagram file from Supabase Storage diagrams bucket
 * @param {string} filePath - Path to diagram file in diagrams bucket
 * @returns {Promise<void>}
 */
export const deleteDiagram = async (filePath) => {
  try {
    const { error } = await supabase
      .storage
      .from(DIAGRAMS_BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      if (error.statusCode === 403 || error.statusCode === 401) {
        throw new Error('Unauthorized: You do not have permission to delete this diagram.');
      }
      throw new Error(error.message || 'Failed to delete diagram');
    }

    console.log('[Frontend Storage] Diagram file deleted:', filePath);
  } catch (error) {
    console.error('[Frontend Storage] Diagram delete error:', error);
    throw error;
  }
};

/**
 * Delete file from Supabase Storage
 * @param {string} filePath - Path to file in bucket
 * @returns {Promise<void>}
 */
export const deleteFile = async (filePath) => {
  try {
    const { error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      if (error.statusCode === 403 || error.statusCode === 401) {
        throw new Error('Unauthorized: You do not have permission to delete this file.');
      }
      throw new Error(error.message || 'Failed to delete file');
    }

    console.log('[Frontend Storage] File deleted:', filePath);
  } catch (error) {
    console.error('[Frontend Storage] Delete error:', error);
    throw error;
  }
};

/**
 * Get file type from filename
 * @param {string} fileName - File name
 * @returns {string} - File type (image, pdf, document, etc.)
 */
const getFileType = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();

  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const documentTypes = ['doc', 'docx', 'txt', 'rtf'];  // NO PDF!
  const spreadsheetTypes = ['xls', 'xlsx', 'csv'];
  const presentationTypes = ['ppt', 'pptx'];

  // Check PDF FIRST before other types
  if (extension === 'pdf') return 'pdf';
  if (imageTypes.includes(extension)) return 'image';
  if (documentTypes.includes(extension)) return 'document';
  if (spreadsheetTypes.includes(extension)) return 'spreadsheet';
  if (presentationTypes.includes(extension)) return 'presentation';

  return 'file';
};

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {Array<string>} allowedTypes - Allowed MIME types
 * @returns {boolean}
 */
export const validateFileType = (file, allowedTypes = []) => {
  if (allowedTypes.length === 0) return true;
  return allowedTypes.includes(file.type);
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default {
  uploadFile,
  uploadDiagram,
  deleteFile,
  deleteDiagram,
  validateFileType,
  formatFileSize
};
