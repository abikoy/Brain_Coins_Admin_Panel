# 🔧 Fix Database Error - "Could not find the 'source' column"

## 🎯 The Problem

**Error:** `Could not find the 'source' column of 'questions' in the schema cache`

**Cause:** The `questions` table either:
1. Doesn't exist in your Supabase database, OR
2. Exists but doesn't have the required columns

---

## ✅ Solution - Create Questions Table

### Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: **Brain Coins**
3. Click **SQL Editor** in the left sidebar

---

### Step 2: Run SQL Script

**Copy and paste this SQL:**

```sql
-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('MCQ', 'FIIB', 'TF', 'HOQ', 'Summary')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Intermediate', 'Hard')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users full access"
  ON questions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

**Click "Run" button** (or press Ctrl+Enter)

---

### Step 3: Verify Table Created

Run this query to check:

```sql
SELECT * FROM questions LIMIT 1;
```

Should return: `No rows` (empty table, which is correct!)

---

### Step 4: Restart Backend

```bash
cd backend
npm run dev
```

---

### Step 5: Test Question Generation

1. **Upload a file** (PDF or image)
2. **Click "Generate Questions"**
3. **Watch backend logs:**

```
[Backend Gemini] Generated questions: 5
[Backend DB] Saving 5 questions to database
[Backend DB] Successfully saved 5 questions  ← Should see this!
```

4. **Check frontend:**
   - Questions appear with all MCQ options
   - Correct answer highlighted in green
   - Difficulty dropdown works

---

### Step 6: Verify Database

Run this in Supabase SQL Editor:

```sql
SELECT 
  id,
  type,
  difficulty,
  question,
  answer,
  created_at
FROM questions
ORDER BY created_at DESC
LIMIT 10;
```

Should see your generated questions!

---

## 📊 Table Schema

### Columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `type` | TEXT | Question type: MCQ, FIIB, TF, HOQ, Summary |
| `difficulty` | TEXT | Easy, Intermediate, or Hard |
| `question` | TEXT | The question text |
| `answer` | TEXT | The correct answer |
| `options` | JSONB | Array of options (for MCQ) |
| `created_at` | TIMESTAMP | When question was created |
| `updated_at` | TIMESTAMP | When question was last updated |

### Constraints:

- ✅ `type` must be one of: MCQ, FIIB, TF, HOQ, Summary
- ✅ `difficulty` must be one of: Easy, Intermediate, Hard
- ✅ All fields are required except `options`
- ✅ `options` is JSONB array (only for MCQ questions)

---

## 🔍 Troubleshooting

### Error: "relation 'questions' does not exist"

**Solution:** Run the CREATE TABLE SQL above

---

### Error: "permission denied for table questions"

**Solution:** Check RLS policies. Run:

```sql
-- View existing policies
SELECT * FROM pg_policies WHERE tablename = 'questions';

-- If no policies, create them
CREATE POLICY "Allow authenticated users full access"
  ON questions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

---

### Error: "duplicate key value violates unique constraint"

**Solution:** The `id` is auto-generated. Don't include `id` when inserting:

```javascript
// ❌ Wrong
{ id: 123, type: 'MCQ', ... }

// ✅ Correct
{ type: 'MCQ', difficulty: 'Easy', ... }
```

---

### Questions not appearing in frontend

**Check:**

1. **Backend logs** - Should see "Successfully saved X questions"
2. **Browser console** - Any errors?
3. **Database** - Run SELECT query to verify data exists
4. **Frontend state** - Questions added to state?

---

## 🎉 Success Checklist

- [ ] Opened Supabase Dashboard
- [ ] Ran CREATE TABLE SQL
- [ ] Table created successfully
- [ ] Indexes created
- [ ] RLS policies created
- [ ] Backend restarted
- [ ] Generated questions
- [ ] Backend logs show "Successfully saved"
- [ ] Questions appear in frontend
- [ ] MCQ options all visible
- [ ] Difficulty dropdown works
- [ ] Questions saved in database

---

## 📝 Example Data

After generating questions, your table should look like:

```
id: 550e8400-e29b-41d4-a716-446655440000
type: MCQ
difficulty: Intermediate
question: What is the capital of France?
answer: Paris
options: ["London", "Paris", "Berlin", "Madrid"]
created_at: 2025-10-19 09:30:00
```

---

## 🚀 Next Steps

After table is created:

1. ✅ Generate questions from files
2. ✅ Questions automatically saved
3. ✅ Admin can change difficulty
4. ✅ All MCQ options visible
5. ✅ Questions persist across sessions

---

**Run the SQL script now and test!** 🎊
