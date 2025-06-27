import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ThemedText } from '../../components/ThemedText';
import { apiCall } from '../../lib/api-config';
import { supabase } from '../../lib/supabase';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface LessonPart {
  title: string;
  content: string;
  mcq?: QuizQuestion;
}

interface LessonData {
  title: string;
  content: string;
  definitionBox?: string;
  keyConcepts: string[];
  example: string;
  hint: string;
  commonMistake: string;
  funFact?: string;
  parts?: LessonPart[];
}

interface QuizData {
  questions: QuizQuestion[];
  lessonSummary: string;
}

// Helper function to decode HTML entities
const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

function renderLessonContent(content: string) {
  // Split by lines
  const lines = content.split(/\r?\n/);
  const elements = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) {
      elements.push(
        <ThemedText key={key++} style={styles.lessonHeader}>
          {line.replace(/^## /, '')}
        </ThemedText>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <ThemedText key={key++} style={[styles.lessonHeader, { fontSize: 17, color: '#453d83' }]}> {/* Slightly smaller */}
          {line.replace(/^### /, '')}
        </ThemedText>
      );
    } else if (line.length > 0) {
      elements.push(
        <ThemedText key={key++} style={styles.lessonText}>
          {line}
        </ThemedText>
      );
    } else {
      // Add spacing for empty lines
      elements.push(<ThemedText key={key++} style={{ marginBottom: 8 }}>{' '}</ThemedText>);
    }
  }
  return elements;
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
  const [currentPage, setCurrentPage] = useState<'loading' | 'teaching' | 'quiz' | 'completion' | 'retry'>('loading');
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [partMcqAnswers, setPartMcqAnswers] = useState<{[key: number]: number}>({});
  const [showPartMcqFeedback, setShowPartMcqFeedback] = useState<{[key: number]: boolean}>({});
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

  // Generate MCQ for each part
  const generateMCQForPart = (title: string, content: string, index: number): QuizQuestion => {
    // This is a simplified MCQ generator - in a real app, you'd use AI to generate these
    const questions = [
      {
        question: `What is the main concept covered in ${title}?`,
        options: ["Basic syntax", "Algorithm complexity", "Data structures", "Problem solving"],
        correctAnswer: index % 4,
        explanation: "This section focuses on the fundamental concepts needed to understand the topic."
      },
      {
        question: `Which approach is most suitable for this concept?`,
        options: ["Iterative", "Recursive", "Dynamic Programming", "Greedy"],
        correctAnswer: (index + 1) % 4,
        explanation: "The approach depends on the specific problem requirements and constraints."
      },
      {
        question: `What should you remember about ${title.toLowerCase()}?`,
        options: ["Time complexity", "Space complexity", "Edge cases", "All of the above"],
        correctAnswer: 3,
        explanation: "All aspects are important when implementing algorithms and data structures."
      }
    ];
    
    return {
      id: index + 1,
      ...questions[index % questions.length]
    };
  };

  // Function to break lesson content into parts
  const breakContentIntoParts = (content: string): LessonPart[] => {
    const sections = content.split(/(?=##\s)/);
    const parts: LessonPart[] = [];
    
    sections.forEach((section, index) => {
      if (section.trim()) {
        const lines = section.trim().split('\n');
        const title = lines[0].replace(/^##\s*/, '') || `Part ${index + 1}`;
        const content = lines.slice(1).join('\n').trim();
        
        if (content) {
          parts.push({
            title,
            content,
            mcq: generateMCQForPart(title, content, index)
          });
        }
      }
    });
    
    // If no sections found, create parts from paragraphs
    if (parts.length === 0) {
      const paragraphs = content.split(/\n\s*\n/);
      const chunkSize = Math.ceil(paragraphs.length / 3);
      
      for (let i = 0; i < paragraphs.length; i += chunkSize) {
        const chunk = paragraphs.slice(i, i + chunkSize).join('\n\n');
        if (chunk.trim()) {
          parts.push({
            title: `Part ${Math.floor(i / chunkSize) + 1}`,
            content: chunk,
            mcq: generateMCQForPart(`Part ${Math.floor(i / chunkSize) + 1}`, chunk, Math.floor(i / chunkSize))
          });
        }
      }
    }
    
    return parts;
  };

  // Debug lessonData changes
  useEffect(() => {
    console.log('🔄 lessonData state changed:', lessonData);
    console.log('🔄 lessonData content:', lessonData?.content);
    console.log('🔄 lessonData title:', lessonData?.title);
    
    // Break content into parts when lesson data is loaded
    if (lessonData && lessonData.content && !lessonData.parts) {
      const parts = breakContentIntoParts(lessonData.content);
      setLessonData(prev => prev ? { ...prev, parts } : null);
    }
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
          console.log('📝 Quiz questions:', quizResult.questions);
          console.log('📝 Quiz questions length:', quizResult.questions?.length);
          setQuizData(quizResult);
          
          // Format quiz questions with IDs
          const formattedQuestions = quizResult.questions.map((q: any, index: number) => ({
            id: index + 1,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          }));
          console.log('📝 Formatted questions:', formattedQuestions);
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
          example: 'Example 1',
          hint: 'Hint 1',
          commonMistake: 'Common mistake 1',
        });
        setCurrentPage('teaching');
      }
    };

    if (questionId && topicName) {
      loadLessonData();
    }
  }, [questionId, topicName]);

  const handleStartQuiz = () => {
    console.log('🎯 Starting quiz...');
    console.log('🎯 Quiz questions available:', quizQuestions);
    console.log('🎯 Quiz questions length:', quizQuestions.length);
    
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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/screens/tournament');
    }
  };

  const handleSaveQuizCompletion = async () => {
    try {
      console.log('🔄 Starting quiz completion save...');
      console.log('📊 Quiz data:', { questionId, score, completed: true });
      
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔑 Session found:', !!session);
      console.log('🔑 Token available:', !!session?.access_token);
      
      if (!session?.access_token) {
        alert('You must be logged in to save your progress.');
        return;
      }
      
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
        alert('Failed to save quiz completion. Please check your connection and try again.');
        console.error('❌ Failed to save quiz completion:', response.status, errorData);
      }
    } catch (error) {
      alert('An unexpected error occurred while saving your quiz completion.');
      console.error('💥 Error saving quiz completion:', error);
    }
  };

  const getOptionStyle = (optionIndex: number) => {
    const baseStyle = styles.optionButton;
    
    // Safety check for optionAnimations
    const transformStyle = optionAnimations[optionIndex] 
      ? { transform: [{ scale: optionAnimations[optionIndex] }] }
      : {};
    
    if (!showFeedback) {
      return [baseStyle, transformStyle];
    }
    
    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (!currentQuestion) {
      return [baseStyle, transformStyle];
    }
    
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
    if (!currentQuestion) {
      return styles.optionText;
    }
    
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
            <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleBubble}>
              <View style={styles.lessonDot} />
              <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                {decodeHtmlEntities(questionTitle || topicName || 'Lesson')}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.headerSpacer} />
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
            <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleBubble}>
              <View style={styles.lessonDot} />
              <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                {decodeHtmlEntities(questionTitle || topicName || 'Lesson')}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.lessonContainer}>
            <ThemedText style={styles.lessonTitle}>
              {lessonData?.title || questionTitle}
            </ThemedText>
            
            <View style={styles.lessonContent}>
              {/* Definition Box for Easy problems */}
              {lessonData?.definitionBox && (
                <View style={styles.definitionBox}>
                  <ThemedText style={styles.definitionBoxTitle}>📚 Definition</ThemedText>
                  <Markdown
                    style={{
                      body: styles.definitionBoxText,
                      strong: { fontWeight: 'bold', color: '#222' },
                    }}
                  >
                    {lessonData.definitionBox}
                  </Markdown>
                </View>
              )}

              {/* Main Content with digestible chunks */}
              <ThemedText style={styles.sectionTitle}>Main Content</ThemedText>
              <Markdown
                style={{
                  body: { color: '#444', fontSize: 16 },
                  heading1: { color: '#6564c7', fontWeight: 'bold', fontSize: 22, marginTop: 16 },
                  heading2: { color: '#6564c7', fontWeight: 'bold', fontSize: 19, marginTop: 14 },
                  heading3: { color: '#453d83', fontWeight: 'bold', fontSize: 17, marginTop: 12 },
                  strong: { fontWeight: 'bold', color: '#222' },
                  bullet_list: { marginVertical: 8 },
                  list_item: { marginVertical: 2 },
                  // Add more custom styles as needed
                }}
              >
                {lessonData?.content || 'Lesson content is loading...'}
              </Markdown>

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

              {lessonData?.example && (
                <>
                  <ThemedText style={styles.sectionTitle}>Example</ThemedText>
                  <ThemedText style={styles.lessonText}>
                    {lessonData.example}
                  </ThemedText>
                </>
              )}

              {lessonData?.hint && (
                <>
                  <ThemedText style={styles.sectionTitle}>Problem-Solving Hint</ThemedText>
                  <ThemedText style={styles.lessonText}>
                    💡 {lessonData.hint}
                  </ThemedText>
                </>
              )}

              {lessonData?.commonMistake && (
                <>
                  <ThemedText style={styles.sectionTitle}>Common Mistake</ThemedText>
                  <ThemedText style={styles.lessonText}>
                    ⚠️ {lessonData.commonMistake}
                  </ThemedText>
                </>
              )}

              {/* Fun Fact Section */}
              {lessonData?.funFact && (
                <>
                  <ThemedText style={styles.sectionTitle}>Fun Fact</ThemedText>
                  <View style={styles.funFactBox}>
                    <ThemedText style={styles.funFactText}>
                      🎉 {lessonData.funFact}
                    </ThemedText>
                  </View>
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
          <TouchableOpacity style={styles.nextButton} onPress={handleBack}>
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
  
  // Add safety check for quiz questions
  if (!currentQuestion || !quizQuestions || quizQuestions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentPage('teaching')} style={styles.backButton}>
            <ThemedText>← Back to Lesson</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Quiz</ThemedText>
        </View>
        
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#6564c7" />
          <ThemedText style={[styles.lessonText, { marginTop: 20, textAlign: 'center' }]}>
            Loading quiz questions...
          </ThemedText>
          <TouchableOpacity 
            style={[styles.nextButton, { marginTop: 20 }]} 
            onPress={() => setCurrentPage('teaching')}
          >
            <ThemedText style={styles.nextButtonText}>Back to Lesson</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
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
          {currentQuestion.options.map((option, index) => {
            // Safety check - only render if we have animations for this option
            if (index >= optionAnimations.length) {
              return null;
            }
            
            return (
              <TouchableOpacity
                key={index}
                style={getOptionStyle(index)}
                onPress={() => handleOptionSelect(index)}
                disabled={showFeedback}
                activeOpacity={0.7}
              >
                <ThemedText style={getOptionTextStyle(index)}>{option}</ThemedText>
              </TouchableOpacity>
            );
          })}
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
  lessonDot: {
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
  definitionBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6564c7',
  },
  definitionBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#6564c7',
  },
  definitionBoxText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  funFactBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  funFactText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#856404',
    fontStyle: 'italic',
  },
  lessonHeader: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#6564c7',
    marginTop: 18,
    marginBottom: 8,
  },
}); 