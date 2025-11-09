# 🚀 Brain Coins - Vercel Deployment Guide

## 📋 Pre-Deployment Checklist

✅ **Backend Deployed Successfully!**
- Backend URL: `https://brain-coins-admin-panel-egap.vercel.app`
- Health Check: Working ✅

**Remaining Steps:**
- [ ] Deploy Frontend
- [ ] Update Backend CORS with Frontend URL
- [ ] Test Complete Application

---

## 🔧 Step 1: Prepare Environment Files

### 1.1 Create Frontend Environment File

**Create:** `frontend/.env.production`

```env
VITE_API_URL=https://brain-coins-admin-panel-egap.vercel.app/api
```

✅ **Backend is already deployed! Use the URL above.**

### 1.2 Backend Environment (Set in Vercel Dashboard)

You'll add these in Vercel's dashboard:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NODE_ENV=production
PORT=3000
```

---

## ✅ Step 2: Backend Deployment - COMPLETED!

**Your Backend is Live:**
- **URL:** `https://brain-coins-admin-panel-egap.vercel.app`
- **Health Check:** `https://brain-coins-admin-panel-egap.vercel.app/health`
- **Status:** Working ✅

**API Endpoints Available:**
- `/api/questions` - Question operations
- `/api/learning-packs` - Learning pack operations
- `/api/subjects` - Subject operations
- `/api/content` - Content operations
- `/api/analytics` - Analytics operations

---

## 🎨 Step 3: Deploy Frontend to Vercel

### 3.1 Update Frontend Environment

**Create:** `frontend/.env.production`

```env
VITE_API_URL=https://brain-coins-admin-panel-egap.vercel.app/api
```

**Commit and push:**

```bash
cd "c:\Users\hp\Documents\Brain Coins"
git add frontend/.env.production
git commit -m "Add production environment variables"
git push origin main
```

### 3.2 Deploy Frontend

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import same GitHub repository
4. Configure:
   - **Project Name:** `brain-coins-frontend`
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. Click **"Environment Variables"** and add:
   ```
   VITE_API_URL = https://brain-coins-admin-panel-egap.vercel.app/api
   ```

6. Click **"Deploy"**

7. Wait 2-3 minutes. You'll get a URL like:
   ```
   https://brain-coins-frontend.vercel.app
   ```

---

## 🔧 Step 4: Update Backend CORS

Now that you have your frontend URL, update the backend to allow it.

### 4.1 Update server.js

**Edit:** `backend/src/server.js`

Find this section (around line 23-25):

```javascript
// Add your Vercel frontend URL here after deployment
// 'https://brain-coins.vercel.app',
// 'https://your-custom-domain.com'
```

**Uncomment and update:**

```javascript
// Add your Vercel frontend URL here after deployment
'https://brain-coins-frontend.vercel.app',
// 'https://your-custom-domain.com'
```

### 4.2 Commit and Push

```bash
git add backend/src/server.js
git commit -m "Add production frontend URL to CORS"
git push origin main
```

Vercel will automatically redeploy the backend.

---

## ✅ Step 5: Verify Deployment

### 5.1 Test Backend

```bash
curl https://brain-coins-admin-panel-egap.vercel.app/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Brain Coins Backend API is running",
  "timestamp": "2025-11-09T11:07:09.529Z"
}
```

✅ **Your backend is already working!**

### 5.2 Test Frontend

1. Visit: `https://brain-coins-frontend.vercel.app`
2. Try to login
3. Upload a file
4. Generate learning packs
5. Generate questions

---

## 🎯 Your Live URLs

**Current Status:**

- **Backend:** `https://brain-coins-admin-panel-egap.vercel.app` ✅ **LIVE**
- **Frontend:** `https://your-frontend-url.vercel.app` ⏳ **Deploy Next**

---

## 🔄 Continuous Deployment

Every time you push to GitHub:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically:
1. Detect the push
2. Build your project
3. Deploy to production
4. Update your live site

---

## 🐛 Troubleshooting

### Issue: CORS Error

**Solution:** Make sure frontend URL is in `allowedOrigins` array in `backend/src/server.js`

### Issue: Environment Variables Not Working

**Solution:**
1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add missing variables
5. Redeploy

### Issue: Build Failed

**Solution:** Check build logs in Vercel dashboard

---

## 📚 Useful Commands

```bash
# View deployment logs
vercel logs

# Redeploy manually
vercel --prod

# Rollback to previous deployment
vercel rollback
```

---

## 🎉 You're Live!

Your Brain Coins app is now deployed and accessible worldwide! 🚀

**Share your app:**
- Frontend: https://brain-coins-frontend.vercel.app
- Backend API: https://brain-coins-backend.vercel.app

---

## 📞 Need Help?

- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
