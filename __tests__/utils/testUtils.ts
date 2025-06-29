/**
 * Test Utilities for CodeOnTheGo App
 * 
 * This file contains helper functions that make testing easier and more consistent
 * across the entire test suite.
 */

/**
 * Creates a mock user object for testing
 * @param overrides - Optional properties to override default values
 * @returns Mock user object
 */
export const createMockUser = (overrides: any = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides
});

/**
 * Creates a mock session object for testing
 * @param overrides - Optional properties to override default values
 * @returns Mock session object
 */
export const createMockSession = (overrides: any = {}) => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: createMockUser(),
  ...overrides
});

/**
 * Creates mock quiz questions for testing
 * @param count - Number of questions to create
 * @returns Array of mock quiz questions
 */
export const createMockQuizQuestions = (count = 5) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    question: `Test question ${index + 1}?`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswer: index % 4,
    explanation: `Explanation for question ${index + 1}`
  }));
};

/**
 * Creates mock lesson data for testing
 * @returns Mock lesson data object
 */
export const createMockLessonData = () => ({
  title: 'Test Lesson',
  parts: [
    {
      title: 'Definition',
      content: 'This is a test definition.',
      mcq: {
        id: 1,
        question: 'What is being defined?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 0,
        explanation: 'This is the correct answer.'
      }
    }
  ],
  keyConcepts: ['Concept 1', 'Concept 2'],
  example: 'Test example',
  hint: 'Test hint',
  commonMistake: 'Test mistake'
}); 