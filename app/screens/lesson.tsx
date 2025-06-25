import { ThemedText } from '@/components/ThemedText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0, 1, or 2
}

export default function LessonScreen() {
  const params = useLocalSearchParams();
  const questionId = Array.isArray(params.questionId) ? params.questionId[0] : params.questionId;
  const questionTitle = Array.isArray(params.questionTitle) ? params.questionTitle[0] : params.questionTitle;
  const questionDescription = Array.isArray(params.questionDescription) ? params.questionDescription[0] : params.questionDescription;
  
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState<'teaching' | 'quiz' | 'completion' | 'retry'>('teaching');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Animation values
  const fadeAnim = new Animated.Value(1);
  const slideAnim = new Animated.Value(0);
  const optionAnimations = [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)];

  // Placeholder quiz questions - will be replaced with AI-generated content later
  const quizQuestions: QuizQuestion[] = [
    {
      id: 1,
      question: "What is the time complexity of the Two Sum algorithm using a hash map?",
      options: [
        "O(n²)",
        "O(n)",
        "O(n log n)"
      ],
      correctAnswer: 1
    },
    {
      id: 2,
      question: "Which data structure is most efficient for the Two Sum problem?",
      options: [
        "Array",
        "Hash Map",
        "Binary Search Tree"
      ],
      correctAnswer: 1
    },
    {
      id: 3,
      question: "What is the space complexity of the Two Sum hash map solution?",
      options: [
        "O(1)",
        "O(n)",
        "O(n²)"
      ],
      correctAnswer: 1
    }
  ];

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
    if (showFeedback) return; // Prevent multiple selections
    
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    
    // Update selected answers
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newSelectedAnswers);
    
    setShowFeedback(true);
    
    // If correct, auto-advance after 1.5 seconds with smooth transition
    if (isCorrect) {
      setScore(score + 1);
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
    // If wrong, don't show correct answer - user will need to retry
  };

  const handleNextQuestion = () => {
    setShowFeedback(false);
    
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
        // Quiz completed successfully - show completion page
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

  if (currentPage === 'teaching') {
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
            <ThemedText style={styles.lessonTitle}>{questionTitle}</ThemedText>
            
            <View style={styles.lessonContent}>
              <ThemedText style={styles.sectionTitle}>Understanding the Problem</ThemedText>
              <ThemedText style={styles.lessonText}>
                The Two Sum problem asks us to find two numbers in an array that add up to a specific target value. 
                We need to return the indices of these two numbers.
              </ThemedText>

              <ThemedText style={styles.sectionTitle}>Key Concepts</ThemedText>
              <ThemedText style={styles.lessonText}>
                • Hash maps provide O(1) average time complexity for lookups{'\n'}
                • We can use a hash map to store numbers we&apos;ve seen{'\n'}
                • For each number, we check if (target - current_number) exists in our map{'\n'}
                • This gives us O(n) time complexity instead of O(n²)
              </ThemedText>

              <ThemedText style={styles.sectionTitle}>Algorithm Steps</ThemedText>
              <ThemedText style={styles.lessonText}>
                1. Create an empty hash map{'\n'}
                2. Iterate through the array{'\n'}
                3. For each number, calculate complement = target - current_number{'\n'}
                4. If complement exists in map, return [map[complement], current_index]{'\n'}
                5. Otherwise, store current_number and its index in the map{'\n'}
                6. Continue until solution is found
              </ThemedText>

              <ThemedText style={styles.sectionTitle}>Why This Works</ThemedText>
              <ThemedText style={styles.lessonText}>
                By storing each number and its index as we iterate, we can quickly check if we&apos;ve 
                already seen the complement of the current number. This eliminates the need for 
                nested loops and dramatically improves efficiency.
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleStartQuiz}>
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
}); 