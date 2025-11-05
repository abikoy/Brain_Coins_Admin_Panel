# 🧠 Brain Coins - AI-Powered Educational Platform

> An intelligent learning management system that generates questions, learning packs, and analytics for Sri Lankan education (Grades 6-11)

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-orange.svg)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-purple.svg)](https://ai.google.dev/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Brain Coins** is an AI-powered educational platform designed for the Sri Lankan education system. It uses Google's Gemini AI to automatically generate questions and learning materials from uploaded documents (PDFs, images) in **English, Sinhala, and Tamil**.

### Key Capabilities:
- 📄 **Document Analysis** - Upload PDFs/images and automatically extract learning content
- 🤖 **AI Question Generation** - Generate MCQ, Fill-in-the-Blank, True/False, and Higher-Order questions
- 📚 **Learning Pack Management** - Organize content by subject, grade, and difficulty
- 📊 **Analytics Dashboard** - Track student performance and question statistics
- 🌐 **Multi-language Support** - Full support for English, Sinhala, and Tamil

---

## ✨ Features

### 🎓 For Educators

#### 1. **Content Management**
- Upload documents (PDF, images) for automatic analysis
- Generate learning packs from chapters/sections
- Create custom questions manually
- Edit and organize existing questions
- Tag questions by difficulty (Easy, Medium, Hard)

#### 2. **AI-Powered Question Generation**
- **Question Types:**
  - Multiple Choice Questions (MCQ)
  - Fill in the Blanks (FIIB)
  - True/False (TF)
  - Higher Order Questions (HOQ)
- **Smart Features:**
  - Automatic language detection
  - Unicode validation for Sinhala/Tamil
  - Garbage character filtering
  - Bloom's Taxonomy tagging
  - Per-type difficulty settings

#### 3. **Learning Pack System**
- Auto-detect chapters from documents
- Calculate study duration based on word count
- Organize by subject and grade (6-11)
- Generate summary bullets
- Link questions to specific packs

#### 4. **Preview & Approval Workflow**
- Preview generated questions before saving
- Select/deselect individual questions
- Edit questions in preview
- Approve and save to database

### 📊 Analytics & Reporting

- **Question Statistics:**
  - Total questions by type
  - Difficulty distribution
  - Language breakdown
  - Generation trends

- **Student Performance:**
  - Subject-wise performance
  - Grade-level analytics
  - Progress tracking
  - Performance charts

### 🎨 User Experience

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern UI** - Clean, intuitive interface with Tailwind CSS
- **Real-time Feedback** - Loading states, error messages, success modals
- **Accessibility** - Keyboard navigation, screen reader support

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Recharts** - Data visualization
- **Supabase Client** - Authentication & database

### Backend
- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - PostgreSQL database & storage
- **Google Gemini AI** - Question generation
- **Multer** - File upload handling
- **PDF-Parse** - PDF text extraction

### Database
- **Supabase (PostgreSQL)** - Main database
- **Row Level Security (RLS)** - Data protection
- **Storage Buckets** - File storage

### AI & ML
- **Gemini 2.5 Flash** - Question generation
- **Vision API** - Image/PDF analysis
- **Unicode Validation** - Sinhala/Tamil support

---

## 📁 Project Structure

```
Brain Coins/
├── backend/                    # Node.js backend
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   │   └── supabaseClient.js
│   │   ├── controllers/       # Route controllers
│   │   │   ├── questionController.js
│   │   │   ├── learningPackController.js
│   │   │   └── subjectController.js
│   │   ├── services/          # Business logic
│   │   │   ├── geminiService.js      # AI generation
│   │   │   ├── supabaseService.js    # Database operations
│   │   │   ├── supabaseStorage.js    # File storage
│   │   │   └── learningPackService.js
│   │   ├── routes/            # API routes
│   │   │   ├── questionRoutes.js
│   │   │   ├── learningPackRoutes.js
│   │   │   └── subjectRoutes.js
│   │   └── server.js          # Express server
│   ├── uploads/               # Temporary file storage
│   ├── package.json
│   └── .env                   # Environment variables
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── api/               # API service layer
│   │   │   ├── questionService.js
│   │   │   ├── learningPackService.js
│   │   │   └── subjectService.js
│   │   ├── components/        # Reusable components
│   │   │   ├── ui/           # UI primitives (Button, Card, etc.)
│   │   │   ├── shared/       # Shared components
│   │   │   ├── LearningPackSelector.jsx
│   │   │   └── CreateLearningPackModal.jsx
│   │   ├── context/          # React Context
│   │   │   ├── AuthContext.jsx
│   │   │   └── DataContext.jsx
│   │   ├── hooks/            # Custom hooks
│   │   │   └── useStudentData.js
│   │   ├── lib/              # Utilities
│   │   │   ├── supabaseClient.js
│   │   │   └── supabaseStorage.js
│   │   ├── pages/            # Page components
│   │   │   ├── ContentManager.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Entry point
│   ├── package.json
│   └── .env                  # Environment variables
│
└── README.md                  # This file
```

---

## 🚀 Installation

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm or yarn** - Package manager
- **Supabase Account** - [Sign up](https://supabase.com/)
- **Google AI API Key** - [Get key](https://ai.google.dev/)

### 1. Clone Repository

```bash
git clone <repository-url>
cd "Brain Coins"
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
# Server
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# CORS
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `.env` file:

```env
# API
VITE_API_URL=http://localhost:5000/api

# Supabase (Frontend)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Database Setup

Run the SQL schema in your Supabase SQL editor:

```sql
-- See Database Schema section below
```

### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access the app:** http://localhost:5173

---

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Backend server port | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin access) | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |

#### Frontend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public) | Yes |

### Supabase Storage

Create a storage bucket named `content-uploads`:

1. Go to Supabase Dashboard → Storage
2. Create new bucket: `content-uploads`
3. Set as **Public**
4. Configure RLS policies for authenticated users

---

## 📖 Usage

### 1. Upload & Analyze Document

1. Navigate to **Content Manager**
2. Click **"Upload File"**
3. Select a PDF or image file
4. Click **"Analyze Document"**
5. Wait for AI to extract learning packs

### 2. Generate Questions

**Option A: Preview First (Recommended)**
1. Select a learning pack (click card - turns green)
2. Configure question types and counts
3. Click **"Preview"**
4. Review generated questions
5. Select/deselect questions
6. Click **"Approve & Save"**

**Option B: Direct Generation**
1. Select a learning pack
2. Configure settings
3. Click **"Generate"**
4. Questions saved automatically

### 3. Manage Questions

- **Edit:** Click edit icon on question card
- **Delete:** Click trash icon
- **Change Difficulty:** Click difficulty badge
- **View Analytics:** Navigate to Analytics page

### 4. View Analytics

- Navigate to **Analytics** page
- View question statistics
- Track student performance
- Export data (coming soon)

---

## 🔌 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All endpoints require authentication via Supabase session cookies.

### Endpoints

#### Questions

**Generate Preview (No Save)**
```http
POST /questions/preview-from-file
Content-Type: application/json

{
  "fileUrl": "https://...",
  "fileType": "pdf",
  "language": "English",
  "grade": "10",
  "subject": "uuid",
  "counts": {
    "MCQ": 5,
    "FIIB": 2,
    "TF": 2,
    "HOQ": 1
  },
  "difficulty": "Medium",
  "bloom_level": "Understand"
}
```

**Approve Preview (Save to DB)**
```http
POST /questions/approve-from-preview
Content-Type: application/json

{
  "pack_id": "uuid",
  "questions": [...],
  "summary_bullets": [...],
  "language": "English",
  "difficulty": "Medium",
  "bloom_level": "Understand"
}
```

**Generate & Save Directly**
```http
POST /questions/generate-from-file
Content-Type: application/json

{
  "fileUrl": "https://...",
  "fileType": "pdf",
  "pack_id": "uuid",
  "count": 10,
  "difficulty": "Medium",
  "types": ["MCQ", "FIIB", "TF", "HOQ"],
  "language": "English",
  "bloom_level": "Understand"
}
```

**Get All Questions**
```http
GET /questions?pack_id=uuid&page=1&limit=20
```

**Update Question**
```http
PATCH /questions/:id
Content-Type: application/json

{
  "question_text": "Updated question",
  "correct_answer": "Updated answer",
  "options": ["A", "B", "C", "D"]
}
```

**Delete Question**
```http
DELETE /questions/:id
```

#### Learning Packs

**Analyze Document**
```http
POST /learning-packs/analyze
Content-Type: multipart/form-data

file: <PDF or Image file>
```

**Create Learning Pack**
```http
POST /learning-packs
Content-Type: application/json

{
  "subject_id": "uuid",
  "grade": 10,
  "title": "Pack Title",
  "difficulty": "Medium",
  "description": "Pack description"
}
```

**Get Learning Packs**
```http
GET /learning-packs?subject_id=uuid
```

#### Subjects

**Get All Subjects**
```http
GET /subjects
```

---

## 🗄️ Database Schema

### Tables

#### `subjects`
```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_si TEXT,
  name_ta TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `learning_packs`
```sql
CREATE TABLE learning_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id),
  grade INTEGER CHECK (grade BETWEEN 6 AND 11),
  title TEXT NOT NULL,
  title_si TEXT,
  title_ta TEXT,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `questions`
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID REFERENCES learning_packs(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_text_si TEXT,
  question_text_ta TEXT,
  question_type TEXT CHECK (question_type IN ('MCQ', 'FIIB', 'TF', 'HOQ')),
  options JSONB DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  explanation_si TEXT,
  explanation_ta TEXT,
  has_diagram BOOLEAN DEFAULT FALSE,
  diagram_path TEXT,
  blooms_taxonomy TEXT DEFAULT 'Remember',
  display_order INTEGER DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  generated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `summaries`
```sql
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID REFERENCES learning_packs(id) ON DELETE CASCADE,
  bullets JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pack_id)
);
```

#### `students`
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  grade INTEGER CHECK (grade BETWEEN 6 AND 11),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 UI Components

### Component Library (`components/ui/`)

- **Button** - Reusable button with variants (default, outline, ghost, secondary)
- **Card** - Container component with header, content, footer
- **Dialog** - Modal dialog for forms and confirmations
- **Input** - Form input field
- **Badge** - Label/tag component
- **Switch** - Toggle switch

### Shared Components (`components/shared/`)

- **GlassCard** - Glassmorphism card design
- **UploadForm** - File upload with drag & drop
- **SessionDebugger** - Debug authentication state

### Page Components (`pages/`)

- **ContentManager** - Main question generation interface
- **Analytics** - Statistics and performance dashboard
- **Dashboard** - Overview and quick actions

---

## 🔒 Security

### Authentication
- Supabase Auth for user management
- Session-based authentication
- Row Level Security (RLS) policies

### File Upload
- 50MB file size limit
- MIME type validation
- Authenticated uploads only
- Unique file naming (timestamp + random)

### API Security
- CORS configuration
- Request validation
- Error handling
- SQL injection prevention (Supabase)

### Data Protection
- Environment variables for secrets
- Service role key for backend only
- Anon key for frontend (limited access)
- RLS policies on all tables

---

## 🐛 Troubleshooting

### Common Issues

**1. Backend won't start**
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process if needed
taskkill /PID <process_id> /F
```

**2. Gemini API errors**
- Check API key is valid
- Verify quota (250 requests/day on free tier)
- Check network connectivity

**3. Supabase connection errors**
- Verify SUPABASE_URL and keys
- Check RLS policies
- Ensure database is active

**4. File upload fails**
- Check storage bucket exists (`content-uploads`)
- Verify bucket is public
- Check RLS policies on storage

**5. Sinhala/Tamil garbage characters**
- Ensure PDF has proper Unicode encoding
- Use Vision API for corrupted PDFs
- Check source document quality

---

## 📈 Performance

### Optimization Tips

1. **Question Generation:**
   - Use preview mode for large batches
   - Limit to 10-20 questions per request
   - Cache generated questions

2. **File Processing:**
   - Compress PDFs before upload
   - Use images only when necessary
   - Clean up temporary files

3. **Database:**
   - Index on `pack_id`, `subject_id`, `grade`
   - Paginate large result sets
   - Use select() to limit columns

4. **Frontend:**
   - Lazy load components
   - Optimize images
   - Use React.memo for expensive components

---

## 🚧 Known Limitations

1. **Gemini API:**
   - 250 requests/day (free tier)
   - Rate limiting may occur
   - Occasional garbage characters in Sinhala/Tamil

2. **File Processing:**
   - 50MB file size limit
   - PDF text extraction may fail for scanned documents
   - Image OCR accuracy varies

3. **Question Types:**
   - Limited to 4 types (MCQ, FIIB, TF, HOQ)
   - No image-based questions yet
   - No diagram generation

4. **Languages:**
   - English, Sinhala, Tamil only
   - Mixed-language documents may confuse AI
   - Unicode validation required

---

## 🛣️ Roadmap

### Phase 1 (Current)
- ✅ Document upload & analysis
- ✅ AI question generation
- ✅ Learning pack management
- ✅ Basic analytics

### Phase 2 (In Progress)
- ⏳ Student portal
- ⏳ Quiz/test creation
- ⏳ Performance tracking
- ⏳ Export to PDF

### Phase 3 (Planned)
- 📋 Image-based questions
- 📋 Diagram generation
- 📋 Video content support
- 📋 Advanced analytics

### Phase 4 (Future)
- 📋 Mobile app
- 📋 Offline mode
- 📋 Collaborative editing
- 📋 AI tutoring

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Use ESLint configuration
- Follow existing patterns
- Write meaningful commit messages
- Add comments for complex logic

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Your Name** - *Initial work*

---

## 🙏 Acknowledgments

- **Google Gemini AI** - For powerful question generation
- **Supabase** - For backend infrastructure
- **React Community** - For excellent libraries
- **Sri Lankan Education System** - For inspiration

---

## 📞 Support

For support, email your-email@example.com or open an issue on GitHub.

---

## 📊 Project Stats

- **Lines of Code:** ~10,000+
- **Components:** 20+
- **API Endpoints:** 15+
- **Database Tables:** 5
- **Supported Languages:** 3 (English, Sinhala, Tamil)
- **Supported Grades:** 6-11
- **Question Types:** 4 (MCQ, FIIB, TF, HOQ)

---

**Made with ❤️ for Sri Lankan Education**
