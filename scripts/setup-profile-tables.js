#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

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

async function setupProfileTables() {
  console.log('🚀 Setting up user profile tables...\n');

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, '..', 'backend', 'src', 'leetcode-setup', 'sql', 'create-tables.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.includes('user_profiles') || statement.includes('user_problem_progress') || 
          statement.includes('create_user_profile') || statement.includes('update_user_profile_stats')) {
        
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec', { 
          sql: statement + ';' 
        });

        if (error) {
          console.log(`⚠️  Statement ${i + 1} warning: ${error.message}`);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }

    console.log('\n✅ Profile tables setup completed!');
    console.log('\n📋 Tables created:');
    console.log('   • user_profiles - Store user profile data');
    console.log('   • user_problem_progress - Track problem solving progress');
    console.log('   • user_profile_stats (view) - Profile with calculated stats');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Alternative: Run the SQL manually in Supabase SQL Editor');
    console.log('   1. Go to your Supabase Dashboard > SQL Editor');
    console.log('   2. Copy and paste the profile-related SQL from: backend/src/leetcode-setup/sql/create-tables.sql');
    process.exit(1);
  }
}

setupProfileTables(); 