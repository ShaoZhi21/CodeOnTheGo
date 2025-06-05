/**
 * @typedef {Object} LeetCodeProblem
 * @property {string} questionId - The problem ID
 * @property {string} title - Problem title
 * @property {string} titleSlug - URL-friendly title
 * @property {'Easy'|'Medium'|'Hard'} difficulty - Problem difficulty
 * @property {boolean} isPaidOnly - Whether problem requires premium
 * @property {Array<{name: string, slug: string}>} topicTags - Problem tags
 * @property {number} acRate - Acceptance rate
 * @property {number} likes - Number of likes
 * @property {number} dislikes - Number of dislikes
 */

/**
 * @typedef {Object} LeetCodeProblemDetail
 * @property {string} content - HTML content of problem description
 * @property {string} exampleTestcases - Example test cases
 * @property {Array<string>} constraints - Problem constraints
 * @property {Array<string>} hints - Problem hints
 * @property {Array<{input: string, output: string, explanation?: string}>} examples - Parsed examples
 */

/**
 * @typedef {Object} DatabaseProblem
 * @property {number} id - Auto-generated ID
 * @property {number} leetcode_id - LeetCode problem ID
 * @property {string} title - Problem title
 * @property {string} slug - URL slug
 * @property {'Easy'|'Medium'|'Hard'} difficulty - Problem difficulty
 * @property {string} description - Problem description (HTML)
 * @property {string} description_text - Problem description (plain text)
 * @property {Array<Object>} examples - Problem examples
 * @property {Array<string>} constraints - Problem constraints
 * @property {Array<string>} hints - Problem hints
 * @property {Array<string>} tags - Problem tags
 * @property {number} acceptance_rate - Acceptance rate
 * @property {number} likes - Number of likes
 * @property {number} dislikes - Number of dislikes
 * @property {boolean} is_premium - Whether problem is premium only
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Last update timestamp
 */

export const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];

export const TABLE_NAME = 'leetcode_problems';

export const DEFAULT_CONFIG = {
  RATE_LIMIT_DELAY: 500, // ms between requests
  BATCH_SIZE: 50,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
}; 