# 📤 File Upload Feature - Complete Guide

## ✅ Implementation Complete

Secure file upload functionality has been implemented with Supabase Storage integration.

---

## 📁 Files Created

### Backend Service
**Location:** `backend/src/services/supabaseStorage.js`

**Purpose:** Server-side file upload handling with RLS error detection

**Functions:**
- `uploadFile(file, fileName)` - Upload file to Supabase Storage
- `deleteFile(filePath)` - Delete file from storage
- `listFiles(folder)` - List files in bucket
- `getFileType(fileName)` - Determine file type from extension

### Frontend Service
**Location:** `frontend/src/lib/supabaseStorage.js`

**Purpose:** Browser-side file upload with validation

**Functions:**
- `uploadFile(file)` - Upload file from browser
- `deleteFile(filePath)` - Delete file
- `validateFileType(file, allowedTypes)` - Validate file MIME type
- `formatFileSize(bytes)` - Format file size for display

### Frontend Component
**Location:** `frontend/src/components/shared/UploadForm.jsx`

**Purpose:** Beautiful upload UI with Tailwind CSS

**Features:**
- Drag & drop file selection
- File size validation (max 50MB)
- Upload progress indicator
- Success/error messages
- Electric Cyan accent button
- Glassmorphism design

---

## 🎨 Component Usage

### Basic Usage

```jsx
import UploadForm from '../components/shared/UploadForm';

function MyComponent() {
  const handleUploadComplete = (filePath, fileType, fileUrl) => {
    console.log('File uploaded:', { filePath, fileType, fileUrl });
    // Use the uploaded file for AI generation or other purposes
  };

  return (
    <UploadForm onUploadComplete={handleUploadComplete} />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onUploadComplete` | `function` | Yes | Callback when upload succeeds |

### Callback Parameters

```javascript
onUploadComplete(filePath, fileType, fileUrl)
```

- **filePath** (string): Path in Supabase bucket (e.g., `uploads/1234567890_abc.pdf`)
- **fileType** (string): File type (`image`, `pdf`, `document`, etc.)
- **fileUrl** (string): Public URL to access the file

---

## 🔐 Supabase Storage Setup

### 1. Create Storage Bucket

Go to Supabase Dashboard → Storage → Create Bucket

**Bucket Name:** `content-uploads`

**Settings:**
- Public bucket: ✅ Yes (for public file access)
- File size limit: 50MB
- Allowed MIME types: All (or restrict as needed)

### 2. Set Up RLS Policies

**Policy 1: Allow Authenticated Users to Upload**

```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-uploads' AND
  auth.role() = 'authenticated'
);
```

**Policy 2: Allow Public Read Access**

```sql
CREATE POLICY "Allow public downloads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'content-uploads');
```

**Policy 3: Allow Users to Delete Their Own Files**

```sql
CREATE POLICY "Allow users to delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-uploads' AND
  auth.uid() = owner
);
```

---

## 🚨 Error Handling

### RLS (Row Level Security) Errors

**Error Message:**
```
Unauthorized: You must be logged in to upload files. Please sign in and try again.
```

**Cause:**
- User is not authenticated
- RLS policy blocks the upload
- Missing permissions

**Solution:**
1. Ensure user is logged in
2. Check RLS policies in Supabase
3. Verify authentication token is valid

### Bucket Not Found Error

**Error Message:**
```
Storage bucket "content-uploads" not found. Please contact administrator.
```

**Cause:**
- Bucket doesn't exist in Supabase
- Bucket name mismatch

**Solution:**
1. Create bucket in Supabase Dashboard
2. Verify bucket name is `content-uploads`

### File Size Error

**Error Message:**
```
File size exceeds 50MB limit
```

**Cause:**
- File is too large

**Solution:**
- Compress file
- Split into smaller files
- Increase limit in code (if needed)

---

## 📊 Supported File Types

### Images
- JPG, JPEG, PNG, GIF, WebP, SVG, BMP

### Documents
- PDF, DOC, DOCX, TXT, RTF

### Spreadsheets
- XLS, XLSX, CSV

### Presentations
- PPT, PPTX

### File Type Detection

Files are automatically categorized:
- `image` - Image files
- `pdf` - PDF documents
- `document` - Word, text files
- `spreadsheet` - Excel, CSV files
- `presentation` - PowerPoint files
- `file` - Other types

---

## 🎨 UI Features

### Glassmorphism Design
- Semi-transparent background
- Backdrop blur effect
- Soft shadows
- Rounded corners

### Upload States

**1. Initial State**
- Upload icon
- "Click to upload or drag and drop" text
- Supported file types listed

**2. File Selected**
- File icon
- File name displayed
- File size shown
- Clear button available

**3. Uploading**
- Progress bar (0-100%)
- "Uploading..." text
- Disabled upload button
- Loading spinner

**4. Success**
- Green checkmark icon
- Success message
- File details
- Auto-reset after 2 seconds

**5. Error**
- Red alert icon
- Error message
- Upload button re-enabled

---

## 🔧 Integration with ContentManager

The UploadForm is integrated into the ContentManager page:

```jsx
// ContentManager.jsx
const [showUploadForm, setShowUploadForm] = useState(false);
const [uploadedFile, setUploadedFile] = useState(null);

const handleUploadComplete = (filePath, fileType, fileUrl) => {
  setUploadedFile({ filePath, fileType, fileUrl });
  setShowUploadForm(false);
  // Use file for AI generation
};

// Toggle upload form
<Button onClick={() => setShowUploadForm(true)}>
  Choose Files
</Button>

// Show upload form
{showUploadForm && (
  <UploadForm onUploadComplete={handleUploadComplete} />
)}
```

---

## 🧪 Testing

### Test Upload Flow

1. **Navigate to Content Management**
   - Go to Dashboard → Content tab
   - Click "Choose Files" button

2. **Select File**
   - Click upload area or drag file
   - Verify file name and size appear
   - Check file size is under 50MB

3. **Upload File**
   - Click "Upload File" button
   - Watch progress bar (0-100%)
   - Wait for success message

4. **Verify Upload**
   - Check Supabase Dashboard → Storage → content-uploads
   - Verify file exists in `uploads/` folder
   - Click file to view public URL

### Test Error Scenarios

**1. Not Logged In**
- Log out
- Try to upload
- Should see: "You must be logged in"

**2. File Too Large**
- Select file > 50MB
- Try to upload
- Should see: "File size exceeds 50MB limit"

**3. Bucket Not Found**
- Delete bucket in Supabase
- Try to upload
- Should see: "Storage bucket not found"

---

## 📝 Code Examples

### Upload File Programmatically

```javascript
import { uploadFile } from '../lib/supabaseStorage';

const handleFileUpload = async (file) => {
  try {
    const result = await uploadFile(file);
    console.log('Upload successful:', result);
    // result = { filePath, fileUrl, fileType, fileName, fileSize }
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
};
```

### Delete File

```javascript
import { deleteFile } from '../lib/supabaseStorage';

const handleFileDelete = async (filePath) => {
  try {
    await deleteFile(filePath);
    console.log('File deleted');
  } catch (error) {
    console.error('Delete failed:', error.message);
  }
};
```

### Validate File Type

```javascript
import { validateFileType } from '../lib/supabaseStorage';

const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
const isValid = validateFileType(file, allowedTypes);

if (!isValid) {
  alert('Only PDF and images are allowed');
}
```

### Format File Size

```javascript
import { formatFileSize } from '../lib/supabaseStorage';

const size = formatFileSize(1024); // "1 KB"
const size2 = formatFileSize(1048576); // "1 MB"
```

---

## 🎯 Next Steps

### 1. Connect to AI Generation
Use uploaded files for Gemini AI question generation:

```javascript
const handleUploadComplete = async (filePath, fileType, fileUrl) => {
  // Extract text from file
  const text = await extractTextFromFile(fileUrl, fileType);
  
  // Generate questions
  const questions = await generateQuestions(text);
  
  // Add to question bank
  setQuestions([...questions, ...newQuestions]);
};
```

### 2. Add File Preview
Show preview of uploaded images/PDFs:

```javascript
{uploadedFile && uploadedFile.fileType === 'image' && (
  <img src={uploadedFile.fileUrl} alt="Preview" />
)}
```

### 3. Add Multiple File Upload
Allow uploading multiple files at once:

```javascript
<input
  type="file"
  multiple
  onChange={handleMultipleFiles}
/>
```

---

## 🐛 Troubleshooting

### Issue: Upload button disabled
**Check:**
- Is a file selected?
- Is upload in progress?
- Check browser console for errors

### Issue: RLS error
**Check:**
- Is user logged in?
- Are RLS policies set up correctly?
- Check Supabase logs

### Issue: File not appearing in bucket
**Check:**
- Bucket name is correct (`content-uploads`)
- File path starts with `uploads/`
- Check Supabase Dashboard → Storage

### Issue: Progress bar stuck at 90%
**Note:** This is normal. Progress is simulated since Supabase doesn't provide real-time progress. It jumps to 100% when upload completes.

---

## ✅ Checklist

Before deploying:
- [ ] Create `content-uploads` bucket in Supabase
- [ ] Set up RLS policies
- [ ] Test upload with authenticated user
- [ ] Test error scenarios
- [ ] Verify files appear in bucket
- [ ] Test file deletion
- [ ] Check public URL access

---

## 📚 Resources

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Tailwind CSS](https://tailwindcss.com/)

---

**🎉 File Upload Feature is Ready!**

Users can now securely upload files to Supabase Storage with a beautiful, professional UI.
