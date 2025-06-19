-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS update_topic_navigation_trigger ON user_topic_navigation;
DROP FUNCTION IF EXISTS update_topic_navigation();

-- Create a simpler function without the recursive insert
CREATE OR REPLACE FUNCTION cleanup_old_navigation()
RETURNS TRIGGER AS $$
BEGIN
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

-- Create trigger to clean up old records after insert
CREATE TRIGGER cleanup_old_navigation_trigger
    AFTER INSERT ON user_topic_navigation
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_old_navigation(); 