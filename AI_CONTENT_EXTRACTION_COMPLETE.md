# ✅ AI Content Extraction Pipeline - Complete Implementation

## 🎯 Feature Overview

**AI-Powered Content Analysis with Gemini 2.5 Flash**

When admin uploads a PDF or image, the system now:
1. ✅ **Extracts metadata** using Gemini Vision API
2. ✅ **Generates questions** based on extracted content
3. ✅ **Stores metadata** in database with questions
4. ✅ **Displays metadata** in UI (language, grade, subject)

---

## 🔧 Implementation Details

### 1. Content Metadata Extraction

**Function:** `extractContentMetadata(base64Data, mimeType)`

**Location:** `backend/src/services/geminiService.js`

**What it extracts:**
- ✅ **Language**: English, Sinhala, Tamil, or Mixed
- ✅ **Grade**: 1-13 (Sri Lankan education system)
- ✅ **Subject**: From 12 compulsory subjects
- ✅ **Chapters**: Array of chapter/section objects with:
  - Title
  - Clean Unicode text content
  - Page numbers
- ✅ **Summary**: Brief document summary
- ✅ **Has Diagrams**: Boolean flag
- ✅ **Topics**: Array of main topics

**How it works:**
```javascript
// Uses Gemini 2.5 Flash with JSON response mode
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: "application/json"  // Forces JSON output
  }
});

// Structured prompt with JSON schema
const prompt = `
Analyze this educational document and extract metadata in JSON format.

Context: Sri Lankan education system with these subjects:
${COMPULSORY_SUBJECTS.join(', ')}

Return JSON with: language, grade, subject, chapters, summary, hasDiagrams, topics
`;
```

---

### 2. Two-Step Generation Process

**Step 1: Extract Metadata**
```
Upload PDF/Image
  ↓
Download file from Supabase
  ↓
Convert to Base64
  ↓
Call extractContentMetadata()
  ↓
Gemini analyzes document
  ↓
Returns structured JSON metadata
```

**Step 2: Generate Questions**
```
Use extracted metadata
  ↓
Call generateQuestionsFromVision()
  ↓
Gemini generates questions
  ↓
Attach metadata to each question
  ↓
Save to database with metadata
```

---

### 3. Database Schema Updates

**New columns in `questions` table:**

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  options JSONB,
  
  -- NEW: AI-extracted metadata
  language TEXT,           -- English, Sinhala, Tamil, Mixed
  grade TEXT,             -- 1-13
  subject TEXT,           -- Mathematics, Science, etc.
  topics JSONB,           -- Array of topics
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Indexes for fast filtering
CREATE INDEX idx_questions_language ON questions(language);
CREATE INDEX idx_questions_grade ON questions(grade);
CREATE INDEX idx_questions_subject ON questions(subject);
```

---

### 4. Frontend Display

**Metadata badges shown in UI:**

```jsx
[MCQ] [Easy ▼] [AI] [English] [Grade 10] [Science]
```

**Features:**
- ✅ Language badge (English/Sinhala/Tamil)
- ✅ Grade badge (Grade 1-13)
- ✅ Subject badge (Mathematics, Science, etc.)
- ✅ Automatic display when metadata available
- ✅ Hidden when metadata not present

---

## 🔄 Complete Flow

### Upload & Generate with Metadata

```
1. Admin uploads PDF (e.g., Grade 10 Science textbook)
   ↓
2. File uploaded to Supabase Storage
   ↓
3. Admin clicks "Generate Questions"
   ↓
4. Backend downloads file
   ↓
5. STEP 1: Extract Metadata
   - Gemini analyzes document
   - Detects: Language = English
   - Detects: Grade = 10
   - Detects: Subject = Science
   - Extracts: 3 chapters
   - Identifies: Topics = ["Cells", "Photosynthesis", "Respiration"]
   ↓
6. STEP 2: Generate Questions
   - Gemini generates 5 questions
   - Each question tagged with metadata
   ↓
7. Save to Database
   - Questions saved with language, grade, subject, topics
   ↓
8. Display in UI
   - Shows: [MCQ] [Easy ▼] [AI] [English] [Grade 10] [Science]
```

---

## 🧪 Testing

### 1. Update Database Schema

**Run this SQL in Supabase Dashboard:**

```sql
-- Add metadata columns to existing table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS topics JSONB;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_questions_language ON questions(language);
CREATE INDEX IF NOT EXISTS idx_questions_grade ON questions(grade);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
```

**Or drop and recreate table:**
```sql
DROP TABLE IF EXISTS questions CASCADE;
-- Then run the full CREATE TABLE script from CREATE_QUESTIONS_TABLE.sql
```

---

### 2. Restart Backend

```bash
cd backend
npm run dev
```

---

### 3. Test Metadata Extraction

**1. Upload a PDF** (preferably educational content with clear grade/subject)

**2. Click "Generate Questions"**

**3. Watch backend logs:**

```
[Backend Gemini] Processing file: { fileType: 'pdf' }
[Backend Gemini] File converted to base64, size: 2244880
[Backend Gemini] Step 1: Extracting content metadata...
[Backend Gemini] Extracting content metadata...
[Backend Gemini] Raw metadata response: {"language":"English","grade":"10"...
[Backend Gemini] Extracted metadata: {
  language: 'English',
  grade: '10',
  subject: 'Science',
  chapters: 3,
  hasDiagrams: true
}
[Backend Gemini] Step 2: Generating questions...
[Backend Gemini] Sending to Gemini Vision API...
[Backend Gemini] Received response from Gemini
[Backend Gemini] Generated questions: 5
[Backend DB] Saving 5 questions to database
[Backend DB] Successfully saved 5 questions
```

**4. Check frontend:**
- Questions appear with metadata badges
- Should see: `[English] [Grade 10] [Science]`

**5. Verify database:**

```sql
SELECT 
  id,
  type,
  difficulty,
  language,
  grade,
  subject,
  topics,
  question
FROM questions
ORDER BY created_at DESC
LIMIT 5;
```

Should see metadata populated!

---

## 📊 Supported Subjects

**Sri Lankan Education System (12 Compulsory Subjects):**

1. Sinhala Language
2. Tamil Language
3. English Language
4. Mathematics
5. Science
6. History
7. Geography
8. Health and Physical Education
9. Religion
10. ICT
11. Art
12. Music

**Gemini will automatically detect the subject from this list.**

---

## 🎯 Features Implemented

### ✅ Metadata Extraction
- Language detection (English/Sinhala/Tamil/Mixed)
- Grade level identification (1-13)
- Subject classification (12 subjects)
- Chapter boundary detection
- Clean Unicode text extraction
- Diagram detection
- Topic identification

### ✅ Question Generation with Context
- Questions tagged with metadata
- Metadata stored in database
- Metadata displayed in UI
- Filterable by language, grade, subject

### ✅ Admin Manual Tagging
- Difficulty still manually tagged (Easy/Medium/Hard)
- Dropdown selector in UI
- Saves to database immediately

---

## 🔍 Example Output

### Metadata Extraction Result:

```json
{
  "language": "English",
  "grade": "10",
  "subject": "Science",
  "chapters": [
    {
      "title": "Chapter 1: Cell Structure",
      "content": "Cells are the basic units of life...",
      "pageNumbers": [1, 2, 3]
    },
    {
      "title": "Chapter 2: Photosynthesis",
      "content": "Photosynthesis is the process...",
      "pageNumbers": [4, 5, 6]
    }
  ],
  "summary": "This document covers cell biology and photosynthesis for Grade 10 students.",
  "hasDiagrams": true,
  "topics": ["Cell Structure", "Photosynthesis", "Cellular Respiration"]
}
```

### Generated Question with Metadata:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "MCQ",
  "difficulty": "Intermediate",
  "question": "What is the powerhouse of the cell?",
  "answer": "Mitochondria",
  "options": ["Nucleus", "Mitochondria", "Ribosome", "Chloroplast"],
  "language": "English",
  "grade": "10",
  "subject": "Science",
  "topics": ["Cell Structure", "Organelles"]
}
```

---

## 🚀 Advanced Features

### Future Enhancements (Optional):

1. **Chapter-based Question Generation**
   - Generate questions per chapter
   - Organize by chapter boundaries

2. **Diagram Analysis**
   - Extract and analyze diagrams separately
   - Generate diagram-specific questions

3. **Multi-language Support**
   - Generate questions in Sinhala/Tamil
   - Translate questions between languages

4. **Smart Filtering**
   - Filter questions by grade
   - Filter by subject
   - Filter by language

---

## ✅ Success Checklist

- [ ] Database schema updated (metadata columns added)
- [ ] Backend restarted
- [ ] Upload PDF/image file
- [ ] Click "Generate Questions"
- [ ] Backend logs show "Step 1: Extracting content metadata..."
- [ ] Backend logs show extracted metadata (language, grade, subject)
- [ ] Backend logs show "Step 2: Generating questions..."
- [ ] Questions saved to database
- [ ] Frontend displays metadata badges
- [ ] Can see [Language] [Grade] [Subject] badges
- [ ] Database query shows metadata populated

---

## 🎉 Summary

**Before:**
- ❌ No content analysis
- ❌ No metadata extraction
- ❌ Questions had no context

**After:**
- ✅ AI extracts language, grade, subject
- ✅ Detects chapter boundaries
- ✅ Identifies topics
- ✅ Metadata stored with questions
- ✅ Metadata displayed in UI
- ✅ Filterable by metadata
- ✅ Full Sri Lankan education system support

**AI Content Extraction Pipeline is now complete!** 🚀
