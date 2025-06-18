#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');

// Load environment variables
config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mock the service function to test best_score logic
async function testBestScoreLogic() {
  console.log('🧪 Testing best_score functionality...\n');

  try {
    // Get a test user
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found');
      return;
    }

    const testUserId = users[0].id;
    const testProblemId = 123; // Use a unique problem ID for testing

    console.log('✅ Using test user:', testUserId);
    console.log('✅ Using test problem ID:', testProblemId);

    // Clean up any existing test data first
    await supabase
      .from('user_problem_progress')
      .delete()
      .eq('user_id', testUserId)
      .eq('problem_id', testProblemId);

    console.log('\n📝 Test Scenario: Multiple completions with different scores');

    // Test 1: First completion with score 70
    console.log('\n1️⃣ First completion (score: 70)...');
    await testMarkComplete(testUserId, testProblemId, 70, 3);

    // Test 2: Second completion with higher score 85
    console.log('\n2️⃣ Second completion (score: 85 - should update best_score)...');
    await testMarkComplete(testUserId, testProblemId, 85, 4);

    // Test 3: Third completion with lower score 60
    console.log('\n3️⃣ Third completion (score: 60 - should NOT update best_score)...');
    await testMarkComplete(testUserId, testProblemId, 60, 2);

    // Test 4: Fourth completion with even higher score 95
    console.log('\n4️⃣ Fourth completion (score: 95 - should update best_score)...');
    await testMarkComplete(testUserId, testProblemId, 95, 5);

    // Final check
    console.log('\n📊 Final verification...');
    const { data: finalData } = await supabase
      .from('user_problem_progress')
      .select('*')
      .eq('user_id', testUserId)
      .eq('problem_id', testProblemId)
      .single();

    console.log('Final record:', {
      score: finalData.score,
      best_score: finalData.best_score,
      stars: finalData.stars,
      attempts: finalData.attempts
    });

    // Verify expectations
    if (finalData.best_score === 95) {
      console.log('✅ SUCCESS: best_score correctly updated to 95');
    } else {
      console.log('❌ FAILURE: best_score should be 95, but got', finalData.best_score);
    }

    if (finalData.attempts === 4) {
      console.log('✅ SUCCESS: attempts correctly tracked (4)');
    } else {
      console.log('❌ FAILURE: attempts should be 4, but got', finalData.attempts);
    }

    // Clean up
    await supabase
      .from('user_problem_progress')
      .delete()
      .eq('user_id', testUserId)
      .eq('problem_id', testProblemId);

    console.log('\n🧹 Test data cleaned up');
    console.log('\n🎉 Best score test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testMarkComplete(userId, problemId, score, stars) {
  // Simulate the markQuestionComplete function logic
  const validScore = Math.max(0, Math.min(100, Math.floor(Number(score) || 0)));
  const validStars = Math.max(0, Math.min(5, Math.floor(Number(stars) || 0)));

  console.log(`   Testing with score: ${validScore}, stars: ${validStars}`);

  // Get existing progress
  const { data: existingProgress } = await supabase
    .from('user_problem_progress')
    .select('best_score, attempts')
    .eq('user_id', userId)
    .eq('problem_id', problemId)
    .single();

  const currentBestScore = existingProgress?.best_score || 0;
  const currentAttempts = existingProgress?.attempts || 0;
  const newBestScore = Math.max(currentBestScore, validScore);

  console.log(`   Current best: ${currentBestScore}, New best: ${newBestScore}, Attempts: ${currentAttempts + 1}`);

  const now = new Date().toISOString();

  // Upsert user progress
  const { data, error } = await supabase
    .from('user_problem_progress')
    .upsert({
      user_id: userId,
      problem_id: problemId,
      is_solved: true,
      score: validScore,
      best_score: newBestScore,
      stars: validStars,
      completed_at: now,
      first_solved_at: existingProgress ? undefined : now,
      last_attempt_at: now,
      attempts: currentAttempts + 1,
      updated_at: now
    }, {
      onConflict: 'user_id,problem_id',
      ignoreDuplicates: false
    })
    .select();

  if (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }

  console.log(`   ✅ Completed: score=${data[0].score}, best_score=${data[0].best_score}, attempts=${data[0].attempts}`);
  return true;
}

testBestScoreLogic(); 