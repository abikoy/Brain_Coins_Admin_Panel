# ⚡ Quick Start - Deploy Frontend to Vercel

## ✅ Backend Already Deployed!

**Your Backend URL:** `https://brain-coins-admin-panel-egap.vercel.app`
**Status:** Working ✅

**Now let's deploy the frontend!**

---

## 📝 Step-by-Step Instructions

### ✅ STEP 1: Create .env Files (IMPORTANT!)

**Create this file manually:**

**File:** `frontend/.env.production`
```
VITE_API_URL=https://brain-coins-admin-panel-egap.vercel.app/api
```

✅ **Use your actual backend URL above!**

---

### ✅ STEP 2: Commit and Push .env File

```bash
# Open terminal in project folder
cd "c:\Users\hp\Documents\Brain Coins"

# Add the .env file
git add frontend/.env.production

# Commit
git commit -m "Add production environment variables"

# Push to GitHub
git push origin main
```

---

### ✅ STEP 3: Deploy Frontend (5 minutes)

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
   VITE_API_URL = https://brain-coins-admin-panel-egap.vercel.app/api
   ```

6. Click **"Deploy"**
7. Wait 2-3 minutes
8. **YOUR APP IS LIVE!** 🎉

---

### ✅ STEP 4: Update Backend CORS

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
