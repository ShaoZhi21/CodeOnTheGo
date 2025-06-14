-- Fix RLS for leetcode_problems table
-- This allows everyone to read LeetCode problems (public data)

-- =============================================================================
-- SOLUTION 1: Enable RLS but allow public read access
-- =============================================================================

-- Make sure RLS is enabled
ALTER TABLE leetcode_problems ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read problems
CREATE POLICY "Anyone can view leetcode problems" ON leetcode_problems
    FOR SELECT USING (true);

-- =============================================================================
-- ALTERNATIVE SOLUTION 2: Disable RLS entirely (if you prefer)
-- =============================================================================
-- If you don't want RLS on this table at all:
-- ALTER TABLE leetcode_problems DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
-- After running this, test the anonymous access:
-- Run this in your terminal: node scripts/debug-query.js

-- =============================================================================
-- EXPLANATION
-- =============================================================================
-- leetcode_problems contains public data (LeetCode problems) that everyone
-- should be able to read. Unlike user_profiles which needs RLS protection,
-- this table should be publicly accessible.
-- 
-- The policy "USING (true)" means "allow access for all rows, always" 