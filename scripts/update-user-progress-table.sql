-- Migration script to update user_problem_progress table with score and stars
-- Run this in your Supabase SQL Editor

-- Add new columns to user_problem_progress table
ALTER TABLE user_problem_progress 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100);

ALTER TABLE user_problem_progress 
ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0 CHECK (stars >= 0 AND stars <= 5);

ALTER TABLE user_problem_progress 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update existing records to have default values
UPDATE user_problem_progress 
SET score = 0, stars = 0 
WHERE score IS NULL OR stars IS NULL;

-- Create index for better query performance on completed problems
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_completed ON user_problem_progress(user_id, is_solved, completed_at);

-- Create index for score and stars queries
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_score_stars ON user_problem_progress(user_id, score, stars);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_problem_progress' 
ORDER BY ordinal_position; 