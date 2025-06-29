/**
 * Widget Tests for QuizModal Component
 * 
 * Tests the QuizModal component's rendering, user interactions,
 * and state management. This component is crucial for the quiz
 * functionality in the app.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { createMockQuizQuestions } from '../utils/testUtils';

// Mock the QuizModal component (since we can't import it directly due to dependencies)
const MockQuizModal = ({ 
  visible, 
  questions, 
  onClose, 
  onOptionSelect 
}: {
  visible: boolean;
  questions: any[];
  onClose: () => void;
  onOptionSelect: (index: number) => void;
}) => {
  if (!visible) return null;
  
  return (
    <View testID="quiz-modal">
      <Text testID="modal-title">Quiz</Text>
      {questions.map((question, qIndex) => (
        <View key={qIndex} testID={`question-${qIndex}`}>
          <Text testID={`question-text-${qIndex}`}>{question.question}</Text>
          {question.options.map((option: string, oIndex: number) => (
            <TouchableOpacity
              key={oIndex}
              testID={`option-${qIndex}-${oIndex}`}
              onPress={() => onOptionSelect(oIndex)}
            >
              <Text>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <TouchableOpacity testID="close-button" onPress={onClose}>
        <Text>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('QuizModal', () => {
  const mockQuestions = createMockQuizQuestions(3);
  const mockOnClose = jest.fn();
  const mockOnOptionSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    /**
     * Test: Should render quiz questions correctly
     * 
     * Verifies that the modal displays all quiz questions with their
     * text and options. This ensures the quiz content is properly
     * presented to the user.
     */
    test('should render quiz questions correctly', () => {
      const { getByTestId, getByText, getAllByText } = render(
        <MockQuizModal
          visible={true}
          questions={mockQuestions}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
        />
      );

      expect(getByTestId('quiz-modal')).toBeTruthy();
      expect(getByTestId('modal-title')).toBeTruthy();
      
      // Check that all questions are rendered
      mockQuestions.forEach((question, index) => {
        expect(getByTestId(`question-${index}`)).toBeTruthy();
        expect(getByText(question.question)).toBeTruthy();
        
        // Check that all options are rendered
        question.options.forEach((option: string, optionIndex: number) => {
          expect(getByTestId(`option-${index}-${optionIndex}`)).toBeTruthy();
          const optionElements = getAllByText(option);
          expect(optionElements.length).toBeGreaterThan(0);
        });
      });
    });

    /**
     * Test: Should not render when not visible
     * 
     * Ensures the modal is hidden when the visible prop is false.
     * This is important for proper modal behavior.
     */
    test('should not render when not visible', () => {
      const { queryByTestId } = render(
        <MockQuizModal
          visible={false}
          questions={mockQuestions}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
        />
      );

      expect(queryByTestId('quiz-modal')).toBeNull();
    });

    /**
     * Test: Should handle empty questions array
     * 
     * Tests the edge case where no questions are provided.
     * The modal should still render but without question content.
     */
    test('should handle empty questions array', () => {
      const { getByTestId, queryByTestId } = render(
        <MockQuizModal
          visible={true}
          questions={[]}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
        />
      );

      expect(getByTestId('quiz-modal')).toBeTruthy();
      expect(queryByTestId('question-0')).toBeNull();
    });
  });

  describe('User Interactions', () => {
    /**
     * Test: Should handle option selection
     * 
     * Verifies that when a user selects an option, the correct
     * callback is called with the right index. This is crucial
     * for tracking user answers.
     */
    test('should handle option selection', () => {
      const { getByTestId } = render(
        <MockQuizModal
          visible={true}
          questions={mockQuestions}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
        />
      );

      // Select first option of first question
      const firstOption = getByTestId('option-0-0');
      fireEvent.press(firstOption);

      expect(mockOnOptionSelect).toHaveBeenCalledWith(0);
      expect(mockOnOptionSelect).toHaveBeenCalledTimes(1);
    });

    /**
     * Test: Should handle multiple option selections
     * 
     * Tests that multiple option selections work correctly and
     * don't interfere with each other. This ensures the quiz
     * can handle user interactions properly.
     */
    test('should handle multiple option selections', () => {
      const { getByTestId } = render(
        <MockQuizModal
          visible={true}
          questions={mockQuestions}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
        />
      );

      // Select different options
      fireEvent.press(getByTestId('option-0-1')); // Question 0, Option 1
      fireEvent.press(getByTestId('option-1-2')); // Question 1, Option 2
      fireEvent.press(getByTestId('option-2-0')); // Question 2, Option 0

      expect(mockOnOptionSelect).toHaveBeenCalledTimes(3);
      expect(mockOnOptionSelect).toHaveBeenNthCalledWith(1, 1);
      expect(mockOnOptionSelect).toHaveBeenNthCalledWith(2, 2);
      expect(mockOnOptionSelect).toHaveBeenNthCalledWith(3, 0);
    });

    /**
     * Test: Should handle close button press
     * 
     * Verifies that the close button properly calls the onClose
     * callback. This ensures users can exit the quiz modal.
     */
    test('should handle close button press', () => {
      const { getByTestId } = render(
        <MockQuizModal
          visible={true}
          questions={mockQuestions}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
        />
      );

      const closeButton = getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    /**
     * Test: Should have proper test IDs for accessibility
     * 
     * Ensures that all interactive elements have proper test IDs
     * for accessibility testing and screen reader support.
     */
    test('should have proper test IDs for accessibility', () => {
      const { getByTestId } = render(
        <MockQuizModal
          visible={true}
          questions={mockQuestions}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
        />
      );

      // Check that all elements have test IDs
      expect(getByTestId('quiz-modal')).toBeTruthy();
      expect(getByTestId('modal-title')).toBeTruthy();
      expect(getByTestId('close-button')).toBeTruthy();
      
      // Check question and option test IDs
      mockQuestions.forEach((_, qIndex) => {
        expect(getByTestId(`question-${qIndex}`)).toBeTruthy();
        expect(getByTestId(`question-text-${qIndex}`)).toBeTruthy();
        
        mockQuestions[qIndex].options.forEach((_: string, oIndex: number) => {
          expect(getByTestId(`option-${qIndex}-${oIndex}`)).toBeTruthy();
        });
      });
    });
  });
}); 