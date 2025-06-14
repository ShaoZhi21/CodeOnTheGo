-- Enable Row Level Security (RLS) for User-Specific Tables
-- Run this in your Supabase SQL Editor

-- =============================================================================
-- USER PROFILES TABLE
-- =============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- USER PROBLEM PROGRESS TABLE
-- =============================================================================
ALTER TABLE user_problem_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own progress
CREATE POLICY "Users can view own progress" ON user_problem_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can modify their own progress
CREATE POLICY "Users can modify own progress" ON user_problem_progress
    FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- USER SOLUTION HISTORY TABLE (if it exists)
-- =============================================================================
-- Enable this section if you have a user_solution_history table
/*
ALTER TABLE user_solution_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own solutions" ON user_solution_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can modify own solutions" ON user_solution_history
    FOR ALL USING (auth.uid() = user_id);
*/

-- =============================================================================
-- USER MISTAKE PATTERNS TABLE (if it exists)
-- =============================================================================
-- Enable this section if you have a user_mistake_patterns table
/*
ALTER TABLE user_mistake_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mistakes" ON user_mistake_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can modify own mistakes" ON user_mistake_patterns
    FOR ALL USING (auth.uid() = user_id);
*/

-- =============================================================================
-- OPTIONAL: Admin Access Policies
-- =============================================================================
-- If you want to give certain users admin access to all data:

/*
-- Example: Create an admin role
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );
*/

-- =============================================================================
-- NOTES:
-- =============================================================================
-- 1. leetcode_problems table does NOT need RLS (public data)
-- 2. Views inherit RLS from their base tables
-- 3. Service role key always bypasses RLS (your populate scripts work)
-- 4. You can disable RLS anytime with: ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;
-- 5. You can drop policies with: DROP POLICY "policy_name" ON tablename;

-- =============================================================================
-- TEST QUERIES (run these to verify RLS is working)
-- =============================================================================
-- These should only return data for the authenticated user:
-- SELECT * FROM user_profiles;
-- SELECT * FROM user_problem_progress;

-- This should return all problems (no RLS):
-- SELECT * FROM leetcode_problems LIMIT 5;