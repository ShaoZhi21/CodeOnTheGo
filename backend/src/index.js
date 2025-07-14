require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const { getTopicProblems, getTopicStats, getAllTopics, recordTopicNavigation, getRecentTopicNavigation, getProblemSolution } = require('./services/topicService');
const { getUserProfile, updateUserProfile, getUserProfileStats } = require('./services/profileService');
const bodyParser = require('body-parser');

// To use Judge0 API for code execution, you need to:
// 1. Sign up at https://rapidapi.com/judge0-official/api/judge0-ce/
// 2. Subscribe to the free tier (60 requests/day)
// 3. Set your API key: export JUDGE0_API_KEY="your-rapidapi-key-here"
// 4. Or add to your .env file: JUDGE0_API_KEY=your-rapidapi-key-here

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

    console.log('PARSED SOLUTION FROM FRONTEND:');
    console.log(numberedCode);

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

7. Structured Explanation - Provide detailed explanations of data structures and algorithms used:

📦 Data Structure Used: [Name of the primary data structure]

1) What it is and how it works  
   - [Explain in simple terms]

2) When and why it's used in this problem  
   - [Explain how it helps optimize or simplify the problem]

3) Key operations used  
   - [List 2-3 key operations like Lookup, insert, delete]

4) Efficiency  
   - Insert: O(?) | Delete: O(?) | Lookup: O(?)  
   - Space Complexity: O(?)

⚙️ Algorithm Used: [Name] (e.g., Two Pointers, Binary Search)
[Only include if algorithm is non-trivial - not just a simple loop]

1) How to approach  
   - [What type of algorithm this is - ONE bullet point only]

2) Core steps  
   - [Step-by-step explanation of the algorithm logic - as many bullets as needed]

8. Multiple Choice Questions (MCQs) - Generate MCQs based on complexity:

CASE 1: Both data structure and algorithm are non-trivial
→ Generate 8 MCQs: 4 for data structure + 4 for algorithm

CASE 2: Trivial algorithm (just a loop)
→ Generate 4 MCQs for data structure + 1-2 MCQs for algorithm logic

CASE 3: Trivial data structure (just array/list)
→ Generate 1-2 MCQs for data structure + 4 MCQs for algorithm

For each MCQ, provide:
- One correct answer
- Two distractors (plausible but incorrect)
- Short explanation for correct choice
- Focus on LOGIC and UNDERSTANDING, not syntax

MCQ Format:
Question: [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
Correct Answer: [A/B/C]
Explanation: [Why correct answer is right]

Scoring  
Rate the solution out of 100 using the following scale:

- 90-100 – Fully correct and efficient, complete explanation, no gaps (5 stars)
- 75–90 – Correct and efficient, but explanation is missing small details (4 stars)
- 60–75 – Correct but inefficient, with solid explanation OR Correct and efficient, lacking lots of details (3 stars)
- 50–60 – Correct but inefficient and not explained clearly (2 stars)
- 25–50 – Incorrect solution due to minor logical flaws present that could cause significant test case failures (1 star)
- 0–25 – Completely incorrect solution due to major logical flaws or complete misunderstanding of the problem (0 stars)

IMPORTANT: You MUST format the final output exactly as follows:
Score: [number]/100  
Stars: [number]
`;

    console.log('🔍 Calling Gemini API for analysis...');
    const result = await geminiModel.generateContent(prompt);
    console.log('✅ Gemini API call successful');
    const response = await result.response;
    const text = response.text();

    console.log('📝 Gemini response received:', text.substring(0, 100) + '...');
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
      
      // Check for score pattern anywhere in the line (case-insensitive, flexible format)
      const scoreMatch = trimmedLine.match(/(?:score|scoring)[:\s]*(\d+)(?:\/100|out of 100|\s*\/\s*100)/i);
      if (scoreMatch) {
        console.log('Found score match in line:', trimmedLine, '-> Matched:', scoreMatch[1]);
        if (analysis.score === 0) { // Only set if not already set
          const parsedScore = parseInt(scoreMatch[1]);
          // Ensure score is within valid range (0-100)
          analysis.score = Math.max(0, Math.min(100, parsedScore));
          console.log('Set score to:', analysis.score, '(original:', parsedScore, ')');
          if (parsedScore !== analysis.score) {
            console.warn('Score value was adjusted from', parsedScore, 'to', analysis.score);
          }
        } else {
          console.log('Score already set, ignoring this match');
        }
      }
      
      // Check for stars pattern anywhere in the line (case-insensitive)
      const starsMatch = trimmedLine.match(/(?:stars?)[:\s]*(\d+)/i);
      if (starsMatch && analysis.stars === 0) { // Only set if not already set
        analysis.stars = parseInt(starsMatch[1]);
        console.log('Parsed stars from line:', trimmedLine, '-> Stars:', analysis.stars);
      }
      
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
        // Don't add Score, Scoring, or Stars lines to suggestions
        const isScoreOrStarsLine = trimmedLine.match(/(?:score|scoring|stars?)[:\s]*\d+/i);
        console.log('Suggestions section - checking line:', trimmedLine);
        console.log('Is score/stars line?', !!isScoreOrStarsLine);
        if (!isScoreOrStarsLine) {
          analysis.suggestions.push(trimmedLine);
          console.log('Added to suggestions:', trimmedLine);
        } else {
          console.log('Filtered out score/stars line from suggestions:', trimmedLine);
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

// Question simplification endpoint
app.post('/api/simplify-question', async (req, res) => {
  try {
    const { description, title } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Question description is required' });
    }

    const model = geminiModel;
    
    const prompt = `Please simplify this coding question for a beginner programmer with both a serious and fun version.

Title: ${title || 'Coding Problem'}

Original Description: ${description}

Requirements:
1. First line: Serious, clear simplified description (max 15 words)
2. Second line: Fun analogy starting with "It's just like..." (max 15 words)
3. Use simple, everyday language
4. Avoid technical jargon
5. Make the analogy relatable but KEEP IT CONTEXTUALLY RELEVANT to the problem
6. The analogy should maintain the core meaning and logic of the original problem

Format your response EXACTLY like this:
[Serious simplified description]

It's just like [fun analogy that maintains the problem's core logic]

Examples:
Find two numbers in a list that add up to target

It's just like finding two coins that add up to the price you want to pay!

---

Check if brackets are properly opened and closed in order

It's just like checking if every opening door has its matching closing door!

---

Combine two ordered lists into one bigger ordered list

It's just like merging two organized lines of people while keeping everyone in order!

---

Search for a value in a sorted array by eliminating half each time

It's just like finding a word in a dictionary by opening to the middle page!

Return only the two-line response as shown above, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let simplifiedDescription = response.text().trim();

    // Parse and format the response to ensure proper line breaks
    // Find the first period and add a line break after it
    const firstPeriodIndex = simplifiedDescription.indexOf('.');
    if (firstPeriodIndex !== -1 && firstPeriodIndex < simplifiedDescription.length - 1) {
      // Split at first period, add line break
      const firstSentence = simplifiedDescription.substring(0, firstPeriodIndex + 1);
      const restOfText = simplifiedDescription.substring(firstPeriodIndex + 1).trim();
      simplifiedDescription = firstSentence + '<br><br>' + restOfText;
    }

    console.log('Question simplification request:');
    console.log('Original:', description);
    console.log('Simplified:', simplifiedDescription);

    res.json({ 
      simplifiedDescription: simplifiedDescription
    });
  } catch (error) {
    console.error('Error simplifying question:', error);
    res.status(500).json({ error: 'Failed to simplify question' });
  }
});

// Code execution endpoint using Gemini AI
app.post('/api/execute-code', async (req, res) => {
  try {
    const { code, language, testCases, pseudocode, functionSignature } = req.body;
    
    console.log('🔍 Backend Debug - Received request:');
    console.log('  - Code length:', code?.length || 0);
    console.log('  - Language:', language);
    console.log('  - Test cases count:', testCases?.length || 0);
    console.log('  - Pseudocode provided:', !!pseudocode);
    console.log('  - Function signature:', functionSignature);
    
    if (!code || !language || !testCases) {
      return res.status(400).json({ error: 'Code, language, and test cases are required' });
    }

    const results = [];

    // Process each test case with Gemini
    for (const testCase of testCases) {
      try {
        console.log(`🔍 Processing test case: ${JSON.stringify(testCase)}`);
        
        const functionInfo = functionSignature ? `
FUNCTION SIGNATURE INFO:
- Function name: ${functionSignature.functionName}
- Parameters: ${functionSignature.parameters?.map(p => `${p.name} (${p.type})`).join(', ')}
- Expected input format: ${functionSignature.inputFormat}
- Sample call: ${functionSignature.sampleCall}
` : '';

        const prompt = `You are a code execution engine. Your job is to:

1. Run the provided ${language} code EXACTLY as written - DO NOT modify or change anything
2. Parse the input according to the function signature and call the appropriate function
3. Return the exact output the code produces
4. Compare with expected output

USER'S CODE:
\`\`\`${language}
${code}
\`\`\`
${functionInfo}
INPUT: ${testCase.input}
EXPECTED OUTPUT: ${testCase.expected}

INSTRUCTIONS:
- Execute the code with the input exactly as provided
- Parse the input and call the main function in the code
- Return the actual output the code produces
- Do NOT modify, fix, or improve the code in any way
- If there's an error, return the error message
- Compare actual output with expected output

Respond in this JSON format:
{
  "actual_output": "the exact output from running the code",
  "expected_output": "${testCase.expected}",
  "passed": true/false,
  "error": null or "error message if any"
}`;

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('🔍 Gemini raw response:', text);
        
        // Try to parse JSON response
        let testResult;
        try {
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            testResult = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (parseError) {
          console.log('🔍 Failed to parse JSON, creating fallback result');
          // Fallback: create result manually
          testResult = {
            actual_output: text.includes('Error') ? '' : text.trim(),
            expected_output: testCase.expected,
            passed: false,
            error: text.includes('Error') ? text : 'Could not parse execution result'
          };
        }
        
        // Ensure we have the right format
        const finalResult = {
          input: testCase.input,
          expected: testCase.expected,
          actual: testResult.actual_output || '',
          passed: testResult.passed || false,
          error: testResult.error || null,
          status: testResult.passed ? 'Passed' : 'Failed'
        };
        
        console.log('🔍 Final test result:', finalResult);
        results.push(finalResult);

      } catch (error) {
        console.error('Error processing test case:', error);
        results.push({
          input: testCase.input,
          expected: testCase.expected,
          actual: '',
          passed: false,
          error: error.message,
          status: 'Error'
        });
      }
    }

    // Calculate overall results
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const allPassed = passedCount === totalCount;

    // Analyze pseudocode progress if provided
    let pseudocodeProgress = null;
    if (pseudocode) {
      try {
        console.log('🔍 Analyzing pseudocode progress...');
        
        const progressPrompt = `You are a code analysis expert. Compare the user's actual code with the pseudocode steps to determine which parts have been implemented correctly.

PSEUDOCODE STEPS:
${pseudocode}

USER'S ACTUAL CODE:
\`\`\`${language}
${code}
\`\`\`

For each pseudocode step, analyze if it's implemented correctly in the actual code:

INSTRUCTIONS:
1. Split the pseudocode into individual logical steps
2. For each step, determine if it's implemented correctly in the code
3. Return status as: "completed" (implemented correctly), "partial" (partially implemented), or "not_started" (not implemented)

Respond in this JSON format:
{
  "steps": [
    {
      "step_number": 1,
      "description": "first step description",
      "status": "completed|partial|not_started",
      "explanation": "brief explanation of implementation status"
    }
  ]
}`;

        const progressResult = await geminiModel.generateContent(progressPrompt);
        const progressResponse = await progressResult.response;
        const progressText = progressResponse.text();
        
        console.log('🔍 Pseudocode progress raw response:', progressText);
        
        // Try to parse JSON response
        try {
          const jsonMatch = progressText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            pseudocodeProgress = JSON.parse(jsonMatch[0]);
            console.log('🔍 Parsed pseudocode progress:', pseudocodeProgress);
          }
        } catch (parseError) {
          console.log('🔍 Failed to parse pseudocode progress JSON');
        }
      } catch (error) {
        console.error('Error analyzing pseudocode progress:', error);
      }
    }

    console.log('Code execution results:', {
      language,
      passedCount,
      totalCount,
      allPassed,
      pseudocodeProgressSteps: pseudocodeProgress?.steps?.length || 0
    });

    res.json({
      results,
      summary: {
        passed: passedCount,
        total: totalCount,
        allPassed,
        percentage: Math.round((passedCount / totalCount) * 100)
      },
      pseudocodeProgress
    });

  } catch (error) {
    console.error('Error in code execution:', error);
    res.status(500).json({ error: 'Failed to execute code' });
  }
});

// MCQ generation endpoint for pseudocode lines
app.post('/api/generate-mcq', async (req, res) => {
  try {
    const { pseudocodeLine, language, context, nextStep, problemTitle, problemDescription } = req.body;
    
    if (!pseudocodeLine || !language) {
      return res.status(400).json({ error: 'Pseudocode line and language are required' });
    }

    console.log('Generating MCQ for pseudocode line:', pseudocodeLine);
    console.log('Language:', language);

    const model = geminiModel;
    
    const prompt = `You are a coding education expert creating MCQ questions that map pseudocode to real code solutions.

PROBLEM: "${problemTitle || 'Programming Problem'}"
${problemDescription ? `DESCRIPTION: ${problemDescription.replace(/<[^>]*>/g, '').substring(0, 500)}...` : ''}

USER'S PSEUDOCODE STEP: "${pseudocodeLine}"
TARGET LANGUAGE: ${language}
${context ? `CONTEXT: ${context}` : ''}
${nextStep ? `NEXT STEP: "${nextStep}"` : ''}

CRITICAL INSTRUCTION: You MUST follow this exact process to ensure the MCQ matches the user's pseudocode:

STEP 1: ANALYZE USER'S PSEUDOCODE
Carefully read and understand what the user's pseudocode step "${pseudocodeLine}" is trying to accomplish:
- What is the specific action or operation described?
- What data structures or variables are mentioned?
- What is the intent behind this step?
- Is this step logically correct for solving the problem?

STEP 2: GENERATE MATCHING SOLUTION
Create a ${language} code solution that DIRECTLY implements the user's pseudocode step as written:
- If the user's pseudocode mentions specific approaches (e.g., "use hash map", "sort array"), use exactly those approaches
- If the user's pseudocode uses specific variable names, try to match them
- If the user's pseudocode describes a specific algorithm step, implement that exact step
- The code MUST be a faithful translation of what the user wrote, even if it's not the most optimal approach
- Do NOT assume or add steps the user didn't mention
- Do NOT optimize beyond what the user described

CRITICAL FORMATTING REQUIREMENTS:
- Use proper indentation (4 spaces) for nested code blocks
- Format control structures clearly with proper line breaks
- Ensure all MCQ options have consistent, readable formatting
- Use \\n for line breaks and proper spacing within code blocks
- Make multi-line code easy to read and understand

STEP 3: CREATE REALISTIC VARIATIONS
Generate 3 incorrect variations with OBVIOUS and DISTINCT differences:
- Variation 1: Clear syntax error (wrong operators like = vs ==, missing semicolons, bracket mismatches)
- Variation 2: Obvious logic error (wrong data type, incorrect method name, wrong variable)
- Variation 3: Different approach entirely (using different data structure or completely different logic)

MAKE DIFFERENCES OBVIOUS:
- Each option should be clearly distinguishable at first glance
- Use different variable names, operators, or data structures between options
- Avoid subtle differences that require careful examination
- Make errors that beginners would easily spot as wrong

STEP 4: VALIDATE MATCH
Ensure the correct answer truly represents what the user's pseudocode describes:
- Does it implement the exact operation mentioned?
- Does it use the same approach/data structure the user specified?
- Would someone reading the user's pseudocode expect this code?

NESTING CONSISTENCY RULES:
${nextStep ? `Since the next step is "${nextStep}":
- IF the current pseudocode creates a control structure (if/while/for) that would contain the next step, ALL OPTIONS must include "(next pseudocode here)" placeholder INSIDE the block
- IF the current and next steps are SEQUENTIAL operations, NO OPTIONS should have any placeholder
- CRITICAL: Be consistent across ALL 4 options - either ALL have the placeholder or NONE do
- Example: "for each element in array" → ALL options: "for (...) {\\n    (next pseudocode here)\\n}"
- Example: "initialize sum to zero" → ALL options: just the initialization, no placeholder` : 'This appears to be a standalone step without nesting requirements.'}

LANGUAGE-SPECIFIC FORMATTING RULES:

For ${language}:
${language === 'JavaScript' ? `
- Use proper brace placement: "if (condition) {\\n    code\\n}"
- Use 4-space indentation for nested blocks
- Include semicolons where appropriate
- Use proper spacing around operators: "i < arr.length"
- Format multi-line structures clearly` : 
language === 'Python' ? `
- Use proper indentation (4 spaces) for nested blocks
- No braces needed: "if condition:\\n    code"
- Use proper spacing around operators: "i < len(arr)"
- Format multi-line structures with consistent indentation` :
language === 'Java' ? `
- Use proper brace placement: "if (condition) {\\n    code\\n}"
- Use 4-space indentation for nested blocks
- Include semicolons for statements
- Use proper spacing around operators
- Format multi-line structures clearly` : `
- Use language-appropriate formatting conventions
- Ensure proper indentation for nested structures
- Use consistent spacing and line breaks`}

QUALITY REQUIREMENTS:
1. The correct answer MUST directly implement what the user's pseudocode describes
2. Do NOT create "better" or "more optimal" solutions than what the user described
3. If the user's pseudocode is inefficient or suboptimal, implement it as described
4. All options should look plausible but only the correct one should match the user's intent
5. Use variable names and approaches that align with the user's pseudocode
6. Avoid artificial patterns like single-iteration loops unless the user's pseudocode specifically describes such patterns

EXAMPLES OF OBVIOUS DIFFERENCES:

Example 1 - "create hash map to store numbers and their indices":
✓ Correct: "let map = new Map();"
✗ Wrong A: "let map = new Set();" (wrong data structure - Set vs Map)
✗ Wrong B: "let map = [];" (completely wrong - array instead of map)  
✗ Wrong C: "let map = new Map;" (syntax error - missing parentheses)

Example 2 - "initialize counter to zero":
✓ Correct: "let counter = 0;"
✗ Wrong A: "let counter == 0;" (wrong operator - comparison instead of assignment)
✗ Wrong B: "let count = 0;" (wrong variable name - count vs counter)
✗ Wrong C: "counter = 0;" (missing declaration keyword)

Example 3 - "for each element in array" (with next step):
✓ Correct: "for (let i = 0; i < arr.length; i++) {\\n    (next pseudocode here)\\n}"
✗ Wrong A: "for (let i = 1; i <= arr.length; i++) {\\n    (next pseudocode here)\\n}" (off-by-one error)
✗ Wrong B: "for (let element of arr) {\\n    (next pseudocode here)\\n}" (different loop style)
✗ Wrong C: "while (i < arr.length) {\\n    (next pseudocode here)\\n}" (wrong loop type)

Example 4 - "if current element equals target" (with next step):
✓ Correct: "if (arr[i] === target) {\\n    (next pseudocode here)\\n}"
✗ Wrong A: "if (arr[i] == target) {\\n    (next pseudocode here)\\n}" (wrong equality operator)
✗ Wrong B: "if arr[i] === target {\\n    (next pseudocode here)\\n}" (missing parentheses)
✗ Wrong C: "if (arr[i] = target) {\\n    (next pseudocode here)\\n}" (assignment instead of comparison)

Example 5 - Complex nested structure "for each element, if element is even":
✓ Correct: "for (let i = 0; i < arr.length; i++) {\\n    if (arr[i] % 2 === 0) {\\n        (next pseudocode here)\\n    }\\n}"
✗ Wrong A: "for (let i = 0; i < arr.length; i++) {\\nif (arr[i] % 2 === 0) {\\n(next pseudocode here)\\n}\\n}" (poor indentation)
✗ Wrong B: "for (let i = 0; i < arr.length; i++) { if (arr[i] % 2 === 0) { (next pseudocode here) } }" (no line breaks)
✗ Wrong C: "for (let i = 0; i < arr.length; i++) {\\n    if (arr[i] % 2 == 0) {\\n        (next pseudocode here)\\n    }\\n}" (wrong equality operator)

FORMATTING REQUIREMENTS:
- Each nested level should be indented 4 spaces deeper
- Use \\n for line breaks between statements and blocks
- Keep opening braces on the same line as the control statement
- Closing braces should align with the control statement
- Maintain consistent spacing around operators and parentheses

CRITICAL: All options must be consistent with placeholder usage - either ALL have it or NONE do.

This ensures the MCQ tests the user's ability to implement their own pseudocode with clearly distinguishable options.

Format your response as JSON:
{
  "question": "How would you convert this pseudocode to ${language}?",
  "pseudocode": "${pseudocodeLine}",
  "options": [
    {
      "id": "A",
      "text": "option A code",
      "isCorrect": false
    },
    {
      "id": "B", 
      "text": "option B code",
      "isCorrect": true
    },
    {
      "id": "C",
      "text": "option C code", 
      "isCorrect": false
    },
    {
      "id": "D",
      "text": "option D code",
      "isCorrect": false
    }
  ],
  "explanation": "Brief explanation of why the correct answer is right",
  "optionExplanations": {
    "A": "Why option A is wrong - specific reason",
    "B": "Why option B is correct - specific reason", 
    "C": "Why option C is wrong - specific reason",
    "D": "Why option D is wrong - specific reason"
  }
}

Return only valid JSON, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Raw MCQ generation response:', text);

    // Parse the JSON response
    let mcqData;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        mcqData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.log('Failed to parse MCQ JSON, creating fallback');
      // Fallback MCQ
      const fallbackOptions = language === 'JavaScript' ? [
        { id: "A", text: "let result = 0;", isCorrect: true },
        { id: "B", text: "var result == 0;", isCorrect: false },
        { id: "C", text: "result = null;", isCorrect: false },
        { id: "D", text: "int result = 0;", isCorrect: false }
      ] : language === 'Python' ? [
        { id: "A", text: "result = 0", isCorrect: true },
        { id: "B", text: "result == 0", isCorrect: false },
        { id: "C", text: "let result = 0", isCorrect: false },
        { id: "D", text: "result := 0", isCorrect: false }
      ] : language === 'Java' ? [
        { id: "A", text: "int result = 0;", isCorrect: true },
        { id: "B", text: "result = 0;", isCorrect: false },
        { id: "C", text: "let result = 0;", isCorrect: false },
        { id: "D", text: "int result == 0;", isCorrect: false }
      ] : [
        { id: "A", text: "int result = 0;", isCorrect: true },
        { id: "B", text: "result = 0;", isCorrect: false },
        { id: "C", text: "let result = 0;", isCorrect: false },
        { id: "D", text: "var result = 0;", isCorrect: false }
      ];

      mcqData = {
        question: `How would you convert this pseudocode to ${language}?`,
        pseudocode: pseudocodeLine,
        options: fallbackOptions,
        explanation: "This is a fallback question for basic variable initialization.",
        optionExplanations: {
          "A": "Correct syntax for variable declaration and initialization",
          "B": "Wrong operator - uses comparison instead of assignment",
          "C": "Wrong language syntax for this language", 
          "D": "Invalid syntax or wrong language construct"
        }
      };
    }

    console.log('Final MCQ data sent to frontend:', mcqData);

    res.json(mcqData);
  } catch (error) {
    console.error('Error generating MCQ:', error);
    res.status(500).json({ error: 'Failed to generate MCQ' });
  }
});

// Code summary generation endpoint
app.post('/api/generate-code-summary', async (req, res) => {
  try {
    const { problemTitle, problemDescription, pseudocode, language, mcqAnswers } = req.body;
    
    if (!problemTitle || !pseudocode || !language) {
      return res.status(400).json({ error: 'Problem title, pseudocode, and language are required' });
    }

    console.log('Generating code summary for:', problemTitle);
    console.log('Language:', language);
    console.log('MCQ Answers provided:', mcqAnswers?.length || 0);

    const model = geminiModel;
    
    const prompt = `Generate a comprehensive code summary that implements the user's exact pseudocode approach:

PROBLEM: "${problemTitle}"
${problemDescription ? `DESCRIPTION: ${problemDescription.replace(/<[^>]*>/g, '').substring(0, 1000)}` : ''}

USER'S PSEUDOCODE STEPS:
${pseudocode}

TARGET LANGUAGE: ${language}
${mcqAnswers && mcqAnswers.length > 0 ? `USER'S MCQ ANSWERS: ${JSON.stringify(mcqAnswers)}` : ''}

CRITICAL INSTRUCTION: You must implement the solution based on the USER'S PSEUDOCODE, not an optimal solution.

IMPLEMENTATION REQUIREMENTS:
1. FOLLOW USER'S APPROACH: Implement exactly what the user described in their pseudocode
   - If they mentioned specific data structures (hash map, array, etc.), use those
   - If they described a particular algorithm approach, follow that approach
   - If their approach is suboptimal, implement it as described anyway
   - Do NOT substitute with more optimal solutions

2. USE USER'S MCQ ANSWERS: If provided, incorporate the code segments the user selected
   - The MCQ answers represent the user's understanding of how to implement each step
   - Build the final solution using these code segments as building blocks
   - Ensure the final code is consistent with their choices

3. FINAL COMPLETE CODE: Write the full, working ${language} solution that:
   - Implements all the user's pseudocode steps in order
   - Uses the approaches and data structures they specified
   - Incorporates their MCQ answer choices where applicable
   - Actually solves the problem (even if not optimally)

4. EXPLANATION: Explain how the algorithm works based on the user's approach:
   - Walk through each step of their pseudocode
   - Explain why their approach works for this problem
   - Highlight the logic behind their chosen method

5. PSEUDOCODE BREAKDOWN: List the user's original pseudocode steps clearly

6. EFFICIENCY ANALYSIS: Analyze the complexity of the user's chosen approach:
   - What is the time/space complexity of their specific implementation?
   - Are there any trade-offs in their approach?
   - Explain the efficiency characteristics of their chosen method

CRITICAL CODE FORMATTING REQUIREMENTS:
- DO NOT include function parameters or function signatures
- DO NOT include return statements or return type declarations
- Focus ONLY on the core algorithm implementation
- Start directly with variable declarations and algorithm logic
- Exclude any function wrapper, just show the algorithm body
- Make it look like code that would go inside a function, not the function itself

EXAMPLE FORMAT:
Instead of: function twoSum(nums, target) { ... return result; }
Generate: let map = new Map();
         for (let i = 0; i < nums.length; i++) {
             // algorithm logic here
         }

REQUIREMENTS:
- Implement the user's exact approach, not the most optimal one
- Use the data structures and methods they specified in pseudocode
- Make the code match their understanding as shown in MCQ answers
- Ensure the solution works but reflects their chosen approach
- Keep explanations focused on their specific implementation
- Show only the algorithm implementation, not function boilerplate

Format your response as JSON:
{
  "finalCode": "Complete working ${language} code solution",
  "explanation": "Detailed explanation of how the algorithm works and why it's effective",
  "pseudocodeSteps": [
    "Step 1: Clear description",
    "Step 2: Clear description",
    "Step 3: Clear description"
  ],
  "efficiency": {
    "timeComplexity": "O(n) or appropriate complexity",
    "spaceComplexity": "O(1) or appropriate complexity", 
    "explanation": "Detailed explanation of why these complexities and any trade-offs"
  }
}

Return only valid JSON, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Raw code summary response:', text);

    // Parse the JSON response
    let summaryData;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summaryData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.log('Failed to parse code summary JSON, creating fallback');
      // Fallback summary
      summaryData = {
        finalCode: `// ${language} solution for ${problemTitle}\n// TODO: Implement solution based on pseudocode`,
        explanation: "This is a fallback explanation. The AI was unable to generate a proper code summary.",
        pseudocodeSteps: pseudocode.split('\n').filter(line => line.trim()).map((line, index) => 
          `${index + 1}. ${line.trim().replace(/^\d+[\.\)\-\s]*/, '')}`
        ),
        efficiency: {
          timeComplexity: "O(n)",
          spaceComplexity: "O(1)",
          explanation: "Complexity analysis unavailable due to generation error."
        }
      };
    }

    console.log('Final code summary sent to frontend:', {
      ...summaryData,
      finalCode: summaryData.finalCode.substring(0, 100) + '...' // Log truncated code
    });

    res.json(summaryData);
  } catch (error) {
    console.error('Error generating code summary:', error);
    res.status(500).json({ error: 'Failed to generate code summary' });
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

    // Check if quiz completion already exists
    const { data: existingCompletion } = await supabase
      .from('user_lesson_completion')
      .select('quiz_score, quiz_completed')
      .eq('user_id', user.id)
      .eq('problem_id', questionId)
      .single();

    console.log('🔍 Backend - Existing quiz completion:', existingCompletion);

    // Save quiz completion to database (upsert will update if exists)
    const { error } = await supabase
      .from('user_lesson_completion')
      .upsert({
        user_id: user.id,
        problem_id: questionId,
        quiz_completed: completed,
        quiz_score: score,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,problem_id'
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

// Function to detect relevant data structure image
const detectDataStructureImage = async (lessonContent) => {
  if (!geminiModel) {
    return null;
  }

  try {
    // Available data structure images
    const availableImages = [
      'array', 'linkedlist', 'hashmap', 'binarytree', 'queue', 
      'priorityqueue', 'matrix', 'trie', 'undirectedgraph', 
      'directedgraph', 'weightedgraph'
    ];

    const detectionPrompt = `Analyze this lesson content and determine the PRIMARY data structure being taught.

Available data structure images: ${availableImages.join(', ')}

Lesson content: ${JSON.stringify(lessonContent)}

Rules:
- Return ONLY the exact name from the available list if there's a clear match
- If no clear primary data structure match, return "none"
- Be conservative - only return a match if you're confident it's the main focus
- For example: if it mentions "hash table" or "hash map", return "hashmap"
- If it mentions "binary tree" or "tree", return "binarytree"
- If it mentions "linked list", return "linkedlist"
- If it mentions "array" as the main structure, return "array"

Respond with ONLY one word: either the exact data structure name or "none".`;

    const result = await geminiModel.generateContent(detectionPrompt);
      const response = await result.response;
    const detectedStructure = response.text().trim().toLowerCase();

    // Verify the response is valid
    if (availableImages.includes(detectedStructure)) {
      return detectedStructure;
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting data structure image:', error);
    return null;
  }
};

// Generate Topic Lesson Endpoint
app.post('/api/generate-topic-lesson', async (req, res) => {
  if (!geminiModel) {
    return res.status(500).json({ error: 'Lesson generation is not configured on the server.' });
  }

  try {
    const { topicName, problemId, userId, lessonPart, specificPrompt, structuredLesson, fastStructuredLesson } = req.body;

    if (!topicName || !problemId) {
      return res.status(400).json({ error: 'Topic name and problem ID are required.' });
    }

    // Fetch user skill level
    let userSkillLevel = 'Beginner'; // Default to Beginner
    if (userId) {
      try {
        const { getUserProfile } = require('./services/profileService');
        const userProfile = await getUserProfile(userId);
        if (userProfile && userProfile.skill_level) {
          userSkillLevel = userProfile.skill_level;
        }
      } catch (error) {
        console.log('Could not fetch user profile, defaulting to Beginner skill level');
      }
    }

    console.log(`User skill level: ${userSkillLevel}`);

    // Route to appropriate lesson generation based on skill level
    if (userSkillLevel === 'Beginner') {
      // Call the easy lesson API
      console.log('🎯 Routing to BEGINNER lesson generation (generateEasyLesson)');
      return await generateEasyLesson(req, res);
    } else {
      // Call the harder lesson API for Intermediate and Professional
      console.log(`🎯 Routing to HARDER lesson generation (generateHarderLesson) for skill level: ${userSkillLevel}`);
      return await generateHarderLesson(req, res);
    }

  } catch (err) {
    console.error('Lesson generation routing error:', err);
    return res.status(500).json({ error: 'Failed to generate lesson', details: err.message });
  }
});

// Generate Easy Lesson Endpoint (for Beginners)
app.post('/api/generate-easy-lesson', generateEasyLesson);

async function generateEasyLesson(req, res) {
  console.log('📚 EXECUTING generateEasyLesson - BEGINNER version with super simple language');
  
  if (!geminiModel) {
    return res.status(500).json({ error: 'Lesson generation is not configured on the server.' });
  }

  try {
    const { topicName, problemId, userId, lessonPart, specificPrompt, structuredLesson, fastStructuredLesson } = req.body;

    if (!topicName || !problemId) {
      return res.status(400).json({ error: 'Topic name and problem ID are required.' });
    }

    // Get problem details from database
    const { data: problemData, error: problemError } = await supabase
      .from('topic_problems')
      .select('title')
      .eq('leetcode_id', problemId)
      .single();

    if (problemError || !problemData) {
      console.error('Error fetching problem:', problemError);
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Handle fast structured lesson generation (all parts in one call) - EASY VERSION
    if (fastStructuredLesson) {
      const easyPrompt = `You are an expert programming tutor teaching ABSOLUTE BEGINNERS who have NEVER coded before. For the problem "${problemData.title}" in the topic "${topicName}", follow these steps:

STEP 1: First, mentally solve the problem and identify the IDEAL solution approach.
STEP 2: Identify the MOST IMPORTANT data structure and algorithm needed for this ideal solution.
STEP 3: Create a lesson that teaches these key concepts WITHOUT revealing the solution steps.

CRITICAL: This is for someone who has NEVER touched code before - imagine explaining to your grandparent or a 10-year-old child.

TEACHING APPROACH FOR COMPLETE BEGINNERS:
- Start with what they already know from daily life
- Use stories, analogies, and examples from everyday activities
- Explain EVERYTHING as if it's their first time hearing these words
- Break down complex ideas into tiny, digestible pieces
- Use encouraging, friendly language that makes coding feel approachable
- Connect programming concepts to things they do every day
- Make it feel like a fun discovery, not intimidating technical stuff

LANGUAGE REQUIREMENTS - SIMPLE BUT ACCURATE:
- Use words like "imagine you're...", "think about when you...", "it's exactly like..."
- Keep technical terms but ALWAYS pair them with everyday analogies:
  * "Array (or list)" → "like a shopping list where each item has a number"
  * "Hash map (or hash table)" → "like a magic address book where each name maps to a phone number"
  * "Binary search" → "like the number guessing game where you guess the middle - this algorithm cuts the search space in half"
  * "Two pointers" → "like using both hands to point at different things in your list"
  * "Stack (data structure)" → "like a pile of dinner plates - you can only add or remove from the top"
  * "Queue (data structure)" → "like waiting in line at the movies - first person in line gets served first"
  * "Tree (data structure)" → "like a family tree with parents and children nodes"
  * "Graph (data structure)" → "like a map showing how cities connect with edges"
  * "Recursion" → "like looking in a mirror that reflects another mirror - the function calls itself"
  * "Loop (or iteration)" → "doing the same thing over and over, like checking each item in your list"
  * "Algorithm" → "a recipe or step-by-step instructions to solve a problem"
  * "Variable" → "a box with a label that stores a value"
  * "Function" → "a machine that takes input and produces output"

STORYTELLING APPROACH:
- Start each explanation with a relatable scenario
- Use characters or situations they can visualize
- Make the explanation feel like a conversation with a friend
- Add emotional context - why would someone WANT to use this?
- Use "you" language to make it personal

COMPLEXITY EXPLANATIONS FOR BEGINNERS:
- ALWAYS mention the technical notation (O(1), O(n), etc.) but immediately explain with everyday comparisons
- Instead, use technical terms WITH everyday speed and storage comparisons:
  * Fast operations: "O(1) - instant like speed dial", "O(log n) - quick like finding a word in a dictionary"
  * Slow operations: "O(n) - slow like checking every house on a street", "O(n²) - very slow like comparing every person with every other person"
  * Space usage: "O(1) space - uses just one sticky note", "O(n) space - needs a filing cabinet that grows with your data"
- Make it relatable to daily activities but always include the technical terms
- Focus on WHY the speed/storage matters in practical programming terms
- Example: "Hash table lookup is O(1) time complexity - that means it's instant like speed dial, no matter if you have 10 contacts or 10 million!"

CRITICAL REQUIREMENTS:
- Each part must be EXACTLY 3-4 sentences maximum
- Use the simplest possible words - avoid any jargon
- Focus ONLY on the most important concept/data structure for the IDEAL solution
- Make it feel encouraging and achievable, not scary
- The "Relevance to this question" should feel like "Oh, that makes perfect sense!"

FOR DEFINITION CONTENT:
- MUST be exactly 3 numbered points: "1) What it is: [explanation] 2) How it works: [explanation] 3) Advantages: [explanation]"
- Each point should be 1-2 sentences using the SIMPLEST possible language
- Use analogies from home, cooking, shopping, organizing, or playing games
- Make it sound like explaining to a curious child
- Follow this EXACT format without deviation

CRITICAL: For the definition content, you MUST use EXACTLY this format:
"1) What it is: [Start with analogy then connect to actual concept - e.g., 'It's like a magic phone book where you say a name and instantly find the number. This is exactly what a hash map does - it lets you use a key to instantly find the corresponding value.'] 2) How it works: [Explain the mechanism using both analogy and technical terms] 3) Advantages: [Benefits explained with both everyday examples and programming advantages]"

EXAMPLES OF BEGINNER-FRIENDLY EXPLANATIONS:

Bad (too technical): "A hash map provides O(1) lookup time complexity"
Good: "A hash map (like a magic phone book) provides O(1) lookup time - that means it's instant, just like speed dial where you press one button and immediately get your friend's number"

Bad (avoiding terms): "This magic list stores things in order"
Good: "An array (or list) stores elements in order, like a numbered shopping list where each item has its own position"

Bad (too technical): "Binary search reduces the search space by half each iteration"
Good: "Binary search is like the number guessing game - this algorithm cuts the search space in half each time, making it O(log n) which means it's super fast even with huge lists"

Bad (avoiding terms): "This is slow"
Good: "This has O(n) time complexity - it's like checking every house on a street one by one, so if there are more houses (larger input), it takes longer"

Bad (avoiding terms): "This only needs one sticky note"
Good: "This has O(1) space complexity - it only needs one sticky note to remember things, no matter how big the problem gets"

Bad (too technical): "Hash table lookup is O(1)"
Good: "Hash table lookup is O(1) time complexity - it's instant like having speed dial, where the key maps to a value just like how a name maps to a phone number"

STORY-DRIVEN EXAMPLES:
- "Imagine you're organizing your bookshelf..."
- "Think about when you're looking for your keys..."
- "Picture yourself at the grocery store..."
- "It's like when you're dealing cards to friends..."
- "Imagine you're a detective solving a mystery..."

Respond with ONLY a JSON object in this exact format:
{
  "title": "Lesson for ${problemData.title}",
  "parts": [
    {
      "title": "Definition",
      "cards": [
        {
          "type": "definition",
          "title": "What is [concept name in simple words]?",
          "content": "1) What it is: [Start with analogy then connect to actual concept - e.g., 'It's like a magic phone book where you say a name and instantly find the number. This is exactly what a hash map does - it lets you use a key to instantly find the corresponding value.'] 2) How it works: [Explain the mechanism using both analogy and technical terms] 3) Advantages: [Benefits explained with both everyday examples and programming advantages]",
          "icon": "📚"
        }
      ]
    },
    {
      "title": "When to use",
      "cards": [
        {
          "type": "usage",
          "title": "When do we use this?",
          "content": "Explain scenarios where this data structure/algorithm is perfect. Start with everyday situations then connect to programming problems. Always mention the technical context - e.g., 'Just like you'd use a phone book when you need to find someone's number quickly, programmers use hash maps when they need fast lookups by key.'",
          "icon": "✨"
        }
      ]
    },
    {
      "title": "Efficiency of operations",
      "cards": [
        {
          "type": "complexity",
          "title": "How fast and efficient is this?",
          "content": "Explain time complexity and space complexity using everyday analogies. Start with time complexity first, then space complexity. Structure it as: 'Time complexity: [explanation with O(?) notation]. Space complexity: [explanation with O(?) notation].' For example: 'Time complexity: Finding something in a hash map is O(1) - instant like speed dial, no matter how many contacts you have. Space complexity: Hash maps need O(n) space - like having a filing cabinet that grows with your data.'",
          "icon": "⚡"
        }
      ]
    },
    {
      "title": "Relevance to question",
      "cards": [
        {
          "type": "advantages",
          "title": "Why is this useful for solving problems?",
          "content": "Connect the concept to real problem-solving scenarios and hint at the approach WITHOUT revealing the full solution. For example: 'Just like having a phone book organized by name saves you from checking every page, using a hash map in programming saves time when you need to find, store, or check if data exists. For problems like finding pairs or checking existence, you might store values as you go and look them up instantly instead of searching repeatedly.'",
          "icon": "🎯"
        }
      ]
    },
    {
      "title": "Algorithm Deep Dive",
      "cards": [
        {
          "type": "usage",
          "title": "How to approach",
          "content": "Explain the general algorithmic thinking and strategy using simple, friendly terms. Provide sufficient hints and clues about the approach without revealing the complete solution. For example: 'Think step-by-step: as you look at each item, ask yourself what you need to find and use your data structure to help you remember what you've seen before. The key insight is to store information as you go, so you can quickly check if you've encountered what you need.'",
          "icon": "🎯"
        }
      ]
    }
  ],
  "keyConcepts": ["Simple everyday concept 1", "Simple everyday concept 2", "Simple everyday concept 3"],
  "example": "Brief example using a story or everyday scenario",
  "hint": "Encouraging hint using simple, friendly language",
  "commonMistake": "Common mistake explained like a friendly warning from a friend"
}

IMPORTANT NOTES:
- ALWAYS include BOTH the 4 main lesson parts AND the Algorithm Deep Dive section (5 total parts)
- The Algorithm Deep Dive should be the 5th and final part with exactly 1 card: "How to approach"
- Focus on the most important concepts for the IDEAL solution
- Make everything feel approachable and not intimidating
- Use encouraging language throughout
- For the Algorithm Deep Dive, teach the general technique with sufficient hints without revealing the specific solution



Generate ONLY the JSON object, no other text.`;

      const result = await geminiModel.generateContent(easyPrompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const lessonData = JSON.parse(text);
      
      // Detect relevant data structure image
      const detectedImage = await detectDataStructureImage(lessonData);
      if (detectedImage) {
        lessonData.dataStructureImage = detectedImage;
      }
      
      return res.json(lessonData);
    }

  } catch (err) {
    console.error('Easy lesson generation error:', err);
    return res.status(500).json({ error: 'Failed to generate easy lesson', details: err.message });
  }
}

// Generate Harder Lesson Endpoint (for Intermediate/Professional)
app.post('/api/generate-harder-lesson', generateHarderLesson);

async function generateHarderLesson(req, res) {
  if (!geminiModel) {
    return res.status(500).json({ error: 'Lesson generation is not configured on the server.' });
  }

  try {
    const { topicName, problemId, userId, lessonPart, specificPrompt, structuredLesson, fastStructuredLesson } = req.body;

    if (!topicName || !problemId) {
      return res.status(400).json({ error: 'Topic name and problem ID are required.' });
    }

    // Get problem details from database
    const { data: problemData, error: problemError } = await supabase
      .from('topic_problems')
      .select('title')
      .eq('leetcode_id', problemId)
      .single();

    if (problemError || !problemData) {
      console.error('Error fetching problem:', problemError);
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Handle fast structured lesson generation (all parts in one call) - HARDER VERSION
    if (fastStructuredLesson) {
      const harderPrompt = `You are an expert programming tutor. For the problem "${problemData.title}" in the topic "${topicName}", follow these steps:

STEP 1: First, mentally solve the problem and identify the IDEAL solution approach.
STEP 2: Identify the MOST IMPORTANT data structure and algorithm needed for this ideal solution.
STEP 3: Create a lesson that teaches these key concepts WITHOUT revealing the solution steps.

TEACHING APPROACH:
- Teach the concept/data structure and algorithm in isolation
- Explain why they're powerful and when to use them
- Give examples that illustrate the concepts but don't solve the target problem
- DO NOT reveal the step-by-step solution to "${problemData.title}"
- DO NOT show code that solves the specific problem

IMPORTANT: Focus on creating clear, educational content that teaches the concepts effectively.

CRITICAL REQUIREMENTS:
- Each part must be EXACTLY 3-4 sentences maximum
- Be concise, direct, and educational
- Focus ONLY on the most important concept/data structure for the IDEAL solution
- Focus on clear, educational explanations
- The "Relevance to this question" should explain WHY this concept is perfect for this type of problem and give a ROUGH hint about the approach WITHOUT revealing the complete solution steps

FOR DEFINITION CONTENT:
- MUST be exactly 3 numbered points: "1) What it is: [explanation] 2) How it works: [explanation] 3) Advantages: [explanation]"
- Each point should be 1-2 sentences maximum
- Follow this EXACT format without deviation
- Do NOT add extra text or formatting

CRITICAL: For the definition content, you MUST use EXACTLY this format:
"1) What it is: [your explanation] 2) How it works: [your explanation] 3) Advantages: [your explanation]"

Respond with ONLY a JSON object in this exact format:
{
  "title": "Lesson for ${problemData.title}",
  "parts": [
    {
      "title": "Definition",
      "cards": [
        {
          "type": "definition",
          "title": "What is [concept name]?",
          "content": "1) What it is: [your explanation] 2) How it works: [your explanation] 3) Advantages: [your explanation]",
          "icon": "📚"
        }
      ]
    },
    {
      "title": "When to use",
      "cards": [
        {
          "type": "usage",
          "title": "When do we use this?",
          "content": "Brief explanation of when this concept is useful. This is the MOST IMPORTANT part.",
          "icon": "✨"
        }
      ]
    },
    {
      "title": "Efficiency of operations", 
      "cards": [
        {
          "type": "complexity",
          "title": "How fast and efficient is this?",
          "content": "Explain time complexity and space complexity clearly and concisely. Structure it as: 'Time complexity: [explanation with O(?) notation]. Space complexity: [explanation with O(?) notation].' For example: 'Time complexity: Hash table operations are O(1) on average, making lookups extremely fast. Space complexity: O(n) as we need storage proportional to the number of elements.'",
          "icon": "⚡"
        }
      ]
    },
    {
      "title": "Relevance to question",
      "cards": [
        {
          "type": "advantages",
          "title": "Why is this useful for solving problems?",
          "content": "Brief explanation connecting the concept to problem-solving scenarios and hint at the general approach WITHOUT revealing the complete solution. Explain why programmers choose this approach for certain types of problems and give a rough idea of how it might be applied.",
          "icon": "🎯"
        }
      ]
    },
    {
      "title": "Algorithm Deep Dive",
      "cards": [
        {
          "type": "usage",
          "title": "How to approach",
          "content": "Explain the general algorithmic thinking and strategy using technical terminology. Provide sufficient hints and clues about the approach without revealing the complete solution to this specific problem. Focus on the overall methodology and key insights that make this approach effective.",
          "icon": "🎯"
        }
      ]
    }
  ],
  "keyConcepts": ["Key concept 1", "Key concept 2", "Key concept 3"],
  "example": "Brief example",
  "hint": "Brief hint",
  "commonMistake": "Brief common mistake",

}

IMPORTANT NOTES:
- ALWAYS include BOTH the 4 main lesson parts AND the Algorithm Deep Dive section (5 total parts)
- The Algorithm Deep Dive should be the 5th and final part with exactly 1 card: "How to approach"
- Focus on the most important concepts for the IDEAL solution
- Make everything feel approachable and not intimidating
- Use encouraging language throughout
- For the Algorithm Deep Dive, teach the general technique with sufficient hints without revealing the specific solution


Generate ONLY the JSON object, no other text.`;

      const result = await geminiModel.generateContent(harderPrompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const lessonData = JSON.parse(text);
      
      // Detect relevant data structure image
      const detectedImage = await detectDataStructureImage(lessonData);
      if (detectedImage) {
        lessonData.dataStructureImage = detectedImage;
      }
      
      return res.json(lessonData);
    }

  } catch (err) {
    console.error('Harder lesson generation error:', err);
    return res.status(500).json({ error: 'Failed to generate harder lesson', details: err.message });
  }
}

// Generate Quiz Endpoint
app.post('/api/generate-quiz', async (req, res) => {
  if (!geminiModel) {
    return res.status(500).json({ error: 'Quiz generation is not configured on the server.' });
  }

  try {
    const { problemId, topicName, lessonData } = req.body;

    if (!problemId || !topicName) {
      return res.status(400).json({ error: 'Problem ID and topic name are required' });
    }

    // Get problem details from database - fetch full details including description
    const { data: problemData, error: problemError } = await supabase
      .from('leetcode_problems')
      .select('leetcode_id, title, description, description_text, examples, constraints, difficulty, tags')
      .eq('leetcode_id', problemId)
      .single();

    if (problemError || !problemData) {
      console.error('Error fetching problem:', problemError);
      return res.status(404).json({ error: 'Problem not found' });
    }

    // First, analyze the problem to identify the ideal solution approach
    const analysisPrompt = `You are an expert competitive programmer. Analyze this LeetCode problem and identify the OPTIMAL solution approach.

PROBLEM: "${problemData.title}"
DIFFICULTY: ${problemData.difficulty}
DESCRIPTION: ${problemData.description_text || problemData.description || 'No description available'}
EXAMPLES: ${JSON.stringify(problemData.examples || [])}
CONSTRAINTS: ${JSON.stringify(problemData.constraints || [])}
TAGS: ${JSON.stringify(problemData.tags || [])}

TASK: Identify the IDEAL solution approach for this problem. Respond with ONLY a JSON object:

{
  "primaryDataStructure": "Name of the primary data structure needed (e.g., 'Hash Map', 'Array', 'Binary Tree', 'Stack', 'Queue', 'Graph', etc.)",
  "primaryAlgorithm": "Name of the primary algorithm/technique (e.g., 'Two Pointers', 'Binary Search', 'Dynamic Programming', 'DFS', 'BFS', 'Sliding Window', 'Greedy', etc.)",
  "keyInsight": "The main insight needed to solve this problem efficiently",
  "timeComplexity": "Time complexity of optimal solution (e.g., 'O(n)', 'O(log n)', 'O(n log n)')",
  "spaceComplexity": "Space complexity of optimal solution (e.g., 'O(1)', 'O(n)', 'O(h)')",
  "criticalEdgeCases": ["Edge case 1", "Edge case 2", "Edge case 3"],
  "whyThisApproach": "Why this data structure/algorithm combination is optimal for this problem"
}`;

    console.log('🔍 Analyzing problem to identify optimal solution approach...');
    const analysisResult = await geminiModel.generateContent(analysisPrompt);
    const analysisResponse = await analysisResult.response;
    let analysisText = analysisResponse.text();
    analysisText = analysisText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let solutionAnalysis;
    try {
      solutionAnalysis = JSON.parse(analysisText);
      console.log('✅ Solution analysis:', solutionAnalysis);
    } catch (parseError) {
      console.error('Failed to parse solution analysis, using fallback');
      solutionAnalysis = {
        primaryDataStructure: "Hash Map",
        primaryAlgorithm: "Linear Scan",
        keyInsight: "Use efficient data structure for lookups",
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
        criticalEdgeCases: ["Empty input", "Single element", "No valid solution"],
        whyThisApproach: "Provides optimal time complexity for this problem type"
      };
    }

    const quizPrompt = `Create a quiz for LeetCode problem "${problemData.title}" with detailed explanations for every option.

🎯 CRITICAL REQUIREMENT: Every option (A, B, C, D) MUST have a detailed explanation in optionExplanations.

🎯 BEGINNER-FRIENDLY REQUIREMENT: This quiz is for BEGINNERS who are learning programming concepts. 
ALL time/space complexity notations (O(1), O(n), O(log n), etc.) mentioned ANYWHERE in the quiz (including option explanations) MUST be immediately explained in simple, beginner-friendly terms. For example, if you write 'O(n)', you must immediately say 'O(n) means linear time - the algorithm takes time proportional to the size n of the input.' This is a strict requirement for every mention, not just the main explanation.

🎯 OPTION LENGTH REQUIREMENT: All options (A, B, C, D) must be strictly within 1 sentence and maximum 12 words each. Do NOT make the correct answer more detailed, longer, or more technical than the others. All options should be plausible and have a similar level of explanation or brevity. This is a strict requirement to avoid making the correct answer obvious.

SOLUTION DATA:
- Primary Data Structure: ${solutionAnalysis.primaryDataStructure}
- Algorithm: ${solutionAnalysis.primaryAlgorithm}  
- Time/Space Complexity: ${solutionAnalysis.timeComplexity}, ${solutionAnalysis.spaceComplexity}
- Key Insight: ${solutionAnalysis.keyInsight}
- Why Optimal: ${solutionAnalysis.whyThisApproach}

BEGINNER-FRIENDLY TIME COMPLEXITY EXPLANATIONS:
When explaining time complexity, ALWAYS include what the notation means:
- O(1): "O(1) means constant time - the algorithm takes the same amount of time regardless of input size"
- O(n): "O(n) means linear time - the algorithm takes time proportional to the size n of the input"
- O(log n): "O(log n) means logarithmic time - the algorithm's time grows very slowly as input size increases"
- O(n log n): "O(n log n) means the algorithm does n operations, each taking log n time - it's like sorting a list"
- O(n²): "O(n²) means quadratic time - the algorithm takes time proportional to the square of input size"
- O(n³): "O(n³) means cubic time - the algorithm takes time proportional to the cube of input size"

EXPLANATION REQUIREMENTS:
✅ CORRECT answers: Explain WHY it's correct and what concept it demonstrates (2-3 sentences)
❌ WRONG answers: Exactly 2 sentences:
  1. What would happen if this approach was used (specific technical consequence)
  2. What programming misconception this represents

🚫 FORBIDDEN phrases: "not optimal", "doesn't work", "incorrect", "inefficient"
✅ REQUIRED: Specific technical reasoning with complexity analysis and educational insights

🎯 EXPLANATION FORMAT REQUIREMENTS:
- DO NOT start explanations with "Correct!" or "Wrong!" - these are redundant
- Keep ALL explanations under 3 sentences and 40 words maximum
- Focus on the technical reasoning, not the correctness label
- Be concise and direct in explaining the concept or misconception

EXAMPLES OF BEGINNER-FRIENDLY EXPLANATIONS:
❌ Bad: "This has O(n²) complexity"
✅ Good: "This has O(n²) time complexity - meaning the algorithm takes time proportional to the square of input size, like comparing every person with every other person in a room"

❌ Bad: "Hash table lookup is O(1)"
✅ Good: "Hash table lookup is O(1) time complexity - meaning it's constant time, like having speed dial where you press one button and immediately get your friend's number"

❌ Bad: "Binary search is O(log n)"
✅ Good: "Binary search is O(log n) time complexity - meaning it's logarithmic time, like finding a word in a dictionary by always checking the middle and eliminating half the remaining pages"

QUIZ STRUCTURE (6-7 questions):
1. Data structure definition and how it works
2. Algorithm usage - when and why to use it  
3. Time/space complexity of optimal solution (MUST explain what the notation means)
4. Why this approach is optimal for this problem
5. Key insight: "${solutionAnalysis.keyInsight}"
6. Critical edge cases handling
7. Alternative approaches comparison

FORMAT REQUIREMENTS:
- Each question has exactly 4 options (A, B, C, D)
- Only ONE correct answer per question
- MANDATORY: optionExplanations for ALL options (A, B, C, D)
- Questions should be concise and clear
- Focus on understanding, not memorization
- ALL time complexity mentions MUST include beginner-friendly explanations
- 🎯 OPTION LENGTH REQUIREMENT: All options (A, B, C, D) must be strictly within 1 sentence and maximum 12 words each to avoid making the correct answer obvious
- 🎯 RANDOM POSITIONING: The correct answer must be randomly positioned across A, B, C, D - do NOT always put it as option A
- 🚨 CRITICAL: You MUST use different positions (0, 1, 2, 3) for correctAnswer across different questions. DO NOT default to 0.

Response format:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why the correct answer is right",
      "optionExplanations": {
        "A": "Explanation for option A (why correct or why wrong)",
        "B": "Explanation for option B (why correct or why wrong)", 
        "C": "Explanation for option C (why correct or why wrong)",
        "D": "Explanation for option D (why correct or why wrong)"
      },
      "category": "definition|usage|efficiency|relevance|problem-specific"
    }
  ]
}

CRITICAL FORMATTING NOTES:
- correctAnswer should be randomly 0, 1, 2, or 3 (not always 0)
- All options must have similar length to avoid making the answer obvious
- Ensure the correct answer is in the position indicated by correctAnswer index
- 🚨 MANDATORY: Use different correctAnswer positions across questions (0, 1, 2, 3)
- 🚨 MANDATORY: Do NOT default to position 0 (option A) for all questions

Generate ONLY the JSON object, no other text.`;

    const result = await geminiModel.generateContent(quizPrompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let quizData;
    try {
      quizData = JSON.parse(text);
      
      // Post-process to ensure completely random positioning of correct answers
      if (quizData.questions && Array.isArray(quizData.questions)) {
        quizData.questions.forEach((question, questionIndex) => {
          // Always randomize the correct answer position
          const correctOption = question.options[question.correctAnswer];
          const correctExplanation = question.optionExplanations?.[Object.keys(question.optionExplanations)[question.correctAnswer]];
          
          // Shuffle options and update correctAnswer
          const shuffledOptions = [...question.options];
          const shuffledExplanations = { ...question.optionExplanations };
          
          // Remove correct answer from current position
          shuffledOptions.splice(question.correctAnswer, 1);
          const optionKeys = ['A', 'B', 'C', 'D'];
          delete shuffledExplanations[optionKeys[question.correctAnswer]];
          
          // Completely random position (0, 1, 2, or 3)
          const randomPosition = Math.floor(Math.random() * 4);
          
          // Insert correct answer at random position
          shuffledOptions.splice(randomPosition, 0, correctOption);
          
          // Update explanations
          const newExplanations = {};
          optionKeys.forEach((key, index) => {
            if (index === randomPosition) {
              newExplanations[key] = correctExplanation;
            } else if (index < randomPosition) {
              newExplanations[key] = shuffledExplanations[optionKeys[index]];
            } else {
              newExplanations[key] = shuffledExplanations[optionKeys[index - 1]];
            }
          });
          
          // Update the question
          question.options = shuffledOptions;
          question.correctAnswer = randomPosition;
          question.optionExplanations = newExplanations;
          
          console.log(`🔄 Repositioned correct answer for question ${questionIndex + 1} to position ${randomPosition}`);
        });
        
        // Log the final distribution
        const positionCounts = [0, 0, 0, 0];
        quizData.questions.forEach(q => positionCounts[q.correctAnswer]++);
        console.log(`📊 Final correct answer distribution: A=${positionCounts[0]}, B=${positionCounts[1]}, C=${positionCounts[2]}, D=${positionCounts[3]}`);
      }
    } catch (parseError) {
      console.error('Failed to parse quiz JSON:', parseError);
      return res.status(500).json({ error: 'Failed to generate quiz questions' });
    }



    console.log(`✅ Generated quiz with ${quizData.questions?.length || 0} questions for problem ${problemId}`);
    res.json(quizData);

  } catch (err) {
    console.error('Quiz generation error:', err);
    return res.status(500).json({ error: 'Failed to generate quiz', details: err.message });
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

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});