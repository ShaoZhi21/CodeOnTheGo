import { useStreak } from '@/contexts/StreakContext';
import { ProfileService } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface QuizMCQQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  optionExplanations?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

interface QuizMCQData {
  introductory_text: string;
  quiz: QuizMCQQuestion[];
}

const { height: screenHeight } = Dimensions.get('window');

export default function QuizMCQScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { showStreakAnimation } = useStreak();
  
  // Parse the quiz data from params or AsyncStorage
  const [quizData, setQuizData] = useState<QuizMCQData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load quiz data from AsyncStorage if usePrefetchedData is true
  useEffect(() => {
    const loadQuizData = async () => {
      try {
        if (params.usePrefetchedData === 'true' && params.lessonTitles) {
          const storedData = await AsyncStorage.getItem(`quiz_${params.lessonTitles}`);
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            setQuizData(parsedData);
            console.log('✅ QuizMCQ: Loaded quiz data from AsyncStorage');
          }
        }
      } catch (error) {
        console.error('Error loading quiz data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuizData();
  }, [params.usePrefetchedData, params.lessonTitles]);



  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  
  // Animation values
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  const currentQuestion = quizData?.quiz[currentQuestionIndex];
  const totalQuestions = quizData?.quiz.length || 0;

  // Bounce animation when question appears
  useEffect(() => {
    // Use requestAnimationFrame to ensure we're not in the middle of a render
    requestAnimationFrame(() => {
      // Reset animations
      bounceAnim.setValue(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      slideAnim.setValue(screenHeight);
      
      // Reset state
      setSelectedOption(null);
      setShowExplanation(false);
      setHasSubmitted(false);
      setIsCorrect(false);

      // Start bounce animation
      Animated.parallel([
        Animated.spring(bounceAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [currentQuestionIndex, bounceAnim, fadeAnim, scaleAnim, slideAnim]);

  const handleAnswerSelect = (selectedAnswer: string) => {
    // Allow re-selection if not submitted or if previous answer was wrong
    if (hasSubmitted && isCorrect) return; // Don't allow re-selection if already correct

    setSelectedOption(selectedAnswer);
    
    // Only update the score and answers array on first correct submission
    if (!hasSubmitted) {
      const newSelectedAnswers = [...selectedAnswers];
      newSelectedAnswers[currentQuestionIndex] = selectedAnswer;
      setSelectedAnswers(newSelectedAnswers);
    }
  };

  const handleSubmit = () => {
    if (!selectedOption) return;

    // Check if answer is correct
    const correct = selectedOption === currentQuestion?.correct_answer;
    setIsCorrect(correct);
    setHasSubmitted(true);

    // Update score only on first correct submission
    if (correct && !hasSubmitted) {
      setScore(score + 1);
    }

    // Show explanation with smooth slide animation
    setShowExplanation(true);
    
    // Reset modal animations
    modalScaleAnim.setValue(0.9);
    modalOpacityAnim.setValue(0);
    
    // Animate modal with smooth slide to final position (no bouncing)
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(modalScaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = () => {
    // Hide explanation with smooth slide down (no bouncing)
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalScaleAnim, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Use requestAnimationFrame to ensure we're not in the middle of a render
      requestAnimationFrame(() => {
        setShowExplanation(false);
        
        if (currentQuestionIndex < totalQuestions - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
          // Quiz completed: check if this is first daily activity
          checkDailyStreakAndNavigate();
        }
      });
    });
  };

  const checkDailyStreakAndNavigate = async () => {
    try {
      console.log('🎯 checkDailyStreakAndNavigate: Starting...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {

        // No user, go directly to RecapQuizComplete
        router.push({
          pathname: './RecapQuizComplete',
          params: {
            lessonTitles: params.lessonTitles || '',
            quizData: JSON.stringify(quizData) || '', // Pass the quiz data
          }
        });
        return;
      }

      // Get today and yesterday at 12am
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const now = new Date(); // Current time for comparison

      console.log('📅 Date check:', {
        today: today.toISOString(),
        yesterday: yesterday.toISOString(),
        currentTime: now.toISOString()
      });

      // Get activities BEFORE the current quiz completion (exclude the quiz we just completed)
      const [{ data: problemData }, { data: lessonData }] = await Promise.all([
        supabase
          .from('user_problem_progress')
          .select('created_at')
          .eq('user_id', user.id)
          .lt('created_at', now.toISOString()) // Only activities before now
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('user_lesson_completion')
          .select('completed_at')
          .eq('user_id', user.id)
          .lt('completed_at', now.toISOString()) // Only activities before now
          .order('completed_at', { ascending: false })
          .limit(1)
      ]);

      console.log('🔍 Activity data (before current quiz):', {
        problemData: problemData,
        lessonData: lessonData
      });

      // Find the latest activity date (excluding current quiz)
      let lastActivity: Date | null = null;
      if (problemData && problemData.length > 0) {
        lastActivity = new Date(problemData[0].created_at);
        console.log('📊 Last problem activity (before current):', lastActivity.toISOString());
      }
      if (lessonData && lessonData.length > 0) {
        const lessonDate = new Date(lessonData[0].completed_at);
        console.log('📊 Last lesson activity (before current):', lessonDate.toISOString());
        if (!lastActivity || lessonDate > lastActivity) {
          lastActivity = lessonDate;
          console.log('📊 Updated last activity to lesson (before current):', lastActivity.toISOString());
        }
      }



      // Now save the current quiz completion
      await handleQuizCompletion();

      // Check if user had already done activity today (before this quiz)
      if (lastActivity && lastActivity >= today) {

        // Already did activity today, go to RecapQuizComplete
        router.push({
          pathname: './RecapQuizComplete',
          params: {
            lessonTitles: params.lessonTitles || '',
            quizData: JSON.stringify(quizData) || '', // Pass the quiz data
          }
        });
        return;
      }

      // If last activity was exactly yesterday, increment streak
      if (lastActivity && lastActivity >= yesterday && lastActivity < today) {
        console.log('✅ Consecutive day detected, incrementing streak');
        // Consecutive day, increment streak
        const updatedProfile = await ProfileService.updateStreak(user.id, true);
        if (updatedProfile) {
          console.log('✅ Streak incremented:', updatedProfile.current_streak);
        } else {
          console.error('❌ Failed to increment streak');
        }
      } else {
        console.log('🔄 Missed a day or first activity, resetting streak to 1');
        // Missed a day or first activity ever, reset streak to 1
        const updatedProfile = await ProfileService.updateStreak(user.id, false); // reset to 0
        if (updatedProfile) {
          // Now increment to 1 for today
          const finalProfile = await ProfileService.updateStreak(user.id, true);
          console.log('✅ Streak reset and started at 1:', finalProfile?.current_streak);
        } else {
          console.error('❌ Failed to reset streak');
        }
      }

      console.log('🎬 Navigating to StreakAnimation...');
      // Show streak animation
      router.push({
        pathname: './StreakAnimation',
        params: {
          from: 'quizMCQ', // Add from parameter to identify source
          problemTitle: 'Recap Quiz',
          problemId: params.lessonTitles || '',
          topicName: 'Recap',
          quizData: JSON.stringify(quizData) || '', // Pass the quiz data
          lessonTitles: params.lessonTitles || '', // Pass lessonTitles for recap quiz
        }
      });
    } catch (error) {
      console.error('❌ Error in checkDailyStreakAndNavigate:', error);
      console.log('🎯 Navigating to RecapQuizComplete with lessonTitles:', params.lessonTitles);
      // On error, go directly to RecapQuizComplete
      router.push({
        pathname: './RecapQuizComplete',
        params: {
          lessonTitles: params.lessonTitles || '',
          quizData: JSON.stringify(quizData) || '', // Pass the quiz data
        }
      });
    }
  };

  const handleRetryQuiz = () => {
    // Use requestAnimationFrame to ensure we're not in the middle of a render
    requestAnimationFrame(() => {
      setCurrentQuestionIndex(0);
      setSelectedAnswers([]);
      setScore(0);
      setShowResult(false);
      setSelectedOption(null);
      setShowExplanation(false);
      setHasSubmitted(false);
      setIsCorrect(false);
      slideAnim.setValue(screenHeight);
    });
  };

  const handleBackToQuiz = () => {
    router.back();
  };

  // Handle quiz completion and trigger streak
  const handleQuizCompletion = async () => {
    if (quizCompleted) return; // Prevent multiple calls
    setQuizCompleted(true);
    try {
      const { markProblemFullyComplete } = await import('@/lib/services/userProgress');
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Calculate final score
      const actualScore = Math.min(score, totalQuestions);
      const percentage = Math.round((actualScore / totalQuestions) * 100);
      const passed = percentage >= 70;
      
      // For recap quiz, we don't need to save to a specific problem
      // Just mark that the user completed a recap quiz
      console.log('✅ Recap quiz completed with score:', actualScore, '/', totalQuestions);
    } catch (error) {
      console.error('Error handling quiz completion:', error);
    }
  };

  const getOptionLetter = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  const getOptionStyle = (option: string, index: number) => {
    const isSelected = selectedOption === option;
    
    if (!hasSubmitted) {
      // Before submission, show purple border for selected option
      return isSelected ? [styles.option, styles.selectedOption] : styles.option;
    }
    
    // After submission, only show feedback for the selected option
    if (isSelected) {
      const optionIsCorrect = option === currentQuestion?.correct_answer;
      if (optionIsCorrect) {
        return [styles.option, styles.correctOption];
      } else {
        return [styles.option, styles.wrongOption];
      }
    }
    
    // Don't show any feedback for non-selected options
    return styles.option;
  };

  const getOptionTextStyle = (option: string) => {
    const isSelected = selectedOption === option;
    
    if (!hasSubmitted) {
      // Before submission, make selected option bold
      return isSelected ? [styles.optionText, styles.selectedOptionText] : styles.optionText;
    }
    
    // After submission, only show feedback for the selected option
    if (isSelected) {
      const optionIsCorrect = option === currentQuestion?.correct_answer;
      if (optionIsCorrect) {
        return [styles.optionText, styles.correctOptionText];
      } else {
        return [styles.optionText, styles.wrongOptionText];
      }
    }
    
    // Don't show any feedback for non-selected options
    return styles.optionText;
  };

  const renderProgressDots = () => {
    return (
      <View style={styles.progressContainer}>
        {Array.from({ length: totalQuestions }, (_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              {
                backgroundColor: index === currentQuestionIndex 
                  ? '#A855F7' 
                  : index < currentQuestionIndex 
                    ? '#10B981' 
                    : '#E5E7EB'
              }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderExplanationModal = () => {
    if (!showExplanation || !selectedOption) return null;

    const selectedIndex = currentQuestion?.options.indexOf(selectedOption) || 0;
    const selectedLetter = getOptionLetter(selectedIndex);
    const selectedExplanation = currentQuestion?.optionExplanations?.[selectedLetter as keyof typeof currentQuestion.optionExplanations];
    
    return (
      <Modal
        visible={showExplanation}
        transparent={true}
        animationType="none"
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalOpacityAnim }]}>
          <Animated.View 
            style={[
              styles.explanationModal,
              {
                transform: [
                  { translateY: slideAnim },
                  { scale: modalScaleAnim }
                ]
              }
            ]}
          >
            <Text style={styles.explanationTitle}>
              {isCorrect ? '✅ Correct' : '❌ Wrong'}
            </Text>
            
            {/* Show clean explanation only */}
            <Text style={[styles.explanationText, { textAlign: 'left' }]}>
              {selectedExplanation || 'Explanation not available for this option.'}
            </Text>
            
            {isCorrect ? (
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>
                  {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'Complete'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.tryAgainButton}
                onPress={() => {
                  // Hide modal with smooth slide down (no bouncing)
                  Animated.parallel([
                    Animated.timing(slideAnim, {
                      toValue: screenHeight,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                    Animated.timing(modalScaleAnim, {
                      toValue: 0.9,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                    Animated.timing(modalOpacityAnim, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: true,
                    }),
                  ]).start(() => {
                    // Use requestAnimationFrame to ensure we're not in the middle of a render
                    requestAnimationFrame(() => {
                      setShowExplanation(false);
                      setHasSubmitted(false);
                      setIsCorrect(false);
                    });
                  });
                }}
              >
                <Text style={styles.tryAgainButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    return (
      <Animated.View 
        style={[
          styles.questionContainer,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: bounceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })},
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        {/* Progress dots */}
        {renderProgressDots()}
        
        {/* Question counter */}
        <View style={styles.questionCounter}>
          <Text style={styles.questionCounterText}>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Text>
        </View>

        {/* Question text */}
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        
        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === option;
            const isCorrect = option === currentQuestion.correct_answer;
            
            return (
              <TouchableOpacity
                key={index}
                style={getOptionStyle(option, index)}
                onPress={() => handleAnswerSelect(option)}
                disabled={hasSubmitted && isCorrect}
              >
                <View style={styles.optionBubble}>
                  <Text style={styles.optionLetter}>{getOptionLetter(index)}</Text>
                </View>
                <Text style={getOptionTextStyle(option)}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={!selectedOption}
        >
          <Text style={styles.submitButtonText}>
            Submit
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToQuiz} style={styles.backButton}>
            <Image 
              source={require('../../assets/images/icons/back-icon.png')} 
              style={styles.backIcon} 
            />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleBubble}>
              <View style={styles.quizDot} />
              <Text style={styles.headerTitle}>Loading Quiz...</Text>
            </View>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Loading quiz data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!quizData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToQuiz} style={styles.backButton}>
            <Image 
              source={require('../../assets/images/icons/back-icon.png')} 
              style={styles.backIcon} 
            />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleBubble}>
              <View style={styles.quizDot} />
              <Text style={styles.headerTitle}>Recap Quiz</Text>
            </View>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No quiz data available</Text>
          <Text style={styles.errorSubtext}>
            Quiz data was not loaded correctly. Please try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToQuiz} style={styles.backButton}>
          <Image 
            source={require('../../assets/images/icons/back-icon.png')} 
            style={styles.backIcon} 
          />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleBubble}>
            <View style={styles.quizDot} />
            <Text style={styles.headerTitle}>Recap Quiz</Text>
          </View>
        </View>
      
        <View style={styles.headerSpacer} />
      </View>
      
      <View style={styles.content}>
        {renderQuestion()}
      </View>
      
      {renderExplanationModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#F3E8FF',
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  questionCounter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  questionCounterText: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 26,
    marginBottom: 15,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedOption: {
    borderColor: '#6564c7',
    backgroundColor: '#EDE9FE',
    borderWidth: 3,
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  optionBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6564c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionLetter: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#6564c7',
    fontSize: 16,
  },
  correctOption: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  correctOptionText: {
    color: '#065F46',
  },
  wrongOption: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  wrongOptionText: {
    color: '#991B1B',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#6564c7',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  explanationModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 200,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  explanationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 12,
    textAlign: 'center',
  },
  explanationText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  nextButton: {
    backgroundColor: '#6564c7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  tryAgainButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  tryAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
}); 