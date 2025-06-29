/**
 * Unit Tests for Quiz Logic
 * 
 * Tests the core quiz functionality including score calculation,
 * completion checking, and answer validation.
 */

// Mock quiz logic functions
const calculateScore = (selectedAnswers: number[], correctAnswers: number[]): number => {
  return selectedAnswers.reduce((score, answer, index) => {
    return score + (answer === correctAnswers[index] ? 1 : 0);
  }, 0);
};

const checkCompletion = (selectedAnswers: (number | undefined)[], totalQuestions: number): boolean => {
  return selectedAnswers.length === totalQuestions && 
         selectedAnswers.every(answer => answer !== undefined);
};

const isAllCorrect = (selectedAnswers: number[], correctAnswers: number[]): boolean => {
  return selectedAnswers.every((answer, index) => answer === correctAnswers[index]);
};

describe('Quiz Logic', () => {
  describe('calculateScore', () => {
    /**
     * Test: Should calculate correct score for all correct answers
     * 
     * Verifies that when all answers are correct, the score equals
     * the total number of questions. This is the core scoring logic.
     */
    test('should calculate correct score for all correct answers', () => {
      const selectedAnswers = [0, 1, 2, 0];
      const correctAnswers = [0, 1, 2, 0];
      expect(calculateScore(selectedAnswers, correctAnswers)).toBe(4);
    });

    /**
     * Test: Should calculate correct score for mixed answers
     * 
     * Tests scoring when some answers are correct and some are wrong.
     * This ensures partial credit is calculated correctly.
     */
    test('should calculate correct score for mixed answers', () => {
      const selectedAnswers = [0, 1, 3, 0]; // 3 correct, 1 wrong
      const correctAnswers = [0, 1, 2, 0];
      expect(calculateScore(selectedAnswers, correctAnswers)).toBe(3);
    });

    /**
     * Test: Should return zero for all wrong answers
     * 
     * Ensures that when no answers are correct, the score is zero.
     * This tests the edge case of complete failure.
     */
    test('should return zero for all wrong answers', () => {
      const selectedAnswers = [1, 2, 3, 1];
      const correctAnswers = [0, 1, 2, 0];
      expect(calculateScore(selectedAnswers, correctAnswers)).toBe(0);
    });

    /**
     * Test: Should handle empty arrays
     * 
     * Tests edge case where no answers have been selected yet.
     * This ensures the function doesn't crash with empty input.
     */
    test('should handle empty arrays', () => {
      expect(calculateScore([], [])).toBe(0);
    });
  });

  describe('checkCompletion', () => {
    /**
     * Test: Should detect complete quiz
     * 
     * Verifies that a quiz is marked as complete when all questions
     * have been answered. This is crucial for determining when to
     * show the results page.
     */
    test('should detect complete quiz', () => {
      const selectedAnswers = [0, 1, 2, 0];
      const totalQuestions = 4;
      expect(checkCompletion(selectedAnswers, totalQuestions)).toBe(true);
    });

    /**
     * Test: Should detect incomplete quiz
     * 
     * Tests that a quiz is marked as incomplete when not all
     * questions have been answered. This prevents premature
     * completion.
     */
    test('should detect incomplete quiz', () => {
      const selectedAnswers = [0, 1, undefined, 0];
      const totalQuestions = 4;
      expect(checkCompletion(selectedAnswers, totalQuestions)).toBe(false);
    });

    /**
     * Test: Should handle quiz with fewer answers than questions
     * 
     * Tests the case where the user hasn't answered all questions yet.
     * This ensures the completion check works correctly during the quiz.
     */
    test('should handle quiz with fewer answers than questions', () => {
      const selectedAnswers = [0, 1];
      const totalQuestions = 4;
      expect(checkCompletion(selectedAnswers, totalQuestions)).toBe(false);
    });
  });

  describe('isAllCorrect', () => {
    /**
     * Test: Should return true for all correct answers
     * 
     * Verifies that the function correctly identifies when all
     * answers are correct. This determines whether to show the
     * completion or retry page.
     */
    test('should return true for all correct answers', () => {
      const selectedAnswers = [0, 1, 2, 0];
      const correctAnswers = [0, 1, 2, 0];
      expect(isAllCorrect(selectedAnswers, correctAnswers)).toBe(true);
    });

    /**
     * Test: Should return false for any wrong answer
     * 
     * Tests that the function returns false when even one answer
     * is incorrect. This ensures the retry page is shown appropriately.
     */
    test('should return false for any wrong answer', () => {
      const selectedAnswers = [0, 1, 3, 0]; // One wrong answer
      const correctAnswers = [0, 1, 2, 0];
      expect(isAllCorrect(selectedAnswers, correctAnswers)).toBe(false);
    });

    /**
     * Test: Should handle empty arrays
     * 
     * Tests edge case with no answers. Should return true for
     * empty arrays as there are no wrong answers.
     */
    test('should handle empty arrays', () => {
      expect(isAllCorrect([], [])).toBe(true);
    });
  });
}); 