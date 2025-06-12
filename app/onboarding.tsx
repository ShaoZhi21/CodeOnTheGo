import { ThemedText } from '@/components/ThemedText';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const questions = [
  // Very Simple Logic Questions (1-2)
  {
    id: 1,
    question: "What is the main purpose of a 'for loop' in programming?",
    options: [
      "To make decisions based on conditions",
      "To repeat a block of code multiple times",
      "To store data in variables",
      "To define functions"
    ],
    correctAnswer: 1,
    difficulty: 'Easy',
    explanation: "A for loop is used to execute a block of code repeatedly, typically for a specific number of iterations or over a collection of items."
  },
  {
    id: 2,
    question: "How would you calculate the sum of all elements in an array [1, 2, 3, 4, 5]?",
    options: [
      "Use a for loop to iterate through each element and add them to a total",
      "Use a while loop to check if each element exists",
      "Use an if statement to compare each element",
      "Use a function to multiply all elements together"
    ],
    correctAnswer: 0,
    difficulty: 'Easy',
    explanation: "A for loop is the most common approach to iterate through an array and accumulate the sum by adding each element to a running total."
  },
  
  // Slightly Harder Questions (3-4)
  {
    id: 3,
    question: "Two Sum Problem: Given an array and a target sum, what's the most efficient approach to find two numbers that add up to the target?",
    options: [
      "Use nested loops to check every pair of numbers (O(n²))",
      "Use a hash map to store values and check for complements (O(n))",
      "Sort the array first, then use binary search (O(n log n))",
      "Check each element against the target individually (O(n))"
    ],
    correctAnswer: 1,
    difficulty: 'Medium',
    explanation: "Using a hash map allows you to store each number as you iterate and check if its complement (target - current) exists, achieving O(n) time complexity."
  },
  {
    id: 4,
    question: "What's the time complexity of finding the maximum element in an unsorted array of n elements?",
    options: [
      "O(1) - Constant time",
      "O(log n) - Logarithmic time",
      "O(n) - Linear time", 
      "O(n²) - Quadratic time"
    ],
    correctAnswer: 2,
    difficulty: 'Medium',
    explanation: "You must examine each element at least once to find the maximum, making it O(n). You can't do better without additional information about the array."
  },
  
  // Really Hard Questions (5-6)
  {
    id: 5,
    question: "Dynamic Programming: What is the key principle behind memoization in DP problems?",
    options: [
      "Always use recursion to solve problems",
      "Store results of expensive function calls to avoid recomputing them",
      "Break problems into smaller independent pieces",
      "Use the fastest algorithm available"
    ],
    correctAnswer: 1,
    difficulty: 'Hard',
    explanation: "Memoization stores the results of expensive function calls and returns the cached result when the same inputs occur again, avoiding redundant calculations."
  },
  {
    id: 6,
    question: "Advanced Graph Algorithms: In which of these scenarios would Dijkstra's algorithm NOT be the appropriate choice?",
    options: [
      "Finding shortest driving route on Google Maps with traffic delays",
      "Finding the longest path in a Directed Acyclic Graph (DAG)",
      "Finding shortest path in a maze with uniform step costs",
      "Finding shortest path in a network with non-negative edge weights"
    ],
    correctAnswer: 1,
    difficulty: 'Hard',
    explanation: "Dijkstra's algorithm finds shortest paths, not longest paths. For longest paths in a DAG, you'd use topological sorting with modified distance relaxation. Dijkstra works for the other scenarios since it handles non-negative weights and uniform costs."
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email, password, name } = params;
  const questionScrollRef = useRef<ScrollView>(null);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [suggestedLevel, setSuggestedLevel] = useState('Beginner');
  const [selectedLevel, setSelectedLevel] = useState('Beginner');
  const [showLevelSelection, setShowLevelSelection] = useState(false);
  const [loading, setLoading] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'rgba(76, 175, 80, 0.1)';
      case 'Medium': return 'rgba(255, 152, 0, 0.1)';
      case 'Hard': return 'rgba(244, 67, 54, 0.1)';
      default: return 'rgba(101, 100, 199, 0.1)';
    }
  };

  const getDifficultyTextColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Hard': return '#F44336';
      default: return '#6564c7';
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) {
      Alert.alert('Please select an answer', 'Choose one of the options before proceeding.');
      return;
    }

    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      // Reset scroll position to top
      questionScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // Calculate suggested skill level based on 6 questions
      const correctAnswers = newAnswers.reduce((count, answer, index) => {
        return count + (answer === questions[index].correctAnswer ? 1 : 0);
      }, 0);

      let level;
      if (correctAnswers <= 3) {
        level = 'Beginner';
      } else if (correctAnswers <= 5) {
        level = 'Intermediate';
      } else {
        level = 'Professional';
      }

      setSuggestedLevel(level);
      setSelectedLevel(level);
      setShowLevelSelection(true);
    }
  };

  const handleShowExplanation = () => {
    setShowExplanation(true);
  };

  const handleCompleteOnboarding = async () => {
    try {
      setLoading(true);

      console.log('Starting account creation process...');
      console.log('Email:', email);
      console.log('Name:', name);
      console.log('Selected Level:', selectedLevel);
      
      // Debug environment variables
      console.log('Environment check:');
      console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:', process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? 'Set (length: ' + process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'Not set');

      // Check if admin client is available
      if (!supabaseAdmin) {
        Alert.alert('Error', 'Unable to create account. Please try again.');
        return;
      }

      // Create user account using admin API (credentials already validated in signup)
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email: email as string,
        password: password as string,
        user_metadata: {
          full_name: name as string,
          skill_level: selectedLevel,
        },
        email_confirm: true,
      });

      if (adminError) {
        console.error('Admin API Error:', adminError);
        Alert.alert('Account Creation Error', 'Failed to create account. Please try again.');
        return;
      }

      if (adminData.user) {
        console.log('User created successfully!');
        
        // Create user profile manually since we disabled the trigger
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: adminData.user.id,
              name: name as string,
              skill_level: selectedLevel,
              available_hints: 5
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't fail the signup for this - user can create profile later
          } else {
            console.log('User profile created successfully');
          }
        } catch (profileErr) {
          console.error('Profile creation failed:', profileErr);
        }

        // Now sign in the user so they have an active session
        console.log('Signing in user...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email as string,
          password: password as string,
        });

        if (signInError) {
          console.error('Sign in error:', signInError);
          // Even if sign-in fails, account was created, so navigate to login
          Alert.alert(
            'Account Created', 
            'Your account was created successfully, but automatic sign-in failed. Please log in manually.',
            [{ text: 'OK', onPress: () => router.replace('/login') }]
          );
          return;
        }

        console.log('Sign in successful, navigating to app...');
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('Unexpected Error:', error);
      Alert.alert('Error', `Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = () => {
    const question = questions[currentQuestion];
    
    return (
      <View style={styles.questionContainer}>
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <ThemedText style={styles.progressText}>
              Question {currentQuestion + 1} of {questions.length}
            </ThemedText>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(question.difficulty) }]}>
              <ThemedText style={[styles.difficultyText, { color: getDifficultyTextColor(question.difficulty) }]}>
                {question.difficulty}
              </ThemedText>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentQuestion + 1) / questions.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        <ScrollView 
          ref={questionScrollRef}
          style={styles.questionScrollView} 
          showsVerticalScrollIndicator={true}
          indicatorStyle="default"
        >
          <ThemedText style={styles.questionText}>
            {question.question}
          </ThemedText>
          <View style={styles.optionsContainer}>
            {question.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedAnswer === index && styles.selectedOption,
                  showExplanation && index === question.correctAnswer && styles.correctOption,
                  showExplanation && selectedAnswer === index && index !== question.correctAnswer && styles.wrongOption,
                ]}
                onPress={() => handleAnswerSelect(index)}
                disabled={showExplanation}
              >
                <ThemedText style={[
                  styles.optionText,
                  selectedAnswer === index && styles.selectedOptionText,
                  showExplanation && index === question.correctAnswer && styles.correctOptionText,
                ]}>
                  {option}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          {showExplanation && (
            <View style={styles.explanationContainer}>
              <ThemedText style={styles.explanationTitle}>Explanation</ThemedText>
              <ThemedText style={styles.explanationText}>
                {question.explanation}
              </ThemedText>
            </View>
          )}
          <View style={styles.scrollBottomPadding} />
        </ScrollView>

        <View style={styles.scrollIndicator} />

        <View style={styles.buttonContainer}>
          {!showExplanation ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.showExplanationButton]}
              onPress={handleShowExplanation}
              disabled={selectedAnswer === null}
            >
              <ThemedText style={styles.actionButtonText}>
                Show Answer
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.nextButton]}
              onPress={handleNextQuestion}
            >
              <ThemedText style={styles.actionButtonText}>
                {currentQuestion === questions.length - 1 ? 'Complete Assessment' : 'Next Question'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderLevelSelection = () => {
    const levelDescriptions = {
      Beginner: 'Little to no programming knowledge, new to coding challenges.',
      Intermediate: 'Some programming experience, can solve basic to moderate problems.',
      Professional: 'Strong programming background, comfortable with complex algorithms.'
    };

    const levelColors = {
      Beginner: '#4CAF50',
      Intermediate: '#FF9800',
      Professional: '#F44336'
    };

    const correctAnswers = answers.reduce((count, answer, index) => 
      count + (answer === questions[index].correctAnswer ? 1 : 0), 0
    );

    return (
      <View style={styles.levelSelectionContainer}>
        <ThemedText style={styles.resultsTitle}>Assessment Complete!</ThemedText>
        
        <ThemedText style={styles.scoreText}>
          You got <ThemedText style={styles.scoreNumber}>{correctAnswers}</ThemedText> out of {questions.length} correct
        </ThemedText>

        <View style={styles.suggestionContainer}>
          <ThemedText style={styles.suggestionText}>We suggest: </ThemedText>
          <View style={[styles.suggestionBubble, { backgroundColor: levelColors[suggestedLevel] }]}>
            <ThemedText style={styles.suggestionBubbleText}>{suggestedLevel}</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.levelSelectionTitle}>Choose your skill level:</ThemedText>
        
        <ThemedText style={styles.noteText}>
          Note: The skill level will affect the gameplay. It can be changed later on.
        </ThemedText>

        <View style={styles.levelOptions}>
          {['Beginner', 'Intermediate', 'Professional'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelOption,
                selectedLevel === level && [styles.selectedLevel, { borderColor: levelColors[level], borderWidth: 3 }],
                { borderColor: selectedLevel === level ? levelColors[level] : '#E0E0E0' }
              ]}
              onPress={() => setSelectedLevel(level)}
            >
              <ThemedText style={[
                styles.levelOptionTitle,
                selectedLevel === level && { color: levelColors[level], fontWeight: 'bold' }
              ]}>
                {level}
              </ThemedText>
              <ThemedText style={[
                styles.levelOptionDescription,
                selectedLevel === level && { color: '#333' }
              ]}>
                {levelDescriptions[level]}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={handleCompleteOnboarding}
          disabled={loading}
        >
          <ThemedText style={styles.actionButtonText}>
            {loading ? 'Creating Account...' : 'Complete Setup'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {showLevelSelection ? 'Skill Assessment' : 'Quick Assessment'}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {showLevelSelection 
            ? 'Help us personalize your experience' 
            : 'Let\'s gauge your programming knowledge'
          }
        </ThemedText>
      </View>

      <View style={styles.content}>
        {showLevelSelection ? renderLevelSelection() : renderQuestion()}
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
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    paddingTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  questionContainer: {
    flex: 1,
    padding: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6564c7',
    borderRadius: 2,
  },
  questionScrollView: {
    flex: 1,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    lineHeight: 26,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedOption: {
    borderColor: '#6564c7',
    backgroundColor: 'rgba(101, 100, 199, 0.05)',
  },
  correctOption: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  wrongOption: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  selectedOptionText: {
    color: '#6564c7',
    fontWeight: '600',
  },
  correctOptionText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  explanationContainer: {
    backgroundColor: 'rgba(101, 100, 199, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6564c7',
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6564c7',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  showExplanationButton: {
    backgroundColor: '#6564c7',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
  },
  completeButton: {
    backgroundColor: '#6564c7',
    marginTop: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  levelSelectionContainer: {
    flex: 1,
    padding: 20,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  suggestionText: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  suggestionBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  suggestionBubbleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  noteText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  levelSelectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  levelOptions: {
    marginBottom: 0,
  },
  levelOption: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedLevel: {
    backgroundColor: 'rgba(101, 100, 199, 0.1)',
    transform: [{ scale: 1.02 }],
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  levelOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  levelOptionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  scrollBottomPadding: {
    height: 20,
  },
  scrollIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
}); 