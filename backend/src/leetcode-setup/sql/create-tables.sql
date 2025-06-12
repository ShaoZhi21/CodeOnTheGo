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

-- Create User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER DEFAULT 1 CHECK (level >= 1),
  total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
  skill_level TEXT DEFAULT 'Beginner' CHECK (skill_level IN ('Beginner', 'Intermediate', 'Professional')),
  total_questions INTEGER DEFAULT 0 CHECK (total_questions >= 0),
  easy_solved INTEGER DEFAULT 0 CHECK (easy_solved >= 0),
  medium_solved INTEGER DEFAULT 0 CHECK (medium_solved >= 0),
  hard_solved INTEGER DEFAULT 0 CHECK (hard_solved >= 0),
  completion_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  trophy_count INTEGER DEFAULT 0 CHECK (trophy_count >= 0),
  current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
  hints_used INTEGER DEFAULT 0 CHECK (hints_used >= 0),
  last_activity_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON user_profiles(level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_skill_level ON user_profiles(skill_level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_xp ON user_profiles(total_xp);

-- Create trigger to automatically update updated_at for user profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create User Problem Progress Table (tracks which problems user has solved)
CREATE TABLE IF NOT EXISTS user_problem_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES leetcode_problems(leetcode_id) ON DELETE CASCADE,
  is_solved BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
  hints_used INTEGER DEFAULT 0 CHECK (hints_used >= 0),
  time_spent_minutes INTEGER DEFAULT 0 CHECK (time_spent_minutes >= 0),
  first_solved_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, problem_id)
);

-- Create indexes for user problem progress
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_user_id ON user_problem_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_problem_id ON user_problem_progress(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_is_solved ON user_problem_progress(is_solved);

-- Create trigger for user problem progress
DROP TRIGGER IF EXISTS update_user_problem_progress_updated_at ON user_problem_progress;
CREATE TRIGGER update_user_problem_progress_updated_at
  BEFORE UPDATE ON user_problem_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update user profile stats when problem progress changes
CREATE OR REPLACE FUNCTION update_user_profile_stats()
RETURNS TRIGGER AS $$
DECLARE
  easy_count INTEGER;
  medium_count INTEGER;
  hard_count INTEGER;
  total_count INTEGER;
  total_problems_in_db INTEGER;
  completion_pct DECIMAL(5,2);
  total_hints INTEGER;
BEGIN
  -- Get counts of solved problems by difficulty
  SELECT 
    COUNT(*) FILTER (WHERE lp.difficulty = 'Easy' AND upp.is_solved = TRUE),
    COUNT(*) FILTER (WHERE lp.difficulty = 'Medium' AND upp.is_solved = TRUE),
    COUNT(*) FILTER (WHERE lp.difficulty = 'Hard' AND upp.is_solved = TRUE),
    COUNT(*) FILTER (WHERE upp.is_solved = TRUE),
    SUM(upp.hints_used)
  INTO easy_count, medium_count, hard_count, total_count, total_hints
  FROM user_problem_progress upp
  JOIN leetcode_problems lp ON upp.problem_id = lp.leetcode_id
  WHERE upp.user_id = COALESCE(NEW.user_id, OLD.user_id);

  -- Get total problems in database for completion percentage
  SELECT COUNT(*) INTO total_problems_in_db FROM leetcode_problems;
  
  -- Calculate completion percentage
  IF total_problems_in_db > 0 THEN
    completion_pct := (total_count::DECIMAL / total_problems_in_db::DECIMAL) * 100;
  ELSE
    completion_pct := 0;
  END IF;

  -- Update user profile
  UPDATE user_profiles 
  SET 
    easy_solved = COALESCE(easy_count, 0),
    medium_solved = COALESCE(medium_count, 0),
    hard_solved = COALESCE(hard_count, 0),
    total_questions = COALESCE(total_count, 0),
    completion_percentage = COALESCE(completion_pct, 0),
    hints_used = COALESCE(total_hints, 0),
    updated_at = NOW()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger to update profile stats when problem progress changes
DROP TRIGGER IF EXISTS update_profile_stats_on_progress_change ON user_problem_progress;
CREATE TRIGGER update_profile_stats_on_progress_change
  AFTER INSERT OR UPDATE OR DELETE ON user_problem_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_stats();

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

-- Create a view for user profile with calculated stats
CREATE OR REPLACE VIEW user_profile_stats AS
SELECT 
  up.*,
  (up.easy_solved + up.medium_solved + up.hard_solved) as total_solved,
  CASE 
    WHEN up.total_xp < 1000 THEN 'Beginner'
    WHEN up.total_xp < 5000 THEN 'Intermediate'
    ELSE 'Advanced'
  END as calculated_skill_level
FROM user_profiles up;

-- Function to create default profile for new users
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically create profile for new users
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Sample queries to test the setup:

-- Get all problems with basic info
-- SELECT leetcode_id, title, difficulty FROM leetcode_problems ORDER BY leetcode_id;

-- Get problems by difficulty
-- SELECT * FROM problems_by_difficulty;

-- Search problems by tag
-- SELECT title, difficulty, tags FROM leetcode_problems WHERE 'Array' = ANY(tags) LIMIT 10;

-- Get problem details
-- SELECT * FROM leetcode_problems WHERE leetcode_id = 1;

-- Get user profile with stats
-- SELECT * FROM user_profile_stats WHERE user_id = 'your-user-id';

-- Get user's solved problems
-- SELECT lp.title, lp.difficulty, upp.first_solved_at 
-- FROM user_problem_progress upp 
-- JOIN leetcode_problems lp ON upp.problem_id = lp.leetcode_id 
-- WHERE upp.user_id = 'your-user-id' AND upp.is_solved = TRUE; 