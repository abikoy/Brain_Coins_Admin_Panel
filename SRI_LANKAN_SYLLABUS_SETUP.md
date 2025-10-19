# 📚 Sri Lankan Local Syllabus - Complete Setup

## 🎯 System Configuration

**Target:** Grades 6-11 (Sri Lankan Local Syllabus)

**8 Compulsory Subjects:**

1. 🧮 **Mathematics**
2. 🔬 **Science**
3. 🌍 **Social Studies** (includes History, Geography, Civics)
4. 📝 **Language & Literature** (First Language)
   - Sinhala or Tamil (based on medium)
5. 🗣️ **English Language**
6. 💻 **Information & Communication Technology (ICT)**
7. 🙏 **Religion**
   - Buddhism / Islam / Hinduism / Christianity (based on student's faith)
8. 🎨 **Health & Physical Education / Aesthetic Education**
   - Includes Health Science, Physical Education, Art & Music (rotationally)

---

## 🔧 Implementation

### 1. Backend Configuration

**File:** `backend/src/services/geminiService.js`

```javascript
// Sri Lankan education system - 8 Compulsory Subjects (Grades 6-11)
const COMPULSORY_SUBJECTS = [
  'Mathematics',
  'Science',
  'Social Studies', // includes History, Geography, Civics
  'Language & Literature (Sinhala)', // First Language
  'Language & Literature (Tamil)', // First Language
  'English Language',
  'Information & Communication Technology (ICT)',
  'Religion' // Buddhism / Islam / Hinduism / Christianity
];

const AESTHETIC_SUBJECTS = [
  'Health & Physical Education',
  'Aesthetic Education', // includes Art & Music
  'Health Science',
  'Physical Education',
  'Art',
  'Music'
];

const GRADE_RANGE = {
  min: 6,
  max: 11
};
```

---

### 2. Database Schema

**Grades:** 6, 7, 8, 9, 10, 11

**Languages:** English, Sinhala, Tamil, Mixed

**Subjects:** 8 compulsory subjects + aesthetic subjects

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  options JSONB,
  
  -- AI-extracted metadata (Sri Lankan Local Syllabus - Grades 6-11)
  language TEXT CHECK (language IN ('English', 'Sinhala', 'Tamil', 'Mixed')),
  grade TEXT CHECK (grade IN ('6', '7', '8', '9', '10', '11', 'Unknown')),
  subject TEXT CHECK (subject IN (
    'Mathematics',
    'Science',
    'Social Studies',
    'Language & Literature (Sinhala)',
    'Language & Literature (Tamil)',
    'English Language',
    'Information & Communication Technology (ICT)',
    'Religion',
    'Health & Physical Education',
    'Aesthetic Education',
    'Unknown'
  )),
  topics JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

### 3. Gemini AI Extraction

**What Gemini Extracts:**

1. **Language**: English, Sinhala, Tamil, or Mixed
2. **Grade**: 6-11 (validates range)
3. **Subject**: One of the 8 compulsory subjects
4. **Chapters**: With titles, content, page numbers
5. **Topics**: Main topics covered
6. **Diagrams**: Detection of visual content

**Prompt Context:**
```
Context: This is from the Sri Lankan Local Syllabus (Grades 6-11) 
with these 8 COMPULSORY subjects:
1. Mathematics
2. Science
3. Social Studies (includes History, Geography, Civics)
4. Language & Literature (Sinhala or Tamil - First Language)
5. English Language
6. Information & Communication Technology (ICT)
7. Religion (Buddhism / Islam / Hinduism / Christianity)
8. Health & Physical Education / Aesthetic Education

IMPORTANT: 
- Grade must be between 6-11 (Sri Lankan local syllabus)
- Subject must match one of the 8 compulsory subjects listed above
```

---

## 📊 Subject Breakdown

### 1. Mathematics 🧮
- Algebra, Geometry, Statistics
- Problem Solving
- Mathematical Reasoning

### 2. Science 🔬
- Biology, Chemistry, Physics
- Scientific Method
- Experiments and Observations

### 3. Social Studies 🌍
**Includes:**
- History (Sri Lankan and World)
- Geography (Physical and Human)
- Civics (Government, Rights, Responsibilities)

### 4. Language & Literature 📝
**Two Options:**
- **Sinhala** (for Sinhala medium students)
- **Tamil** (for Tamil medium students)

**Content:**
- Grammar, Composition
- Literature, Poetry
- Reading Comprehension

### 5. English Language 🗣️
- Grammar, Vocabulary
- Reading, Writing
- Listening, Speaking

### 6. ICT 💻
- Computer Basics
- Programming Fundamentals
- Digital Literacy
- Internet Safety

### 7. Religion 🙏
**Four Options:**
- Buddhism
- Islam
- Hinduism
- Christianity

**Content:**
- Religious teachings
- Moral values
- Cultural practices

### 8. Health & Physical Education / Aesthetic Education 🎨
**Includes:**
- Health Science
- Physical Education
- Art
- Music

**Rotational:** These subjects are taught rotationally throughout the year.

---

## 🔄 Complete Workflow

### Upload & Extract Metadata

```
1. Admin uploads PDF (e.g., Grade 9 Science textbook in Sinhala)
   ↓
2. Gemini analyzes document
   ↓
3. Extracts metadata:
   - Language: Sinhala
   - Grade: 9
   - Subject: Science
   - Chapters: 5 chapters detected
   - Topics: ["Cells", "Photosynthesis", "Respiration"]
   ↓
4. Validates:
   - Grade 9 ✅ (within 6-11 range)
   - Science ✅ (one of 8 compulsory subjects)
   - Sinhala ✅ (valid language)
   ↓
5. Generates questions with metadata
   ↓
6. Saves to database
   ↓
7. Displays in UI:
   [MCQ] [Easy ▼] [AI] [Sinhala] [Grade 9] [Science]
```

---

## 🧪 Testing Examples

### Example 1: Grade 10 Mathematics (English)

**Upload:** Grade 10 Mathematics textbook in English

**Expected Extraction:**
```json
{
  "language": "English",
  "grade": "10",
  "subject": "Mathematics",
  "chapters": [
    {
      "title": "Chapter 1: Algebra",
      "content": "Algebraic expressions and equations...",
      "pageNumbers": [1, 2, 3]
    }
  ],
  "summary": "This textbook covers algebra, geometry, and statistics for Grade 10.",
  "hasDiagrams": true,
  "topics": ["Algebra", "Geometry", "Statistics"]
}
```

---

### Example 2: Grade 8 Social Studies (Tamil)

**Upload:** Grade 8 Social Studies textbook in Tamil

**Expected Extraction:**
```json
{
  "language": "Tamil",
  "grade": "8",
  "subject": "Social Studies",
  "chapters": [
    {
      "title": "Chapter 1: Ancient Civilizations",
      "content": "History of ancient Sri Lanka...",
      "pageNumbers": [1, 2, 3]
    },
    {
      "title": "Chapter 2: Geography of Sri Lanka",
      "content": "Physical features and climate...",
      "pageNumbers": [4, 5, 6]
    }
  ],
  "summary": "This textbook covers history, geography, and civics for Grade 8.",
  "hasDiagrams": true,
  "topics": ["Ancient History", "Geography", "Civics"]
}
```

---

### Example 3: Grade 11 ICT (English)

**Upload:** Grade 11 ICT textbook in English

**Expected Extraction:**
```json
{
  "language": "English",
  "grade": "11",
  "subject": "Information & Communication Technology (ICT)",
  "chapters": [
    {
      "title": "Chapter 1: Programming Basics",
      "content": "Introduction to programming concepts...",
      "pageNumbers": [1, 2, 3]
    }
  ],
  "summary": "This textbook covers programming, databases, and web development for Grade 11.",
  "hasDiagrams": true,
  "topics": ["Programming", "Databases", "Web Development"]
}
```

---

## 🗄️ Database Setup

### Step 1: Drop Existing Table (if needed)

```sql
-- CAREFUL: This deletes all existing questions!
DROP TABLE IF EXISTS questions CASCADE;
```

---

### Step 2: Create New Table

```sql
-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('MCQ', 'FIIB', 'TF', 'HOQ', 'Summary')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Intermediate', 'Hard')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  options JSONB,
  
  -- AI-extracted metadata (Sri Lankan Local Syllabus - Grades 6-11)
  language TEXT CHECK (language IN ('English', 'Sinhala', 'Tamil', 'Mixed')),
  grade TEXT CHECK (grade IN ('6', '7', '8', '9', '10', '11', 'Unknown')),
  subject TEXT CHECK (subject IN (
    'Mathematics',
    'Science',
    'Social Studies',
    'Language & Literature (Sinhala)',
    'Language & Literature (Tamil)',
    'English Language',
    'Information & Communication Technology (ICT)',
    'Religion',
    'Health & Physical Education',
    'Aesthetic Education',
    'Unknown'
  )),
  topics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_language ON questions(language);
CREATE INDEX IF NOT EXISTS idx_questions_grade ON questions(grade);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow authenticated users full access"
  ON questions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

---

## ✅ Validation Rules

### Grade Validation
- ✅ Must be between 6-11
- ❌ Grades 1-5 not supported
- ❌ Grades 12-13 not supported

### Subject Validation
- ✅ Must match one of 8 compulsory subjects
- ✅ Social Studies includes History/Geography/Civics
- ✅ Language & Literature specifies Sinhala or Tamil
- ✅ Religion includes all 4 faiths

### Language Validation
- ✅ English, Sinhala, Tamil, Mixed
- ❌ Other languages not supported

---

## 🎯 Success Checklist

- [ ] Database table created with validation constraints
- [ ] Backend updated with 8 compulsory subjects
- [ ] Grade range set to 6-11
- [ ] Backend restarted
- [ ] Upload test file (Grade 6-11 content)
- [ ] Gemini extracts correct metadata
- [ ] Grade is within 6-11 range
- [ ] Subject matches one of 8 compulsory subjects
- [ ] Language is English/Sinhala/Tamil
- [ ] Questions saved with metadata
- [ ] UI displays metadata badges
- [ ] Database validates constraints

---

## 🚀 Quick Start

**1. Update database:**
```sql
-- Run in Supabase SQL Editor
-- Copy entire SQL from CREATE_QUESTIONS_TABLE.sql
```

**2. Restart backend:**
```bash
cd backend
npm run dev
```

**3. Test with sample files:**
- Grade 6-11 textbooks
- Any of the 8 compulsory subjects
- English, Sinhala, or Tamil language

**4. Verify extraction:**
- Check backend logs for extracted metadata
- Verify grade is 6-11
- Verify subject matches compulsory subjects
- Check UI displays correct badges

---

## 📝 Notes

**Important:**
- System only supports Grades 6-11 (Sri Lankan Local Syllabus)
- 8 compulsory subjects are strictly enforced
- Social Studies combines History, Geography, and Civics
- Language & Literature is either Sinhala or Tamil (not both)
- Religion can be Buddhism, Islam, Hinduism, or Christianity
- Aesthetic subjects are rotational (Health, PE, Art, Music)

**Future Enhancements:**
- Support for O/L and A/L syllabi
- Additional optional subjects
- Multi-language question generation
- Subject-specific question templates

---

## 🎉 Summary

**System Configuration:**
- ✅ Grades 6-11 only
- ✅ 8 compulsory subjects
- ✅ 3 languages (English, Sinhala, Tamil)
- ✅ AI metadata extraction
- ✅ Database validation
- ✅ UI display

**Sri Lankan Local Syllabus integration is complete!** 🇱🇰📚
