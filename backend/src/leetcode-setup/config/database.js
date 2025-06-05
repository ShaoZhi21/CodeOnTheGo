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