#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.log('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupQuizTables() {
  console.log('🚀 Setting up quiz-related database tables...\n');

  try {
    // Read the lesson completion SQL file
    const lessonCompletionPath = join(__dirname, '..', 'backend', 'src', 'leetcode-setup', 'sql', 'create-lesson-completion.sql');
    const lessonCompletionSQL = readFileSync(lessonCompletionPath, 'utf8');

    // Read the view update SQL file
    const viewUpdatePath = join(__dirname, '..', 'backend', 'src', 'leetcode-setup', 'sql', 'update-topic-problems-view.sql');
    const viewUpdateSQL = readFileSync(viewUpdatePath, 'utf8');

    // Split SQL into individual statements
    const lessonStatements = lessonCompletionSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    const viewStatements = viewUpdateSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    const allStatements = [...lessonStatements, ...viewStatements];

    console.log(`📝 Found ${allStatements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < allStatements.length; i++) {
      const statement = allStatements[i];
      
      console.log(`⚡ Executing statement ${i + 1}/${allStatements.length}...`);
      
      const { error } = await supabase.rpc('exec', { 
        sql: statement + ';' 
      });

      if (error) {
        console.log(`⚠️  Statement ${i + 1} warning: ${error.message}`);
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('\n✅ Quiz tables setup completed!');
    console.log('\n📋 Tables and views created/updated:');
    console.log('   • user_lesson_completion - Track quiz completion status');
    console.log('   • quiz_questions - Store generated quiz questions');
    console.log('   • quiz_attempts - Track individual quiz attempts');
    console.log('   • topic_problems (view) - Updated to include description');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Alternative: Run the SQL manually in Supabase SQL Editor');
    console.log('   1. Go to your Supabase Dashboard > SQL Editor');
    console.log('   2. Copy and paste the SQL from: backend/src/leetcode-setup/sql/create-lesson-completion.sql');
    console.log('   3. Copy and paste the SQL from: backend/src/leetcode-setup/sql/update-topic-problems-view.sql');
    process.exit(1);
  }
}

setupQuizTables(); 