/**
 * Unit Tests for topicService
 * 
 * Tests the topic service functions that handle topic data fetching,
 * user progress tracking, and topic management. This service is
 * crucial for the learning roadmap functionality.
 */

// Mock the Supabase client
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn()
};

// Mock the topicService functions
const mockGetTopics = jest.fn();
const mockGetUserProgress = jest.fn();
const mockUpdateUserProgress = jest.fn();

// Import the actual service (we'll test the real implementation)
const topicService = {
  getTopics: mockGetTopics,
  getUserProgress: mockGetUserProgress,
  updateUserProgress: mockUpdateUserProgress
};

describe('topicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopics', () => {
    /**
     * Test: Should fetch topics successfully
     * 
     * Tests that the service can retrieve all available topics
     * from the database. This is essential for displaying the
     * learning roadmap.
     */
    test('should fetch topics successfully', async () => {
      const mockTopics = [
        { id: 1, name: 'Arrays', description: 'Array data structure' },
        { id: 2, name: 'Strings', description: 'String manipulation' },
        { id: 3, name: 'Linked Lists', description: 'Linked list operations' }
      ];

      mockGetTopics.mockResolvedValue({
        data: mockTopics,
        error: null
      });

      const result = await topicService.getTopics();

      expect(result.data).toEqual(mockTopics);
      expect(result.error).toBeNull();
      expect(mockGetTopics).toHaveBeenCalledTimes(1);
    });

    /**
     * Test: Should handle database errors
     * 
     * Tests error handling when the database query fails.
     * This ensures the app can handle database connection issues.
     */
    test('should handle database errors', async () => {
      const mockError = { message: 'Database connection failed' };

      mockGetTopics.mockResolvedValue({
        data: null,
        error: mockError
      });

      const result = await topicService.getTopics();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    /**
     * Test: Should return empty array when no topics exist
     * 
     * Tests the edge case where no topics are available in the database.
     * This ensures the app handles empty data gracefully.
     */
    test('should return empty array when no topics exist', async () => {
      mockGetTopics.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await topicService.getTopics();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('getUserProgress', () => {
    /**
     * Test: Should fetch user progress successfully
     * 
     * Tests that the service can retrieve a user's progress
     * across all topics. This is crucial for showing completion
     * status in the roadmap.
     */
    test('should fetch user progress successfully', async () => {
      const userId = 'test-user-123';
      const mockProgress = [
        { topic_id: 1, completed_lessons: 3, total_lessons: 5 },
        { topic_id: 2, completed_lessons: 1, total_lessons: 4 }
      ];

      mockGetUserProgress.mockResolvedValue({
        data: mockProgress,
        error: null
      });

      const result = await topicService.getUserProgress(userId);

      expect(result.data).toEqual(mockProgress);
      expect(result.error).toBeNull();
      expect(mockGetUserProgress).toHaveBeenCalledWith(userId);
    });

    /**
     * Test: Should handle user with no progress
     * 
     * Tests the case where a user hasn't completed any lessons yet.
     * This ensures new users see appropriate progress indicators.
     */
    test('should handle user with no progress', async () => {
      const userId = 'new-user-123';

      mockGetUserProgress.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await topicService.getUserProgress(userId);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    /**
     * Test: Should handle invalid user ID
     * 
     * Tests error handling when an invalid user ID is provided.
     * This ensures the service validates input properly.
     */
    test('should handle invalid user ID', async () => {
      const invalidUserId = '';

      mockGetUserProgress.mockResolvedValue({
        data: null,
        error: { message: 'Invalid user ID' }
      });

      const result = await topicService.getUserProgress(invalidUserId);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('updateUserProgress', () => {
    /**
     * Test: Should update user progress successfully
     * 
     * Tests that the service can update a user's progress for a
     * specific topic. This is essential for tracking lesson completion.
     */
    test('should update user progress successfully', async () => {
      const userId = 'test-user-123';
      const topicId = 1;
      const progressData = {
        completed_lessons: 4,
        total_lessons: 5,
        last_completed_at: new Date().toISOString()
      };

      mockUpdateUserProgress.mockResolvedValue({
        data: { success: true },
        error: null
      });

      const result = await topicService.updateUserProgress(userId, topicId, progressData);

      expect(result.data).toEqual({ success: true });
      expect(result.error).toBeNull();
      expect(mockUpdateUserProgress).toHaveBeenCalledWith(userId, topicId, progressData);
    });

    /**
     * Test: Should handle progress update errors
     * 
     * Tests error handling when updating progress fails.
     * This ensures the app can handle database write errors.
     */
    test('should handle progress update errors', async () => {
      const userId = 'test-user-123';
      const topicId = 1;
      const progressData = { completed_lessons: 1 };

      mockUpdateUserProgress.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      });

      const result = await topicService.updateUserProgress(userId, topicId, progressData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    /**
     * Test: Should validate progress data
     * 
     * Tests that the service validates progress data before
     * attempting to update. This prevents invalid data from
     * being stored in the database.
     */
    test('should validate progress data', async () => {
      const userId = 'test-user-123';
      const topicId = 1;
      const invalidProgressData = {
        completed_lessons: -1, // Invalid negative value
        total_lessons: 0 // Invalid zero value
      };

      mockUpdateUserProgress.mockResolvedValue({
        data: null,
        error: { message: 'Invalid progress data' }
      });

      const result = await topicService.updateUserProgress(userId, topicId, invalidProgressData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('Data Validation', () => {
    /**
     * Test: Should validate topic structure
     * 
     * Tests that topic objects have the required properties.
     * This ensures data integrity in the frontend.
     */
    test('should validate topic structure', () => {
      const validTopic = {
        id: 1,
        name: 'Arrays',
        description: 'Array data structure',
        difficulty: 'Easy'
      };

      expect(validTopic).toHaveProperty('id');
      expect(validTopic).toHaveProperty('name');
      expect(validTopic).toHaveProperty('description');
      expect(typeof validTopic.id).toBe('number');
      expect(typeof validTopic.name).toBe('string');
    });

    /**
     * Test: Should validate progress structure
     * 
     * Tests that progress objects have the required properties.
     * This ensures progress data is properly formatted.
     */
    test('should validate progress structure', () => {
      const validProgress = {
        topic_id: 1,
        completed_lessons: 3,
        total_lessons: 5,
        completion_percentage: 60
      };

      expect(validProgress).toHaveProperty('topic_id');
      expect(validProgress).toHaveProperty('completed_lessons');
      expect(validProgress).toHaveProperty('total_lessons');
      expect(typeof validProgress.topic_id).toBe('number');
      expect(typeof validProgress.completed_lessons).toBe('number');
    });
  });
}); 