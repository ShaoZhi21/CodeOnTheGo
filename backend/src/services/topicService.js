const { createClient } = require('@supabase/supabase-js');
// LeetCode client will be imported dynamically where needed to support ESM


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
    console.log('getTopicProblems called with topic:', topic);
    const client = getSupabaseClient();
    console.log('About to execute query: topic_problems where topic_name =', topic);
    const { data, error } = await client
      .from('topic_problems')
      .select('*')
      .eq('topic_name', topic)
      .order('leetcode_id');

    if (error) {
      console.error('Supabase error in getTopicProblems:', error);
      throw error;
    }
    console.log('getTopicProblems success, found', data?.length || 0, 'problems');
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
      .eq('topic_name', topic);

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

// Helper to parse HTML content (copied from leetcode-client.js to avoid module issues)
function parseDescription(htmlContent) {
  if (!htmlContent) return { description: '', examples: [], constraints: [] };

  // Basic HTML to text conversion
  let text = htmlContent
    .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
    .replace(/&nbsp;/g, ' ')           // Replace &nbsp;
    .replace(/&lt;/g, '<')             // Replace &lt;
    .replace(/&gt;/g, '>')             // Replace &gt;
    .replace(/&amp;/g, '&')            // Replace &amp;
    .replace(/&quot;/g, '"')          // Replace &quot;
    .replace(/\s+/g, ' ')              // Normalize whitespace
    .trim();

  // Split into sections
  const result = {
    description: '',
    examples: [],
    constraints: []
  };

  try {
    // Find constraints section
    const constraintsMatch = text.match(/Constraints?:\s*(.*?)(?=\n\n|\n[A-Z]|$)/s);
    if (constraintsMatch) {
      const constraintsText = constraintsMatch[1].trim();
      // Split constraints by common patterns
      result.constraints = constraintsText
        .split(/\n|\.(?=\s*[0-9]|\s*[a-z])|(?<=\.)(?=\s*[0-9])/)
        .map(c => c.trim())
        .filter(c => c && c.length > 2);

      // Remove constraints from main text
      text = text.replace(constraintsMatch[0], '').trim();
    }

    // Extract examples
    const exampleMatches = text.matchAll(/Example\s*(\d+):\s*(.*?)(?=Example\s*\d+:|Constraints?:|$)/gs);
    let exampleIndex = 1;

    for (const match of exampleMatches) {
      const exampleText = match[2].trim();

      // Parse input, output, explanation
      const inputMatch = exampleText.match(/Input:\s*(.*?)(?=Output:|Explanation:|$)/s);
      const outputMatch = exampleText.match(/Output:\s*(.*?)(?=Explanation:|Input:|$)/s);
      const explanationMatch = exampleText.match(/Explanation:\s*(.*?)(?=Input:|Output:|$)/s);

      const example = {
        id: exampleIndex++,
        input: inputMatch ? inputMatch[1].trim() : '',
        output: outputMatch ? outputMatch[1].trim() : '',
        explanation: explanationMatch ? explanationMatch[1].trim() : ''
      };

      result.examples.push(example);

      // Remove this example from main text
      text = text.replace(match[0], '').trim();
    }

    // Clean up the remaining text as pure description
    result.description = text
      .replace(/Example\s*\d+:.*$/s, '')  // Remove any remaining example text
      .replace(/Constraints?:.*$/s, '')   // Remove any remaining constraints
      .trim();

  } catch (error) {
    console.warn('⚠️  Failed to parse sections, using basic parsing:', error.message);
    // Fallback to basic parsing
    result.description = text;
  }

  return result;
}

// Get problem solution (Modified to fetch live from LeetCode with fallback)
async function getProblemSolution(problemId, title = null) {
  try {
    const client = getSupabaseClient();
    let dbData = null;

    // 1. Try to get basic info (slug) from DB if problemId is provided
    if (problemId) {
      const { data, error } = await client
        .from('leetcode_problems') // Updated from topic_problems to leetcode_problems
        .select('*')
        .eq('leetcode_id', problemId)
        .single();

      if (!error && data) {
        dbData = data;
      }
    }

    // ✅ If we already have the description stored in DB, return immediately.
    // This prevents slow/hanging live fetches from blocking the app.
    if (dbData && (dbData.description || dbData.description_text)) {
      const hasHtml = typeof dbData.description === 'string' && dbData.description.trim().length > 0;
      const hasText = typeof dbData.description_text === 'string' && dbData.description_text.trim().length > 0;
      if (hasHtml || hasText) {
        return dbData;
      }
    }

    // 2. Determine slug to use for live fetch
    let slug = null;

    // First priority: DB derived slug
    if (dbData && dbData.slug) {
      slug = dbData.slug;
    }
    // Second priority: Generate slug from DB title
    else if (dbData && dbData.title) {
      slug = dbData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // remove special chars
        .trim()
        .replace(/\s+/g, '-')         // replace spaces with dashes
        .replace(/-+/g, '-');         // remove duplicate dashes
      console.log(`⚠️ Derived slug from DB title: "${dbData.title}" -> "${slug}"`);
    }
    // Third priority: Generate slug from provided title argument (Fallback)
    else if (title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // remove special chars
        .trim()
        .replace(/\s+/g, '-')         // replace spaces with dashes
        .replace(/-+/g, '-');         // remove duplicate dashes
      console.log(`⚠️ Derived slug from provided title: "${title}" -> "${slug}"`);
    }

    // If we have no way to find the problem, return null
    if (!slug) {
      console.warn(`❌ Could not determine slug for problemId: ${problemId}, title: ${title}`);
      return dbData; // Return whatever we found in DB (might be null)
    }

    // 3. Fetch details from LeetCode Live
    // This avoids storing copyrighted descriptions in our DB
    try {
      console.log(`🔄 Live fetching details for: ${slug}`);
      const { LeetCode } = await import('leetcode-query');
      const leetcode = new LeetCode();
      const problem = await leetcode.problem(slug);

      if (problem) {
        console.log('✅ Live fetch successful');

        // Check for empty content (common for premium problems or parsing issues)
        if (!problem.content || problem.content.length === 0) {
          console.warn('⚠️ Fetched content is empty (likely premium restricted)');
          const baseData = dbData || {
            leetcode_id: problemId,
            title: title || slug,
            difficulty: 'Medium', // Default if unknown
            slug: slug
          };

          return {
            ...baseData,
            description: '<p>This is a <b>Premium</b> LeetCode problem. The full description is not available via the public API.</p><p>Please view it on the official LeetCode website.</p>',
            description_text: 'This is a Premium LeetCode problem. The full description is not available via the public API. Please view it on the official LeetCode website.',
            is_premium: true
          };
        }

        const parsed = parseDescription(problem.content);

        // Merge live data with value from DB (if exists) or create new object
        const baseData = dbData || {
          leetcode_id: problemId,
          title: problem.title || title,
          difficulty: problem.difficulty || 'Medium',
          slug: slug
        };

        return {
          ...baseData,
          description: problem.content,     // Full HTML
          description_text: parsed.description,
          examples: parsed.examples.length > 0 ? parsed.examples : (dbData?.examples || []),
          constraints: parsed.constraints.length > 0 ? parsed.constraints : (dbData?.constraints || []),
          hints: problem.hints || dbData?.hints || []
        };
      }
    } catch (lcError) {
      console.warn('⚠️  Live fetch failed, falling back to DB content:', lcError.message);
    }

    // Fallback: Return what we have in DB (useful if API is down or for existing cached data)
    return dbData;

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
