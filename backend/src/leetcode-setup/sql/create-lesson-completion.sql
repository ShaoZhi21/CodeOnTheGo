-- Create Lesson Completion Table for tracking quiz completion
CREATE TABLE IF NOT EXISTS user_lesson_completion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    problem_id INTEGER REFERENCES leetcode_problems(leetcode_id) ON DELETE CASCADE,
    quiz_completed BOOLEAN DEFAULT FALSE,
    quiz_score INTEGER DEFAULT 0 CHECK (quiz_score >= 0 AND quiz_score <= 3),
    quiz_attempts INTEGER DEFAULT 0 CHECK (quiz_attempts >= 0),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, problem_id)
);

-- Create indexes for lesson completion
CREATE INDEX IF NOT EXISTS idx_user_lesson_completion_user_id ON user_lesson_completion(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_completion_problem_id ON user_lesson_completion(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_completion_quiz_completed ON user_lesson_completion(quiz_completed);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_lesson_completion_updated_at ON user_lesson_completion;
CREATE TRIGGER update_user_lesson_completion_updated_at
  BEFORE UPDATE ON user_lesson_completion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create Quiz Questions Table for storing generated quiz questions
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id INTEGER REFERENCES leetcode_problems(leetcode_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of 4 options: [{"text": "option1", "correct": false}, ...]
    correct_option INTEGER NOT NULL CHECK (correct_option >= 0 AND correct_option <= 3),
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for quiz questions
CREATE INDEX IF NOT EXISTS idx_quiz_questions_problem_id ON quiz_questions(problem_id);

-- Create trigger to automatically update updated_at for quiz questions
DROP TRIGGER IF EXISTS update_quiz_questions_updated_at ON quiz_questions;
CREATE TRIGGER update_quiz_questions_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create Quiz Attempts Table for tracking individual quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    problem_id INTEGER REFERENCES leetcode_problems(leetcode_id) ON DELETE CASCADE,
    quiz_question_ids UUID[] NOT NULL, -- Array of quiz question IDs for this attempt
    user_answers INTEGER[] NOT NULL, -- Array of user's selected answers (0-3)
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 3),
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for quiz attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_problem_id ON quiz_attempts(problem_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed ON quiz_attempts(completed);

-- Create function to update lesson completion when quiz is completed
CREATE OR REPLACE FUNCTION update_lesson_completion_on_quiz()
RETURNS TRIGGER AS $$
BEGIN
    -- If quiz is completed with score 3/3, update lesson completion
    IF NEW.completed AND NEW.score = 3 THEN
        INSERT INTO user_lesson_completion (user_id, problem_id, quiz_completed, quiz_score, completed_at)
        VALUES (NEW.user_id, NEW.problem_id, TRUE, NEW.score, NOW())
        ON CONFLICT (user_id, problem_id)
        DO UPDATE SET
            quiz_completed = TRUE,
            quiz_score = NEW.score,
            completed_at = NOW(),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update lesson completion when quiz is completed
CREATE TRIGGER update_lesson_completion_on_quiz_complete
  AFTER UPDATE ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_completion_on_quiz(); 