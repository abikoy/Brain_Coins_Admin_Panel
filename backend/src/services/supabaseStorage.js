/**
 * BACKEND - Supabase Storage Service
 * Handles secure file uploads to Supabase Storage
 * Bucket: content-uploads
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase Configuration (Backend)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('[Storage] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend .env');
}

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

    // Get signed URL with 1 year expiry
    const { data: urlData, error: urlError } = await supabaseStorage
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 31536000); // 1 year in seconds

    if (urlError) {
      console.error('[Backend Storage] Failed to create signed URL:', urlError);
      throw new Error('Failed to create signed URL');
    }

    const fileUrl = urlData.signedUrl;

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
    console.log('[Backend Storage] Downloading file via storage API:', filePath);

    const { data, error } = await supabaseStorage
      .storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error) {
      console.error('[Backend Storage] Download error:', error);
      throw new Error(error.message || 'Failed to download file');
    }

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
 * Download a public URL directly (works across projects)
 */
export const downloadFromPublicUrl = async (fileUrl, retries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Backend Storage] Downloading via public URL (attempt ${attempt}/${retries}):`, fileUrl);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const res = await fetch(fileUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'BrainCoins-Backend/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      console.log(`[Backend Storage] Successfully downloaded ${arrayBuffer.byteLength} bytes`);
      return Buffer.from(arrayBuffer);
      
    } catch (error) {
      lastError = error;
      console.error(`[Backend Storage] Download attempt ${attempt} failed:`, error.message);
      
      // Don't retry on non-network errors
      if (error.name !== 'AbortError' && !error.message.includes('fetch failed') && !error.message.includes('timeout')) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s
        console.log(`[Backend Storage] Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  console.error('[Backend Storage] All download attempts failed');
  throw lastError;
};

/**
 * Unified downloader: if URL belongs to this SUPABASE_URL host, use storage API; otherwise fetch via public URL.
 */
export const downloadAny = async (fileUrl) => {
  try {
    const thisHost = new URL(supabaseUrl).host;
    const urlObj = new URL(fileUrl);
    const isSameProject = urlObj.host === thisHost;

    // Public URL form: /storage/v1/object/public/<bucket>/<path>
    const publicPrefix = '/storage/v1/object/public/';
    const idx = fileUrl.indexOf(publicPrefix);

    if (!isSameProject || idx === -1) {
      // Different project or not a standard public path → direct fetch
      return await downloadFromPublicUrl(fileUrl);
    }

    // Same project: extract bucket and path and use storage API
    const after = fileUrl.substring(idx + publicPrefix.length);
    const [bucket, ...rest] = after.split('/');
    const path = rest.join('/');

    // Respect bucket from URL if different from default
    const { data, error } = await supabaseStorage
      .storage
      .from(bucket || BUCKET_NAME)
      .download(path);

    if (error) {
      console.warn('[Backend Storage] Storage API failed, falling back to public URL...', error);
      return await downloadFromPublicUrl(fileUrl);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[Backend Storage] downloadAny failed:', error);
    throw error;
  }
};

export const getBucketAndPathFromPublicUrl = (fileUrl) => {
  try {
    const publicPrefix = '/storage/v1/object/public/';
    const idx = fileUrl.indexOf(publicPrefix);
    if (idx === -1) return null;
    const after = fileUrl.substring(idx + publicPrefix.length);
    const [bucket, ...rest] = after.split('/');
    return { bucket, path: rest.join('/') };
  } catch {
    return null;
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
