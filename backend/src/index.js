require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const { getTopicProblems, getTopicStats, getAllTopics, recordTopicNavigation, getRecentTopicNavigation, getProblemSolution } = require('./services/topicService');
const { getUserProfile, updateUserProfile, getUserProfileStats } = require('./services/profileService');
const bodyParser = require('body-parser');

// Debug logging for environment variables
console.log('🔍 Environment Variables Debug:');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
console.log('GEMINI_API_KEY first 10 chars:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'undefined');
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Current working directory:', process.cwd());
console.log('========================');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini AI
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn('GEMINI_API_KEY is not set. Quiz and analysis features will not work.');
}
let geminiModel;
if (API_KEY) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    console.log('✅ Gemini model initialized successfully');
} else {
    console.log('❌ Gemini model NOT initialized - API key missing');
}

// --- USER PROGRESS ENDPOINTS ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors({
  origin: '*', // In production, replace with your app's domain
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(bodyParser.json());
app.use(morgan('dev'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("Backend is live! 🚀");
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Code analysis endpoint
app.post('/api/analyze', async (req, res) => {
  if (!geminiModel) {
    return res.status(500).json({ error: 'Analysis feature is not configured on the server.' });
  }
  try {
    const { code, question } = req.body;
    
    if (!code || !question) {
      return res.status(400).json({ error: 'Code and question are required' });
    }

    let numberedCode = '';
    if (Array.isArray(code)) {
      const nonEmptyBlocks = code.filter(block => block.trim() !== '');
      numberedCode = nonEmptyBlocks.join('\n');
    } else {
      numberedCode = code;
    }

    const prompt = `You are a concise and critical code reviewer...`; // Keeping prompt short for brevity
    
    console.log('🔍 Calling Gemini API for analysis...');
    const result = await geminiModel.generateContent(prompt);
    console.log('✅ Gemini API call successful');
    const response = await result.response;
    const text = response.text();
    console.log('📝 Gemini response received:', text.substring(0, 100) + '...');

    const analysis = {}; // Parse 'text' into 'analysis' object here...

    res.json({ analysis: text }); // Sending raw text for now
  } catch (error) {
    console.error('❌ Error analyzing code:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Failed to analyze code' });
  }
});

// Enhanced Lesson Generation Endpoint
app.post('/api/generate-topic-lesson', async (req, res) => {
  if (!geminiModel) {
    return res.status(500).json({ error: 'Lesson generation is not configured on the server.' });
  }

  const { topicName, problemId, userId } = req.body;

  if (!topicName || !problemId) {
    return res.status(400).json({ error: 'Topic name and problem ID are required.' });
  }

  try {
    // Get the specific problem details
    console.log('🔍 Fetching problem with ID:', problemId);
    const problem = await getProblemSolution(problemId);
    if (!problem) {
      console.error(`Problem not found: ${problemId}`);
      return res.status(404).json({ error: `Problem with ID ${problemId} not found in database.` });
    }
    console.log('✅ Found problem:', problem.title, 'ID:', problem.leetcode_id);

    // Get all problems in this topic for context
    const topicProblems = await getTopicProblems(topicName);
    console.log(`Found ${topicProblems.length} problems for topic: ${topicName}`);
    
    if (topicProblems.length === 0) {
      console.error(`No problems found for topic: ${topicName}`);
      return res.status(404).json({ error: `No problems found for topic: ${topicName}. Please ensure problems are populated in the database.` });
    }

    // Get user's progress in this topic if userId provided
    let userProgress = [];
    if (userId) {
      const { data: progressData } = await supabase
        .from('user_problem_progress')
        .select('problem_id, is_solved, stars')
        .eq('user_id', userId)
        .in('problem_id', topicProblems.map(p => p.leetcode_id));
      userProgress = progressData || [];
    }

    // Create context about what the user has already learned
    const completedProblems = userProgress.filter(p => p.is_solved).map(p => {
      const problem = topicProblems.find(tp => tp.leetcode_id === p.problem_id);
      return problem ? problem.title : null;
    }).filter(Boolean);

    const prompt = `You are an expert programming tutor specializing in data structures and algorithms. 

Create a SIMPLE, beginner-friendly lesson for the following LeetCode problem. Focus on making it EASY to understand, not comprehensive.

CONTEXT:
- Topic: ${topicName}
- Target Problem: ${problem.title} (ID: ${problemId})
- Problem Description: ${problem.description || 'No description available'}

INSTRUCTIONS:
1. **KEEP IT SIMPLE** - A beginner should understand this in 2-3 minutes
2. **DO NOT** explain how to solve the specific problem step-by-step
3. **DO** teach 1-2 core concepts that are essential for this problem
4. **DO** provide 1 simple example that illustrates the concept
5. **DO** make it encouraging and not intimidating
6. **FOCUS** on the "why" not the "how"

Your lesson should be structured and include:

1. **Main Content**: A brief, friendly explanation of the key concept (2-3 sentences max). Focus on the intuition, not the details.

2. **Key Concepts**: List only 2-3 essential concepts that are most important for this problem type. Keep them simple.

3. **Example**: Provide 1 simple, concrete example that illustrates the concept without solving the actual problem. Make it small and manageable.

4. **Hint**: Give 1 encouraging hint about the approach without revealing the solution. Focus on the thought process.

5. **Common Mistake**: Mention 1 common mistake beginners make, but keep it simple.

Respond with ONLY a JSON object in this exact format:
{
  "title": "Simple Lesson Title for ${problem.title}",
  "content": "Brief, friendly explanation of the key concept in 2-3 sentences...",
  "keyConcepts": ["Simple concept 1", "Simple concept 2"],
  "example": "One simple example with brief explanation",
  "hint": "One encouraging hint about the approach",
  "commonMistake": "One common mistake beginners make"
}

Make the content specific to this exact problem type but keep it simple and encouraging. Focus on building confidence, not overwhelming with details. Do not include any other text, only the JSON object.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    console.log('🔵 Raw Gemini response:', text);
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let lessonData;
    try {
      lessonData = JSON.parse(text);
    } catch (jsonError) {
      // Try to extract the first valid JSON object from the response
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          lessonData = JSON.parse(match[0]);
        } catch (innerError) {
          console.error('❌ Failed to parse extracted JSON:', innerError);
          return res.status(500).json({ error: 'Failed to parse Gemini JSON', raw: text });
        }
      } else {
        console.error('❌ No JSON object found in Gemini response');
        return res.status(500).json({ error: 'No JSON object found in Gemini response', raw: text });
      }
    }
    res.json(lessonData);
  } catch (error) {
    console.error('Error generating topic lesson with Gemini:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Failed to generate lesson.' });
  }
});

// Enhanced Quiz Generation Endpoint
app.post('/api/generate-topic-quiz', async (req, res) => {
  if (!geminiModel) {
    return res.status(500).json({ error: 'Quiz generation is not configured on the server.' });
  }

  const { topicName, problemId, lessonContent } = req.body;

  if (!topicName || !problemId || !lessonContent) {
    return res.status(400).json({ error: 'Topic name, problem ID, and lesson content are required.' });
  }

  try {
    // Get the specific problem details
    const problem = await getProblemSolution(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    const prompt = `You are an expert programming tutor specializing in data structures and algorithms. Create a 3-question multiple-choice quiz for beginners about the concepts taught in the lesson.

CONTEXT:
- Topic: ${topicName}
- Target Problem: ${problem.title} (ID: ${problemId})
- Lesson Content: ${lessonContent}

INSTRUCTIONS:
1. **KEEP IT SIMPLE** - Questions should be easy to understand
2. **DO NOT** ask questions that directly reveal the solution to the problem
3. **DO** ask questions that test understanding of the core concepts from the lesson
4. **DO** make questions encouraging, not intimidating
5. **AVOID** complex time/space complexity questions for beginners

Create 3 simple questions that test:

1. **Basic Concept Understanding**: Test if they understand the main concept from the lesson
2. **Simple Application**: Test if they can apply the concept to a simple scenario
3. **Common Sense**: Test their intuition about the problem-solving approach

Each question should:
- Have exactly 4 options (A, B, C, D)
- Be easy to read and understand
- Test practical understanding, not memorization
- Include a simple explanation of why the correct answer is right
- NOT give away the solution to the actual problem

Respond with ONLY a JSON object in this exact format:
{
  "questions": [
    {
      "question": "Simple question about the main concept?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Simple explanation of why this is correct"
    },
    {
      "question": "Simple question about applying the concept?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 2,
      "explanation": "Simple explanation of why this is correct"
    },
    {
      "question": "Simple question about problem-solving intuition?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 1,
      "explanation": "Simple explanation of why this is correct"
    }
  ],
  "lessonSummary": "Brief, encouraging summary of what they learned"
}

Make all questions simple and beginner-friendly. Focus on building confidence, not testing advanced knowledge. Do not include any other text, only the JSON object.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const quizData = JSON.parse(text);
    res.json(quizData);
  } catch (error) {
    console.error('Error generating topic quiz with Gemini:', error);
    res.status(500).json({ error: 'Failed to generate quiz.' });
  }
});

// Test endpoint to check database connection and table existence
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
    console.log('Supabase Key:', supabaseKey ? 'Set' : 'Not set');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('user_lesson_completion')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Database test error:', error);
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: error.message,
        code: error.code 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Database connection successful',
      tableExists: true,
      sampleData: data 
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Quiz Completion Endpoint
app.post('/api/quiz-completion', async (req, res) => {
  try {
    const { questionId, score, completed } = req.body;
    
    if (!questionId || score === undefined || completed === undefined) {
      return res.status(400).json({ error: 'Question ID, score, and completion status are required' });
    }

    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header with Bearer token is required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Save quiz completion to database
    const { error } = await supabase
      .from('user_lesson_completion')
      .upsert({
        user_id: user.id,
        problem_id: questionId,
        quiz_completed: completed,
        quiz_score: score,
        completed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving quiz completion:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return res.status(500).json({ error: 'Failed to save quiz completion', details: error.message });
    }

    res.json({ success: true, message: 'Quiz completion saved successfully' });
  } catch (error) {
    console.error('Error in quiz completion endpoint:', error);
    res.status(500).json({ error: 'Failed to save quiz completion' });
  }
});

// Test Lesson Generation Endpoint (for development)
app.post('/api/test-lesson-generation', async (req, res) => {
  if (!geminiModel) {
    return res.status(500).json({ error: 'Lesson generation is not configured on the server.' });
  }

  const { topicName, problemTitle, problemDescription } = req.body;

  if (!topicName || !problemTitle || !problemDescription) {
    return res.status(400).json({ error: 'Topic name, problem title, and problem description are required.' });
  }

  try {
    const prompt = `You are an expert programming tutor specializing in data structures and algorithms. Create a comprehensive educational lesson for a beginner programmer about the following LeetCode problem. The lesson should teach the fundamental concepts needed to solve this problem WITHOUT revealing the complete solution.

CONTEXT:
- Topic: ${topicName}
- Target Problem: ${problemTitle}
- Problem Description: ${problemDescription}

INSTRUCTIONS:
1. **DO NOT** explain how to solve the specific problem
2. **DO** teach the fundamental concepts and data structures that would be useful
3. **DO** provide examples that illustrate the concepts without solving the target problem
4. **DO** make the content beginner-friendly but comprehensive

For example, if the problem involves hash maps:
- Teach WHAT a hash map is and how it works
- Explain why hash map lookups are O(1)
- Show simple examples of hash map usage
- Explain collision resolution concepts
- DO NOT show how to use hash maps to solve the specific problem

Your lesson should be structured and include:

1. **Main Content**: A clear, step-by-step explanation of the key concepts and algorithms needed. Focus on the problem-solving approach and the underlying data structures or algorithms that would be useful.

2. **Key Concepts**: List 3-5 specific concepts that are essential for understanding this problem type. Be specific about data structures, algorithms, or techniques.

3. **Examples**: Provide 2-3 simple, concrete examples that illustrate the concepts without solving the actual problem. Use small, manageable examples.

4. **Problem-Solving Hints**: Give 2-3 specific hints about the approach without revealing the solution. Focus on the thought process and strategy.

5. **Common Pitfalls**: Mention 1-2 common mistakes or misconceptions students might have.

6. **Visual Aids**: Suggest 1-2 visual representations or analogies that would help understand the concepts.

Respond with ONLY a JSON object in this exact format:
{
  "title": "Specific Lesson Title for ${problemTitle}",
  "content": "Detailed explanation of the concepts, step-by-step approach, and problem-solving strategy...",
  "keyConcepts": ["Specific concept 1", "Specific concept 2", "Specific concept 3", "Specific concept 4"],
  "examples": ["Concrete example 1 with explanation", "Concrete example 2 with explanation", "Concrete example 3 with explanation"],
  "hints": ["Hint 1 about approach", "Hint 2 about strategy", "Hint 3 about implementation"],
  "pitfalls": ["Common mistake 1", "Common mistake 2"],
  "visualAids": ["Visual aid 1 description", "Visual aid 2 description"]
}

Make the content specific to this exact problem type and topic. Do not include any other text, only the JSON object.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const lessonData = JSON.parse(text);
    res.json(lessonData);
  } catch (error) {
    console.error('Error generating test lesson with Gemini:', error);
    res.status(500).json({ error: 'Failed to generate lesson.' });
  }
});

// --- Existing Service Endpoints ---
app.get('/topics', async (req, res) => {
    try {
      const topics = await getAllTopics();
      res.json(topics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch topics' });
    }
  });
  
app.get('/topic-problems', async (req, res) => {
try {
    const { topic } = req.query;
    const problems = await getTopicProblems(topic);
    res.json(problems);
} catch (error) {
    res.status(500).json({ error: 'Failed to fetch topic problems' });
}
});
  
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
}); 