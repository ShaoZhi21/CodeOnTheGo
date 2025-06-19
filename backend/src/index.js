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

IMPORTANT: You MUST format the final output exactly as follows:
Score: [number]/100  
Stars: [number]
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

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: "You are a helpful assistant that simplifies technical questions for beginners. Make complex concepts easy to understand using simple language and everyday analogies.",
    });
    
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

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Press Ctrl+C to stop the server');
}); 