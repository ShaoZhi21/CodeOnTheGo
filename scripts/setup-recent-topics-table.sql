-- Create user_recent_topics table to store the 3 most recent topics for each user
CREATE TABLE IF NOT EXISTS user_recent_topics (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_name VARCHAR(255) NOT NULL,
    last_visited TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    visit_order INTEGER NOT NULL, -- 1 = most recent, 2 = second most recent, 3 = third most recent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to ensure one record per user-topic combination
ALTER TABLE user_recent_topics ADD CONSTRAINT unique_user_topic UNIQUE (user_id, topic_name);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_recent_topics_user_id ON user_recent_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recent_topics_visit_order ON user_recent_topics(user_id, visit_order);

-- Enable Row Level Security
ALTER TABLE user_recent_topics ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own recent topics
CREATE POLICY "Users can view their own recent topics" ON user_recent_topics
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own recent topics
CREATE POLICY "Users can insert their own recent topics" ON user_recent_topics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own recent topics
CREATE POLICY "Users can update their own recent topics" ON user_recent_topics
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own recent topics
CREATE POLICY "Users can delete their own recent topics" ON user_recent_topics
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update recent topics
CREATE OR REPLACE FUNCTION update_user_recent_topics(p_user_id UUID, p_topic_name VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    -- First, update the visit_order for existing topics (shift them down)
    UPDATE user_recent_topics 
    SET visit_order = visit_order + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id AND visit_order < 3;
    
    -- Insert or update the new topic as most recent
    INSERT INTO user_recent_topics (user_id, topic_name, visit_order, last_visited)
    VALUES (p_user_id, p_topic_name, 1, NOW())
    ON CONFLICT (user_id, topic_name) 
    DO UPDATE SET 
        visit_order = 1,
        last_visited = NOW(),
        updated_at = NOW();
    
    -- Remove topics beyond the 3 most recent
    DELETE FROM user_recent_topics 
    WHERE user_id = p_user_id AND visit_order > 3;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's recent topics
CREATE OR REPLACE FUNCTION get_user_recent_topics(p_user_id UUID)
RETURNS TABLE(topic_name VARCHAR(255), last_visited TIMESTAMP WITH TIME ZONE, visit_order INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT urt.topic_name, urt.last_visited, urt.visit_order
    FROM user_recent_topics urt
    WHERE urt.user_id = p_user_id
    ORDER BY urt.visit_order ASC;
END;
$$ LANGUAGE plpgsql; 