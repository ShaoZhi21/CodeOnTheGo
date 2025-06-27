-- Update the topic_problems view to include description
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
    p.description,
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