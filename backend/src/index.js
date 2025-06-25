require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const { getTopicProblems, getTopicStats, getAllTopics, recordTopicNavigation, getRecentTopicNavigation, getProblemSolution } = require('./services/topicService');
const { getUserProfile, updateUserProfile, getUserProfileStats } = require('./services/profileService');
const bodyParser = require('body-parser');

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
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
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
    
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const analysis = {}; // Parse 'text' into 'analysis' object here...

    res.json({ analysis: text }); // Sending raw text for now
  } catch (error) {
    console.error('Error analyzing code:', error);
    res.status(500).json({ error: 'Failed to analyze code' });
  }
});

// New Lesson Generation Endpoint
app.post('/generate-lesson', async (req, res) => {
  if (!geminiModel) {
    return res.status(500).json({ error: 'Lesson generation is not configured on the server.' });
  }

  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Problem title and description are required.' });
  }

  const prompt = `You are an expert programming tutor specializing in data structures and algorithms. Create a comprehensive educational lesson about the following LeetCode problem. The lesson should teach the key concepts needed to solve the problem WITHOUT revealing the complete solution.

Problem: ${title}
Description: ${description}

Your lesson should be structured and include:

1. **Main Content**: A clear, step-by-step explanation of the key concepts and algorithms needed. Focus on the problem-solving approach and the underlying data structures or algorithms that would be useful.

2. **Key Concepts**: List 3-5 specific concepts that are essential for understanding this problem type. Be specific about data structures, algorithms, or techniques.

3. **Examples**: Provide 2-3 simple, concrete examples that illustrate the concepts without solving the actual problem. Use small, manageable examples.

4. **Problem-Solving Hints**: Give 2-3 specific hints about the approach without revealing the solution. Focus on the thought process and strategy.

5. **Common Pitfalls**: Mention 1-2 common mistakes or misconceptions students might have.

Respond with ONLY a JSON object in this exact format:
{
  "title": "Specific Lesson Title for ${title}",
  "content": "Detailed explanation of the concepts, step-by-step approach, and problem-solving strategy...",
  "keyConcepts": ["Specific concept 1", "Specific concept 2", "Specific concept 3", "Specific concept 4"],
  "examples": ["Concrete example 1 with explanation", "Concrete example 2 with explanation", "Concrete example 3 with explanation"]
}

Make the content specific to this exact problem type. Do not include any other text, only the JSON object.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const lessonData = JSON.parse(text);
    res.json(lessonData);
  } catch (error) {
    console.error('Error generating lesson with Gemini:', error);
    res.status(500).json({ error: 'Failed to generate lesson.' });
  }
});

// Quiz Generation Endpoint
app.post('/generate-quiz', async (req, res) => {
  if (!geminiModel) {
    return res.status(500).json({ error: 'Quiz generation is not configured on the server.' });
  }

  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Problem title and description are required.' });
  }

  const prompt = `You are an expert programming tutor specializing in data structures and algorithms. Create a 3-question multiple-choice quiz specifically about the following LeetCode problem. The questions should test deep understanding of the key concepts needed to solve this exact problem.

Problem: ${title}
Description: ${description}

Create 3 targeted questions that specifically test:

1. **Core Algorithm/Data Structure Understanding**: Test understanding of the specific algorithm, data structure, or technique most relevant to this problem.

2. **Time/Space Complexity Analysis**: Test ability to analyze the time and space complexity of the approach needed for this specific problem.

3. **Problem-Solving Strategy**: Test understanding of the problem-solving approach, edge cases, or implementation details specific to this problem.

Each question should:
- Have exactly 4 options (A, B, C, D)
- Be specific to this problem type, not generic
- Test practical understanding, not just memorization
- Include a detailed explanation of why the correct answer is right

Respond with ONLY a JSON object in this exact format:
{
  "questions": [
    {
      "question": "Specific question about the core concept for ${title}?",
      "options": ["Specific option A", "Specific option B", "Specific option C", "Specific option D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation of why this is correct, including the reasoning and concepts involved"
    },
    {
      "question": "Specific question about time/space complexity for ${title}?",
      "options": ["Specific option A", "Specific option B", "Specific option C", "Specific option D"],
      "correctAnswer": 2,
      "explanation": "Detailed explanation of why this is correct, including the reasoning and concepts involved"
    },
    {
      "question": "Specific question about problem-solving approach for ${title}?",
      "options": ["Specific option A", "Specific option B", "Specific option C", "Specific option D"],
      "correctAnswer": 1,
      "explanation": "Detailed explanation of why this is correct, including the reasoning and concepts involved"
    }
  ],
  "lessonContent": "Brief summary of the key learning points from this specific problem"
}

Make all questions and options specific to this exact problem. Do not include any other text, only the JSON object.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const quizData = JSON.parse(text);
    res.json(quizData);
  } catch (error) {
    console.error('Error generating quiz with Gemini:', error);
    res.status(500).json({ error: 'Failed to generate quiz.' });
  }
});

// Quiz Completion Endpoint
app.post('/api/quiz-completion', async (req, res) => {
  try {
    const { questionId, score, completed } = req.body;
    
    if (!questionId || score === undefined || completed === undefined) {
      return res.status(400).json({ error: 'Question ID, score, and completion status are required' });
    }

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
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
      return res.status(500).json({ error: 'Failed to save quiz completion' });
    }

    res.json({ success: true, message: 'Quiz completion saved successfully' });
  } catch (error) {
    console.error('Error in quiz completion endpoint:', error);
    res.status(500).json({ error: 'Failed to save quiz completion' });
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