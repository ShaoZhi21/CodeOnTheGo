-- Create user_daily_challenges table
CREATE TABLE IF NOT EXISTS user_daily_challenges (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,
    problem_id INTEGER NOT NULL,
    problem_title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one challenge per user per day
    UNIQUE(user_id, challenge_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_daily_challenges_user_date 
ON user_daily_challenges(user_id, challenge_date);

-- Enable RLS (Row Level Security)
ALTER TABLE user_daily_challenges ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only access their own challenges
CREATE POLICY "Users can only access their own daily challenges" ON user_daily_challenges
    FOR ALL USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_daily_challenges_updated_at
    BEFORE UPDATE ON user_daily_challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 