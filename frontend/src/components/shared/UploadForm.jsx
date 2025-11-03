/**
 * FRONTEND - UploadForm Component
 * Secure file upload component with Tailwind CSS styling
 */

import React, { useState, useRef } from 'react';
import { Upload, File, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { uploadFile, formatFileSize } from '../../lib/supabaseStorage';
import Button from '../ui/Button';

const UploadForm = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  /**
   * Handle file selection
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (selectedFile.size > maxSize) {
        setMessage({ 
          type: 'error', 
          text: `File is too large. Maximum size is 50MB. Your file is ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB.` 
        });
        e.target.value = ''; // Clear the file input
        return;
      }
      
      setFile(selectedFile);
      setMessage({ type: '', text: '' });
    }
  };

  /**
   * Handle file upload
   */
  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first' });
      return;
    }

    setIsUploading(true);
    setMessage({ type: '', text: '' });
    setUploadProgress(0);

    try {
      // Simulate progress (since Supabase doesn't provide real-time progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file
      const result = await uploadFile(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Success message
      setMessage({
        type: 'success',
        text: `File uploaded successfully: ${result.fileName}`
      });

      // Call parent callback with file information
      if (onUploadComplete) {
        onUploadComplete({
          filePath: result.filePath,
          fileType: result.fileType,
          fileUrl: result.fileUrl,
          name: result.fileName,
          file: file // Pass the file object for direct upload
        });
      }

      // Reset form after 2 seconds
      setTimeout(() => {
        setFile(null);
        setUploadProgress(0);
        setMessage({ type: '', text: '' });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to upload file'
      });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Clear selected file
   */
  const handleClear = () => {
    setFile(null);
    setMessage({ type: '', text: '' });
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card rounded-2xl p-8 shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
            <Upload className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Upload Content
          </h2>
          <p className="text-gray-600">
            Upload PDFs, images, or documents for AI question generation
          </p>
        </div>

        {/* File Input Area */}
        <div className="mb-6">
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-white/50 hover:bg-white/70 transition-all duration-200"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {file ? (
                <>
                  <File className="h-12 w-12 text-electric-cyan mb-3" />
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="mb-2 text-sm text-gray-700">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, PNG, JPG, DOCX (MAX. 50MB)
                  </p>
                </>
              )}
            </div>
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-gradient-primary h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={`text-sm ${
                message.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {file && !isUploading && (
            <Button
              onClick={handleClear}
              variant="outline"
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="flex-1 bg-electric-cyan hover:bg-electric-cyan/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            <strong>Note:</strong> Files are securely uploaded to Supabase Storage.
            Make sure you're logged in to upload files.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadForm;
