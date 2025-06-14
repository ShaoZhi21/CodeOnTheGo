#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

async function debugQueries() {
  console.log('🔍 Debugging All Questions Screen Issue\n');

  // 1. Check with SERVICE ROLE (admin) - should always work
  console.log('1️⃣ Testing with SERVICE ROLE (admin access):');
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data, error, count } = await serviceClient
      .from('leetcode_problems')
      .select('id, leetcode_id, title, difficulty, tags, is_premium', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.log('❌ Service role query failed:', error.message);
    } else {
      console.log(`✅ Service role sees ${count} total problems`);
      console.log(`   First 5 problems:`, data?.map(p => `${p.leetcode_id}: ${p.title}`));
    }
  } catch (error) {
    console.log('❌ Service role error:', error.message);
  }

  console.log('\n');

  // 2. Check with ANON KEY (same as your app) - might be blocked by RLS
  console.log('2️⃣ Testing with ANON KEY (same as your app):');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error, count } = await anonClient
      .from('leetcode_problems')
      .select('id, leetcode_id, title, difficulty, tags, is_premium', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.log('❌ Anonymous query failed:', error.message);
      console.log('   This is likely why your app shows no data!');
      console.log('   Error details:', error);
    } else {
      console.log(`✅ Anonymous client sees ${count} total problems`);
      console.log(`   First 5 problems:`, data?.map(p => `${p.leetcode_id}: ${p.title}`));
    }
  } catch (error) {
    console.log('❌ Anonymous error:', error.message);
  }

  console.log('\n');

  // 3. Check RLS status
  console.log('3️⃣ Checking RLS status:');
  try {
    const { data: rlsData } = await serviceClient.rpc('get_table_rls_status');
    console.log('RLS status:', rlsData);
  } catch (error) {
    // RLS check function might not exist, that's OK
    console.log('⚠️  Could not check RLS status (function might not exist)');
  }

  // 4. Check if RLS is enabled directly
  try {
    const { data: tables } = await serviceClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'leetcode_problems');
    
    console.log('Table exists:', tables?.length > 0 ? 'Yes' : 'No');
  } catch (error) {
    console.log('Could not verify table existence');
  }

  console.log('\n📋 DIAGNOSIS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('If Service Role works but Anonymous fails:');
  console.log('  → RLS is enabled and blocking anonymous access');
  console.log('  → Solution: Create RLS policy to allow reading leetcode_problems');
  console.log('');
  console.log('If both fail:');
  console.log('  → Table might not exist or have different name');
  console.log('  → Environment variables might be wrong');
  console.log('');
  console.log('If both work:');
  console.log('  → Issue is in the React Native app (check environment variables)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  debugQueries();
} 