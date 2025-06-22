import { ThemedText } from '@/components/ThemedText';
import { apiCall } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface QuizQuestion {
  id: string;
  question_text: string;
  options: { text: string; correct: boolean }[];
  correct_option: number;
  explanation: string;
}

interface QuizModalProps {
  visible: boolean;
  onClose: () => void;
  problemId: number;
  questionTitle: string;
  questionDescription: string;
  onQuizComplete: (passed: boolean) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  visible,
  onClose,
  problemId,
  questionTitle,
  questionDescription,
  onQuizComplete,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    if (visible) {
      loadQuizQuestions();
    }
  }, [visible, problemId]);

  const loadQuizQuestions = async () => {
    try {
      setQuizLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const response = await apiCall('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problemId,
          questionTitle,
          questionDescription,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions);
        setUserAnswers(new Array(data.questions.length).fill(-1));
        setCurrentQuestionIndex(0);
        setShowResults(false);
        setScore(0);
        setPassed(false);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to load quiz questions');
      }
    } catch (error) {
      console.error('Error loading quiz questions:', error);
      Alert.alert('Error', 'Failed to load quiz questions');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      submitQuiz();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitQuiz = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Check if all questions are answered
      if (userAnswers.some(answer => answer === -1)) {
        Alert.alert('Incomplete Quiz', 'Please answer all questions before submitting.');
        return;
      }

      const response = await apiCall('/api/quiz-attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          problemId,
          quizQuestionIds: questions.map(q => q.id),
          userAnswers,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScore(data.score);
        setPassed(data.passed);
        setShowResults(true);
        
        if (data.passed) {
          onQuizComplete(true);
        }
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to submit quiz');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      Alert.alert('Error', 'Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers(new Array(questions.length).fill(-1));
    setShowResults(false);
    setScore(0);
    setPassed(false);
  };

  const handleClose = () => {
    if (loading) return; // Prevent closing while submitting
    
    if (showResults && passed) {
      onClose();
    } else if (showResults && !passed) {
      Alert.alert(
        'Quiz Not Passed',
        'You need to score 3/3 to unlock the question. Would you like to retry?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: handleRetryQuiz },
        ]
      );
    } else {
      Alert.alert(
        'Leave Quiz?',
        'Are you sure you want to leave? Your progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', onPress: onClose },
        ]
      );
    }
  };

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  const renderQuestion = () => {
    if (!questions[currentQuestionIndex]) return null;
    
    const question = questions[currentQuestionIndex];
    const selectedAnswer = userAnswers[currentQuestionIndex];

    return (
      <View style={styles.questionContainer}>
        <View style={styles.questionHeader}>
          <ThemedText style={styles.questionNumber}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </ThemedText>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        <ThemedText style={styles.questionText}>
          {question.question_text}
        </ThemedText>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === index && styles.selectedOption,
              ]}
              onPress={() => handleAnswerSelect(index)}
              disabled={showResults}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.optionCircle,
                  selectedAnswer === index && styles.selectedOptionCircle
                ]}>
                  <ThemedText style={[
                    styles.optionLabel,
                    selectedAnswer === index && styles.selectedOptionLabel
                  ]}>
                    {getOptionLabel(index)}
                  </ThemedText>
                </View>
                <ThemedText style={[
                  styles.optionText,
                  selectedAnswer === index && styles.selectedOptionText
                ]}>
                  {option.text}
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentQuestionIndex === 0 && styles.disabledButton
            ]}
            onPress={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ThemedText style={styles.navButtonText}>Previous</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              styles.primaryButton,
              selectedAnswer === -1 && styles.disabledButton
            ]}
            onPress={handleNextQuestion}
            disabled={selectedAnswer === -1}
          >
            <ThemedText style={styles.navButtonText}>
              {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderResults = () => {
    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <ThemedText style={styles.resultsTitle}>
            Quiz Results
          </ThemedText>
          <View style={[
            styles.scoreCircle,
            passed ? styles.passedScore : styles.failedScore
          ]}>
            <ThemedText style={styles.scoreText}>
              {score}/3
            </ThemedText>
          </View>
        </View>

        <ThemedText style={[
          styles.resultMessage,
          passed ? styles.passedMessage : styles.failedMessage
        ]}>
          {passed 
            ? '🎉 Congratulations! You passed the quiz and can now attempt the question.'
            : '❌ You need to score 3/3 to unlock the question. Review the material and try again.'
          }
        </ThemedText>

        {!passed && (
          <View style={styles.explanationsContainer}>
            <ThemedText style={styles.explanationsTitle}>
              Review Your Answers:
            </ThemedText>
            {questions.map((question, index) => (
              <View key={index} style={styles.explanationItem}>
                <ThemedText style={styles.explanationQuestion}>
                  Q{index + 1}: {question.question_text}
                </ThemedText>
                <ThemedText style={styles.explanationText}>
                  {question.explanation}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        <View style={styles.resultsButtons}>
          {!passed && (
            <TouchableOpacity
              style={[styles.resultsButton, styles.retryButton]}
              onPress={handleRetryQuiz}
            >
              <ThemedText style={styles.resultsButtonText}>Retry Quiz</ThemedText>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.resultsButton, styles.resultsCloseButton]}
            onPress={onClose}
          >
            <ThemedText style={styles.resultsButtonText}>
              {passed ? 'Start Question' : 'Close'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>Quick Quiz</ThemedText>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <ThemedText style={styles.closeButtonText}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {quizLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6564c7" />
                <ThemedText style={styles.loadingText}>
                  Generating quiz questions...
                </ThemedText>
              </View>
            ) : showResults ? (
              renderResults()
            ) : (
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {renderQuestion()}
              </ScrollView>
            )}
          </View>

          {/* Loading overlay for submit */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#6564c7" />
              <ThemedText style={styles.loadingText}>Submitting quiz...</ThemedText>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#F4EEFF',
    borderRadius: 20,
    width: width * 0.95,
    maxWidth: 500,
    maxHeight: height * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  questionContainer: {
    flex: 1,
  },
  questionHeader: {
    marginBottom: 20,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6564c7',
    borderRadius: 2,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 26,
    marginBottom: 24,
  },
  optionsContainer: {
    marginBottom: 32,
  },
  optionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedOption: {
    borderColor: '#6564c7',
    backgroundColor: '#F3F4F6',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedOptionCircle: {
    backgroundColor: '#6564c7',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  selectedOptionLabel: {
    color: 'white',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
  },
  selectedOptionText: {
    color: '#1F2937',
    fontWeight: '500',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6564c7',
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  resultsContainer: {
    padding: 20,
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  passedScore: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  failedScore: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  resultMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  passedMessage: {
    color: '#059669',
  },
  failedMessage: {
    color: '#DC2626',
  },
  explanationsContainer: {
    marginBottom: 24,
  },
  explanationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  explanationItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  explanationQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  resultsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resultsButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#F59E0B',
  },
  resultsCloseButton: {
    backgroundColor: '#6564c7',
  },
  resultsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(244, 238, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
});

export default QuizModal; 