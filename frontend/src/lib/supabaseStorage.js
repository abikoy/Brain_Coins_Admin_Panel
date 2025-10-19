/**
 * FRONTEND - Supabase Storage Service
 * Handles file uploads from the browser to Supabase Storage
 * Bucket: content-uploads
 */

import { supabase } from './supabaseClient';

const BUCKET_NAME = 'content-uploads';

/**
 * Upload file to Supabase Storage
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

    // CRITICAL: Check if user is authenticated before upload
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    console.log('[Frontend Storage] Session check:', {
      hasSession: !!sessionData?.session,
      user: sessionData?.session?.user?.email,
      error: sessionError
    });

    if (!sessionData?.session) {
      console.error('[Frontend Storage] No active session found!');
      throw new Error('You must be logged in to upload files. Please refresh the page and sign in again.');
    }

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
      authenticatedAs: sessionData.session.user.email
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

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

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;

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
  deleteFile,
  validateFileType,
  formatFileSize
};
