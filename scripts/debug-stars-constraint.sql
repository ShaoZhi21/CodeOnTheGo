-- Debug script for stars constraint issue
-- Run this in your Supabase SQL Editor to identify the problem

-- 1. Check if the table exists and has the stars column
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_problem_progress' 
  AND column_name IN ('stars', 'score')
ORDER BY column_name;

-- 2. Check all constraints on the table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'user_problem_progress'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 3. Check specifically for stars constraint
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%stars%' 
   OR check_clause LIKE '%stars%';

-- 4. Test insert with valid values (should work)
-- Uncomment to test:
/*
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
        
        -- Clean up
        DELETE FROM user_problem_progress 
        WHERE user_id = test_user_id AND problem_id = 999;
        
    ELSE
        RAISE NOTICE 'No users found in auth.users table';
    END IF;
END $$;
*/

-- 5. Test insert with invalid values (should fail)
-- Uncomment to test:
/*
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the first user ID from auth.users
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        BEGIN
            -- Test with invalid values
            INSERT INTO user_problem_progress (
                user_id, 
                problem_id, 
                is_solved, 
                score, 
                stars
            ) VALUES (
                test_user_id,
                998, -- test problem ID
                true,
                150, -- invalid score (> 100)
                7    -- invalid stars (> 5)
            );
            
            RAISE NOTICE 'Invalid insert unexpectedly succeeded!';
            
        EXCEPTION 
            WHEN check_violation THEN
                RAISE NOTICE 'Expected constraint violation: %', SQLERRM;
            WHEN OTHERS THEN
                RAISE NOTICE 'Unexpected error: %', SQLERRM;
        END;
    END IF;
END $$;
*/

-- 6. Show current data in the table (if any)
SELECT 
    user_id,
    problem_id,
    score,
    stars,
    is_solved,
    created_at
FROM user_problem_progress 
ORDER BY created_at DESC 
LIMIT 5; 