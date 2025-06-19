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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_leetcode_problems_updated_at ON leetcode_problems;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row updates
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
  available_hints INTEGER DEFAULT 5 CHECK (available_hints >= 0),
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Create trigger to automatically update updated_at for user profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create User Problem Progress Table
CREATE TABLE IF NOT EXISTS user_problem_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES leetcode_problems(leetcode_id) ON DELETE CASCADE,
  is_solved BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
  hints_used INTEGER DEFAULT 0 CHECK (hints_used >= 0),
  time_spent_minutes INTEGER DEFAULT 0 CHECK (time_spent_minutes >= 0),
  stars INTEGER DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
  best_score INTEGER DEFAULT 0 CHECK (best_score >= 0),
  first_solved_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, problem_id)
);

-- Create User Solutions Table
CREATE TABLE IF NOT EXISTS user_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES leetcode_problems(leetcode_id) ON DELETE CASCADE,
  solution_code TEXT NOT NULL,
  language TEXT NOT NULL,
  runtime_ms INTEGER,
  memory_mb INTEGER,
  score INTEGER,
  is_best BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user solutions
CREATE INDEX IF NOT EXISTS idx_user_solutions_user_id ON user_solutions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_solutions_problem_id ON user_solutions(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_solutions_is_best ON user_solutions(is_best);

-- Create trigger for user solutions
CREATE TRIGGER update_user_solutions_updated_at
  BEFORE UPDATE ON user_solutions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update best solution
CREATE OR REPLACE FUNCTION update_best_solution()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is marked as best, unmark all other solutions for this problem
  IF NEW.is_best THEN
    UPDATE user_solutions
    SET is_best = FALSE
    WHERE user_id = NEW.user_id
    AND problem_id = NEW.problem_id
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to maintain best solution
CREATE TRIGGER maintain_best_solution
  BEFORE INSERT OR UPDATE ON user_solutions
  FOR EACH ROW
  EXECUTE FUNCTION update_best_solution();

-- Create function to update problem progress
CREATE OR REPLACE FUNCTION update_problem_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the best score in user_problem_progress
  UPDATE user_problem_progress
  SET 
    best_score = GREATEST(best_score, NEW.score),
    stars = CASE
      WHEN NEW.score >= 90 THEN 3
      WHEN NEW.score >= 70 THEN 2
      WHEN NEW.score >= 50 THEN 1
      ELSE stars
    END,
    is_solved = CASE
      WHEN NEW.score >= 50 THEN TRUE
      ELSE is_solved
    END,
    last_attempt_at = NOW()
  WHERE user_id = NEW.user_id
  AND problem_id = NEW.problem_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update progress when new solution is added
CREATE TRIGGER update_progress_on_solution
  AFTER INSERT OR UPDATE ON user_solutions
  FOR EACH ROW
  EXECUTE FUNCTION update_problem_progress();

-- Create Topics Table
CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    difficulty_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Problem Topics Junction Table
CREATE TABLE IF NOT EXISTS problem_topics (
    problem_id INTEGER REFERENCES leetcode_problems(id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, topic_id)
);

-- Insert initial topics
INSERT INTO topics (name, description, difficulty_order) VALUES
    ('Array', 'Problems involving array manipulation and algorithms', 1),
    ('String', 'String manipulation and pattern matching problems', 2),
    ('Linked List', 'Problems involving linked list data structure', 3),
    ('Tree', 'Binary tree and tree traversal problems', 4),
    ('Dynamic Programming', 'Problems solved using dynamic programming techniques', 5),
    ('Graph', 'Graph theory and traversal problems', 6),
    ('Hash Table', 'Problems involving hash tables and maps', 7),
    ('Two Pointers', 'Problems solved using two pointer technique', 8),
    ('Binary Search', 'Problems involving binary search algorithm', 9),
    ('Stack', 'Stack-based problems', 10),
    ('Queue', 'Queue-based problems', 11),
    ('Heap', 'Heap and priority queue problems', 12)
ON CONFLICT (name) DO NOTHING;

-- Create view for topic problems
CREATE OR REPLACE VIEW topic_problems AS
SELECT 
    t.id as topic_id,
    t.name as topic_name,
    p.leetcode_id,
    p.title,
    p.difficulty,
    p.tags,
    p.acceptance_rate,
    p.is_premium,
    CASE 
        WHEN p.difficulty = 'Easy' THEN 1
        WHEN p.difficulty = 'Medium' THEN 2
        WHEN p.difficulty = 'Hard' THEN 3
        ELSE 4
    END as difficulty_order
FROM topics t
JOIN problem_topics pt ON t.id = pt.topic_id
JOIN leetcode_problems p ON pt.problem_id = p.id
ORDER BY t.difficulty_order, difficulty_order;

-- Create view for topic stats with stars
CREATE OR REPLACE VIEW topic_stats AS
SELECT 
    t.name as topic_name,
    COUNT(*) as total_problems,
    COUNT(*) FILTER (WHERE p.difficulty = 'Easy') as easy_problems,
    COUNT(*) FILTER (WHERE p.difficulty = 'Medium') as medium_problems,
    COUNT(*) FILTER (WHERE p.difficulty = 'Hard') as hard_problems,
    AVG(p.acceptance_rate) as avg_acceptance_rate,
    COALESCE(SUM(upp.stars), 0) as total_stars,
    COALESCE(AVG(upp.best_score), 0) as avg_best_score,
    ROUND(
        (COUNT(*) FILTER (WHERE upp.is_solved = true)::float / 
        NULLIF(COUNT(*), 0) * 100)::numeric, 
        1
    ) as completion_percentage
FROM topics t
JOIN problem_topics pt ON t.id = pt.topic_id
JOIN leetcode_problems p ON pt.problem_id = p.id
LEFT JOIN user_problem_progress upp ON p.leetcode_id = upp.problem_id
GROUP BY t.name;

-- Create user topic navigation history table
CREATE TABLE IF NOT EXISTS user_topic_navigation (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_name VARCHAR(50) NOT NULL,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient querying of recent navigation
CREATE INDEX IF NOT EXISTS idx_user_topic_navigation_user_visited 
ON user_topic_navigation(user_id, visited_at DESC);

-- Create function to update topic navigation history
CREATE OR REPLACE FUNCTION update_topic_navigation()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new navigation record
    INSERT INTO user_topic_navigation (user_id, topic_name, visited_at)
    VALUES (NEW.user_id, NEW.topic_name, NOW());
    
    -- Keep only the last 10 navigation records per user to prevent table bloat
    DELETE FROM user_topic_navigation 
    WHERE user_id = NEW.user_id 
    AND id NOT IN (
        SELECT id FROM user_topic_navigation 
        WHERE user_id = NEW.user_id 
        ORDER BY visited_at DESC 
        LIMIT 10
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update navigation history
CREATE TRIGGER update_topic_navigation_trigger
    AFTER INSERT ON user_topic_navigation
    FOR EACH ROW
    EXECUTE FUNCTION update_topic_navigation(); 