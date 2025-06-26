const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createLessonTable() {
  try {
    console.log('📝 Reading SQL file...');
    const sqlPath = './backend/src/leetcode-setup/sql/create-lesson-completion.sql';
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('⚡ Executing SQL...');
    const { error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      return;
    }
    
    console.log('✅ Lesson completion table created successfully!');
    
    // Test the table
    console.log('🧪 Testing table...');
    const { data, error: testError } = await supabase
      .from('user_lesson_completion')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Table test failed:', testError);
    } else {
      console.log('✅ Table test successful!');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

createLessonTable(); 