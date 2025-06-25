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

// Get all topics
async function getAllTopics() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('topics')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
}

// Get problems for a specific topic
async function getTopicProblems(topic) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('topic_problems')
      .select('*')
      .eq('topic', topic)
      .order('leetcode_id');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching topic problems:', error);
    return [];
  }
}

// Get topic stats
async function getTopicStats(topic) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('topic_problems')
      .select('*')
      .eq('topic', topic);
    
    if (error) throw error;
    
    const totalProblems = data?.length || 0;
    return {
      total_problems: totalProblems,
      total_stars: 0, // This will be calculated from user progress
      completion_percentage: 0
    };
  } catch (error) {
    console.error('Error fetching topic stats:', error);
    return { total_problems: 0, total_stars: 0, completion_percentage: 0 };
  }
}

// Record topic navigation
async function recordTopicNavigation(userId, topicName) {
  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('user_topic_navigation')
      .insert({
        user_id: userId,
        topic_name: topicName,
        visited_at: new Date().toISOString()
      });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error recording topic navigation:', error);
    return false;
  }
}

// Get recent topic navigation
async function getRecentTopicNavigation(userId) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('user_topic_navigation')
      .select('topic_name, visited_at')
      .eq('user_id', userId)
      .order('visited_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recent topic navigation:', error);
    return [];
  }
}

// Get problem solution
async function getProblemSolution(problemId) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('topic_problems')
      .select('*')
      .eq('leetcode_id', problemId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching problem solution:', error);
    return null;
  }
}

module.exports = {
  getAllTopics,
  getTopicProblems,
  getTopicStats,
  recordTopicNavigation,
  getRecentTopicNavigation,
  getProblemSolution
}; 