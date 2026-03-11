-- Add best_score and stars columns to user_problem_progress
ALTER TABLE user_problem_progress 
ADD COLUMN IF NOT EXISTS best_score INTEGER DEFAULT 0 CHECK (best_score >= 0),
ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0 CHECK (stars >= 0 AND stars <= 3);

-- Create User Solutions Table if it doesn't exist
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

-- Create indexes for user solutions if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_solutions_user_id ON user_solutions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_solutions_problem_id ON user_solutions(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_solutions_is_best ON user_solutions(is_best);

-- Create or replace function to update best solution
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

-- Create or replace trigger to maintain best solution
DROP TRIGGER IF EXISTS maintain_best_solution ON user_solutions;
CREATE TRIGGER maintain_best_solution
  BEFORE INSERT OR UPDATE ON user_solutions
  FOR EACH ROW
  EXECUTE FUNCTION update_best_solution();

-- Create or replace function to update problem progress
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

-- Create or replace trigger to update progress when new solution is added
DROP TRIGGER IF EXISTS update_progress_on_solution ON user_solutions;
CREATE TRIGGER update_progress_on_solution
  AFTER INSERT OR UPDATE ON user_solutions
  FOR EACH ROW
  EXECUTE FUNCTION update_problem_progress();

-- Update topic_stats view to include best scores
CREATE OR REPLACE VIEW topic_stats AS
WITH topic_problem_counts AS (
  SELECT
    t.name AS topic_name,
    COUNT(DISTINCT p.leetcode_id) AS total_problems
  FROM topics t
  JOIN topic_problems tp ON t.name = tp.topic_name
  JOIN leetcode_problems p ON tp.leetcode_id = p.leetcode_id
  GROUP BY t.name
),
user_progress AS (
  SELECT
    tp.topic_name,
    auth.uid() AS user_id,
    COUNT(
      DISTINCT CASE
        WHEN upp.is_solved = true AND ulc.quiz_completed = true THEN upp.problem_id
      END
    ) AS completed_problems,
    COALESCE(
      SUM(
        CASE
          WHEN upp.is_solved = true AND ulc.quiz_completed = true THEN upp.stars
          ELSE 0
        END
      ),
      0
    ) AS total_stars
  FROM topic_problems tp
  LEFT JOIN user_problem_progress upp
    ON upp.problem_id = tp.leetcode_id
   AND upp.user_id = auth.uid()
  LEFT JOIN user_lesson_completion ulc
    ON ulc.problem_id = tp.leetcode_id
   AND ulc.user_id = auth.uid()
  GROUP BY tp.topic_name, auth.uid()
)
SELECT
  tpc.topic_name,
  up.user_id,
  tpc.total_problems,
  COALESCE(up.total_stars, 0) AS total_stars,
  CASE
    WHEN tpc.total_problems > 0 THEN
      ROUND((COALESCE(up.completed_problems, 0)::float / tpc.total_problems * 100)::numeric, 2)
    ELSE 0
  END AS completion_percentage,
  COALESCE(up.completed_problems, 0) AS completed_problems
FROM topic_problem_counts tpc
LEFT JOIN user_progress up ON tpc.topic_name = up.topic_name;