# Brain Coins - Educational Admin Panel

**Learn Smart. Earn Rewards**

---

## 🎯 Project Structure

This project is organized into **clear, separate folders** for easy maintenance:

```
brain-coins/
│
├── 📁 frontend/          ← ALL FRONTEND CODE (React, UI, Browser)
│   ├── src/
│   ├── package.json
│   └── README.md         ← Frontend documentation
│
├── 📁 backend/           ← ALL BACKEND CODE (API, Server, Database)
│   ├── src/
│   ├── package.json
│   └── README.md         ← Backend documentation
│
└── 📄 README.md          ← This file (Project overview)
```

---

## 🚀 Quick Start

### For Frontend Developers

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:3001**

**Read:** `frontend/README.md` for details

### For Backend Developers

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

Backend runs at: **http://localhost:5000**

**Read:** `backend/README.md` for details

---

## 📋 What's Where?

### 🎨 FRONTEND (`frontend/` folder)

**Purpose:** User interface, React components, styling

**Contains:**
- React components (UI, pages, shared)
- Tailwind CSS styling
- Browser-side authentication
- Charts and visualizations
- Context providers (state management)

**Key Files:**
- `src/lib/supabaseClient.js` - Frontend Supabase client
- `src/pages/Login.jsx` - Login page
- `src/pages/Dashboard.jsx` - Main dashboard
- `src/context/AuthContext.jsx` - Auth state management

**Tech Stack:**
- React 18
- Vite
- Tailwind CSS
- Recharts
- Supabase JS (browser)

### ⚙️ BACKEND (`backend/` folder)

**Purpose:** API endpoints, business logic, database operations

**Contains:**
- Express server
- API controllers
- Business logic services
- Database operations
- AI question generation

**Key Files:**
- `src/server.js` - Express server
- `src/services/supabaseService.js` - Backend Supabase operations
- `src/services/geminiService.js` - AI generation
- `src/controllers/questionController.js` - Question API

**Tech Stack:**
- Node.js
- Express
- Supabase (server-side)
- Gemini AI

---

## 🔍 For Testers

### Testing Frontend
```bash
cd frontend
npm run dev
# Test at http://localhost:3001
```

**What to test:**
- Login functionality
- Dashboard navigation
- Charts and visualizations
- Responsive design
- Error handling

### Testing Backend
```bash
cd backend
npm run dev
# Test at http://localhost:5000
```

**What to test:**
- API endpoints (`/health`, `/api/questions/generate`)
- Error responses
- Database operations
- AI generation

### Integration Testing
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Test full flow: Login → Dashboard → Generate Questions

---

## 🛠️ For Maintainers

### Updating Frontend
1. Go to `frontend/` folder
2. Make changes to React components
3. Test with `npm run dev`
4. Build with `npm run build`

### Updating Backend
1. Go to `backend/` folder
2. Make changes to API controllers/services
3. Test with `npm run dev`
4. Deploy backend separately

### Clear Separation Benefits
- ✅ Know exactly where to make changes
- ✅ Frontend and backend can be deployed separately
- ✅ No confusion about file locations
- ✅ Easy to onboard new developers
- ✅ Can scale independently

---

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Gemini API key (optional)

### Full Setup

```bash
# Clone repository
git clone <repository-url>
cd brain-coins

# Setup Frontend
cd frontend
npm install
cd ..

# Setup Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
cd ..
```

---

## 🔐 Environment Variables

### Frontend
No environment variables needed (uses hardcoded Supabase URL for now)

### Backend
Create `backend/.env`:
```env
PORT=5000
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
GEMINI_API_KEY=your_key
FRONTEND_URL=http://localhost:3001
```

---

## 🎨 Features

### Frontend Features
- ✅ Glassmorphism design
- ✅ Royal Purple → Electric Cyan gradient
- ✅ Real Supabase authentication
- ✅ Session persistence
- ✅ Responsive layout (mobile, tablet, desktop)
- ✅ Interactive charts
- ✅ Modal dialogs
- ✅ Error handling
- ✅ Loading states

### Backend Features
- ✅ RESTful API
- ✅ Supabase integration (server-side)
- ✅ Gemini AI question generation
- ✅ Error handling
- ✅ CORS configuration
- ✅ Environment variables
- ✅ Modular structure

---

## 📱 Application Features

### Analytics Dashboard
- Student list with progress tracking
- Interactive bar charts
- Day/Week/Month filters
- Real-time activity logs
- Performance statistics

### Content Management
- AI question generation (Gemini API)
- Multiple question types (MCQ, FIIB, TF, HOQ, Summary)
- Manual question creation
- Edit/Delete functionality
- Difficulty levels (Easy, Intermediate, Hard)

### Configuration & Logs
- Feature toggles
- CSV Import/Export
- System logs
- Error reporting

---

## 🚀 Deployment

### Deploy Frontend
**Recommended:** Vercel, Netlify, or Cloudflare Pages

```bash
cd frontend
npm run build
# Deploy dist/ folder
```

### Deploy Backend
**Recommended:** Railway, Heroku, or DigitalOcean

```bash
cd backend
# Set environment variables on platform
# Deploy with npm start
```

---

## 📚 Documentation

- **Frontend Docs:** `frontend/README.md`
- **Backend Docs:** `backend/README.md`
- **API Docs:** `backend/README.md#api-endpoints`
- **Supabase Integration:** `SUPABASE_INTEGRATION.md`
- **Quick Start:** `QUICK_START.md`

---

## 🐛 Troubleshooting

### Frontend Issues
See `frontend/README.md#troubleshooting`

### Backend Issues
See `backend/README.md#troubleshooting`

### Common Issues

**Q: Frontend can't connect to backend**
- Check backend is running on port 5000
- Verify CORS settings in `backend/src/server.js`
- Check `FRONTEND_URL` in backend `.env`

**Q: Authentication not working**
- Verify Supabase credentials
- Check browser console for errors
- Ensure user exists in Supabase

---

## 👥 Team Guidelines

### For New Developers

1. **Read this README first**
2. **Choose your focus:**
   - Frontend? Read `frontend/README.md`
   - Backend? Read `backend/README.md`
3. **Set up your environment**
4. **Start coding!**

### File Naming Conventions

**Frontend:**
- Components: `PascalCase.jsx`
- Hooks: `useCamelCase.js`
- Utilities: `camelCase.js`

**Backend:**
- Controllers: `camelCaseController.js`
- Services: `camelCaseService.js`
- Routes: `kebab-case.routes.js`

---

## 🎯 Project Goals

- ✅ Clear separation of frontend and backend
- ✅ Easy to maintain and update
- ✅ Scalable architecture
- ✅ Beautiful, modern UI
- ✅ Robust API
- ✅ AI-powered features

---

## 📄 License

MIT License

---

## 🙏 Credits

Built with ❤️ for Brain Coins Educational Platform

**Tech Stack:**
- React + Vite
- Express + Node.js
- Supabase
- Gemini AI
- Tailwind CSS

---

## 📞 Support

- Frontend issues: Check `frontend/README.md`
- Backend issues: Check `backend/README.md`
- General questions: Check this README

---

**Remember:**
- 🎨 Frontend = `frontend/` folder
- ⚙️ Backend = `backend/` folder
- 📚 Documentation = README files in each folder

**Happy coding! 🚀**
