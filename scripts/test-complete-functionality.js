#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');

// Load environment variables
config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.log('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompleteFunction() {
  console.log('🧪 Testing complete functionality...\n');

  try {
    // 1. Check table structure
    console.log('1️⃣ Checking table structure...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('exec', { 
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'user_problem_progress' 
          ORDER BY ordinal_position;
        `
      });

    if (columnsError) {
      console.log('⚠️  Could not check table structure:', columnsError.message);
    } else {
      console.log('✅ Table structure:');
      console.table(columns);
    }

    // 2. Check constraints
    console.log('\n2️⃣ Checking constraints...');
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('exec', { 
        sql: `
          SELECT constraint_name, check_clause
          FROM information_schema.check_constraints 
          WHERE constraint_name LIKE '%user_problem_progress%';
        `
      });

    if (constraintsError) {
      console.log('⚠️  Could not check constraints:', constraintsError.message);
    } else {
      console.log('✅ Constraints:');
      console.table(constraints);
    }

    // 3. Test valid insert
    console.log('\n3️⃣ Testing valid insert...');
    
    // First, get a test user (create one if needed)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    let testUserId;
    if (usersError || !users || users.length === 0) {
      console.log('No users found, creating test user...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'test@example.com',
        password: 'test123456',
        email_confirm: true
      });
      
      if (createError) {
        console.error('❌ Could not create test user:', createError.message);
        return;
      }
      
      testUserId = newUser.user.id;
      console.log('✅ Created test user:', testUserId);
    } else {
      testUserId = users[0].id;
      console.log('✅ Using existing user:', testUserId);
    }

    // Test with valid values
    const testData = {
      user_id: testUserId,
      problem_id: 1,
      is_solved: true,
      score: 85,
      stars: 4,
      attempts: 1,
      hints_used: 0,
      time_spent_minutes: 15,
      first_solved_at: new Date().toISOString(),
      last_attempt_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    console.log('Inserting test data:', testData);

    const { data: insertResult, error: insertError } = await supabase
      .from('user_problem_progress')
      .upsert(testData, {
        onConflict: 'user_id,problem_id',
        ignoreDuplicates: false
      })
      .select();

    if (insertError) {
      console.error('❌ Insert failed:', insertError.message);
      console.log('Full error:', insertError);
    } else {
      console.log('✅ Insert successful:', insertResult);
    }

    // 4. Test with invalid values (should fail)
    console.log('\n4️⃣ Testing invalid values (should fail)...');
    
    const invalidTestData = {
      user_id: testUserId,
      problem_id: 2,
      is_solved: true,
      score: 150, // Invalid: > 100
      stars: 7,   // Invalid: > 5
      attempts: 1
    };

    console.log('Inserting invalid test data:', invalidTestData);

    const { data: invalidResult, error: invalidError } = await supabase
      .from('user_problem_progress')
      .upsert(invalidTestData, {
        onConflict: 'user_id,problem_id',
        ignoreDuplicates: false
      })
      .select();

    if (invalidError) {
      console.log('✅ Expected failure for invalid data:', invalidError.message);
    } else {
      console.log('⚠️  Unexpected success with invalid data:', invalidResult);
    }

    // 5. Clean up test data
    console.log('\n5️⃣ Cleaning up test data...');
    
    const { error: deleteError } = await supabase
      .from('user_problem_progress')
      .delete()
      .eq('user_id', testUserId);

    if (deleteError) {
      console.log('⚠️  Could not clean up test data:', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteFunction(); 