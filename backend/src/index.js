require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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


Code: ${code}
Question: ${question}

Evaluate the submission as follows:
1. Correctness (✓ or ✗) – Be strict. Only mark ✓ if the logic fully and precisely solves the problem.  
   - Do not assume steps the user left out (e.g. sorting, bounds checks, loop conditions).  
   - If the code omits or fails to explain something critical, mark it as ✗ and include that in Suggestions.
   - Ensure the user has included all the steps in the explanation.
   - Ensure the user explains how it reaches the final answer clearly. If not stated, wrong.
2. Efficiency – 
   Time: [state time complexity clearly]  
   Space: [state space complexity]  
   Any more optimal? [Yes/No – If yes, describe why this is not optimal, but do not give the optimal solution]
3. Edge Cases – 
  - What corner cases could break this code? 
    Write concisely. Give at least 1 and at most 3 strictly.
    Ignore large input cases unless the time complexity is O(n^2) or O(n^3) or worse.
  Give it in the format of:
  1) Corner case 1 (reasoning 5 words max STRICTLY)
  2) Corner case 2 (reasoning 5 words max STRICTLY)
  3) Corner case 3 (reasoning 5 words max STRICTLY)
4. Suggestions – 
  Give at least 1 and at most 3 specific ways to improve the code strictly. 
  Write concisely only one sentence.
  No need to tell them to explain time or space complexity.
  If logic is ✓, suggest what was missing (e.g. "no sorting step included").
  If logic is ✗, suggest what was missing (e.g. "no sorting step included").
  Include suggestions to include more details in explanation, clarity, performance, or robustness.
  Give it in the format of:
  1) Suggestion 1 (reasoning 15 words max STRICTLY)
  2) Suggestion 2 (reasoning 15 words max STRICTLY)
  3) Suggestion 3 (reasoning 15 words max STRICTLY)

Scoring  
Rate the solution out of 100 using the following scale:

- 90-100 – Fully correct and efficient, complete explanation, no gaps (5 stars)
- 75–90 – Correct and efficient, but explanation is missing small details (4 stars)
- 60–75 – Correct but inefficient, with solid explanation OR Correct and efficient, lacking lots of details (3 stars)
- 50–60 – Correct but inefficient and not explained clearly (2 stars)
- 25–50 – Incorrect solution due to minor logical flaws present that could cause significant test case failures (1 star)
- 0–25 – Completely incorrect solution due to major logical flaw or complete misunderstanding of the problem (0 stars)

Final Output Format:

Correctness: ✓ or ✗  

Efficiency:  
Time:  
Space:  
Any more optimal?  

Edge Cases:  

Suggestions:  

Score: __/100  
Stars: 0-5
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Raw Gemini response:', text); // Log the raw response

    // Parse the response into structured format
    const lines = text.split('\n');
    const analysis = {
      correctness: '',
      efficiency: {
        time: '',
        space: '',
        anyMoreOptimal: ''
      },
      edgeCases: [],
      suggestions: [],
      score: 0,
      stars: 0
    };

    let currentSection = '';
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('Correctness:')) {
        analysis.correctness = trimmedLine.replace('Correctness:', '').trim();
      } else if (trimmedLine.startsWith('Time:')) {
        analysis.efficiency.time = trimmedLine.replace('Time:', '').trim();
      } else if (trimmedLine.startsWith('Space:')) {
        analysis.efficiency.space = trimmedLine.replace('Space:', '').trim();
      } else if (trimmedLine.startsWith('Any more optimal?')) {
        analysis.efficiency.anyMoreOptimal = trimmedLine.replace('Any more optimal?', '').trim();
      } else if (trimmedLine.startsWith('Edge Cases:')) {
        currentSection = 'edgeCases';
      } else if (trimmedLine.startsWith('Suggestions:')) {
        currentSection = 'suggestions';
      } else if (trimmedLine.startsWith('Score:')) {
        const scoreMatch = trimmedLine.match(/(\d+)\/100/);
        if (scoreMatch) {
          analysis.score = parseInt(scoreMatch[1]);
        }
      } else if (trimmedLine.startsWith('Stars:')) {
        const starsMatch = trimmedLine.match(/(\d+)/);
        if (starsMatch) {
          analysis.stars = parseInt(starsMatch[1]);
        }
      } else if (trimmedLine && currentSection === 'edgeCases') {
        analysis.edgeCases.push(trimmedLine);
      } else if (trimmedLine && currentSection === 'suggestions') {
        analysis.suggestions.push(trimmedLine);
      }
    }
    res.json({ analysis });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to analyze code' });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Press Ctrl+C to stop the server');
}); 