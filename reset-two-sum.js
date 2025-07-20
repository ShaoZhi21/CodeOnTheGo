const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetTwoSumProgress() {
  try {
    // Use provided user ID directly
    const userId = 'e17bc8a4-1acb-4bfe-aaa8-a405a409dd6a';
    console.log('Using user ID:', userId);
    
    // Two Sum is typically LeetCode problem #1
    const twoSumLeetcodeId = 1;
    
    console.log(`Resetting progress for Two Sum (LeetCode ID: ${twoSumLeetcodeId})...`);
    
    // Delete from user_problem_progress
    const { count: progressCount, error: progressError } = await supabase
      .from('user_problem_progress')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('leetcode_id', twoSumLeetcodeId);
    
    if (progressError) {
      console.error('Error deleting from user_problem_progress:', progressError);
    } else {
      console.log(`✓ Deleted ${progressCount ?? 0} rows from user_problem_progress`);
    }
    
    // Delete from user_lesson_completion
    const { count: lessonCount, error: lessonError } = await supabase
      .from('user_lesson_completion')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('leetcode_id', twoSumLeetcodeId);
    
    if (lessonError) {
      console.error('Error deleting from user_lesson_completion:', lessonError);
    } else {
      console.log(`✓ Deleted ${lessonCount ?? 0} rows from user_lesson_completion`);
    }
    
    // Fetch and print current state after deletion
    const { data: progressRows } = await supabase
      .from('user_problem_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('leetcode_id', twoSumLeetcodeId);
    const { data: lessonRows } = await supabase
      .from('user_lesson_completion')
      .select('*')
      .eq('user_id', userId)
      .eq('leetcode_id', twoSumLeetcodeId);
    
    console.log('Current user_problem_progress rows for Two Sum:', progressRows);
    console.log('Current user_lesson_completion rows for Two Sum:', lessonRows);
    
    console.log('Two Sum progress reset complete!');
    
  } catch (error) {
    console.error('Error resetting Two Sum progress:', error);
  }
}

resetTwoSumProgress(); 