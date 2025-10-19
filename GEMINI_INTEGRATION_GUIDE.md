# 🤖 Gemini AI Integration Guide

## ✅ Implementation Complete

The Gemini AI question generation from uploaded files is now fully integrated!

---

## 🎯 How It Works

### Complete Flow

```
1. User uploads file (PDF/Image) → Supabase Storage
2. User clicks "Generate Questions" button
3. Frontend calls Backend API with file URL
4. Backend fetches file from Supabase Storage
5. Backend converts file to Base64
6. Backend sends to Gemini Vision API
7. Gemini analyzes content and generates questions
8. Backend returns questions to Frontend
9. Frontend displays questions in UI
```

---

## 📁 Files Created/Updated

### Backend Files

**1. `backend/src/services/geminiService.js`**
- ✅ `generateQuestionsFromFile(fileUrl, fileType, options)` - Main function
- ✅ `generateQuestionsFromVision(base64Data, mimeType, options)` - Vision API handler
- ✅ `getMimeType(fileType, fileUrl)` - MIME type detection
- ✅ Uses Gemini 1.5 Flash model for vision capabilities
- ✅ Handles images and PDFs
- ✅ Converts files to Base64
- ✅ Parses JSON responses with markdown handling

**2. `backend/src/controllers/questionController.js`**
- ✅ `generateQuestionsFromFileHandler` - New endpoint handler
- ✅ Validates fileUrl and fileType
- ✅ Calls Gemini service
- ✅ Returns generated questions

**3. `backend/src/routes/question.routes.js`**
- ✅ `POST /api/questions/generate-from-file` - New route
- ✅ Accepts: fileUrl, fileType, count, difficulty, types

**4. `backend/package.json`**
- ✅ Added `node-fetch` dependency for fetching files

### Frontend Files

**1. `frontend/src/api/questionService.js`** (NEW)
- ✅ `generateQuestionsFromFile(fileUrl, fileType, options)` - API client
- ✅ `generateQuestionsFromText(content, options)` - Text generation
- ✅ Handles API calls to backend
- ✅ Error handling

**2. `frontend/src/pages/ContentManager.jsx`**
- ✅ Updated `handleGenerateQuestions` to call real API
- ✅ Added error state and display
- ✅ Disabled button when no file uploaded
- ✅ Shows upload requirement message
- ✅ Clears uploaded file after generation

---

## 🚀 Usage

### Step 1: Upload File

1. Go to **Content Management** tab
2. Click **"Choose Files"** button
3. Select a PDF or image file
4. Click **"Upload File"**
5. Wait for success message
6. File is now stored in Supabase

### Step 2: Generate Questions

1. Click **"Generate Questions"** button (now enabled)
2. Wait while Gemini analyzes the file
3. Questions appear in the list below
4. Questions are marked with "AI" badge

---

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Gemini AI API Key (REQUIRED)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (for fetching files)
SUPABASE_URL=https://jgtjkqwephakgpxvvxsr.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Server
PORT=5000
NODE_ENV=development
```

### Get Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Add to `backend/.env` as `GEMINI_API_KEY`

### Frontend Environment Variables

Create `frontend/.env` (optional):

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api
```

---

## 📊 API Endpoints

### Generate Questions from File

**Endpoint:** `POST /api/questions/generate-from-file`

**Request Body:**
```json
{
  "fileUrl": "https://...supabase.co/storage/v1/object/public/content-uploads/uploads/123.pdf",
  "fileType": "pdf",
  "count": 5,
  "difficulty": "Intermediate",
  "types": ["MCQ", "FIIB", "TF", "HOQ", "Summary"]
}
```

**Response:**
```json
{
  "success": true,
  "questions": [
    {
      "id": 1234567890,
      "type": "MCQ",
      "difficulty": "Easy",
      "question": "What is the main topic?",
      "answer": "Option A",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "generated": true,
      "source": "gemini-vision"
    }
  ],
  "count": 5,
  "source": "file",
  "fileType": "pdf"
}
```

---

## 🎨 Question Types

### MCQ (Multiple Choice)
```json
{
  "type": "MCQ",
  "question": "What is...?",
  "answer": "Correct option",
  "options": ["Option A", "Option B", "Option C", "Option D"]
}
```

### FIIB (Fill in the Blanks)
```json
{
  "type": "FIIB",
  "question": "The capital of France is ___",
  "answer": "Paris"
}
```

### TF (True/False)
```json
{
  "type": "TF",
  "question": "The Earth is flat",
  "answer": "False"
}
```

### HOQ (Higher Order Questions)
```json
{
  "type": "HOQ",
  "question": "Explain the concept of...",
  "answer": "Detailed explanation..."
}
```

### Summary
```json
{
  "type": "Summary",
  "question": "Summarize the main points",
  "answer": "Key points are..."
}
```

---

## 🧪 Testing

### Test Backend Directly

```bash
# Start backend
cd backend
npm install
npm run dev
```

```bash
# Test endpoint with curl
curl -X POST http://localhost:5000/api/questions/generate-from-file \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl": "https://your-file-url.pdf",
    "fileType": "pdf",
    "count": 3
  }'
```

### Test Frontend

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Upload a file
4. Click "Generate Questions"
5. Check browser console for logs
6. Verify questions appear

---

## 🔍 Debugging

### Check Backend Logs

Backend logs show the entire process:

```
[Backend Gemini] Processing file: { fileUrl: '...', fileType: 'pdf' }
[Backend Gemini] File converted to base64, size: 123456
[Backend Gemini] Sending to Gemini Vision API...
[Backend Gemini] Received response from Gemini
[Backend Gemini] Generated questions: 5
```

### Check Frontend Logs

Frontend logs show API calls:

```
[ContentManager] Generating questions from file: { fileUrl: '...', fileType: 'pdf' }
[Frontend API] Calling backend to generate questions
[Frontend API] Questions generated: 5
[ContentManager] Questions generated: [...]
```

### Common Issues

**Issue 1: "GEMINI_API_KEY not set"**
- Add API key to `backend/.env`
- Restart backend server

**Issue 2: "Failed to fetch file"**
- Check file URL is public
- Verify Supabase Storage bucket is public
- Check CORS settings

**Issue 3: "Invalid response format"**
- Gemini sometimes returns markdown
- Code handles this automatically
- Check backend logs for raw response

**Issue 4: Backend not running**
- Start backend: `cd backend && npm run dev`
- Check port 5000 is not in use
- Verify `node_modules` installed

---

## 📈 Supported File Types

### Images
- ✅ JPG, JPEG
- ✅ PNG
- ✅ GIF
- ✅ WebP

### Documents
- ✅ PDF (via Gemini Vision)
- ✅ TXT (text extraction)

### Coming Soon
- 📄 DOCX (requires additional library)
- 📊 XLSX (requires additional library)

---

## ⚡ Performance

### File Size Limits
- **Frontend upload:** 50MB
- **Gemini API:** Recommended < 20MB for best performance
- **Base64 conversion:** Increases size by ~33%

### Generation Time
- **Small files (< 1MB):** 5-10 seconds
- **Medium files (1-5MB):** 10-20 seconds
- **Large files (5-20MB):** 20-40 seconds

### Rate Limits
- **Gemini API:** 60 requests per minute (free tier)
- **Supabase Storage:** No specific limit
- **Backend:** No rate limiting (add if needed)

---

## 🔒 Security

### API Key Protection
- ✅ API key stored in backend `.env`
- ✅ Never exposed to frontend
- ✅ Not committed to git

### File Access
- ✅ Files stored in Supabase Storage
- ✅ Public URLs for reading
- ✅ RLS policies for writing

### Input Validation
- ✅ File URL validation
- ✅ File type validation
- ✅ Size limits enforced
- ✅ Error handling

---

## 🎯 Example Workflow

### Complete Example

```javascript
// 1. Upload file
const { filePath, fileUrl, fileType } = await uploadFile(file);
console.log('File uploaded:', fileUrl);

// 2. Generate questions
const questions = await generateQuestionsFromFile(fileUrl, fileType, {
  count: 5,
  difficulty: 'Intermediate',
  types: ['MCQ', 'FIIB', 'TF']
});

// 3. Display questions
setQuestions([...existingQuestions, ...questions]);
```

---

## 📚 Resources

- [Gemini API Docs](https://ai.google.dev/docs)
- [Gemini Vision Guide](https://ai.google.dev/tutorials/vision_quickstart)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Node Fetch Docs](https://github.com/node-fetch/node-fetch)

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ Backend starts without errors
2. ✅ Upload file succeeds
3. ✅ "Generate Questions" button is enabled
4. ✅ Clicking button shows "Generating..." with spinner
5. ✅ Backend logs show Gemini API call
6. ✅ Questions appear in the list
7. ✅ Questions have "AI" badge
8. ✅ Questions are relevant to uploaded content

---

## 🚀 Next Steps

### Enhancements
1. **Add progress indicator** - Show % during generation
2. **Add question preview** - Preview before adding
3. **Add edit before save** - Modify generated questions
4. **Add regenerate** - Generate different questions
5. **Add difficulty selector** - Choose difficulty level
6. **Add type selector** - Choose question types
7. **Add batch processing** - Multiple files at once

### Advanced Features
1. **Question bank** - Save to database
2. **Question categories** - Organize by topic
3. **Question analytics** - Track usage
4. **Export questions** - Download as PDF/CSV
5. **Share questions** - Share with students

---

**🎊 Gemini AI Integration Complete! Your app can now generate questions from uploaded files! 🎊**
