# 🚀 Brain Coins - Vercel Deployment Guide

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:

- [x] GitHub account
- [x] Vercel account (sign up at vercel.com)
- [x] Supabase database URL and Service Role Key
- [x] Google Gemini API Key
- [x] All code committed to GitHub

---

## 🔧 Step 1: Prepare Environment Files

### 1.1 Create Frontend Environment File

**Create:** `frontend/.env.production`

```env
VITE_API_URL=https://your-backend-name.vercel.app/api
```

**Note:** You'll update this URL after deploying the backend in Step 2.

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

## 🚀 Step 2: Deploy Backend to Vercel

### 2.1 Push to GitHub

```bash
cd "c:\Users\hp\Documents\Brain Coins"
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2.2 Deploy Backend

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Project Name:** `brain-coins-backend`
   - **Framework Preset:** Other
   - **Root Directory:** `backend`
   - **Build Command:** Leave empty
   - **Output Directory:** Leave empty
   - **Install Command:** `npm install`

5. Click **"Environment Variables"** and add:
   ```
   SUPABASE_URL = your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
   GEMINI_API_KEY = your_gemini_api_key
   NODE_ENV = production
   PORT = 3000
   ```

6. Click **"Deploy"**

7. Wait 2-3 minutes. You'll get a URL like:
   ```
   https://brain-coins-backend.vercel.app
   ```

8. **COPY THIS URL** - you need it for the frontend!

### 2.3 Test Backend

Visit: `https://brain-coins-backend.vercel.app/health`

Should return:
```json
{
  "status": "OK",
  "message": "Brain Coins Backend API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🎨 Step 3: Deploy Frontend to Vercel

### 3.1 Update Frontend Environment

**Edit:** `frontend/.env.production`

```env
VITE_API_URL=https://brain-coins-backend.vercel.app/api
```

**Commit and push:**

```bash
git add frontend/.env.production
git commit -m "Update API URL for production"
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
   VITE_API_URL = https://brain-coins-backend.vercel.app/api
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
curl https://brain-coins-backend.vercel.app/health
```

### 5.2 Test Frontend

1. Visit: `https://brain-coins-frontend.vercel.app`
2. Try to login
3. Upload a file
4. Generate learning packs
5. Generate questions

---

## 🎯 Your Live URLs

After deployment:

- **Frontend:** `https://brain-coins-frontend.vercel.app`
- **Backend:** `https://brain-coins-backend.vercel.app`

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
