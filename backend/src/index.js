require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
  try {
    const { code, question } = req.body;
    
    if (!code || !question) {
      return res.status(400).json({ error: 'Code and question are required' });
    }

    // Format the code with line numbers
    let numberedCode = '';
    if (Array.isArray(code)) {
      // Filter out empty blocks - frontend already numbers them
      const nonEmptyBlocks = code.filter(block => block.trim() !== '');
      numberedCode = nonEmptyBlocks.join('\n');
    } else {
      // If code is a string, use it as is if already numbered
      numberedCode = code;
    }

    console.log('PARSED SOLUTION FROM FRONTEND:');
    console.log(numberedCode);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: "You are a helpful and precise assistant. Your job is to evaluate the logic of pseudocode when given a question and a block of pseudocode. Explain whether the logic correctly answers the question, and point out any logical errors or missing steps. Use clear reasoning and suggest improvements if needed. Do not write actual code unless asked.",
    });
    
    const prompt = 
    `You are a concise and critical code reviewer. 
    When given a question and a piece of code (or pseudocode), your job is to 
    determine if the logic correctly solves the question, assess its efficiency, 
    identify any edge cases it might fail, and suggest specific improvements. 
    You must always include a score out of 100 and explain the reasoning. 
    Be clear and structured.

    Mark primarily based on the clarity and correctness of the algorithmic idea, not on syntax, 
    language-specific features, type safety or indexing related issues.
    Ignore minor syntax issues unless they affect logic or understanding.

    Award more marks for clearer and longer explanations that accurately justify the approach.
    Short or vague answers, even if correct, should not receive high scores without sufficient reasoning.
    Gibberish answers should be marked as ✗ and given a score of 0.

    Before scoring, do the following:
    - Step 1: Generate your own ideal pseudocode in step-by-step point form (in natural language) that explains the intended algorithm fully.
    - Step 2: Check how many of these steps the user's explanation hits, either exactly or paraphrased. No need to be very strict with the phrasing as long as the idea is similar.
    - Step 3: For solutions that are correct, determine explanation detail coverage:
    - < 30% → Very vague or incomplete → Score ≤ 50-60
    - 30-60% → Decent but missing several key steps → Score 60-75
    - 60–80% → Decent but missing several key steps → Score 75–90
    - 80–100% → Very detailed and thorough → Score 90–100

    If the solution is not logically correct (✗), do not apply this explanation coverage rule.
    Instead, refer directly to the scoring rubric under "Scoring" and award points accordingly for those that are incorrect.

    Do not give high marks for correct but very short explanations.
    Mark based on whether the user sufficiently explained their thinking — not just whether the final logic appears valid.

Question: ${question}

User's Solution (numbered):
${numberedCode}

Evaluate the submission as follows:
1. Line-by-Line Analysis –
   IMPORTANT: You MUST analyze each numbered line from the user's solution above. Use this EXACT format:
   
   Line-by-Line Analysis:
   Line 1:
   Status: Fully correct/ Can be improved/ Wrong
   Explanation: [7-word max hint as rhetorical question]
   
   Line 2:
   Status: Fully correct/ Can be improved/ Wrong
   Explanation: [7-word max hint as rhetorical question]
   
   Further lines...
   
   CRITICAL FORMATTING RULES:
   - Use the EXACT line numbers from the numbered solution above (1, 2, 3, etc.)
   - Write "Status:" followed by exactly ONE of these: "Fully correct", "Can be improved", "Wrong"  
   - DO NOT write "1) Wrong" or "2) Can be improved" or any numbers before the status
   - DO NOT use parentheses like "(explanation here)" 
   - If explanation needed, put it on separate line starting with "Explanation:"
   - NO numbered lists in your response for status
   
   Continue for ALL lines in the user's solution above. DO NOT skip any line numbers.

2. Correctness (✓ or ✗) – Be strict. Only mark ✓ if the logic fully and precisely solves the problem.  
   - Do not assume steps the user left out (e.g. sorting, bounds checks, loop conditions).  
   - If the code omits or fails to explain something critical, mark it as ✗ and include that in Suggestions.
   - Ensure the user has included all the steps in the explanation.
   - Ensure the user explains how it reaches the final answer clearly. If not stated, wrong.
3. Efficiency – 
   Time: [state time complexity clearly]  
   Space: [state space complexity]  
   Any more optimal? [Yes/No – If yes, describe why this is not optimal, but do not give the optimal solution]
4. Edge Cases – 
  - What corner cases could break this code? 
    Write concisely. Give at least 1 and at most 3 strictly.
    Ignore large input cases unless the time complexity is O(n^2) or O(n^3) or worse.
  Give it in the format of:
  1) Corner case 1 (reasoning 5 words max STRICTLY)
  2) Corner case 2 (reasoning 5 words max STRICTLY)
  3) Corner case 3 (reasoning 5 words max STRICTLY)
5. Track Assessment –
  Based on correctness and score, determine if the user is on the right track:
  - Right Track: Correctness is ✓ AND score ≥ 60
  - Wrong Track: Correctness is ✗ OR score < 60
6. Suggestions – 
  Give at least 1 and at most 3 specific ways to improve the code strictly. 
  Write concisely only one sentence.
  No need to tell them to explain time or space complexity.
  If logic is ✓, suggest what was missing (e.g. "no sorting step included").
  If logic is ✗, suggest what was missing (e.g. "no sorting step included").
  Include suggestions to include more details in explanation, clarity, performance, or robustness.
  
  Format based on track assessment:
  - If Right Track: "You are on the right track!"
  - If Wrong Track: "You are on the wrong track!"
  
  1) Suggestion 1 (reasoning 15 words max STRICTLY)
  2) Suggestion 2 (reasoning 15 words max STRICTLY)
  3) Suggestion 3 (reasoning 15 words max STRICTLY)
  DO NOT INCLUDE ANYTHING ELSE. NO EXTRA EXPLANATION.

Scoring  
Rate the solution out of 100 using the following scale:

- 90-100 – Fully correct and efficient, complete explanation, no gaps (5 stars)
- 75–90 – Correct and efficient, but explanation is missing small details (4 stars)
- 60–75 – Correct but inefficient, with solid explanation OR Correct and efficient, lacking lots of details (3 stars)
- 50–60 – Correct but inefficient and not explained clearly (2 stars)
- 25–50 – Incorrect solution due to minor logical flaws present that could cause significant test case failures (1 star)
- 0–25 – Completely incorrect solution due to major logical flaws or complete misunderstanding of the problem (0 stars)

Score: __/100  
Stars: 0-5
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Raw Gemini response:', text);

    // Parse the response into structured format
    const lines = text.split('\n');
    const analysis = {
      lineByLineAnalysis: [],
      correctness: '',
      efficiency: {
        time: '',
        space: '',
        anyMoreOptimal: ''
      },
      edgeCases: [],
      trackAssessment: '',
      suggestions: [],
      score: 0,
      stars: 0
    };

    let currentSection = '';
    let currentLineNumber = null; // Track the current line number from "Line X:" headers
    let pendingStatus = null; // Track the status for the current line
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('Line-by-Line Analysis:')) {
        currentSection = 'lineByLine';
      } else if (trimmedLine.includes('Line-by-Line') || trimmedLine.includes('Line by Line')) {
        currentSection = 'lineByLine';
      } else if (trimmedLine.startsWith('Correctness:') || trimmedLine.startsWith('**Correctness:**')) {
        analysis.correctness = trimmedLine.replace(/\*?\*?Correctness:\*?\*?/, '').trim();
        currentSection = '';
      } else if (trimmedLine.startsWith('Time:')) {
        analysis.efficiency.time = trimmedLine.replace('Time:', '').trim();
      } else if (trimmedLine.startsWith('Space:')) {
        analysis.efficiency.space = trimmedLine.replace('Space:', '').trim();
      } else if (trimmedLine.startsWith('Any more optimal?')) {
        analysis.efficiency.anyMoreOptimal = trimmedLine.replace('Any more optimal?', '').trim();
      } else if (trimmedLine.startsWith('Edge Cases:') || trimmedLine.startsWith('**Edge Cases:**')) {
        currentSection = 'edgeCases';
      } else if (trimmedLine.startsWith('Track Assessment:') || trimmedLine.startsWith('**Track Assessment:**')) {
        analysis.trackAssessment = trimmedLine.replace(/\*?\*?Track Assessment:\*?\*?/, '').trim();
        currentSection = '';
      } else if (trimmedLine.startsWith('Suggestions:') || trimmedLine.startsWith('**Suggestions:**')) {
        currentSection = 'suggestions';
      } else if (trimmedLine.startsWith('Score:') || trimmedLine.startsWith('**Score:') || trimmedLine.match(/Score:\s*\d+\/100/)) {
        const scoreMatch = trimmedLine.match(/(\d+)\/100/);
        if (scoreMatch) {
          analysis.score = parseInt(scoreMatch[1]);
          console.log('Parsed score:', analysis.score);
        }
      } else if (trimmedLine.startsWith('Stars:') || trimmedLine.startsWith('**Stars:') || trimmedLine.match(/Stars:\s*\d+/)) {
        const starsMatch = trimmedLine.match(/(\d+)/);
        if (starsMatch) {
          analysis.stars = parseInt(starsMatch[1]);
          console.log('Parsed stars:', analysis.stars);
        }
      } else if (trimmedLine && currentSection === 'lineByLine') {
        // Check if this is a line number header like "Line 3:"
        const lineHeaderMatch = trimmedLine.match(/^Line\s+(\d+):?$/i);
        if (lineHeaderMatch) {
          // If we have a pending analysis from previous line, save it first
          if (currentLineNumber !== null && pendingStatus !== null) {
            const lineAnalysis = {
              lineNumber: currentLineNumber,
              status: pendingStatus,
              explanation: null
            };
            analysis.lineByLineAnalysis.push(lineAnalysis);
          }
          
          currentLineNumber = parseInt(lineHeaderMatch[1]);
          pendingStatus = null;
          continue;
        }
        
        // Check if this is a status line
        if (currentLineNumber !== null && pendingStatus === null) {
          const statusMatch = trimmedLine.match(/^Status:\s*(Fully correct|Can be improved|Wrong)$/i);
          if (statusMatch) {
            let status = statusMatch[1].toLowerCase().trim();
            
            // Normalize the status
            if (status.includes('fully') && status.includes('correct')) {
              status = 'fully_correct';
            } else if (status.includes('improved') || status.includes('improve')) {
              status = 'can_be_improved';
            } else if (status.includes('wrong')) {
              status = 'wrong';
            }
            
            pendingStatus = status;
            continue;
          }
        }
        
        // Check if this is an explanation line
        if (currentLineNumber !== null && pendingStatus !== null && trimmedLine.startsWith('Explanation:')) {
          const explanation = trimmedLine.replace('Explanation:', '').trim();
          
          const lineAnalysis = {
            lineNumber: currentLineNumber,
            status: pendingStatus,
            explanation: explanation || null
          };
          analysis.lineByLineAnalysis.push(lineAnalysis);
          
          // Reset for next line
          currentLineNumber = null;
          pendingStatus = null;
        }
      } else if (trimmedLine && currentSection === 'edgeCases') {
        analysis.edgeCases.push(trimmedLine);
      } else if (trimmedLine && currentSection === 'suggestions') {
        // Don't add Score: or Stars: lines to suggestions
        if (!trimmedLine.startsWith('Score:') && !trimmedLine.startsWith('Stars:') && 
            !trimmedLine.match(/Score:\s*\d+\/100/) && !trimmedLine.match(/Stars:\s*\d+/)) {
          analysis.suggestions.push(trimmedLine);
        }
      }
    }
    
    // Handle any remaining pending analysis at the end
    if (currentLineNumber !== null && pendingStatus !== null) {
      const lineAnalysis = {
        lineNumber: currentLineNumber,
        status: pendingStatus,
        explanation: null
      };
      analysis.lineByLineAnalysis.push(lineAnalysis);
    }

    console.log('Final analysis sent to frontend:');
    console.log('Score:', analysis.score);
    console.log('Stars:', analysis.stars);
    console.log('Correctness:', analysis.correctness);
    console.log('Total line analyses:', analysis.lineByLineAnalysis.length);
    console.log('Line-by-line breakdown:');
    analysis.lineByLineAnalysis.forEach(line => {
      console.log(`Line ${line.lineNumber}: ${line.status}${line.explanation ? ` (${line.explanation})` : ''}`);
    });
    console.log('Edge cases:', analysis.edgeCases);
    console.log('Suggestions:', analysis.suggestions);

    res.json({ 
      analysis,
      rawResponse: text // Add raw response for debugging
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to analyze code' });
  }
});

// Get all progress for a user and topic
app.get('/api/user-progress/:userId/:topic', async (req, res) => {
  const { userId, topic } = req.params;
  const { data, error } = await supabase
    .from('user_problem_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('topic', topic);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ progress: data });
});

// Save/update answer and attempts for a question
app.post('/api/user-progress/:userId/:topic/:problemId/answer', async (req, res) => {
  const { userId, topic, problemId } = req.params;
  const { code, result, completed, stars } = req.body;
  const now = new Date().toISOString();

  console.log('Saving progress:', {
    userId,
    topic,
    problemId,
    completed,
    stars,
    result
  });

  // Fetch existing progress
  let { data: progress, error } = await supabase
    .from('user_problem_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('problem_id', problemId)
    .single();

  let attempts = [];
  if (progress && progress.attempts) {
    attempts = progress.attempts;
  }
  attempts.push({ code, timestamp: now, result });

  const updateFields = {
    last_answer: code,
    attempts,
    updated_at: now,
  };
  if (typeof completed === 'boolean') updateFields.is_solved = completed;
  if (typeof stars === 'number') updateFields.stars = stars;

  let upsertData = {
    user_id: userId,
    problem_id: parseInt(problemId),
    ...updateFields,
  };

  console.log('Upsert data:', upsertData);

  const { data: upsertResult, error: upsertError } = await supabase
    .from('user_problem_progress')
    .upsert(upsertData, { onConflict: ['user_id', 'problem_id'] })
    .select();

  if (upsertError) {
    console.error('Upsert error:', upsertError);
    return res.status(500).json({ error: upsertError.message });
  }
  
  console.log('Progress saved successfully:', upsertResult);
  res.json({ success: true, data: upsertResult });
});

// Record topic navigation
app.post('/api/topic-navigation', async (req, res) => {
  try {
    const { userId, topicName } = req.body;
    
    if (!userId || !topicName) {
      return res.status(400).json({ error: 'User ID and topic name are required' });
    }

    const { error } = await supabase
      .from('user_topic_navigation')
      .insert({
        user_id: userId,
        topic_name: topicName,
        visited_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error recording topic navigation:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in topic navigation endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent topic navigation for a user
app.get('/api/topic-navigation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('user_topic_navigation')
      .select('topic_name, visited_at')
      .eq('user_id', userId)
      .order('visited_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching topic navigation:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ navigation: data || [] });
  } catch (error) {
    console.error('Error in get topic navigation endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate quiz questions for a problem using Gemini AI
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { problemId, questionTitle, questionDescription } = req.body;
    
    if (!problemId || !questionTitle || !questionDescription) {
      return res.status(400).json({ error: 'Problem ID, title, and description are required' });
    }

    // Check if quiz questions already exist for this problem
    const { data: existingQuestions, error: checkError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('problem_id', problemId)
      .limit(3);

    if (checkError) {
      console.error('Error checking existing quiz questions:', checkError);
      return res.status(500).json({ error: checkError.message });
    }

    // If we already have 3 questions, return them
    if (existingQuestions && existingQuestions.length >= 3) {
      console.log(`Returning existing quiz questions for problem ${problemId}`);
      return res.json({ 
        questions: existingQuestions.slice(0, 3),
        fromCache: true 
      });
    }

    console.log(`Generating new quiz questions for problem ${problemId}`);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: "You are an expert programming instructor. Your job is to create multiple choice questions that test understanding of programming concepts and problem-solving approaches.",
    });

    const prompt = `
You are creating a quiz to test understanding of a programming problem. Generate exactly 3 multiple choice questions.

Problem Title: ${questionTitle}
Problem Description: ${questionDescription}

Create 3 questions that test:
1. Understanding of the problem requirements
2. Knowledge of the algorithmic approach
3. Awareness of edge cases or implementation details

For each question, provide:
- A clear question text
- 4 multiple choice options (A, B, C, D)
- The correct answer (0-3, where 0=A, 1=B, 2=C, 3=D)
- A brief explanation of why the answer is correct

Format your response as JSON:
{
  "questions": [
    {
      "question_text": "What is the main goal of this problem?",
      "options": [
        {"text": "Option A text", "correct": false},
        {"text": "Option B text", "correct": true},
        {"text": "Option C text", "correct": false},
        {"text": "Option D text", "correct": false}
      ],
      "correct_option": 1,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Make sure:
- Each question has exactly 4 options
- Only one option is correct per question
- Questions are relevant to the problem
- Options are plausible but only one is correct
- Explanations are clear and educational
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Raw Gemini quiz response:', text);

    // Try to parse JSON from the response
    let quizData;
    try {
      // Extract JSON from the response (handle cases where AI adds extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse quiz JSON:', parseError);
      return res.status(500).json({ error: 'Failed to generate quiz questions' });
    }

    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length !== 3) {
      return res.status(500).json({ error: 'Invalid quiz format generated' });
    }

    // Store the generated questions in the database
    const questionsToInsert = quizData.questions.map(q => ({
      problem_id: problemId,
      question_text: q.question_text,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting quiz questions:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    console.log(`Successfully generated and stored ${insertedQuestions.length} quiz questions`);

    res.json({ 
      questions: insertedQuestions,
      fromCache: false
    });

  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: 'Failed to generate quiz questions' });
  }
});

// Get lesson completion status for a user and problem
app.get('/api/lesson-completion/:userId/:problemId', async (req, res) => {
  try {
    const { userId, problemId } = req.params;
    
    const { data, error } = await supabase
      .from('user_lesson_completion')
      .select('*')
      .eq('user_id', userId)
      .eq('problem_id', parseInt(problemId))
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching lesson completion:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      completion: data || { 
        quiz_completed: false, 
        quiz_score: 0, 
        quiz_attempts: 0 
      } 
    });
  } catch (error) {
    console.error('Error in lesson completion endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit quiz attempt
app.post('/api/quiz-attempt', async (req, res) => {
  try {
    const { userId, problemId, quizQuestionIds, userAnswers } = req.body;
    
    if (!userId || !problemId || !quizQuestionIds || !userAnswers) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Get the correct answers for the quiz questions
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, correct_option')
      .in('id', quizQuestionIds);

    if (questionsError) {
      console.error('Error fetching quiz questions:', questionsError);
      return res.status(500).json({ error: questionsError.message });
    }

    // Calculate score
    let score = 0;
    const questionMap = new Map(questions.map(q => [q.id, q.correct_option]));
    
    for (let i = 0; i < quizQuestionIds.length; i++) {
      const questionId = quizQuestionIds[i];
      const userAnswer = userAnswers[i];
      const correctAnswer = questionMap.get(questionId);
      
      if (userAnswer === correctAnswer) {
        score++;
      }
    }

    // Insert quiz attempt
    const { data: attempt, error: insertError } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        problem_id: parseInt(problemId),
        quiz_question_ids: quizQuestionIds,
        user_answers: userAnswers,
        score: score,
        completed: true,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting quiz attempt:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Update lesson completion if score is 3/3
    if (score === 3) {
      const { error: completionError } = await supabase
        .from('user_lesson_completion')
        .upsert({
          user_id: userId,
          problem_id: parseInt(problemId),
          quiz_completed: true,
          quiz_score: score,
          completed_at: new Date().toISOString()
        }, { onConflict: ['user_id', 'problem_id'] });

      if (completionError) {
        console.error('Error updating lesson completion:', completionError);
      }
    }

    res.json({ 
      attempt,
      score,
      passed: score === 3,
      correctAnswers: questions.map(q => q.correct_option)
    });

  } catch (error) {
    console.error('Error in quiz attempt endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Press Ctrl+C to stop the server');
}); 