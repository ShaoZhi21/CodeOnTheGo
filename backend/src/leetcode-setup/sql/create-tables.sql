-- LeetCode Problems Table Setup
-- Run this SQL in your Supabase SQL Editor if the automatic setup doesn't work

-- Create the main problems table
CREATE TABLE IF NOT EXISTS leetcode_problems (
  id SERIAL PRIMARY KEY,
  leetcode_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  description TEXT,
  description_text TEXT,
  examples JSONB DEFAULT '[]'::jsonb,
  constraints TEXT[] DEFAULT ARRAY[]::TEXT[],
  hints TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  acceptance_rate DECIMAL(5,2) DEFAULT 0,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leetcode_problems_difficulty ON leetcode_problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_leetcode_problems_tags ON leetcode_problems USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_leetcode_problems_leetcode_id ON leetcode_problems(leetcode_id);
CREATE INDEX IF NOT EXISTS idx_leetcode_problems_is_premium ON leetcode_problems(is_premium);
CREATE INDEX IF NOT EXISTS idx_leetcode_problems_title ON leetcode_problems(title);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_leetcode_problems_updated_at ON leetcode_problems;
CREATE TRIGGER update_leetcode_problems_updated_at
  BEFORE UPDATE ON leetcode_problems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a helpful view for quick problem summaries
CREATE OR REPLACE VIEW problems_summary AS
SELECT 
  id,
  leetcode_id,
  title,
  difficulty,
  array_length(tags, 1) as tag_count,
  acceptance_rate,
  likes,
  is_premium,
  created_at
FROM leetcode_problems
ORDER BY leetcode_id;

-- Create a view for problems by difficulty
CREATE OR REPLACE VIEW problems_by_difficulty AS
SELECT 
  difficulty,
  COUNT(*) as problem_count,
  AVG(acceptance_rate) as avg_acceptance_rate,
  COUNT(*) FILTER (WHERE is_premium = true) as premium_count
FROM leetcode_problems
GROUP BY difficulty
ORDER BY 
  CASE difficulty 
    WHEN 'Easy' THEN 1 
    WHEN 'Medium' THEN 2 
    WHEN 'Hard' THEN 3 
  END;

-- User Problem Progress Table
CREATE TABLE IF NOT EXISTS user_problem_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  problem_id INTEGER NOT NULL REFERENCES leetcode_problems(id),
  topic TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  stars INTEGER DEFAULT 0,
  last_answer TEXT,
  attempts JSONB DEFAULT '[]'::jsonb, -- Array of { code, timestamp, result }
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, problem_id)
);

-- Sample queries to test the setup:

-- Get all problems with basic info
-- SELECT leetcode_id, title, difficulty FROM leetcode_problems ORDER BY leetcode_id;

-- Get problems by difficulty
-- SELECT * FROM problems_by_difficulty;

-- Search problems by tag
-- SELECT title, difficulty, tags FROM leetcode_problems WHERE 'Array' = ANY(tags) LIMIT 10;

-- Get problem details
-- SELECT * FROM leetcode_problems WHERE leetcode_id = 1; 