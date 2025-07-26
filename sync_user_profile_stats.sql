-- Sync user_profile_stats with actual user_problem_progress data
-- This query updates total_questions, easy_solved, medium_solved, hard_solved based on actual progress

UPDATE user_profile_stats 
SET 
  total_questions = (
    SELECT COUNT(DISTINCT upp.problem_id) 
    FROM user_problem_progress upp 
    WHERE upp.user_id = user_profile_stats.user_id 
    AND upp.is_solved = true
  ),
  easy_solved = (
    SELECT COUNT(DISTINCT upp.problem_id) 
    FROM user_problem_progress upp 
    JOIN leetcode_problems lp ON upp.problem_id = lp.leetcode_id 
    WHERE upp.user_id = user_profile_stats.user_id 
    AND upp.is_solved = true 
    AND lp.difficulty = 'Easy'
  ),
  medium_solved = (
    SELECT COUNT(DISTINCT upp.problem_id) 
    FROM user_problem_progress upp 
    JOIN leetcode_problems lp ON upp.problem_id = lp.leetcode_id 
    WHERE upp.user_id = user_profile_stats.user_id 
    AND upp.is_solved = true 
    AND lp.difficulty = 'Medium'
  ),
  hard_solved = (
    SELECT COUNT(DISTINCT upp.problem_id) 
    FROM user_problem_progress upp 
    JOIN leetcode_problems lp ON upp.problem_id = lp.leetcode_id 
    WHERE upp.user_id = user_profile_stats.user_id 
    AND upp.is_solved = true 
    AND lp.difficulty = 'Hard'
  ),
  completion_percentage = ROUND(
    (SELECT COUNT(DISTINCT upp.problem_id) 
     FROM user_problem_progress upp 
     WHERE upp.user_id = user_profile_stats.user_id 
     AND upp.is_solved = true) * 100.0 / 3850, 2
  ),
  updated_at = NOW()
WHERE user_profile_stats.user_id IN (
  SELECT DISTINCT user_id FROM user_problem_progress WHERE is_solved = true
);

-- Alternative: If you want to update ALL users (even those with 0 solved problems)
-- Uncomment the following query instead:

/*
UPDATE user_profile_stats 
SET 
  total_questions = COALESCE((
    SELECT COUNT(DISTINCT upp.problem_id) 
    FROM user_problem_progress upp 
    WHERE upp.user_id = user_profile_stats.user_id 
    AND upp.is_solved = true
  ), 0),
  easy_solved = COALESCE((
    SELECT COUNT(DISTINCT upp.problem_id) 
    FROM user_problem_progress upp 
    JOIN leetcode_problems lp ON upp.problem_id = lp.leetcode_id 
    WHERE upp.user_id = user_profile_stats.user_id 
    AND upp.is_solved = true 
    AND lp.difficulty = 'Easy'
  ), 0),
  medium_solved = COALESCE((
    SELECT COUNT(DISTINCT upp.problem_id) 
    FROM user_problem_progress upp 
    JOIN leetcode_problems lp ON upp.problem_id = lp.leetcode_id 
    WHERE upp.user_id = user_profile_stats.user_id 
    AND upp.is_solved = true 
    AND lp.difficulty = 'Medium'
  ), 0),
  hard_solved = COALESCE((
    SELECT COUNT(DISTINCT upp.problem_id) 
    FROM user_problem_progress upp 
    JOIN leetcode_problems lp ON upp.problem_id = lp.leetcode_id 
    WHERE upp.user_id = user_profile_stats.user_id 
    AND upp.is_solved = true 
    AND lp.difficulty = 'Hard'
  ), 0),
  completion_percentage = ROUND(
    COALESCE((
      SELECT COUNT(DISTINCT upp.problem_id) 
      FROM user_problem_progress upp 
      WHERE upp.user_id = user_profile_stats.user_id 
      AND upp.is_solved = true
    ), 0) * 100.0 / 3850, 2
  ),
  updated_at = NOW();
*/

-- Verification query to check the results
SELECT 
  ups.user_id,
  ups.total_questions,
  ups.easy_solved,
  ups.medium_solved,
  ups.hard_solved,
  ups.completion_percentage,
  (ups.easy_solved + ups.medium_solved + ups.hard_solved) as calculated_total,
  ROUND((ups.total_questions * 100.0 / 3850), 2) as calculated_percentage,
  CASE 
    WHEN ups.total_questions = (ups.easy_solved + ups.medium_solved + ups.hard_solved) 
    THEN '✅ SYNCED' 
    ELSE '❌ OUT OF SYNC' 
  END as sync_status
FROM user_profile_stats ups
ORDER BY ups.user_id; 