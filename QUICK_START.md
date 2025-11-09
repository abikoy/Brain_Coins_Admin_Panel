# ⚡ Quick Start - Deploy to Vercel in 10 Minutes

## 🎯 What You Need

1. **GitHub Account** - Create at github.com
2. **Vercel Account** - Create at vercel.com (use GitHub login)
3. **Your API Keys:**
   - Supabase URL & Service Role Key (from Supabase dashboard)
   - Gemini API Key (from aistudio.google.com)

---

## 📝 Step-by-Step Instructions

### ✅ STEP 1: Create .env Files (IMPORTANT!)

**Create this file manually:**

**File:** `frontend/.env.production`
```
VITE_API_URL=https://brain-coins-backend.vercel.app/api
```

**Note:** You can change `brain-coins-backend` to any name you want!

---

### ✅ STEP 2: Push to GitHub

```bash
# Open terminal in project folder
cd "c:\Users\hp\Documents\Brain Coins"

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for deployment"

# Create repository on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/brain-coins.git
git branch -M main
git push -u origin main
```

---

### ✅ STEP 3: Deploy Backend (5 minutes)

1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Select your **brain-coins** repository
4. Configure:
   ```
   Project Name: brain-coins-backend
   Framework: Other
   Root Directory: backend
   Build Command: (leave empty)
   Output Directory: (leave empty)
   ```

5. **Add Environment Variables:**
   ```
   SUPABASE_URL = (paste your Supabase URL)
   SUPABASE_SERVICE_ROLE_KEY = (paste your service role key)
   GEMINI_API_KEY = (paste your Gemini API key)
   NODE_ENV = production
   PORT = 3000
   ```

6. Click **"Deploy"**
7. Wait 2-3 minutes
8. **COPY YOUR BACKEND URL** (e.g., `https://brain-coins-backend.vercel.app`)

---

### ✅ STEP 4: Update Frontend .env

**Edit:** `frontend/.env.production`

Replace with YOUR backend URL:
```
VITE_API_URL=https://YOUR-BACKEND-URL.vercel.app/api
```

**Commit and push:**
```bash
git add frontend/.env.production
git commit -m "Update API URL"
git push
```

---

### ✅ STEP 5: Deploy Frontend (5 minutes)

1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Select your **brain-coins** repository again
4. Configure:
   ```
   Project Name: brain-coins-frontend
   Framework: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   ```

5. **Add Environment Variable:**
   ```
   VITE_API_URL = https://YOUR-BACKEND-URL.vercel.app/api
   ```

6. Click **"Deploy"**
7. Wait 2-3 minutes
8. **YOUR APP IS LIVE!** 🎉

---

### ✅ STEP 6: Update Backend CORS

**Edit:** `backend/src/server.js` (line 24)

Change:
```javascript
// 'https://brain-coins.vercel.app',
```

To:
```javascript
'https://YOUR-FRONTEND-URL.vercel.app',
```

**Commit and push:**
```bash
git add backend/src/server.js
git commit -m "Add frontend URL to CORS"
git push
```

Vercel will auto-redeploy!

---

## 🎉 DONE!

Your app is now live at:
- **Frontend:** `https://your-frontend.vercel.app`
- **Backend:** `https://your-backend.vercel.app`

---

## 🧪 Test Your App

1. Visit your frontend URL
2. Login
3. Upload a PDF
4. Generate learning packs
5. Generate questions

**Everything should work!** ✅

---

## 🔄 Future Updates

Every time you make changes:

```bash
git add .
git commit -m "Your changes"
git push
```

Vercel automatically redeploys! 🚀

---

## ❓ Common Issues

### "CORS Error"
- Make sure you added your frontend URL to `backend/src/server.js`
- Push the changes to GitHub

### "Environment variables not found"
- Check Vercel Dashboard → Project → Settings → Environment Variables
- Make sure all variables are added
- Redeploy if needed

### "Build failed"
- Check build logs in Vercel dashboard
- Make sure `package.json` has correct scripts

---

## 📞 Need Help?

Check the full guide: `DEPLOYMENT.md`
