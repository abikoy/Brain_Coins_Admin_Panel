/**
 * BACKEND - Question Diagram Service
 * Handles diagram uploads for questions
 */

import { uploadFile, deleteFile, uploadDiagram, deleteDiagram } from './supabaseStorage.js';
import { supabaseAdmin } from '../config/supabaseClient.js';

/**
 * Upload diagram for a question
 * @param {string} questionId - Question ID
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} fileName - Original file name
 * @returns {Promise<{diagramUrl: string}>}
 */
export const uploadQuestionDiagram = async (questionId, fileBuffer, fileName) => {
  try {
    console.log('[Diagram Service] Upload request:', {
      questionId,
      fileName,
      fileBufferLength: fileBuffer.length,
      fileNameType: typeof fileName
    });

    // Validate file type
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'];
    
    // Better extension extraction - handle multiple dots and special characters
    let extension = '';
    if (fileName && typeof fileName === 'string') {
      const parts = fileName.split('.');
      if (parts.length > 1) {
        extension = parts.pop().toLowerCase().trim();
      }
    }
    
    console.log('[Diagram Service] File validation:', {
      originalName: fileName,
      extractedExtension: extension,
      fileNameType: typeof fileName,
      allowedExtensions
    });
    
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new Error(`Invalid file type "${extension}". Allowed: ${allowedExtensions.join(', ')}`);
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileBuffer.length > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    // Get existing diagram path to delete old one
    const { data: question } = await supabaseAdmin
      .from('questions')
      .select('diagram_path')
      .eq('id', questionId)
      .single();

    // Delete old diagram if exists
    if (question?.diagram_path) {
      try {
        // Check if the old diagram is in the diagrams bucket
        if (question.diagram_path.includes('/storage/v1/object/sign/diagrams/')) {
          // Extract path from signed URL
          const urlParts = question.diagram_path.split('/storage/v1/object/sign/diagrams/');
          if (urlParts[1]) {
            await deleteDiagram(urlParts[1]);
          }
        } else {
          // Use old delete method for backward compatibility
          await deleteFile(question.diagram_path);
        }
      } catch (error) {
        console.warn('[Diagram Service] Failed to delete old diagram:', error.message);
      }
    }

    // Upload new diagram with question ID in filename using diagrams bucket
    const timestamp = Date.now();
    const uniqueFileName = `question_${questionId}_${timestamp}.${extension}`;
    
    const { fileUrl, filePath } = await uploadDiagram(fileBuffer, uniqueFileName);

    // Update question with diagram info - store full URL
    const { error: updateError } = await supabaseAdmin
      .from('questions')
      .update({
        has_diagram: true,
        diagram_path: fileUrl, // Store full HTTPS URL instead of path
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId);

    if (updateError) {
      // Rollback: delete uploaded file
      await deleteFile(filePath).catch(console.error);
      throw updateError;
    }

    console.log('[Diagram Service] Diagram uploaded successfully:', fileUrl);

    return {
      diagramUrl: fileUrl,
      diagramPath: fileUrl // Return full URL
    };

  } catch (error) {
    console.error('[Diagram Service] Upload error:', error);
    throw error;
  }
};

/**
 * Remove diagram from a question
 * @param {string} questionId - Question ID
 * @returns {Promise<void>}
 */
export const removeQuestionDiagram = async (questionId) => {
  try {
    // Get diagram path
    const { data: question, error: fetchError } = await supabaseAdmin
      .from('questions')
      .select('diagram_path')
      .eq('id', questionId)
      .single();

    if (fetchError) throw fetchError;

    if (!question?.diagram_path) {
      throw new Error('Question has no diagram');
    }

    // Extract file path from URL if it's a full URL
    let filePath = question.diagram_path;
    let isDiagramsBucket = false;
    
    if (filePath.includes('/storage/v1/object/sign/diagrams/')) {
      // New diagrams bucket: Extract path from signed URL
      const urlParts = filePath.split('/storage/v1/object/sign/diagrams/');
      if (urlParts[1]) {
        filePath = urlParts[1];
        isDiagramsBucket = true;
      }
    } else if (filePath.includes('/storage/v1/object/public/')) {
      // Old content-uploads bucket: Extract path from URL
      const parts = filePath.split('/storage/v1/object/public/');
      if (parts[1]) {
        const [bucket, ...pathParts] = parts[1].split('/');
        filePath = pathParts.join('/');
      }
    }

    // Delete file from appropriate storage bucket
    if (isDiagramsBucket) {
      await deleteDiagram(filePath);
    } else {
      await deleteFile(filePath);
    }

    // Update question
    const { error: updateError } = await supabaseAdmin
      .from('questions')
      .update({
        has_diagram: false,
        diagram_path: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId);

    if (updateError) throw updateError;

    console.log('[Diagram Service] Diagram removed successfully');

  } catch (error) {
    console.error('[Diagram Service] Remove error:', error);
    throw error;
  }
};

/**
 * Get diagram URL for a question
 * @param {string} questionId - Question ID
 * @returns {Promise<{diagramUrl: string|null}>}
 */
export const getQuestionDiagram = async (questionId) => {
  try {
    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .select('diagram_path, has_diagram')
      .eq('id', questionId)
      .single();

    if (error) throw error;

    if (!question?.has_diagram || !question?.diagram_path) {
      return { diagramUrl: null };
    }

    // Get public URL
    const { supabaseStorage } = await import('./supabaseStorage.js');
    const { data: urlData } = supabaseStorage
      .storage
      .from('content-uploads')
      .getPublicUrl(question.diagram_path);

    return {
      diagramUrl: urlData.publicUrl
    };

  } catch (error) {
    console.error('[Diagram Service] Get diagram error:', error);
    throw error;
  }
};

export default {
  uploadQuestionDiagram,
  removeQuestionDiagram,
  getQuestionDiagram
};
