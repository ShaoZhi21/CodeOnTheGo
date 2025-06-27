-- Fix constraints for user_problem_progress table
-- Run this in your Supabase SQL Editor

-- 1. First, let's see the current table structure
SELECT 
    column_name,
    data_type,
    ordinal_position,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_problem_progress' 
ORDER BY ordinal_position;

-- 2. Drop existing constraints if they exist
ALTER TABLE user_problem_progress 
DROP CONSTRAINT IF EXISTS user_problem_progress_score_check;

ALTER TABLE user_problem_progress 
DROP CONSTRAINT IF EXISTS user_problem_progress_stars_check;

-- 3. Recreate constraints with correct syntax
ALTER TABLE user_problem_progress 
ADD CONSTRAINT user_problem_progress_score_check 
CHECK (score >= 0 AND score <= 100);

ALTER TABLE user_problem_progress 
ADD CONSTRAINT user_problem_progress_stars_check 
CHECK (stars >= 0 AND stars <= 5);

-- 4. Verify constraints were created
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%user_problem_progress%'
ORDER BY constraint_name;

-- 5. Test with valid values
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the first user ID from auth.users
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test with valid values
        INSERT INTO user_problem_progress (
            user_id, 
            problem_id, 
            is_solved, 
            score, 
            stars,
            attempts,
            hints_used,
            time_spent_minutes
        ) VALUES (
            test_user_id,
            999, -- test problem ID
            true,
            75,  -- valid score (0-100)
            4,   -- valid stars (0-5)
            1,
            0,
            10
        )
        ON CONFLICT (user_id, problem_id) 
        DO UPDATE SET
            score = EXCLUDED.score,
            stars = EXCLUDED.stars,
            updated_at = NOW();
            
        RAISE NOTICE 'Valid insert successful for user_id: %', test_user_id;
        
        -- Clean up test data
        DELETE FROM user_problem_progress 
        WHERE user_id = test_user_id AND problem_id = 999;
        
        RAISE NOTICE 'Test data cleaned up';
        
    ELSE
        RAISE NOTICE 'No users found in auth.users table';
    END IF;
END $$; 