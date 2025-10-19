# Brain Coins - BACKEND

**Express API Server for Brain Coins Educational Platform**

---

## 📁 This is the BACKEND

All server-side code, API endpoints, and business logic are here.

**If you're working on:**
- ✅ API endpoints
- ✅ Database operations
- ✅ AI question generation
- ✅ Server-side authentication
- ✅ Business logic

**Then work in this folder!**

---

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Supabase** - Database & Auth (server-side)
- **Gemini AI** - Question generation
- **CORS** - Cross-origin requests
- **dotenv** - Environment variables

---

## 📂 Folder Structure

```
backend/
├── src/
│   ├── controllers/              # Request Handlers
│   │   └── questionController.js # Question endpoints
│   │
│   ├── services/                 # Business Logic
│   │   ├── supabaseService.js    # Supabase operations (BACKEND)
│   │   └── geminiService.js      # AI generation (BACKEND)
│   │
│   ├── routes/                   # API Routes
│   │   └── question.routes.js    # Question routes
│   │
│   ├── middleware/               # Express Middleware
│   │   └── (to be added)
│   │
│   └── server.js                 # Express server entry point
│
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── package.json                  # Backend dependencies
└── README.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Gemini API key (optional)

### Installation

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
# Add your Supabase URL, keys, and Gemini API key
```

### Environment Variables

Create a `.env` file with:

```env
PORT=5000
NODE_ENV=development

# Supabase (Backend)
SUPABASE_URL=https://jgtjkqwephakgpxvvxsr.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# CORS
FRONTEND_URL=http://localhost:3001
```

### Start Development Server

```bash
npm run dev
```

Server will start at **http://localhost:5000**

### Start Production Server

```bash
npm start
```

---

## 🔌 API Endpoints

### Health Check
```
GET /health
```
Returns server status

**Response:**
```json
{
  "status": "OK",
  "message": "Brain Coins Backend API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Generate Questions
```
POST /api/questions/generate
```

Generate questions using Gemini AI

**Request Body:**
```json
{
  "content": "Text content to generate questions from",
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
      "type": "MCQ",
      "difficulty": "Easy",
      "question": "What is...?",
      "answer": "Answer",
      "options": ["A", "B", "C", "D"]
    }
  ],
  "count": 5
}
```

### Get All Questions
```
GET /api/questions
```

Get all questions from database

**Response:**
```json
{
  "success": true,
  "questions": []
}
```

---

## 🗄️ Services

### Supabase Service (`src/services/supabaseService.js`)

**BACKEND ONLY** - Server-side Supabase operations

Functions:
- `getAllStudents()` - Get all students
- `getStudentById(id)` - Get student by ID
- `createStudent(data)` - Create new student
- `updateStudent(id, data)` - Update student
- `deleteStudent(id)` - Delete student

**Important:** This uses the **service role key** for admin operations. Never expose this in frontend!

### Gemini Service (`src/services/geminiService.js`)

**BACKEND ONLY** - AI question generation

Functions:
- `generateQuestions(content, options)` - Generate questions using AI
- `processDocument(buffer, mimeType)` - Extract text from documents

---

## 🔐 Security

### Environment Variables
- **Never commit `.env` file**
- Use `.env.example` as template
- Keep service role key secret

### CORS
- Configure allowed origins in `server.js`
- Default: `http://localhost:3001` (frontend)

### Authentication
- Use Supabase Auth for user authentication
- Verify JWT tokens in middleware (to be implemented)

---

## 🧪 Testing

```bash
# Run tests (to be implemented)
npm test
```

### Manual Testing

Test health endpoint:
```bash
curl http://localhost:5000/health
```

Test question generation:
```bash
curl -X POST http://localhost:5000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Photosynthesis is the process...",
    "count": 3,
    "difficulty": "Easy"
  }'
```

---

## 📝 Development Guidelines

### File Naming
- Controllers: `camelCaseController.js` (e.g., `questionController.js`)
- Services: `camelCaseService.js` (e.g., `geminiService.js`)
- Routes: `kebab-case.routes.js` (e.g., `question.routes.js`)
- Models: `PascalCase.js` (e.g., `Student.js`)

### Code Structure

**Controller Pattern:**
```javascript
export const handlerName = async (req, res) => {
  try {
    // 1. Validate input
    // 2. Call service
    // 3. Return response
  } catch (error) {
    // Handle error
  }
};
```

**Service Pattern:**
```javascript
export const serviceName = async (params) => {
  try {
    // Business logic here
    return result;
  } catch (error) {
    console.error('[Backend] Error:', error);
    throw error;
  }
};
```

---

## 🔄 Adding New Endpoints

1. **Create Controller** (`src/controllers/`)
   ```javascript
   export const newHandler = async (req, res) => {
     // Handle request
   };
   ```

2. **Create Route** (`src/routes/`)
   ```javascript
   import { newHandler } from '../controllers/controller.js';
   router.post('/endpoint', newHandler);
   ```

3. **Register Route** (`src/server.js`)
   ```javascript
   import newRoutes from './routes/new.routes.js';
   app.use('/api/new', newRoutes);
   ```

---

## 🐛 Troubleshooting

### Port already in use
```bash
# Change PORT in .env
PORT=5001
```

### Supabase connection error
- Verify `SUPABASE_URL` and keys in `.env`
- Check Supabase project is active
- Ensure service role key is correct

### Gemini API error
- Verify `GEMINI_API_KEY` in `.env`
- Check API quota/limits
- Review error logs

### CORS error
- Update `FRONTEND_URL` in `.env`
- Check CORS configuration in `server.js`

---

## 📊 Logging

All backend operations log with `[Backend]` prefix:

```javascript
console.log('[Backend] Operation successful');
console.error('[Backend] Error occurred:', error);
```

This helps distinguish backend logs from frontend logs.

---

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure CORS origins
4. Use HTTPS

### Recommended Platforms
- **Railway** - Easy Node.js deployment
- **Heroku** - Classic PaaS
- **DigitalOcean** - App Platform
- **AWS** - EC2 or Lambda

---

## 📚 Learn More

- [Express Documentation](https://expressjs.com/)
- [Supabase Server Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## 🎯 Key Features

- ✅ RESTful API design
- ✅ Supabase integration (server-side)
- ✅ Gemini AI integration
- ✅ Error handling
- ✅ CORS configuration
- ✅ Environment variables
- ✅ Modular structure

---

**Need to work on frontend?** Go to `../frontend/` folder

**Built with ❤️ for Brain Coins**
