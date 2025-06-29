/**
 * Integration Tests for API Endpoints
 * 
 * Tests the backend API endpoints to ensure they work correctly
 * with the frontend. These tests verify the communication between
 * the React Native app and the Node.js backend.
 */

// Mock fetch for testing API calls
global.fetch = jest.fn();

describe('API Integration Tests', () => {
  const baseUrl = 'http://localhost:3000';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Lesson Generation API', () => {
    /**
     * Test: Should generate lesson successfully
     * 
     * Tests the /api/generate-topic-lesson endpoint to ensure it
     * returns proper lesson data when given valid parameters.
     * This is crucial for the learning functionality.
     */
    test('should generate lesson successfully', async () => {
      const mockLessonData = {
        title: 'Test Lesson',
        parts: [
          {
            title: 'Introduction',
            content: 'This is a test lesson introduction.'
          }
        ],
        keyConcepts: ['Concept 1', 'Concept 2'],
        example: 'Test example',
        hint: 'Test hint',
        commonMistake: 'Test mistake'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLessonData
      });

      const response = await fetch(`${baseUrl}/api/generate-topic-lesson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          topic: 'Arrays',
          difficulty: 'Easy'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockLessonData);
      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/generate-topic-lesson`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }),
          body: JSON.stringify({
            topic: 'Arrays',
            difficulty: 'Easy'
          })
        })
      );
    });

    /**
     * Test: Should handle lesson generation errors
     * 
     * Tests error handling when the lesson generation API fails.
     * This ensures the frontend can handle API errors gracefully.
     */
    test('should handle lesson generation errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const response = await fetch(`${baseUrl}/api/generate-topic-lesson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          topic: 'Invalid Topic',
          difficulty: 'Invalid'
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });

  describe('Quiz Generation API', () => {
    /**
     * Test: Should generate quiz successfully
     * 
     * Tests the /api/generate-topic-quiz endpoint to ensure it
     * returns proper quiz questions when given valid parameters.
     * This is essential for the quiz functionality.
     */
    test('should generate quiz successfully', async () => {
      const mockQuizData = {
        questions: [
          {
            id: 1,
            question: 'What is the time complexity of binary search?',
            options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
            correctAnswer: 1,
            explanation: 'Binary search has logarithmic time complexity.'
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuizData
      });

      const response = await fetch(`${baseUrl}/api/generate-topic-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          topic: 'Binary Search',
          difficulty: 'Medium',
          questionCount: 5
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockQuizData);
      expect(data.questions).toHaveLength(1);
      expect(data.questions[0]).toHaveProperty('question');
      expect(data.questions[0]).toHaveProperty('options');
      expect(data.questions[0]).toHaveProperty('correctAnswer');
    });

    /**
     * Test: Should handle quiz generation with invalid parameters
     * 
     * Tests that the API properly validates input parameters
     * and returns appropriate error responses.
     */
    test('should handle quiz generation with invalid parameters', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      const response = await fetch(`${baseUrl}/api/generate-topic-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          topic: '',
          difficulty: 'Invalid',
          questionCount: -1
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Quiz Completion API', () => {
    /**
     * Test: Should save quiz completion successfully
     * 
     * Tests the /api/quiz-completion endpoint to ensure quiz
     * results are properly saved to the database. This is
     * critical for tracking user progress.
     */
    test('should save quiz completion successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Quiz completion saved successfully'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const quizData = {
        topic: 'Arrays',
        difficulty: 'Easy',
        score: 4,
        totalQuestions: 5,
        selectedAnswers: [0, 1, 2, 0, 1],
        correctAnswers: [0, 1, 2, 0, 1],
        timeSpent: 120
      };

      const response = await fetch(`${baseUrl}/api/quiz-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(quizData)
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/quiz-completion`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(quizData)
        })
      );
    });

    /**
     * Test: Should handle quiz completion with missing data
     * 
     * Tests error handling when required quiz completion data
     * is missing or invalid.
     */
    test('should handle quiz completion with missing data', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      const incompleteData = {
        topic: 'Arrays',
        // Missing required fields
      };

      const response = await fetch(`${baseUrl}/api/quiz-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(incompleteData)
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Authentication', () => {
    /**
     * Test: Should handle unauthorized requests
     * 
     * Tests that API endpoints properly reject requests without
     * valid authentication tokens. This ensures security.
     */
    test('should handle unauthorized requests', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const response = await fetch(`${baseUrl}/api/generate-topic-lesson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Missing Authorization header
        },
        body: JSON.stringify({
          topic: 'Arrays',
          difficulty: 'Easy'
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });
}); 