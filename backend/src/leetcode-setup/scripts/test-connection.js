#!/usr/bin/env node

import { testConnection } from '../config/database.js';
import { LeetCodeClient } from '../utils/leetcode-client.js';

// Debug environment variables
console.log('🔍 Checking environment variables...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');

async function testLeetCodeAPI() {
  console.log('🔄 Testing LeetCode API connection...');
  
  try {
    const client = new LeetCodeClient();
    
    // Test basic problems fetch
    console.log('   → Fetching first 5 problems...');
    const problems = await client.getAllProblems({ limit: 5 });
    
    if (problems && problems.length > 0) {
      console.log(`   ✅ Successfully fetched ${problems.length} problems`);
      console.log('   📝 Sample problems:');
      problems.forEach(p => {
        console.log(`      • #${p.questionId}: ${p.title} (${p.difficulty})`);
      });
    } else {
      console.log('   ⚠️  No problems returned');
    }
    
    // Test problem details
    console.log('\n   → Testing problem details fetch...');
    const firstProblem = problems[0];
    if (firstProblem) {
      const details = await client.getProblemDetails(firstProblem.titleSlug);
      console.log(`   ✅ Successfully fetched details for "${firstProblem.title}"`);
      console.log(`   📊 Description length: ${details.content?.length || 0} characters`);
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ LeetCode API test failed:', error.message);
    return false;
  }
}

async function testDatabaseQueries() {
  console.log('🔄 Testing database queries...');
  
  try {
    const { supabase } = await import('../config/database.js');
    
    // Test basic query
    console.log('   → Testing table access...');
    const { data, error, count } = await supabase
      .from('leetcode_problems')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      if (error.message.includes('relation "leetcode_problems" does not exist')) {
        console.log('   ⚠️  Table does not exist yet (run setup first)');
        return false;
      }
      throw error;
    }
    
    console.log(`   ✅ Table accessible with ${count || 0} records`);
    
    // Test insert capability (dry run)
    console.log('   → Testing insert permissions...');
    const testData = {
      leetcode_id: 99999,
      title: 'Test Problem',
      slug: 'test-problem',
      difficulty: 'Easy',
      tags: ['test'],
      is_premium: false
    };
    
    const { error: insertError } = await supabase
      .from('leetcode_problems')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.log(`   ⚠️  Insert test failed: ${insertError.message}`);
    } else {
      console.log('   ✅ Insert permissions working');
      
      // Clean up test record
      await supabase
        .from('leetcode_problems')
        .delete()
        .eq('leetcode_id', 99999);
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Database query test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Running connection tests...\n');
  
  const tests = [
    { name: 'Database Connection', test: testConnection },
    { name: 'Database Queries', test: testDatabaseQueries },
    { name: 'LeetCode API', test: testLeetCodeAPI }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    console.log(`\n🔍 Testing ${name}:`);
    try {
      const success = await test();
      results.push({ name, success });
    } catch (error) {
      console.error(`❌ ${name} test failed:`, error.message);
      results.push({ name, success: false });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  let allPassed = true;
  results.forEach(({ name, success }) => {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
    if (!success) allPassed = false;
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (allPassed) {
    console.log('🎉 All tests passed! Your setup is ready.');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run setup (if you haven\'t already)');
    console.log('   2. Run: npm run populate -- --test (to test with 10 problems)');
    console.log('   3. Run: npm run populate (to populate all problems)');
  } else {
    console.log('⚠️  Some tests failed. Please check your configuration.');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verify your .env file has correct Supabase credentials');
    console.log('   2. Run: npm run setup (to create database tables)');
    console.log('   3. Check your internet connection for LeetCode API');
  }
  
  process.exit(allPassed ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 