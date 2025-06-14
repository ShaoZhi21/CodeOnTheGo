-- Fix Infinite Recursion in user_profile_stats View
-- This error occurs when views reference themselves or create circular dependencies

-- =============================================================================
-- STEP 1: Drop the problematic view
-- =============================================================================
DROP VIEW IF EXISTS user_profile_stats;

-- =============================================================================
-- STEP 2: Recreate the view with explicit column references
-- =============================================================================
CREATE OR REPLACE VIEW user_profile_stats AS
SELECT 
  user_profiles.id,
  user_profiles.user_id,
  user_profiles.name,
  user_profiles.level,
  user_profiles.total_xp,
  user_profiles.skill_level,
  user_profiles.total_questions,
  user_profiles.easy_solved,
  user_profiles.medium_solved,
  user_profiles.hard_solved,
  user_profiles.completion_percentage,
  user_profiles.trophy_count,
  user_profiles.current_streak,
  user_profiles.longest_streak,
  user_profiles.hints_used,
  user_profiles.available_hints,
  user_profiles.last_activity_date,
  user_profiles.created_at,
  user_profiles.updated_at,
  -- Calculated fields
  (user_profiles.easy_solved + user_profiles.medium_solved + user_profiles.hard_solved) as total_solved,
  CASE 
    WHEN user_profiles.total_xp < 1000 THEN 'Beginner'
    WHEN user_profiles.total_xp < 5000 THEN 'Intermediate'
    ELSE 'Advanced'
  END as calculated_skill_level
FROM user_profiles;

-- =============================================================================
-- STEP 3: Alternative - Create a simple function instead of view
-- =============================================================================
-- If the view still causes issues, you can use this function approach:

/*
CREATE OR REPLACE FUNCTION get_user_profile_stats(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  name TEXT,
  level INTEGER,
  total_xp INTEGER,
  skill_level TEXT,
  total_questions INTEGER,
  easy_solved INTEGER,
  medium_solved INTEGER,
  hard_solved INTEGER,
  completion_percentage DECIMAL(5,2),
  trophy_count INTEGER,
  current_streak INTEGER,
  longest_streak INTEGER,
  hints_used INTEGER,
  available_hints INTEGER,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  total_solved INTEGER,
  calculated_skill_level TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.name,
    up.level,
    up.total_xp,
    up.skill_level,
    up.total_questions,
    up.easy_solved,
    up.medium_solved,
    up.hard_solved,
    up.completion_percentage,
    up.trophy_count,
    up.current_streak,
    up.longest_streak,
    up.hints_used,
    up.available_hints,
    up.last_activity_date,
    up.created_at,
    up.updated_at,
    (up.easy_solved + up.medium_solved + up.hard_solved) as total_solved,
    CASE 
      WHEN up.total_xp < 1000 THEN 'Beginner'
      WHEN up.total_xp < 5000 THEN 'Intermediate'
      ELSE 'Advanced'
    END as calculated_skill_level
  FROM public.user_profiles up
  WHERE up.user_id = target_user_id;
END;
$$;
*/

-- =============================================================================
-- STEP 4: Check for other potential circular references
-- =============================================================================
-- Run this query to check for any other views that might have issues:
/*
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname LIKE '%user%';
*/

-- =============================================================================
-- STEP 5: Verify the fix
-- =============================================================================
-- Test the view works:
-- SELECT * FROM user_profile_stats LIMIT 1;

-- =============================================================================
-- NOTES:
-- =============================================================================
-- The infinite recursion usually happens when:
-- 1. A view references itself (directly or indirectly)
-- 2. Multiple views reference each other in a cycle
-- 3. A view name conflicts with a table name
-- 4. RLS policies create circular dependencies
--
-- This fix explicitly references the table name to prevent confusion. 