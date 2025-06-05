import { LeetCode } from 'leetcode-query';
import { DEFAULT_CONFIG } from '../types/leetcode.js';

export class LeetCodeClient {
  constructor(config = {}) {
    this.leetcode = new LeetCode();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.requestCount = 0;
    this.startTime = Date.now();
  }

  /**
   * Add delay between requests to respect rate limits
   */
  async sleep(ms = this.config.RATE_LIMIT_DELAY) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log rate limiting info
   */
  logRateLimit() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.requestCount / elapsed;
    console.log(`📊 Rate: ${rate.toFixed(2)} req/sec | Total: ${this.requestCount} requests`);
  }

  /**
   * Retry wrapper for API calls
   */
  async withRetry(operation, retries = this.config.MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
      try {
        this.requestCount++;
        const result = await operation();
        await this.sleep();
        return result;
      } catch (error) {
        console.warn(`⚠️  Attempt ${i + 1} failed:`, error.message);
        
        if (i === retries - 1) {
          throw error;
        }
        
        // Exponential backoff
        await this.sleep(this.config.RETRY_DELAY * Math.pow(2, i));
      }
    }
  }

  /**
   * Get all problems with pagination
   */
  async getAllProblems(options = {}) {
    const { 
      limit = null, 
      includeDetails = false,
      onProgress = null 
    } = options;

    console.log('🔄 Fetching all LeetCode problems...');
    
    try {
      // Try different approaches to get all problems
      let problemsResponse;
      
      // Approach 1: Try with a very high limit
      try {
        console.log('🔄 Attempting to fetch all problems with high limit...');
        problemsResponse = await this.withRetry(() => this.leetcode.problems({ 
          limit: 5000,  // Try high limit
          skip: 0 
        }));
      } catch (error) {
        console.log('⚠️  High limit approach failed, trying default...');
        // Fallback to default
        problemsResponse = await this.withRetry(() => this.leetcode.problems());
      }
      
      // Debug the API response
      console.log('📊 API Response Debug:');
      console.log(`   Total available: ${problemsResponse.total || 'unknown'}`);
      console.log(`   Questions returned: ${problemsResponse.questions?.length || 0}`);
      
      // Handle different response formats
      let problems;
      if (Array.isArray(problemsResponse)) {
        problems = problemsResponse;
      } else if (problemsResponse && problemsResponse.questions && Array.isArray(problemsResponse.questions)) {
        problems = problemsResponse.questions;
        console.log(`📈 Found ${problems.length} out of ${problemsResponse.total || 'unknown'} total problems`);
        
        // If we didn't get all problems, warn the user
        if (problemsResponse.total && problems.length < problemsResponse.total) {
          console.log(`⚠️  Only received ${problems.length}/${problemsResponse.total} problems`);
          console.log(`   This might be due to API pagination limits`);
        }
      } else if (problemsResponse && problemsResponse.data && Array.isArray(problemsResponse.data)) {
        problems = problemsResponse.data;
      } else if (problemsResponse && problemsResponse.problems && Array.isArray(problemsResponse.problems)) {
        problems = problemsResponse.problems;
      } else {
        console.error('❌ Unexpected response format:', typeof problemsResponse);
        console.log('Response sample:', JSON.stringify(problemsResponse, null, 2).slice(0, 500));
        throw new Error('Problems response is not in expected format');
      }
      
      let filteredProblems = problems;
      if (limit && typeof limit === 'number') {
        filteredProblems = problems.slice(0, limit);
        console.log(`🔧 Limited to ${limit} problems (from ${problems.length} available)`);
      }

      console.log(`✅ Found ${filteredProblems.length} problems`);

      if (includeDetails) {
        console.log('🔄 Fetching detailed information for each problem...');
        
        for (let i = 0; i < filteredProblems.length; i++) {
          const problem = filteredProblems[i];
          
          try {
            const details = await this.getProblemDetails(problem.titleSlug);
            filteredProblems[i] = { ...problem, details };
            
            if (onProgress) {
              onProgress(i + 1, filteredProblems.length, problem.title);
            }
            
            // More frequent logging for detailed fetching
            if ((i + 1) % 10 === 0) {
              console.log(`📈 Progress: ${i + 1}/${filteredProblems.length} problems processed`);
              this.logRateLimit();
            }
          } catch (error) {
            console.error(`❌ Failed to get details for ${problem.title}:`, error.message);
            filteredProblems[i] = { ...problem, details: null };
          }
        }
      }

      return filteredProblems;
    } catch (error) {
      console.error('❌ Failed to fetch problems:', error.message);
      throw error;
    }
  }

  /**
   * Get detailed information for a specific problem
   */
  async getProblemDetails(titleSlug) {
    return await this.withRetry(() => this.leetcode.problem(titleSlug));
  }

  /**
   * Get daily challenge
   */
  async getDailyChallenge() {
    return await this.withRetry(() => this.leetcode.daily());
  }

  /**
   * Parse HTML content to extract sections separately
   */
  parseDescription(htmlContent) {
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

  /**
   * Parse example test cases into structured format (legacy method for compatibility)
   */
  parseExamples(exampleTestcases) {
    if (!exampleTestcases) return [];
    
    try {
      // Split by double newlines to separate examples
      const examples = exampleTestcases.split('\n\n').filter(ex => ex.trim());
      
      return examples.map((example, index) => {
        const lines = example.split('\n').filter(line => line.trim());
        
        const parsedExample = {
          id: index + 1,
          input: '',
          output: '',
          explanation: ''
        };

        lines.forEach(line => {
          if (line.startsWith('Input:')) {
            parsedExample.input = line.replace('Input:', '').trim();
          } else if (line.startsWith('Output:')) {
            parsedExample.output = line.replace('Output:', '').trim();
          } else if (line.startsWith('Explanation:')) {
            parsedExample.explanation = line.replace('Explanation:', '').trim();
          }
        });

        return parsedExample;
      });
    } catch (error) {
      console.warn('⚠️  Failed to parse examples:', error.message);
      return [];
    }
  }

  /**
   * Transform LeetCode problem to database format
   */
  transformProblemForDatabase(problem, details = null) {
    const tags = problem.topicTags?.map(tag => tag.name) || [];
    
    const transformed = {
      leetcode_id: parseInt(problem.questionFrontendId || problem.questionId),
      title: problem.title,
      slug: problem.titleSlug,
      difficulty: problem.difficulty,
      tags: tags,
      acceptance_rate: problem.acRate || 0,
      likes: problem.likes || 0,
      dislikes: problem.dislikes || 0,
      is_premium: problem.isPaidOnly || false
    };

    if (details) {
      // Use improved parsing
      const parsed = this.parseDescription(details.content);
      
      transformed.description = details.content || '';
      transformed.description_text = parsed.description;
      transformed.examples = parsed.examples.length > 0 ? parsed.examples : this.parseExamples(details.exampleTestcases);
      transformed.constraints = parsed.constraints.length > 0 ? parsed.constraints : (details.constraints || []);
      transformed.hints = details.hints || [];
    }

    return transformed;
  }
} 