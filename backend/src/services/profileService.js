const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Get user profile
async function getUserProfile(userId) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Update user profile
async function updateUserProfile(userId, name, skill_level) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('user_profiles')
      .upsert({
        user_id: userId,
        name: name,
        skill_level: skill_level,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
}

// Get user profile stats
async function getUserProfileStats(userId) {
  try {
    const client = getSupabaseClient();
    // Get user's problem progress
    const { data: progressData, error: progressError } = await client
      .from('user_problem_progress')
      .select('*')
      .eq('user_id', userId);
    
    if (progressError) throw progressError;
    
    // Get user's lesson completion
    const { data: lessonData, error: lessonError } = await client
      .from('user_lesson_completion')
      .select('*')
      .eq('user_id', userId);
    
    if (lessonError) throw lessonError;
    
    // Only count problems and stars when both lesson and pseudocode are completed
    const completedProblemsMap = new Map();
    let totalStars = 0;

    // First mark which problems have completed lessons
    const completedLessons = new Set(
      lessonData?.filter(l => l.quiz_completed).map(l => l.problem_id)
    );

    // Then process problem progress, only counting those with completed lessons
    progressData?.forEach(p => {
      if (p.is_solved && completedLessons.has(p.problem_id)) {
        completedProblemsMap.set(p.problem_id, true);
        totalStars += p.stars || 0;
      }
    });
    
    const completedProblems = completedProblemsMap.size;
    const completedLessonsCount = completedLessons.size;
    
    return {
      completed_problems: completedProblems,
      total_stars: totalStars,
      completed_lessons: completedLessonsCount
    };
  } catch (error) {
    console.error('Error fetching user profile stats:', error);
    return {
      completed_problems: 0,
      total_stars: 0,
      completed_lessons: 0
    };
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserProfileStats
}; 