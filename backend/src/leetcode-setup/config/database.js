import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase client with service role key for admin operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const databaseSchema = `
-- Create the leetcode_problems table
CREATE TABLE IF NOT EXISTS leetcode_problems (
  id SERIAL PRIMARY KEY,
  leetcode_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  description TEXT,
  description_text TEXT,
  examples JSONB DEFAULT '[]'::jsonb,
  constraints TEXT[] DEFAULT ARRAY[]::TEXT[],
  hints TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  acceptance_rate DECIMAL(5,2) DEFAULT 0,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leetcode_problems_difficulty ON leetcode_problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_leetcode_problems_tags ON leetcode_problems USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_leetcode_problems_leetcode_id ON leetcode_problems(leetcode_id);
CREATE INDEX IF NOT EXISTS idx_leetcode_problems_is_premium ON leetcode_problems(is_premium);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_leetcode_problems_updated_at ON leetcode_problems;
CREATE TRIGGER update_leetcode_problems_updated_at
  BEFORE UPDATE ON leetcode_problems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER DEFAULT 1 CHECK (level >= 1),
  total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
  skill_level TEXT DEFAULT 'Beginner' CHECK (skill_level IN ('Beginner', 'Intermediate', 'Professional')),
  total_questions INTEGER DEFAULT 0 CHECK (total_questions >= 0),
  easy_solved INTEGER DEFAULT 0 CHECK (easy_solved >= 0),
  medium_solved INTEGER DEFAULT 0 CHECK (medium_solved >= 0),
  hard_solved INTEGER DEFAULT 0 CHECK (hard_solved >= 0),
  completion_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  trophy_count INTEGER DEFAULT 0 CHECK (trophy_count >= 0),
  current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
  hints_used INTEGER DEFAULT 0 CHECK (hints_used >= 0),
  last_activity_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON user_profiles(level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_skill_level ON user_profiles(skill_level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_xp ON user_profiles(total_xp);

-- Create trigger to automatically update updated_at for user profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create User Problem Progress Table
CREATE TABLE IF NOT EXISTS user_problem_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES leetcode_problems(leetcode_id) ON DELETE CASCADE,
  is_solved BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
  hints_used INTEGER DEFAULT 0 CHECK (hints_used >= 0),
  time_spent_minutes INTEGER DEFAULT 0 CHECK (time_spent_minutes >= 0),
  first_solved_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, problem_id)
);

-- Create indexes for user problem progress
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_user_id ON user_problem_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_problem_id ON user_problem_progress(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_is_solved ON user_problem_progress(is_solved);

-- Create trigger for user problem progress
DROP TRIGGER IF EXISTS update_user_problem_progress_updated_at ON user_problem_progress;
CREATE TRIGGER update_user_problem_progress_updated_at
  BEFORE UPDATE ON user_problem_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easy querying (optional)
CREATE OR REPLACE VIEW problems_summary AS
SELECT 
  id,
  leetcode_id,
  title,
  difficulty,
  array_length(tags, 1) as tag_count,
  acceptance_rate,
  likes,
  is_premium,
  created_at
FROM leetcode_problems
ORDER BY leetcode_id;

-- Create a view for user profile with calculated stats
CREATE OR REPLACE VIEW user_profile_stats AS
SELECT 
  up.*,
  (up.easy_solved + up.medium_solved + up.hard_solved) as total_solved,
  CASE 
    WHEN up.total_xp < 1000 THEN 'Beginner'
    WHEN up.total_xp < 5000 THEN 'Intermediate'
    ELSE 'Advanced'
  END as calculated_skill_level
FROM user_profiles up;
`;

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    // Try a simple query first
    const { data, error } = await supabase
      .from('leetcode_problems')
      .select('id')
      .limit(1);
    
    if (error) {
      // If table doesn't exist, that's expected before setup
      if (error.message.includes('relation "leetcode_problems" does not exist')) {
        console.log('✅ Database connection successful (table not created yet)');
        return true;
      }
      throw error;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Setup database schema
 */
export async function setupDatabase() {
  try {
    console.log('🔄 Setting up database schema...');
    
    // Execute each SQL statement individually for better compatibility
    const statements = [
      `CREATE TABLE IF NOT EXISTS leetcode_problems (
        id SERIAL PRIMARY KEY,
        leetcode_id INTEGER UNIQUE NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
        description TEXT,
        description_text TEXT,
        examples JSONB DEFAULT '[]'::jsonb,
        constraints TEXT[] DEFAULT ARRAY[]::TEXT[],
        hints TEXT[] DEFAULT ARRAY[]::TEXT[],
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        acceptance_rate DECIMAL(5,2) DEFAULT 0,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        is_premium BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_leetcode_problems_difficulty ON leetcode_problems(difficulty)`,
      `CREATE INDEX IF NOT EXISTS idx_leetcode_problems_tags ON leetcode_problems USING GIN(tags)`,
      `CREATE INDEX IF NOT EXISTS idx_leetcode_problems_leetcode_id ON leetcode_problems(leetcode_id)`,
      `CREATE INDEX IF NOT EXISTS idx_leetcode_problems_is_premium ON leetcode_problems(is_premium)`,
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
       END;
       $$ language 'plpgsql'`,
      `DROP TRIGGER IF EXISTS update_leetcode_problems_updated_at ON leetcode_problems`,
      `CREATE TRIGGER update_leetcode_problems_updated_at
         BEFORE UPDATE ON leetcode_problems
         FOR EACH ROW
         EXECUTE FUNCTION update_updated_at_column()`
    ];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   → Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec', { sql: statement });
      
      if (error) {
        console.warn(`   ⚠️  Statement ${i + 1} warning:`, error.message);
        // Continue with other statements even if one fails
      } else {
        console.log(`   ✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('✅ Database schema setup completed');
    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n💡 Alternative: Run the SQL manually in Supabase SQL Editor');
    console.log('   File: backend/src/leetcode-setup/sql/create-tables.sql');
    return false;
  }
} 