import { ThemedText } from '@/components/ThemedText';
import { useStreak } from '@/contexts/StreakContext';
import { apiCall } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface LessonData {
  title: string;
  content: string;
  keyConcepts: string[];
  examples: string[];
  hints: string[];
  pitfalls: string[];
  visualAids: string[];
  solutionApproaches?: {
    name: string;
    description: string;
    timeComplexity: string;
    spaceComplexity: string;
    keyInsight: string;
  }[];
}

interface QuizData {
  questions: QuizQuestion[];
  lessonSummary: string;
}

export default function LessonScreen() {
  console.log('🚀 LessonScreen component loaded!');
  console.log('🚀 Params:', useLocalSearchParams());
  
  const params = useLocalSearchParams();
  const questionId = Array.isArray(params.questionId) ? params.questionId[0] : params.questionId;
  const questionTitle = Array.isArray(params.questionTitle) ? params.questionTitle[0] : params.questionTitle;
  const questionDescription = Array.isArray(params.questionDescription) ? params.questionDescription[0] : params.questionDescription;
  const topicName = Array.isArray(params.topicName) ? params.topicName[0] : params.topicName;
  
  const router = useRouter();
  const { showStreakAnimation } = useStreak();
  const [currentPage, setCurrentPage] = useState<'loading' | 'teaching' | 'quiz' | 'completion' | 'retry'>('loading');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  
  // Lesson and quiz data
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  
  // Animation values
  const fadeAnim = new Animated.Value(1);
  const slideAnim = new Animated.Value(0);
  const optionAnimations = [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)];

  // Debug lessonData changes
  useEffect(() => {
    console.log('🔄 lessonData state changed:', lessonData);
    console.log('🔄 lessonData content:', lessonData?.content);
    console.log('🔄 lessonData title:', lessonData?.title);
  }, [lessonData]);

  // Load lesson and quiz data
  useEffect(() => {
    const loadLessonData = async () => {
      try {
        console.log('🔄 Loading lesson data for problem:', questionId, 'topic:', topicName);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 User found:', !!user);
        
        console.log('📡 Making lesson API call...');
        console.log('📡 API request body:', {
          topicName: topicName,
          problemId: parseInt(questionId || '0'),
          userId: user?.id,
        });
        
        // Generate lesson content
        const lessonResponse = await apiCall('/api/generate-topic-lesson', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            topicName: topicName,
            problemId: parseInt(questionId || '0'),
            userId: user?.id,
          }),
        });

        console.log('📡 Lesson API response status:', lessonResponse.status);
        
        if (!lessonResponse.ok) {
          const errorText = await lessonResponse.text();
          console.error('❌ Lesson API error:', lessonResponse.status, errorText);
          throw new Error(`Failed to generate lesson: ${lessonResponse.status} - ${errorText}`);
        }

        const lessonResult = await lessonResponse.json();
        console.log('📚 Lesson data received:', lessonResult);
        console.log('📚 Lesson data type:', typeof lessonResult);
        console.log('📚 Lesson data keys:', Object.keys(lessonResult || {}));
        console.log('📚 Content field:', lessonResult?.content);
        console.log('📚 Content length:', lessonResult?.content?.length);
        
        // Set lesson data if we have any valid response
        if (lessonResult) {
          setLessonData(lessonResult);
          console.log('✅ Lesson data set successfully');
        } else {
          console.warn('⚠️ No lesson data received, using fallback');
          throw new Error('No lesson data received from API');
        }

        // Try to generate quiz, but don't fail the entire lesson if quiz fails
        try {
          console.log('📡 Making quiz API call...');
          // Generate quiz questions based on lesson content
          const quizResponse = await apiCall('/api/generate-topic-quiz', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
              topicName: topicName,
              problemId: parseInt(questionId || '0'),
              lessonContent: lessonResult.content,
              solutionApproaches: lessonResult.solutionApproaches,
            }),
          });

          console.log('📡 Quiz API response status:', quizResponse.status);
          if (!quizResponse.ok) {
            const errorText = await quizResponse.text();
            console.error('❌ Quiz API error:', quizResponse.status, errorText);
            throw new Error(`Failed to generate quiz: ${quizResponse.status} - ${errorText}`);
          }

          const quizResult = await quizResponse.json();
          console.log('📝 Quiz data generated successfully:', quizResult);
          setQuizData(quizResult);
          
          // Format quiz questions with IDs
          const formattedQuestions = quizResult.questions.map((q: any, index: number) => ({
            id: index + 1,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          }));
          setQuizQuestions(formattedQuestions);
        } catch (quizError) {
          console.error('⚠️ Quiz generation failed, but lesson will still be shown:', quizError);
          // Don't throw here - just log the error and continue with lesson only
        }

        console.log('✅ All data loaded successfully, showing teaching page');
        setCurrentPage('teaching');
      } catch (error: any) {
        console.error('💥 Error loading lesson data:', error);
        console.error('💥 Error details:', {
          message: error?.message || 'Unknown error',
          stack: error?.stack || 'No stack trace',
          name: error?.name || 'Unknown error type'
        });
        
        // Fallback to basic content if API fails
        setLessonData({
          title: questionTitle || 'Lesson',
          content: 'Lesson content could not be loaded. Please try again later.',
          keyConcepts: ['Basic concepts'],
          examples: ['Example 1', 'Example 2'],
          hints: ['Hint 1', 'Hint 2'],
          pitfalls: ['Common mistake 1'],
          visualAids: ['Visual aid 1'],
        });
        setCurrentPage('teaching');
      }
    };

    if (questionId && topicName) {
      loadLessonData();
    }
  }, [questionId, topicName]);

  const handleStartQuiz = () => {
    setCurrentPage('quiz');
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setScore(0);
    // Reset animations
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
    optionAnimations.forEach(anim => anim.setValue(1));
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (showFeedback || isProcessingAnswer) return; // Prevent multiple selections
    
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    
    // Set processing flag to prevent multiple selections
    setIsProcessingAnswer(true);
    
    // Update selected answers
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newSelectedAnswers);
    
    // Update score only once
    if (isCorrect) {
      setScore(prevScore => prevScore + 1);
    }
    
    setShowFeedback(true);
    
    // Animate the selected option
    Animated.sequence([
      Animated.timing(optionAnimations[optionIndex], {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(optionAnimations[optionIndex], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    // If correct, auto-advance after 1.5 seconds with smooth transition
    if (isCorrect) {
      setTimeout(() => {
        // Fade out current question
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          handleNextQuestion();
        });
      }, 1500);
    }
  };

  const handleNextQuestion = () => {
    setShowFeedback(false);
    setIsProcessingAnswer(false); // Reset processing flag
    
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // Reset animations for new question
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      optionAnimations.forEach(anim => anim.setValue(0.8));
      
      // Animate in new question with staggered timing
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Stagger the option animations for a more natural feel
      optionAnimations.forEach((anim, index) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: 200 + (index * 150), // Start after fade-in begins, stagger each option
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Check if all answers are correct
      const allCorrect = selectedAnswers.every((answer, index) => 
        answer === quizQuestions[index].correctAnswer
      );
      
      if (allCorrect) {
        // Quiz completed successfully - save to database and show completion page
        handleSaveQuizCompletion().catch(error => {
          console.error('Failed to save quiz completion:', error);
        });
        // Trigger streak animation for lesson completion
        showStreakAnimation(1);
        setCurrentPage('completion');
      } else {
        // Not all correct - show retry page
        setCurrentPage('retry');
      }
    }
  };

  const handleRestartQuiz = () => {
    setCurrentPage('quiz');
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setScore(0);
    setShowFeedback(false);
    setIsProcessingAnswer(false); // Reset processing flag
    
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    optionAnimations.forEach(anim => anim.setValue(0.8));
    
    // Animate in first question
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Stagger the option animations
    optionAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 200 + (index * 150),
        useNativeDriver: true,
      }).start();
    });
  };

  const handleBackToRoadmap = () => {
    router.back();
  };

  const handleSaveQuizCompletion = async () => {
    try {
      console.log('🔄 Starting quiz completion save...');
      console.log('📊 Quiz data:', { questionId, score, completed: true });
      
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔑 Session found:', !!session);
      console.log('🔑 Token available:', !!session?.access_token);
      
      const response = await apiCall('/api/quiz-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          questionId: parseInt(questionId || '0'),
          score: score,
          completed: true,
        }),
      });

      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Quiz completion saved successfully:', responseData);
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to save quiz completion:', response.status, errorData);
      }
    } catch (error) {
      console.error('💥 Error saving quiz completion:', error);
    }
  };

  const getOptionStyle = (optionIndex: number) => {
    const baseStyle = styles.optionButton;
    const transformStyle = { transform: [{ scale: optionAnimations[optionIndex] }] };
    
    if (!showFeedback) {
      return [baseStyle, transformStyle];
    }
    
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isSelected = selectedAnswers[currentQuestionIndex] === optionIndex;
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    
    if (isSelected && isCorrect) {
      return [baseStyle, styles.optionCorrect, transformStyle];
    } else if (isSelected && !isCorrect) {
      return [baseStyle, styles.optionIncorrect, transformStyle];
    }
    // Don't show correct answer if user selected wrong answer
    
    return [baseStyle, transformStyle];
  };

  const getOptionTextStyle = (optionIndex: number) => {
    if (!showFeedback) {
      return styles.optionText;
    }
    
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isSelected = selectedAnswers[currentQuestionIndex] === optionIndex;
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    
    if (isSelected && isCorrect) {
      return [styles.optionText, styles.optionTextCorrect];
    } else if (isSelected && !isCorrect) {
      return [styles.optionText, styles.optionTextIncorrect];
    }
    // Don't show correct answer text if user selected wrong answer
    
    return styles.optionText;
  };

  // Animate options in on quiz start
  useEffect(() => {
    if (currentPage === 'quiz') {
      // Start with fade and slide animation for the entire quiz container
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Stagger the option animations for a more natural entrance
      optionAnimations.forEach((anim, index) => {
        anim.setValue(0.8);
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: 300 + (index * 120), // Start after container animation, stagger each option
          useNativeDriver: true,
        }).start();
      });
    }
  }, [currentPage, currentQuestionIndex]);

  if (currentPage === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText>← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Lesson</ThemedText>
        </View>
        
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#6564c7" />
          <ThemedText style={[styles.lessonText, { marginTop: 20, textAlign: 'center' }]}>
            Generating your personalized lesson...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (currentPage === 'teaching') {
    console.log('🎨 Rendering teaching page with lessonData:', lessonData);
    console.log('🎨 lessonData?.title:', lessonData?.title);
    console.log('🎨 lessonData?.content:', lessonData?.content);
    console.log('🎨 questionTitle:', questionTitle);
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText>← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Lesson</ThemedText>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.lessonContainer}>
            <ThemedText style={styles.lessonTitle}>
              {lessonData?.title || questionTitle}
            </ThemedText>
            
            <View style={styles.lessonContent}>
              <ThemedText style={styles.sectionTitle}>Main Content</ThemedText>
              <ThemedText style={styles.lessonText}>
                {lessonData?.content || 'Lesson content is loading...'}
              </ThemedText>

              {lessonData?.keyConcepts && lessonData.keyConcepts.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>Key Concepts</ThemedText>
                  <ThemedText style={styles.lessonText}>
                    {lessonData.keyConcepts.map((concept, index) => 
                      `• ${concept}${index < lessonData.keyConcepts.length - 1 ? '\n' : ''}`
                    )}
                  </ThemedText>
                </>
              )}

              {lessonData?.examples && lessonData.examples.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>Examples</ThemedText>
                  {lessonData.examples.map((example, index) => (
                    <ThemedText key={index} style={styles.lessonText}>
                      {index + 1}. {example}
                      {index < lessonData.examples.length - 1 ? '\n\n' : ''}
                    </ThemedText>
                  ))}
                </>
              )}

              {lessonData?.hints && lessonData.hints.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>Problem-Solving Hints</ThemedText>
                  {lessonData.hints.map((hint, index) => (
                    <ThemedText key={index} style={styles.lessonText}>
                      💡 {hint}
                      {index < lessonData.hints.length - 1 ? '\n\n' : ''}
                    </ThemedText>
                  ))}
                </>
              )}

              {lessonData?.pitfalls && lessonData.pitfalls.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>Common Pitfalls</ThemedText>
                  {lessonData.pitfalls.map((pitfall, index) => (
                    <ThemedText key={index} style={styles.lessonText}>
                      ⚠️ {pitfall}
                      {index < lessonData.pitfalls.length - 1 ? '\n\n' : ''}
                    </ThemedText>
                  ))}
                </>
              )}

              {lessonData?.visualAids && lessonData.visualAids.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>Visual Aids</ThemedText>
                  {lessonData.visualAids.map((aid, index) => (
                    <ThemedText key={index} style={styles.lessonText}>
                      🎯 {aid}
                      {index < lessonData.visualAids.length - 1 ? '\n\n' : ''}
                    </ThemedText>
                  ))}
                </>
              )}

              {lessonData?.solutionApproaches && lessonData.solutionApproaches.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>Solution Approaches Overview</ThemedText>
                  <ThemedText style={styles.lessonText}>
                    This problem can be solved using several different approaches. Understanding these will help you choose the best strategy:
                  </ThemedText>
                  {lessonData.solutionApproaches.map((approach, index) => (
                    <View key={index} style={styles.approachContainer}>
                      <ThemedText style={styles.approachTitle}>
                        {index + 1}. {approach.name}
                      </ThemedText>
                      <ThemedText style={styles.lessonText}>
                        {approach.description}
                      </ThemedText>
                      <View style={styles.complexityContainer}>
                        <ThemedText style={styles.complexityText}>
                          ⏱️ Time: {approach.timeComplexity}
                        </ThemedText>
                        <ThemedText style={styles.complexityText}>
                          💾 Space: {approach.spaceComplexity}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.lessonText}>
                        💡 Key Insight: {approach.keyInsight}
                      </ThemedText>
                      {index < (lessonData.solutionApproaches?.length || 0) - 1 ? '\n' : ''}
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.nextButton, !lessonData && styles.nextButtonDisabled]} 
            onPress={handleStartQuiz}
            disabled={!lessonData}
          >
            <ThemedText style={styles.nextButtonText}>Start Quiz →</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (currentPage === 'completion') {
    const percentage = Math.round((score / quizQuestions.length) * 100);
    const isPerfect = score === quizQuestions.length;
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Quiz Complete!</ThemedText>
        </View>

        <View style={styles.completionContainer}>
          <View style={styles.scoreCard}>
            <ThemedText style={styles.congratulationsText}>
              {isPerfect ? '🎉 Perfect Score! 🎉' : '🎉 Congratulations! 🎉'}
            </ThemedText>
            
            <ThemedText style={styles.scoreText}>
              You scored {score} out of {quizQuestions.length} ({percentage}%)
            </ThemedText>
            
            <View style={styles.scoreBar}>
              <View style={[styles.scoreFill, { width: `${percentage}%` }]} />
            </View>
            
            <ThemedText style={styles.completionMessage}>
              Great job! You&apos;ve successfully completed the lesson and quiz. 
              You&apos;re now ready to attempt the actual coding question!
            </ThemedText>
            
            <ThemedText style={styles.readyText}>
              ✅ You can now go back and click &quot;Attempt Question!&quot; to solve the problem.
            </ThemedText>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleBackToRoadmap}>
            <ThemedText style={styles.nextButtonText}>Back to Roadmap</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (currentPage === 'retry') {
    const percentage = Math.round((score / quizQuestions.length) * 100);
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Quiz Incomplete</ThemedText>
        </View>

        <View style={styles.completionContainer}>
          <View style={styles.scoreCard}>
            <ThemedText style={styles.retryTitle}>
              ❌ Not Quite There Yet
            </ThemedText>
            
            <ThemedText style={styles.scoreText}>
              You scored {score} out of {quizQuestions.length} ({percentage}%)
            </ThemedText>
            
            <View style={styles.scoreBar}>
              <View style={[styles.scoreFill, { width: `${percentage}%` }]} />
            </View>
            
            <ThemedText style={styles.retryMessage}>
              You need to get all questions correct to complete this lesson. 
              Review the material and try again!
            </ThemedText>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleRestartQuiz}>
            <ThemedText style={styles.nextButtonText}>Retry Quiz</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Quiz page
  const currentQuestion = quizQuestions[currentQuestionIndex];
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentPage('teaching')} style={styles.backButton}>
          <ThemedText>← Back to Lesson</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          Question {currentQuestionIndex + 1} of {quizQuestions.length}
        </ThemedText>
      </View>

      <Animated.View 
        style={[
          styles.quizContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <ThemedText style={styles.questionText}>{currentQuestion.question}</ThemedText>
        
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={getOptionStyle(index)}
              onPress={() => handleOptionSelect(index)}
              disabled={showFeedback}
              activeOpacity={0.7}
            >
              <ThemedText style={getOptionTextStyle(index)}>{option}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, !showFeedback && styles.nextButtonDisabled]} 
          onPress={handleNextQuestion}
          disabled={!showFeedback}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.nextButtonText}>
            {currentQuestionIndex < quizQuestions.length - 1 ? 'Next Question →' : 'Complete Quiz'}
          </ThemedText>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Compensate for back button width
  },
  content: {
    flex: 1,
  },
  lessonContainer: {
    padding: 20,
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#6564c7',
  },
  lessonContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  lessonText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 15,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  nextButton: {
    backgroundColor: '#6564c7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quizContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#333',
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionCorrect: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  optionIncorrect: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  optionTextCorrect: {
    color: '#155724',
    fontWeight: 'bold',
  },
  optionTextIncorrect: {
    color: '#721c24',
    fontWeight: 'bold',
  },
  completionContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  scoreCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  congratulationsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  scoreBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    marginBottom: 30,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 6,
  },
  completionMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  readyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
  },
  retryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  approachContainer: {
    marginBottom: 20,
  },
  approachTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  complexityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  complexityText: {
    fontSize: 16,
    color: '#666',
  },
}); 