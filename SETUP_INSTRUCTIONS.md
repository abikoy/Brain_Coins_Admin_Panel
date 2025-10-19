# 🚀 Setup Instructions - Brain Coins Admin Panel

## ✅ Quick Start Guide

Follow these steps to get the complete system running with Gemini AI integration.

---

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Google Gemini API key

---

## 🔧 Step-by-Step Setup

### Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

**Installs:**
- Express
- Supabase JS
- Google Generative AI
- node-fetch
- CORS
- dotenv

---

### Step 2: Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

**Edit `backend/.env`:**

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://jgtjkqwephakgpxvvxsr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Gemini AI Configuration (REQUIRED!)
GEMINI_API_KEY=your_gemini_api_key_here

# CORS Configuration
FRONTEND_URL=http://localhost:3002
```

**Get Gemini API Key:**
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy and paste into `.env`

---

### Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
```

**Installs:**
- React
- Vite
- Tailwind CSS
- Supabase JS
- Recharts
- Lucide React

---

### Step 4: Create Supabase Storage Bucket

**IMPORTANT:** This must be done before uploading files!

1. **Go to Supabase Dashboard**
   - URL: https://app.supabase.com/project/jgtjkqwephakgpxvvxsr

2. **Create Storage Bucket**
   - Click "Storage" in sidebar
   - Click "New bucket"
   - Name: `content-uploads`
   - Public: ✅ Yes
   - Click "Create bucket"

3. **Add RLS Policies**
   - Click on `content-uploads` bucket
   - Go to "Policies" tab
   - Add INSERT policy for authenticated users
   - Add SELECT policy for public

**SQL for policies:**
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content-uploads');

-- Allow public to download
CREATE POLICY "Allow public downloads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'content-uploads');
```

---

### Step 5: Start Backend Server

```bash
cd backend
npm run dev
```

**Expected output:**
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎓 Brain Coins Backend API                             ║
║                                                           ║
║   Server running on: http://localhost:5000               ║
║   Environment: development                               ║
║   Frontend URL: http://localhost:3002                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

**Test backend:**
```bash
curl http://localhost:5000/health
```

Should return:
```json
{
  "status": "OK",
  "message": "Brain Coins Backend API is running"
}
```

---

### Step 6: Start Frontend Server

```bash
cd frontend
npm run dev
```

**Expected output:**
```
VITE v5.4.20  ready in 254 ms

➜  Local:   http://localhost:3002/
```

**Open in browser:**
http://localhost:3002

---

## 🧪 Test the Complete Flow

### Test 1: Login

1. Open http://localhost:3002
2. Login with Supabase credentials
3. Should see dashboard

### Test 2: Upload File

1. Go to "Content" tab
2. Click "Choose Files"
3. Select a PDF or image
4. Click "Upload File"
5. Should see success message
6. Should see "File Uploaded" badge

### Test 3: Generate Questions

1. Click "Generate Questions" button
2. Should see "Generating..." with spinner
3. Wait 10-30 seconds
4. Should see questions appear below
5. Questions should have "AI" badge

### Test 4: Verify in Supabase

1. Go to Supabase Dashboard → Storage
2. Click `content-uploads` bucket
3. Should see uploaded file in `uploads/` folder

---

## 🔍 Troubleshooting

### Backend won't start

**Check:**
- Node.js installed: `node --version`
- Dependencies installed: `npm install`
- Port 5000 available: `netstat -ano | findstr :5000`
- `.env` file exists with correct values

**Fix:**
```bash
cd backend
npm install
# Check .env file
npm run dev
```

---

### Frontend won't start

**Check:**
- Dependencies installed: `npm install`
- Port 3002 available

**Fix:**
```bash
cd frontend
npm install
npm run dev
```

---

### Upload fails with "Unauthorized"

**Check:**
- Storage bucket `content-uploads` exists
- Bucket is public
- RLS policies are set up
- User is logged in

**Fix:**
- Create bucket in Supabase Dashboard
- Add RLS policies (see Step 4)
- Logout and login again

---

### Generate Questions fails

**Check:**
- Backend is running
- `GEMINI_API_KEY` is set in `backend/.env`
- File was uploaded successfully
- Check browser console for errors
- Check backend terminal for errors

**Fix:**
```bash
# Check backend logs
cd backend
npm run dev

# Check if API key is set
cat .env | grep GEMINI_API_KEY
```

---

### "Failed to fetch file" error

**Check:**
- File URL is public
- Supabase Storage bucket is public
- File exists in Supabase

**Fix:**
- Make bucket public in Supabase Dashboard
- Re-upload file
- Check file URL in browser

---

## 📊 Verify Everything Works

### Backend Health Check
```bash
curl http://localhost:5000/health
```
✅ Should return: `{"status":"OK"}`

### Frontend Access
```
http://localhost:3002
```
✅ Should show login page

### Storage Bucket
```
Supabase Dashboard → Storage → content-uploads
```
✅ Should exist and be public

### Gemini API Key
```bash
cd backend
cat .env | grep GEMINI_API_KEY
```
✅ Should show your API key

---

## 🎯 Success Checklist

Before testing, ensure:

- [ ] Backend dependencies installed
- [ ] Backend `.env` configured with Gemini API key
- [ ] Frontend dependencies installed
- [ ] Supabase bucket `content-uploads` created
- [ ] RLS policies added to bucket
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3002
- [ ] Can login to frontend
- [ ] Can upload file
- [ ] Can generate questions

---

## 📞 Need Help?

### Check Logs

**Backend logs:**
```bash
cd backend
npm run dev
# Watch terminal for errors
```

**Frontend logs:**
- Open browser DevTools (F12)
- Go to Console tab
- Look for errors

### Common Error Messages

**"GEMINI_API_KEY is not defined"**
→ Add API key to `backend/.env`

**"Bucket not found"**
→ Create `content-uploads` bucket in Supabase

**"Unauthorized"**
→ Add RLS policies to bucket

**"Failed to fetch"**
→ Check backend is running on port 5000

---

## 🎉 You're Ready!

Once all steps are complete:

1. ✅ Backend running
2. ✅ Frontend running
3. ✅ Storage bucket created
4. ✅ Can upload files
5. ✅ Can generate questions

**Start using Brain Coins Admin Panel!** 🚀
