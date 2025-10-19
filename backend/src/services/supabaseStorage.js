/**
 * BACKEND - Supabase Storage Service
 * Handles secure file uploads to Supabase Storage
 * Bucket: content-uploads
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase Configuration (Backend)
const supabaseUrl = process.env.SUPABASE_URL || "https://jgtjkqwephakgpxvvxsr.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndGprcXdlcGhha2dweHZ2eHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDIyNjYsImV4cCI6MjA3NjI3ODI2Nn0.ozPWNdgWmcTfFzetvxS-y3zq204fdx--kkyiIMCaTZQ";

// Initialize Supabase client for backend storage operations
const supabaseStorage = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'content-uploads';

/**
 * Upload file to Supabase Storage
 * @param {File|Buffer} file - File to upload
 * @param {string} fileName - Optional custom file name
 * @returns {Promise<{filePath: string, fileUrl: string, fileType: string}>}
 * @throws {Error} - Upload error including RLS failures
 */
export const uploadFile = async (file, fileName = null) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate unique file name
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = fileName ? fileName.split('.').pop() : 'bin';
    const uniqueFileName = fileName || `upload_${timestamp}_${randomString}.${fileExtension}`;
    
    // Determine file path in bucket
    const filePath = `uploads/${uniqueFileName}`;

    console.log('[Backend Storage] Uploading file:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabaseStorage
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
          error.statusCode === 403) {
        console.error('[Backend Storage] RLS Error - Unauthorized upload attempt:', error);
        throw new Error('Unauthorized: You do not have permission to upload files. Please check your authentication and storage policies.');
      }

      // Check for bucket not found
      if (error.message.includes('Bucket not found')) {
        console.error('[Backend Storage] Bucket Error:', error);
        throw new Error(`Storage bucket "${BUCKET_NAME}" not found. Please create the bucket in Supabase Dashboard.`);
      }

      console.error('[Backend Storage] Upload error:', error);
      throw new Error(error.message || 'Failed to upload file');
    }

    // Get public URL
    const { data: urlData } = supabaseStorage
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;

    // Determine file type
    const fileType = getFileType(uniqueFileName);

    console.log('[Backend Storage] Upload successful:', {
      filePath: data.path,
      fileUrl,
      fileType
    });

    return {
      filePath: data.path,
      fileUrl,
      fileType,
      fileName: uniqueFileName
    };

  } catch (error) {
    console.error('[Backend Storage] Upload failed:', error);
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
    const { error } = await supabaseStorage
      .storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw new Error(error.message || 'Failed to delete file');
    }

    console.log('[Backend Storage] File deleted:', filePath);
  } catch (error) {
    console.error('[Backend Storage] Delete error:', error);
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
 * Download file from Supabase Storage (bypasses RLS using service role)
 * @param {string} filePath - Path to file in bucket (e.g., "uploads/file.pdf")
 * @returns {Promise<Buffer>} - File buffer
 */
export const downloadFile = async (filePath) => {
  try {
    console.log('[Backend Storage] Downloading file:', filePath);

    const { data, error } = await supabaseStorage
      .storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error) {
      console.error('[Backend Storage] Download error:', error);
      throw new Error(error.message || 'Failed to download file');
    }

    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('[Backend Storage] File downloaded successfully, size:', buffer.length, 'bytes');

    return buffer;
  } catch (error) {
    console.error('[Backend Storage] Download failed:', error);
    throw error;
  }
};

/**
 * List files in bucket
 * @param {string} folder - Optional folder path
 * @returns {Promise<Array>} - List of files
 */
export const listFiles = async (folder = 'uploads') => {
  try {
    const { data, error } = await supabaseStorage
      .storage
      .from(BUCKET_NAME)
      .list(folder);

    if (error) {
      throw new Error(error.message || 'Failed to list files');
    }

    return data || [];
  } catch (error) {
    console.error('[Backend Storage] List files error:', error);
    throw error;
  }
};

export default {
  uploadFile,
  downloadFile,
  deleteFile,
  listFiles
};
