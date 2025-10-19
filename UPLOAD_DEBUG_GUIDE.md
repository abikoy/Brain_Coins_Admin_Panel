# 🔍 Upload Error Debug Guide

## ❌ Error Message
```
Unauthorized: You must be logged in to upload files. Please sign in and try again.
```

---

## 🎯 Root Cause Analysis

### The Problem
Even though you're logged in (showing "enanaye00" in the UI), the Supabase Storage API is rejecting your upload request as **unauthorized**.

### Why This Happens
1. **Session Not Shared** - The upload function doesn't have access to your auth session
2. **Storage Bucket Missing** - The `content-uploads` bucket doesn't exist
3. **RLS Policies Missing** - Storage policies don't allow authenticated uploads
4. **Session Expired** - Your login session expired but UI still shows logged in

---

## ✅ Step-by-Step Fix

### Step 1: Check Browser Console

1. **Open Developer Tools**
   - Press `F12` or `Ctrl+Shift+I`
   - Go to "Console" tab

2. **Look for these logs when you try to upload:**
   ```
   [Frontend Storage] Session check: {
     hasSession: true/false,
     user: "your-email@example.com",
     error: null
   }
   ```

3. **What to check:**
   - ✅ `hasSession: true` - Session exists
   - ✅ `user: "enanaye00@..."` - Shows your email
   - ❌ `hasSession: false` - **SESSION PROBLEM**
   - ❌ `error: {...}` - **SESSION ERROR**

---

### Step 2: Verify Session in LocalStorage

1. **In Console, type:**
   ```javascript
   // Check if session exists
   const session = await supabase.auth.getSession();
   console.log('Session:', session);
   ```

2. **Expected output:**
   ```javascript
   {
     data: {
       session: {
         access_token: "eyJ...",
         user: {
           email: "enanaye00@...",
           id: "..."
         }
       }
     }
   }
   ```

3. **If session is null:**
   - Your session expired
   - **Fix:** Logout and login again

---

### Step 3: Create Storage Bucket (MOST COMMON ISSUE)

**This is likely your problem!**

1. **Go to Supabase Dashboard**
   - URL: https://app.supabase.com/project/jgtjkqwephakgpxvvxsr
   - Click "Storage" in left sidebar

2. **Check if `content-uploads` bucket exists**
   - ❌ If you don't see it → **CREATE IT NOW**
   - ✅ If you see it → Go to Step 4

3. **Create the bucket:**
   - Click "New bucket"
   - **Name:** `content-uploads` (exactly this, no spaces)
   - **Public:** ✅ Check this box
   - Click "Create bucket"

---

### Step 4: Add RLS Policies

**Even if bucket exists, you need policies!**

1. **Go to Storage → Policies**
   - Click on `content-uploads` bucket
   - Click "Policies" tab

2. **Add INSERT Policy (Upload)**
   - Click "New Policy"
   - Click "For full customization"
   - **Policy name:** `Allow authenticated uploads`
   - **Allowed operation:** INSERT
   - **Target roles:** authenticated
   - **WITH CHECK expression:**
     ```sql
     bucket_id = 'content-uploads'
     ```
   - Click "Review" → "Save policy"

3. **Add SELECT Policy (Download)**
   - Click "New Policy"
   - **Policy name:** `Allow public downloads`
   - **Allowed operation:** SELECT
   - **Target roles:** public
   - **USING expression:**
     ```sql
     bucket_id = 'content-uploads'
     ```
   - Click "Review" → "Save policy"

---

### Step 5: Test Upload Again

1. **Refresh your app** (F5)
2. **Open Console** (F12)
3. **Try uploading a file**
4. **Check console logs:**
   ```
   [Frontend Storage] Session check: { hasSession: true, user: "..." }
   [Frontend Storage] Uploading file: { name: "...", authenticatedAs: "..." }
   [Frontend Storage] Upload successful: { filePath: "...", fileUrl: "..." }
   ```

---

## 🧪 Debug Tests

### Test 1: Check Session
```javascript
// Paste in browser console
const { data } = await supabase.auth.getSession();
console.log('Has session:', !!data.session);
console.log('User email:', data.session?.user?.email);
```

**Expected:** `Has session: true` and your email

---

### Test 2: Check Bucket Exists
```javascript
// Paste in browser console
const { data, error } = await supabase.storage.listBuckets();
console.log('Buckets:', data);
console.log('Has content-uploads:', data?.some(b => b.name === 'content-uploads'));
```

**Expected:** `Has content-uploads: true`

---

### Test 3: Test Upload Directly
```javascript
// Paste in browser console
const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
const { data, error } = await supabase.storage
  .from('content-uploads')
  .upload(`test/${Date.now()}.txt`, testFile);

console.log('Upload result:', { data, error });
```

**Expected:** `data: { path: "..." }` and `error: null`

---

## 🔍 Common Issues & Solutions

### Issue 1: Session is null
**Symptom:** Console shows `hasSession: false`

**Solution:**
1. Logout from app
2. Clear browser cache (Ctrl+Shift+Del)
3. Login again
4. Try upload

---

### Issue 2: Bucket not found
**Symptom:** Error says "Bucket not found"

**Solution:**
1. Go to Supabase Dashboard → Storage
2. Create `content-uploads` bucket
3. Make it public
4. Try upload

---

### Issue 3: RLS Policy Error
**Symptom:** Error says "row-level security" or "policy"

**Solution:**
1. Go to Storage → Policies
2. Add INSERT policy for authenticated users
3. Add SELECT policy for public
4. Try upload

---

### Issue 4: Session exists but still unauthorized
**Symptom:** Console shows session, but upload fails

**Possible causes:**
1. **Bucket doesn't exist** → Create it
2. **RLS policies missing** → Add them
3. **Wrong bucket name** → Must be exactly `content-uploads`
4. **Session not in storage request** → Already fixed in code

**Solution:**
```javascript
// Check if session is being sent with request
const { data: session } = await supabase.auth.getSession();
console.log('Session token:', session?.session?.access_token?.substring(0, 20) + '...');

// If token exists, the problem is RLS policies or bucket
```

---

## 📋 Complete Checklist

Before upload should work:
- [ ] User is logged in (shows name in header)
- [ ] Session exists in localStorage
- [ ] Console shows `hasSession: true`
- [ ] Bucket `content-uploads` exists in Supabase
- [ ] Bucket is marked as "Public"
- [ ] INSERT policy exists for authenticated users
- [ ] SELECT policy exists for public
- [ ] Browser console shows no errors
- [ ] Page has been refreshed after setup

---

## 🎯 Quick Fix Commands

### Reset Everything
```javascript
// Paste in console to reset auth
await supabase.auth.signOut();
localStorage.clear();
location.reload();
// Then login again
```

### Force Session Refresh
```javascript
// Paste in console
const { data, error } = await supabase.auth.refreshSession();
console.log('Session refreshed:', { data, error });
location.reload();
```

---

## 📞 Still Not Working?

### Check Supabase Logs
1. Go to Supabase Dashboard
2. Click "Logs" in sidebar
3. Filter by "Storage"
4. Look for your upload attempts
5. Check error messages

### Check Network Tab
1. Open DevTools (F12)
2. Go to "Network" tab
3. Try upload
4. Look for request to `storage/v1/object`
5. Check request headers for `Authorization: Bearer ...`
6. If no Bearer token → **SESSION PROBLEM**

---

## ✅ Success Indicators

You'll know it's fixed when:
1. ✅ Console shows: `[Frontend Storage] Session check: { hasSession: true }`
2. ✅ Console shows: `authenticatedAs: "your-email"`
3. ✅ No "Unauthorized" error
4. ✅ Progress bar completes
5. ✅ Green success message
6. ✅ File appears in Supabase Storage

---

## 🎉 Expected Flow

```
1. User clicks "Upload File"
2. Console: "Session check: { hasSession: true, user: 'enanaye00@...' }"
3. Console: "Uploading file: { name: '...', authenticatedAs: '...' }"
4. Progress bar: 0% → 100%
5. Console: "Upload successful: { filePath: '...', fileUrl: '...' }"
6. UI: Green success message
7. Supabase Storage: File appears in content-uploads/uploads/
```

---

**Most likely issue: Storage bucket doesn't exist yet! Create it in Supabase Dashboard.**
