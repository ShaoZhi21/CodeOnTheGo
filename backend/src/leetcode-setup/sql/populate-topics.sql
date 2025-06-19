-- Check if tables exist before proceeding
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'topics') THEN
        RAISE EXCEPTION 'Please run create-tables.sql first to create the necessary tables';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leetcode_problems') THEN
        RAISE EXCEPTION 'Please run create-tables.sql first to create the necessary tables';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'problem_topics') THEN
        RAISE EXCEPTION 'Please run create-tables.sql first to create the necessary tables';
    END IF;
END $$;

-- Function to populate topics with 30 questions each
CREATE OR REPLACE FUNCTION populate_topic_questions()
RETURNS void AS $$
DECLARE
    topic_record RECORD;
    easy_count INTEGER;
    medium_count INTEGER;
    hard_count INTEGER;
    remaining_slots INTEGER;
BEGIN
    -- For each topic
    FOR topic_record IN SELECT id, name FROM topics LOOP
        -- First, try to get 10 easy questions
        WITH easy_questions AS (
            SELECT p.id
            FROM leetcode_problems p
            WHERE p.difficulty = 'Easy'
            AND NOT EXISTS (
                SELECT 1 FROM problem_topics pt 
                WHERE pt.problem_id = p.id
            )
            LIMIT 10
        )
        INSERT INTO problem_topics (problem_id, topic_id)
        SELECT id, topic_record.id
        FROM easy_questions;

        -- Then, try to get 10 medium questions
        WITH medium_questions AS (
            SELECT p.id
            FROM leetcode_problems p
            WHERE p.difficulty = 'Medium'
            AND NOT EXISTS (
                SELECT 1 FROM problem_topics pt 
                WHERE pt.problem_id = p.id
            )
            LIMIT 10
        )
        INSERT INTO problem_topics (problem_id, topic_id)
        SELECT id, topic_record.id
        FROM medium_questions;

        -- Then, try to get 10 hard questions
        WITH hard_questions AS (
            SELECT p.id
            FROM leetcode_problems p
            WHERE p.difficulty = 'Hard'
            AND NOT EXISTS (
                SELECT 1 FROM problem_topics pt 
                WHERE pt.problem_id = p.id
            )
            LIMIT 10
        )
        INSERT INTO problem_topics (problem_id, topic_id)
        SELECT id, topic_record.id
        FROM hard_questions;

        -- Count how many questions we actually got for each difficulty
        SELECT 
            COUNT(*) FILTER (WHERE p.difficulty = 'Easy'),
            COUNT(*) FILTER (WHERE p.difficulty = 'Medium'),
            COUNT(*) FILTER (WHERE p.difficulty = 'Hard')
        INTO easy_count, medium_count, hard_count
        FROM problem_topics pt
        JOIN leetcode_problems p ON pt.problem_id = p.id
        WHERE pt.topic_id = topic_record.id;

        -- Calculate remaining slots needed to reach 30
        remaining_slots := 30 - (easy_count + medium_count + hard_count);

        -- If we need more questions, fill with any available questions
        IF remaining_slots > 0 THEN
            WITH remaining_questions AS (
                SELECT p.id
                FROM leetcode_problems p
                WHERE NOT EXISTS (
                    SELECT 1 FROM problem_topics pt 
                    WHERE pt.problem_id = p.id
                )
                LIMIT remaining_slots
            )
            INSERT INTO problem_topics (problem_id, topic_id)
            SELECT id, topic_record.id
            FROM remaining_questions;
        END IF;

        -- If we have more than 30 questions, remove the excess
        WITH excess_questions AS (
            SELECT pt.problem_id
            FROM problem_topics pt
            JOIN leetcode_problems p ON pt.problem_id = p.id
            WHERE pt.topic_id = topic_record.id
            ORDER BY 
                CASE p.difficulty
                    WHEN 'Easy' THEN 1
                    WHEN 'Medium' THEN 2
                    WHEN 'Hard' THEN 3
                END,
                p.leetcode_id
            OFFSET 30
        )
        DELETE FROM problem_topics pt
        WHERE pt.topic_id = topic_record.id
        AND pt.problem_id IN (SELECT problem_id FROM excess_questions);

    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT populate_topic_questions();

-- Verify the results
SELECT 
    t.name as topic_name,
    t.difficulty_order,
    COUNT(*) as total_problems,
    COUNT(*) FILTER (WHERE p.difficulty = 'Easy') as easy_problems,
    COUNT(*) FILTER (WHERE p.difficulty = 'Medium') as medium_problems,
    COUNT(*) FILTER (WHERE p.difficulty = 'Hard') as hard_problems
FROM topics t
LEFT JOIN problem_topics pt ON t.id = pt.topic_id
LEFT JOIN leetcode_problems p ON pt.problem_id = p.id
GROUP BY t.name, t.difficulty_order
ORDER BY t.difficulty_order; 