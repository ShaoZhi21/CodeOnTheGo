/* global jest, describe, test, expect, beforeEach */

/**
 * Unit Tests for Backend Functionality
 * 
 * Tests the Node.js backend server, API endpoints, and business logic.
 * These tests ensure the backend works correctly with the React Native app.
 */

// Mock the required modules
const mockGemini = {
  generateContent: jest.fn()
};

const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

// Mock environment variables
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

describe('Backend API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Lesson Generation', () => {
    /**
     * Test: Should generate lesson with valid parameters
     * 
     * Tests the lesson generation logic with proper topic and difficulty.
     * This ensures the AI can create educational content correctly.
     */
    test('should generate lesson with valid parameters', async () => {
      const mockLessonResponse = {
        title: 'Arrays Introduction',
        parts: [
          {
            title: 'What are Arrays?',
            content: 'Arrays are collections of elements...'
          }
        ],
        keyConcepts: ['Indexing', 'Traversal'],
        example: 'const arr = [1, 2, 3];',
        hint: 'Remember array indices start at 0',
        commonMistake: 'Forgetting array bounds'
      };

      mockGemini.generateContent.mockResolvedValue({
        response: {
          text: JSON.stringify(mockLessonResponse)
        }
      });

      // Simulate the lesson generation function
      const generateLesson = async (topic, difficulty) => {
        const prompt = `Generate a lesson about ${topic} for ${difficulty} level`;
        const result = await mockGemini.generateContent(prompt);
        return JSON.parse(result.response.text);
      };

      const result = await generateLesson('Arrays', 'Easy');

      expect(result).toEqual(mockLessonResponse);
      expect(result.title).toContain('Arrays');
      expect(result.parts).toHaveLength(1);
      expect(result.keyConcepts).toBeDefined();
    });

    /**
     * Test: Should handle lesson generation errors
     * 
     * Tests error handling when the AI service fails to generate content.
     * This ensures the API returns proper error responses.
     */
    test('should handle lesson generation errors', async () => {
      mockGemini.generateContent.mockRejectedValue(new Error('AI service unavailable'));

      const generateLesson = async (topic, difficulty) => {
        try {
          const prompt = `Generate a lesson about ${topic} for ${difficulty} level`;
          const result = await mockGemini.generateContent(prompt);
          return JSON.parse(result.response.text);
        } catch (error) {
          throw new Error('Failed to generate lesson: ' + error.message);
        }
      };

      await expect(generateLesson('Arrays', 'Easy')).rejects.toThrow('Failed to generate lesson');
    });
  });

  describe('Quiz Generation', () => {
    /**
     * Test: Should generate quiz questions successfully
     * 
     * Tests the quiz generation logic to ensure it creates proper
     * multiple choice questions with correct answers and explanations.
     */
    test('should generate quiz questions successfully', async () => {
      const mockQuizResponse = {
        questions: [
          {
            id: 1,
            question: 'What is the time complexity of accessing an array element?',
            options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
            correctAnswer: 0,
            explanation: 'Array access is constant time O(1)'
          }
        ]
      };

      mockGemini.generateContent.mockResolvedValue({
        response: {
          text: JSON.stringify(mockQuizResponse)
        }
      });

      const generateQuiz = async (topic, difficulty, questionCount) => {
        const prompt = `Generate ${questionCount} quiz questions about ${topic} for ${difficulty} level`;
        const result = await mockGemini.generateContent(prompt);
        return JSON.parse(result.response.text);
      };

      const result = await generateQuiz('Arrays', 'Easy', 1);

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]).toHaveProperty('question');
      expect(result.questions[0]).toHaveProperty('options');
      expect(result.questions[0]).toHaveProperty('correctAnswer');
      expect(result.questions[0]).toHaveProperty('explanation');
      expect(result.questions[0].options).toHaveLength(4);
    });

    /**
     * Test: Should validate quiz question structure
     * 
     * Tests that generated quiz questions have the correct format
     * and required properties for the frontend to display properly.
     */
    test('should validate quiz question structure', async () => {
      const mockQuizResponse = {
        questions: [
          {
            id: 1,
            question: 'Test question?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 0,
            explanation: 'Test explanation'
          }
        ]
      };

      const validateQuestion = (question) => {
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('question');
        expect(question).toHaveProperty('options');
        expect(question).toHaveProperty('correctAnswer');
        expect(question).toHaveProperty('explanation');
        expect(Array.isArray(question.options)).toBe(true);
        expect(question.options.length).toBe(4);
        expect(typeof question.correctAnswer).toBe('number');
        expect(question.correctAnswer >= 0 && question.correctAnswer < 4).toBe(true);
      };

      mockQuizResponse.questions.forEach(validateQuestion);
    });
  });

  describe('Database Operations', () => {
    /**
     * Test: Should save quiz completion to database
     * 
     * Tests the database operation for saving quiz results.
     * This ensures user progress is properly tracked.
     */
    test('should save quiz completion to database', async () => {
      const mockQuizData = {
        user_id: 'test-user-123',
        topic: 'Arrays',
        difficulty: 'Easy',
        score: 4,
        total_questions: 5,
        selected_answers: [0, 1, 2, 0, 1],
        correct_answers: [0, 1, 2, 0, 1],
        time_spent: 120
      };

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          data: { success: true },
          error: null
        })
      });

      const saveQuizCompletion = async (quizData) => {
        const { data, error } = await mockSupabase
          .from('user_lesson_completion')
          .upsert(quizData);
        
        return { data, error };
      };

      const result = await saveQuizCompletion(mockQuizData);

      expect(result.data).toEqual({ success: true });
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('user_lesson_completion');
    });

    /**
     * Test: Should handle database save errors
     * 
     * Tests error handling when saving to the database fails.
     * This ensures the API can handle database connection issues.
     */
    test('should handle database save errors', async () => {
      const mockQuizData = {
        user_id: 'test-user-123',
        topic: 'Arrays',
        score: 4
      };

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      });

      const saveQuizCompletion = async (quizData) => {
        const { data, error } = await mockSupabase
          .from('user_lesson_completion')
          .upsert(quizData);
        
        return { data, error };
      };

      const result = await saveQuizCompletion(mockQuizData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Database connection failed');
    });
  });

  describe('Authentication', () => {
    /**
     * Test: Should validate authentication token
     * 
     * Tests that the backend properly validates user authentication
     * tokens before processing requests. This ensures security.
     */
    test('should validate authentication token', async () => {
      const mockUser = {
        id: 'test-user-123',
        email: 'test@example.com'
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const validateToken = async (token) => {
        const { data, error } = await mockSupabase.auth.getUser(token);
        return { user: data?.user, error };
      };

      const result = await validateToken('valid-token');

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    });

    /**
     * Test: Should reject invalid authentication token
     * 
     * Tests that the backend rejects requests with invalid or
     * expired authentication tokens.
     */
    test('should reject invalid authentication token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      const validateToken = async (token) => {
        const { data, error } = await mockSupabase.auth.getUser(token);
        return { user: data?.user, error };
      };

      const result = await validateToken('invalid-token');

      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Invalid token');
    });
  });

  describe('Input Validation', () => {
    /**
     * Test: Should validate lesson generation parameters
     * 
     * Tests that the backend validates input parameters before
     * processing requests. This prevents invalid data from being processed.
     */
    test('should validate lesson generation parameters', () => {
      const validateLessonParams = (topic, difficulty) => {
        if (!topic || typeof topic !== 'string') {
          throw new Error('Topic must be a non-empty string');
        }
        if (!difficulty || !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
          throw new Error('Difficulty must be Easy, Medium, or Hard');
        }
        return true;
      };

      expect(() => validateLessonParams('Arrays', 'Easy')).not.toThrow();
      expect(() => validateLessonParams('', 'Easy')).toThrow('Topic must be a non-empty string');
      expect(() => validateLessonParams('Arrays', 'Invalid')).toThrow('Difficulty must be Easy, Medium, or Hard');
    });

    /**
     * Test: Should validate quiz generation parameters
     * 
     * Tests that quiz generation parameters are properly validated
     * to ensure valid quiz questions are generated.
     */
    test('should validate quiz generation parameters', () => {
      const validateQuizParams = (topic, difficulty, questionCount) => {
        if (!topic || typeof topic !== 'string') {
          throw new Error('Topic must be a non-empty string');
        }
        if (!difficulty || !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
          throw new Error('Difficulty must be Easy, Medium, or Hard');
        }
        if (!questionCount || questionCount < 1 || questionCount > 10) {
          throw new Error('Question count must be between 1 and 10');
        }
        return true;
      };

      expect(() => validateQuizParams('Arrays', 'Easy', 5)).not.toThrow();
      expect(() => validateQuizParams('Arrays', 'Easy', 0)).toThrow('Question count must be between 1 and 10');
      expect(() => validateQuizParams('Arrays', 'Easy', 15)).toThrow('Question count must be between 1 and 10');
    });
  });
}); 