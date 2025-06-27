import { ThemedText } from '@/components/ThemedText';
import { apiCall } from '@/lib/api-config';
import { decodeHtmlEntities } from '@/lib/utils/textUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizData {
  questions: QuizQuestion[];
  lessonContent: string;
}

export default function QuizScreen() {
  const params = useLocalSearchParams();
  const { questionId, questionTitle, questionDescription } = params;
  const router = useRouter();
  
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    generateQuiz();
  }, []);

  const generateQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall('/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: questionTitle,
          description: questionDescription,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuizData(data);
      } else {
        setError('Failed to generate quiz');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResults) return; // Don't allow changes after submission
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (selectedAnswers[currentQuestionIndex] === undefined) {
      Alert.alert('Please select an answer', 'Choose one of the options before proceeding.');
      return;
    }

    if (currentQuestionIndex < 2) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowExplanation(false);
    } else {
      setShowResults(true);
    }
  };

  const handleShowExplanation = () => {
    setShowExplanation(true);
  };

  const handleFinishQuiz = () => {
    // Calculate score
    const correctAnswers = selectedAnswers.reduce((count, answer, index) => {
      return count + (answer === quizData?.questions[index].correctAnswer ? 1 : 0);
    }, 0);
    
    const score = Math.round((correctAnswers / 3) * 100);
    
    // Save quiz completion to database
    saveQuizCompletion(score);
    
    // Navigate back to roadmap
    router.back();
  };

  const saveQuizCompletion = async (score: number) => {
    try {
      const response = await apiCall(`/api/quiz-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          score,
          completed: true,
        }),
      });

      if (response.ok) {
        console.log('Quiz completion saved successfully');
      }
    } catch (error) {
      console.error('Failed to save quiz completion:', error);
    }
  };

  const getCurrentQuestion = () => {
    return quizData?.questions[currentQuestionIndex];
  };

  const isAnswerCorrect = (answerIndex: number) => {
    if (!showResults) return false;
    return answerIndex === getCurrentQuestion()?.correctAnswer;
  };

  const isAnswerSelected = (answerIndex: number) => {
    return selectedAnswers[currentQuestionIndex] === answerIndex;
  };

  const getAnswerStyle = (answerIndex: number) => {
    if (!showResults) {
      return isAnswerSelected(answerIndex) ? styles.selectedAnswer : styles.answerOption;
    }
    
    if (isAnswerCorrect(answerIndex)) {
      return styles.correctAnswer;
    } else if (isAnswerSelected(answerIndex) && !isAnswerCorrect(answerIndex)) {
      return styles.wrongAnswer;
    }
    return styles.answerOption;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleBubble}>
              <View style={styles.quizDot} />
              <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                {decodeHtmlEntities(String(questionTitle))}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6564c7" />
          <ThemedText style={styles.loadingText}>Generating quiz...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleBubble}>
              <View style={styles.quizDot} />
              <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                {decodeHtmlEntities(String(questionTitle))}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={generateQuiz}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showResults) {
    const correctAnswers = selectedAnswers.reduce((count, answer, index) => {
      return count + (answer === quizData?.questions[index].correctAnswer ? 1 : 0);
    }, 0);
    const score = Math.round((correctAnswers / 3) * 100);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleBubble}>
              <View style={styles.quizDot} />
              <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                Quiz Results
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Image source={require('@/assets/images/icons/quiz-icon.png')} style={styles.resultsIcon} />
            <ThemedText style={styles.resultsTitle}>Quiz Complete!</ThemedText>
          </View>

          <View style={styles.scoreContainer}>
            <ThemedText style={styles.scoreText}>{score}%</ThemedText>
            <ThemedText style={styles.scoreLabel}>
              You got {correctAnswers} out of 3 questions correct
            </ThemedText>
          </View>

          <View style={styles.questionsReview}>
            {quizData?.questions.map((question, index) => (
              <View key={index} style={styles.questionReview}>
                <View style={styles.reviewQuestionHeader}>
                  <ThemedText style={styles.questionNumber}>Question {index + 1}</ThemedText>
                  <View style={[
                    styles.resultBadge,
                    selectedAnswers[index] === question.correctAnswer 
                      ? styles.correctBadge 
                      : styles.wrongBadge
                  ]}>
                    <Image 
                      source={
                        selectedAnswers[index] === question.correctAnswer
                          ? require('@/assets/images/icons/correct-icon.png')
                          : require('@/assets/images/icons/wrong-icon.png')
                      } 
                      style={styles.resultIcon}
                    />
                  </View>
                </View>
                <ThemedText style={styles.reviewQuestionText}>{question.question}</ThemedText>
                <ThemedText style={styles.reviewExplanationText}>{question.explanation}</ThemedText>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.finishButton} onPress={handleFinishQuiz}>
            <ThemedText style={styles.finishButtonText}>Finish</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleBubble}>
            <View style={styles.quizDot} />
            <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {decodeHtmlEntities(String(questionTitle))}
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.questionContainer}>
          {/* Progress Tracker */}
          <View style={styles.progressTracker}>
            <View style={styles.progressDots}>
              {[0, 1, 2].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index <= currentQuestionIndex ? styles.progressDotActive : styles.progressDotInactive
                  ]}
                />
              ))}
            </View>
            <ThemedText style={styles.progressLabel}>
              Question {currentQuestionIndex + 1} of 3
            </ThemedText>
          </View>

          <View style={styles.questionHeader}>
            <ThemedText style={styles.questionTitle}>
              {decodeHtmlEntities(String(questionTitle))}
            </ThemedText>
            <View style={styles.quizBadge}>
              <Image source={require('@/assets/images/icons/quiz-icon.png')} style={styles.quizIcon} />
              <ThemedText style={styles.quizBadgeText}>Quiz</ThemedText>
            </View>
          </View>

          <View style={styles.questionSection}>
            <ThemedText style={styles.questionText}>
              {getCurrentQuestion()?.question}
            </ThemedText>

            <View style={styles.optionsContainer}>
              {getCurrentQuestion()?.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={getAnswerStyle(index)}
                  onPress={() => handleAnswerSelect(index)}
                  disabled={showResults}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionLetter}>
                      <ThemedText style={styles.optionLetterText}>
                        {String.fromCharCode(65 + index)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.optionText}>{option}</ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {showExplanation && (
              <View style={styles.explanationContainer}>
                <ThemedText style={styles.explanationTitle}>Explanation:</ThemedText>
                <ThemedText style={styles.explanationText}>
                  {getCurrentQuestion()?.explanation}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!showExplanation ? (
          <TouchableOpacity
            style={[
              styles.actionButton,
              selectedAnswers[currentQuestionIndex] === undefined && styles.disabledButton
            ]}
            onPress={handleShowExplanation}
            disabled={selectedAnswers[currentQuestionIndex] === undefined}
          >
            <ThemedText style={styles.actionButtonText}>Show Answer</ThemedText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleNextQuestion}
          >
            <ThemedText style={styles.actionButtonText}>
              {currentQuestionIndex === 2 ? 'Finish Quiz' : 'Next Question'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#6564c7',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
    tintColor: '#fff',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBubble: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E6FF',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    minWidth: '60%',
    maxWidth: '85%',
  },
  quizDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6564c7',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6564c7',
    textAlign: 'center',
    flexShrink: 1,
  },
  headerSpacer: {
    width: 60,
  },
  progressContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
  progressTracker: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#6564c7',
  },
  progressDotInactive: {
    backgroundColor: '#E0E0E0',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6564c7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6564c7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  questionContainer: {
    flex: 1,
  },
  questionHeader: {
    marginBottom: 24,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d2d2d',
    marginBottom: 12,
  },
  quizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  quizIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  quizBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f57c00',
  },
  questionSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d2d2d',
    marginBottom: 24,
    lineHeight: 26,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  answerOption: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedAnswer: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#1976d2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  correctAnswer: {
    backgroundColor: '#e8f5e8',
    borderWidth: 2,
    borderColor: '#4caf50',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  wrongAnswer: {
    backgroundColor: '#ffebee',
    borderWidth: 2,
    borderColor: '#f44336',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6564c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionLetterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#2d2d2d',
    lineHeight: 22,
  },
  explanationContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d2d2d',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#2d2d2d',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    backgroundColor: '#6564c7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultsIcon: {
    width: 48,
    height: 48,
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d2d2d',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6564c7',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  questionsReview: {
    marginBottom: 32,
  },
  questionReview: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewQuestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  resultBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  correctBadge: {
    backgroundColor: '#e8f5e8',
  },
  wrongBadge: {
    backgroundColor: '#ffebee',
  },
  resultIcon: {
    width: 16,
    height: 16,
  },
  reviewQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d2d2d',
    marginBottom: 8,
    lineHeight: 22,
  },
  reviewExplanationText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  finishButton: {
    backgroundColor: '#6564c7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 