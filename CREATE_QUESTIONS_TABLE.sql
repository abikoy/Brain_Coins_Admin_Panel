-- ============================================
-- Brain Coins - Questions Table Setup
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Drop existing table if needed (CAREFUL: This deletes all data!)
-- DROP TABLE IF EXISTS questions CASCADE;

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('MCQ', 'FIIB', 'TF', 'HOQ', 'Summary')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Intermediate', 'Hard')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  options JSONB,
  
  -- AI-extracted metadata (Sri Lankan Local Syllabus - Grades 6-11)
  language TEXT CHECK (language IN ('English', 'Sinhala', 'Tamil', 'Mixed')),
  grade TEXT CHECK (grade IN ('6', '7', '8', '9', '10', '11', 'Unknown')),
  subject TEXT CHECK (subject IN (
    'Mathematics',
    'Science',
    'Social Studies',
    'Language & Literature (Sinhala)',
    'Language & Literature (Tamil)',
    'English Language',
    'Information & Communication Technology (ICT)',
    'Religion',
    'Health & Physical Education',
    'Aesthetic Education',
    'Unknown'
  )),
  topics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_language ON questions(language);
CREATE INDEX IF NOT EXISTS idx_questions_grade ON questions(grade);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);

-- Enable Row Level Security (RLS)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read questions" ON questions;
DROP POLICY IF EXISTS "Allow authenticated users to insert questions" ON questions;
DROP POLICY IF EXISTS "Allow authenticated users to update questions" ON questions;
DROP POLICY IF EXISTS "Allow authenticated users to delete questions" ON questions;

-- Create RLS policies for authenticated users
CREATE POLICY "Allow authenticated users to read questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete questions"
  ON questions FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify table was created
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'questions'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Questions table created successfully!';
  RAISE NOTICE 'You can now generate and save questions.';
END $$;
