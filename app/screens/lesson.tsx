import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ThemedText } from '../../components/ThemedText';
import { useStreak } from '../../contexts/StreakContext';
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
  // Ensure content is a string before splitting
  if (!content || typeof content !== 'string') {
    return [<ThemedText key={0} style={styles.lessonText}>No content available</ThemedText>];
  }
  
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
  const isMounted = useRef(false);
  const params = useLocalSearchParams();
  const questionId = Array.isArray(params.questionId) ? params.questionId[0] : params.questionId;
  const questionTitle = Array.isArray(params.questionTitle) ? params.questionTitle[0] : params.questionTitle;
  const questionDescription = Array.isArray(params.questionDescription) ? params.questionDescription[0] : params.questionDescription;
  const topicName = Array.isArray(params.topicName) ? params.topicName[0] : params.topicName;
  
  // Parse preFetchedData only once using useMemo
  const preFetchedData = useMemo(() => {
    try {
      return params.preFetchedData ? JSON.parse(params.preFetchedData as string) : null;
    } catch (e) {
      console.error('Failed to parse preFetchedData:', e);
      return null;
    }
  }, [params.preFetchedData]); // Add params.preFetchedData as dependency
  
  const router = useRouter();
  const { showStreakAnimation } = useStreak();
  
  // Initialize all state
  const [currentPage, setCurrentPage] = useState<'teaching' | 'quiz' | 'completion' | 'retry'>('teaching');
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [partMcqAnswers, setPartMcqAnswers] = useState<{[key: number]: number}>({});
  const [showPartMcqFeedback, setShowPartMcqFeedback] = useState<{[key: number]: boolean}>({});
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  
  // Initialize lesson data state
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  
  // Animation values with useRef
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const optionAnimations = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1)
  ]).current;

  // Generate MCQ for each part - this is just a fallback, real MCQs come from the API
  const generateMCQForPart = (title: string, content: string, index: number): QuizQuestion => {
    // This should rarely be used since API provides real MCQs
    return {
      id: index + 1,
      question: `What is the key concept in ${title}?`,
      options: ["Loading lesson content...", "Please wait...", "Generating question...", "Almost ready..."],
      correctAnswer: 0,
      explanation: "This question will be replaced with content from the lesson."
    };
  };

  // Function to create structured lesson parts
  const createStructuredLessonParts = useCallback((): LessonPart[] => {
    const parts: LessonPart[] = [];
    
    // Define the structured lesson outline - reduced to 4 essential parts
    const lessonStructure = [
      {
        title: "Definition",
        prompt: `For the problem "${questionTitle}", what is the most important concept/data structure needed? Provide a clear, concise definition in 2-3 sentences max.`
      },
      {
        title: "How to use",
        prompt: `Explain how to use this concept/data structure. Include basic usage and simple examples. Keep it brief - 2-3 sentences max.`
      },
      {
        title: "Operations and efficiency",
        prompt: `List the key operations with their time/space complexity. Be specific about efficiency. Keep it brief - 2-3 sentences max.`
      },
      {
        title: "Relevance to this question",
        prompt: `Specifically explain why this concept/data structure is the most efficient solution for "${questionTitle}". This is the most important part. Keep it brief - 2-3 sentences max.`
      }
    ];

    // Create parts with structured content
    lessonStructure.forEach((structure, index) => {
      parts.push({
        title: structure.title,
        content: structure.prompt,
        mcq: generateMCQForPart(structure.title, structure.prompt, index)
      });
    });

    return parts;
  }, [questionTitle]);

  // Function to break lesson content into parts (fallback)
  const breakContentIntoParts = useCallback((content: string): LessonPart[] => {
    if (!content || typeof content !== 'string') {
      return createStructuredLessonParts();
    }
    
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
    
    return parts.length > 0 ? parts : createStructuredLessonParts();
  }, [createStructuredLessonParts]);

  // Debug lessonData changes
  useEffect(() => {
    console.log('🔄 lessonData state changed:', lessonData);
    console.log('🔄 lessonData content:', lessonData?.content);
    console.log('🔄 lessonData title:', lessonData?.title);
    
    // Break content into parts when lesson data is loaded
    if (lessonData && lessonData.content && !lessonData.parts && typeof lessonData.content === 'string') {
      const parts = breakContentIntoParts(lessonData.content);
      setLessonData(prev => prev ? { ...prev, parts } : null);
    }
  }, [lessonData, breakContentIntoParts]);

  // Initialize lesson data only once
  useEffect(() => {
    if (!isMounted.current && preFetchedData) {
      isMounted.current = true;
      
      // Use requestAnimationFrame to ensure we're not scheduling updates during render
      requestAnimationFrame(() => {
        console.log('🎯 Initializing lesson data (one-time only)');
        setLessonData(preFetchedData);
      });
    }
  }, [preFetchedData]);

  // Handle state reset in a separate effect
  const resetState = useCallback(() => {
    requestAnimationFrame(() => {
      setCurrentPage('teaching');
      setCurrentPartIndex(0);
      setCurrentQuestionIndex(0);
      setSelectedAnswers([]);
      setPartMcqAnswers({});
      setShowPartMcqFeedback({});
      setScore(0);
      setShowFeedback(false);
      setIsProcessingAnswer(false);
      setQuizData(null);
      setQuizQuestions([]);
      setIsGeneratingQuiz(false);
    });
  }, []);

  // Break content into parts when lesson data changes
  useEffect(() => {
    if (lessonData?.content && !lessonData.parts && typeof lessonData.content === 'string') {
      requestAnimationFrame(() => {
        const parts = breakContentIntoParts(lessonData.content);
        setLessonData(prev => prev ? { ...prev, parts } : null);
      });
    }
  }, [lessonData, breakContentIntoParts]);

  // Memoize the current part to prevent unnecessary re-renders
  const currentPart = useMemo(() => {
    return lessonData?.parts?.[currentPartIndex] || null;
  }, [lessonData?.parts, currentPartIndex]);

  // Load lesson data from pre-fetched data
  useEffect(() => {
    if (preFetchedData) {
      console.log('✅ Using pre-fetched lesson data');
      setLessonData(preFetchedData);
      setCurrentPage('teaching');
    } else {
      console.log('⚠️ No pre-fetched data found, this should not happen');
      // Fallback to basic content if no pre-fetched data
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
  }, [preFetchedData, questionTitle]);

  const handleStartQuiz = async () => {
    console.log('🎯 Starting quiz generation...');
    setIsGeneratingQuiz(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('You must be logged in to take the quiz.');
        setIsGeneratingQuiz(false);
        return;
      }

      console.log('📡 Generating separate quiz...');
      
      // Generate a separate quiz (different from lesson MCQs)
      const quizResponse = await apiCall('/api/generate-topic-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          topicName: topicName,
          problemId: parseInt(questionId || '0'),
          lessonContent: lessonData?.parts ? 
            lessonData.parts.map(part => `${part.title}: ${part.content}`).join('\n\n') : 
            lessonData?.content || '',
        }),
      });

      if (!quizResponse.ok) {
        throw new Error('Failed to generate quiz');
      }

      const quizResult = await quizResponse.json();
      console.log('✅ Separate quiz generated successfully');
      console.log('📊 Quiz result:', {
        questionsCount: quizResult.questions?.length || 0,
        questions: quizResult.questions?.map((q: any) => ({
          id: q.id,
          question: q.question?.substring(0, 50) + '...',
          optionsCount: q.options?.length || 0,
          correctAnswer: q.correctAnswer
        }))
      });
      
      // Set the new quiz questions (separate from lesson MCQs)
      setQuizQuestions(quizResult.questions || []);
      
      console.log('🎯 Starting quiz with new questions...');
      console.log('📊 Quiz state after setting questions:', {
        quizQuestionsLength: quizResult.questions?.length || 0,
        currentQuestionIndex: 0,
        selectedAnswers: [],
        score: 0
      });
      
      setCurrentPage('quiz');
      setCurrentQuestionIndex(0);
      setSelectedAnswers([]);
      setScore(0);
      // Reset animations
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      optionAnimations.forEach(anim => anim.setValue(1));
      
    } catch (error: any) {
      console.error('💥 Error generating quiz:', error);
      alert('Failed to generate quiz. Please try again.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (showFeedback || isProcessingAnswer) return; // Prevent multiple selections
    
    // Safety check for quiz questions
    if (!quizQuestions || quizQuestions.length === 0) {
      console.error('❌ No quiz questions available');
      return;
    }
    
    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (!currentQuestion) {
      console.error('❌ Current question not found');
      return;
    }
    
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    
    console.log('🎯 Option selected:', {
      optionIndex,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      currentQuestionIndex,
      currentScore: score
    });
    
    // Set processing flag to prevent multiple selections
    setIsProcessingAnswer(true);
    
    // Update selected answers
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newSelectedAnswers);
    
    console.log('📊 Updated selected answers:', {
      newSelectedAnswers,
      length: newSelectedAnswers.length
    });
    
    // Update score only once
    if (isCorrect) {
      setScore(prevScore => {
        const newScore = prevScore + 1;
        console.log('🎯 Score updated:', { prevScore, newScore });
        return newScore;
      });
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
    
    console.log('🔄 handleNextQuestion called');
    console.log('📊 Current state:', {
      currentQuestionIndex,
      quizQuestionsLength: quizQuestions.length,
      selectedAnswersLength: selectedAnswers.length,
      score,
      currentPage
    });
    
    // Safety check: ensure we're dealing with main quiz questions, not lesson MCQs
    if (!quizQuestions || quizQuestions.length === 0) {
      console.error('❌ No main quiz questions available');
      return;
    }
    
    if (currentQuestionIndex < quizQuestions.length - 1) {
      console.log('🔄 Moving to next question');
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
      // Quiz is complete when all questions are answered
      const allQuestionsAnswered = selectedAnswers.length === quizQuestions.length;
      
      console.log('🎯 Quiz finished - checking completion');
      console.log('📊 Completion check:', {
        allQuestionsAnswered,
        selectedAnswersLength: selectedAnswers.length,
        quizQuestionsLength: quizQuestions.length,
        selectedAnswers,
        quizQuestions: quizQuestions.map(q => q.correctAnswer)
      });
      
      // Safety check: if we're on the last question and have quiz questions, consider it complete
      if (currentQuestionIndex === quizQuestions.length - 1 && quizQuestions.length > 0) {
        console.log('✅ On last question with quiz questions - considering complete');
        
        // Always save completion when quiz is finished, regardless of score
        console.log('✅ Quiz completed - saving results');
        handleSaveQuizCompletion().then(() => {
          // Check if all answers are correct for UI display (completion vs retry page)
          const allCorrect = selectedAnswers.every((answer, index) => 
            answer === quizQuestions[index].correctAnswer
          );
          
          console.log('🎯 Checking if all correct:', {
            allCorrect,
            selectedAnswers,
            correctAnswers: quizQuestions.map(q => q.correctAnswer)
          });
          
          if (allCorrect) {
            console.log('🎉 All correct - showing completion page');
            // Trigger streak animation for lesson completion
            showStreakAnimation(1);
            setCurrentPage('completion');
          } else {
            console.log('❌ Not all correct - showing retry page');
            setCurrentPage('retry');
          }
        }).catch(error => {
          console.error('Failed to save quiz completion:', error);
          // Still show completion/retry page even if save fails
          const allCorrect = selectedAnswers.every((answer, index) => 
            answer === quizQuestions[index].correctAnswer
          );
          
          console.log('🎯 Fallback check if all correct:', allCorrect);
          
          if (allCorrect) {
            console.log('🎉 All correct - showing completion page (fallback)');
            // Trigger streak animation for lesson completion (fallback)
            showStreakAnimation(1);
            setCurrentPage('completion');
          } else {
            console.log('❌ Not all correct - showing retry page (fallback)');
            setCurrentPage('retry');
          }
        });
      } else if (allQuestionsAnswered) {
        // Original logic for when all questions are answered
        console.log('✅ Quiz completed - saving results');
        handleSaveQuizCompletion().then(() => {
          // Check if all answers are correct for UI display (completion vs retry page)
          const allCorrect = selectedAnswers.every((answer, index) => 
            answer === quizQuestions[index].correctAnswer
          );
          
          console.log('🎯 Checking if all correct:', {
            allCorrect,
            selectedAnswers,
            correctAnswers: quizQuestions.map(q => q.correctAnswer)
          });
          
          if (allCorrect) {
            console.log('🎉 All correct - showing completion page');
            // Trigger streak animation for lesson completion
            showStreakAnimation(1);
            setCurrentPage('completion');
          } else {
            console.log('❌ Not all correct - showing retry page');
            setCurrentPage('retry');
          }
        }).catch(error => {
          console.error('Failed to save quiz completion:', error);
          // Still show completion/retry page even if save fails
          const allCorrect = selectedAnswers.every((answer, index) => 
            answer === quizQuestions[index].correctAnswer
          );
          
          console.log('🎯 Fallback check if all correct:', allCorrect);
          
          if (allCorrect) {
            console.log('🎉 All correct - showing completion page (fallback)');
            // Trigger streak animation for lesson completion (fallback)
            showStreakAnimation(1);
            setCurrentPage('completion');
          } else {
            console.log('❌ Not all correct - showing retry page (fallback)');
            setCurrentPage('retry');
          }
        });
      } else {
        console.error('❌ Quiz incomplete - not all questions answered');
        console.log('📊 Missing answers:', {
          selectedAnswersLength: selectedAnswers.length,
          quizQuestionsLength: quizQuestions.length,
          selectedAnswers
        });
        // This shouldn't happen, but handle gracefully
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
    router.replace({
      pathname: '/screens/roadmaptopic',
      params: {
        topicName: topicName as string
      }
    });
  };

  const handleSaveQuizCompletion = async () => {
    try {
      console.log('🔄 Starting quiz completion save...');
      console.log('📊 Quiz data:', { 
        questionId, 
        score, 
        completed: true,
        selectedAnswers,
        quizQuestionsLength: quizQuestions.length
      });
      
      // Get the current session to include auth token
      console.log('🔑 Getting Supabase session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔑 Session result:', { 
        hasSession: !!session, 
        sessionError: sessionError,
        hasAccessToken: !!session?.access_token,
        tokenLength: session?.access_token?.length || 0
      });
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        alert('Authentication error. Please log in again.');
        return;
      }
      
      if (!session?.access_token) {
        console.error('❌ No session or access token available');
        console.log('🔑 Session details:', {
          session: session,
          accessToken: session?.access_token,
          refreshToken: session?.refresh_token
        });
        alert('You must be logged in to save your progress.');
        return;
      }
      
      // Validate the data before sending
      if (!questionId || questionId === '0') {
        console.error('❌ Invalid questionId:', questionId);
        alert('Invalid question ID. Please try again.');
        return;
      }
      
      const requestBody = {
        questionId: parseInt(questionId || '0'),
        score: score,
        completed: true,
      };
      
      console.log('📡 Sending request with body:', requestBody);
      console.log('🔑 Using token (first 20 chars):', session.access_token.substring(0, 20) + '...');
      
      const response = await apiCall('/api/quiz-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', response.headers);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Quiz completion saved successfully:', responseData);
        return responseData;
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to save quiz completion:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData
        });
        
        // Try to parse error as JSON for better error messages
        try {
          const errorJson = JSON.parse(errorData);
          console.error('❌ Parsed error:', errorJson);
          alert(`Failed to save quiz completion: ${errorJson.message || errorJson.error || 'Unknown error'}`);
        } catch (parseError) {
          console.error('❌ Could not parse error as JSON:', parseError);
          alert(`Failed to save quiz completion. Status: ${response.status}. Please check your connection and try again.`);
        }
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
    } catch (error) {
      console.error('💥 Error saving quiz completion:', error);
      console.error('💥 Error details:', {
        message: (error as any)?.message || 'Unknown error',
        stack: (error as any)?.stack || 'No stack trace',
        name: (error as any)?.name || 'Unknown error type'
      });
      
      // Don't show alert here, let the calling function handle it
      throw error;
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

  // Debug currentPage changes
  useEffect(() => {
    console.log('🔄 Current page changed to:', currentPage);
    console.log('📊 Current state:', {
      currentPage,
      currentQuestionIndex,
      selectedAnswersLength: selectedAnswers.length,
      quizQuestionsLength: quizQuestions.length,
      score
    });
  }, [currentPage, currentQuestionIndex, selectedAnswers.length, quizQuestions.length, score]);

  // Handle focus changes without resetting state unnecessarily
  useFocusEffect(
    useCallback(() => {
      let shouldCleanup = false;

      // Only reset if we're actually coming from completion/retry
      if (currentPage === 'completion' || currentPage === 'retry') {
        console.log('🔄 Resetting state after completion/retry');
        shouldCleanup = true;
        // Schedule the state reset for the next frame
        requestAnimationFrame(() => {
          resetState();
        });
      }
      
      return () => {
        // Cleanup only if necessary
        if (shouldCleanup) {
          console.log('🧹 Cleaning up after completion/retry');
        }
      };
    }, [currentPage, resetState])
  );

  if (currentPage === 'teaching') {
    console.log('🎨 Rendering teaching page with lessonData:', lessonData);
    console.log('🎨 lessonData?.parts:', lessonData?.parts);
    console.log('🎨 currentPartIndex:', currentPartIndex);
    
    const lessonParts = lessonData?.parts || [];
    const currentPart = lessonParts[currentPartIndex];
    const isLastPart = currentPartIndex === lessonParts.length - 1;
    
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

        {/* Progress Indicator */}
        {lessonParts.length > 0 && (
          <View style={styles.progressContainer}>
            <ThemedText style={styles.progressText}>
              Part {currentPartIndex + 1} of {lessonParts.length}
            </ThemedText>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentPartIndex + 1) / lessonParts.length) * 100}%` }
                ]} 
              />
            </View>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.lessonContainer}>
            {currentPart ? (
              <>
                <ThemedText style={styles.lessonTitle}>
                  {currentPart.title}
                </ThemedText>
                
                <View style={styles.lessonContent}>
                  <Markdown
                    style={{
                      body: { color: '#444', fontSize: 16, lineHeight: 24 },
                      heading1: { color: '#6564c7', fontWeight: 'bold', fontSize: 22, marginTop: 16 },
                      heading2: { color: '#6564c7', fontWeight: 'bold', fontSize: 19, marginTop: 14 },
                      heading3: { color: '#453d83', fontWeight: 'bold', fontSize: 17, marginTop: 12 },
                      strong: { fontWeight: 'bold', color: '#222' },
                      bullet_list: { marginVertical: 8 },
                      list_item: { marginVertical: 2 },
                      paragraph: { marginVertical: 8 },
                    }}
                  >
                    {(currentPart.content && typeof currentPart.content === 'string') ? currentPart.content : 'Loading content...'}
                  </Markdown>
                </View>

                {/* Optional MCQ for each part */}
                {currentPart.mcq && (
                  <View style={styles.partMcqContainer}>
                    <ThemedText style={styles.partMcqTitle}>Quick Check</ThemedText>
                    <ThemedText style={styles.partMcqQuestion}>
                      {currentPart.mcq.question}
                    </ThemedText>
                    
                    {currentPart.mcq.options.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.partMcqOption,
                          partMcqAnswers[currentPartIndex] === index && styles.partMcqOptionSelected,
                                                     showPartMcqFeedback[currentPartIndex] && 
                           index === currentPart.mcq?.correctAnswer && styles.partMcqOptionCorrect,
                           showPartMcqFeedback[currentPartIndex] && 
                           partMcqAnswers[currentPartIndex] === index &&
                           index !== currentPart.mcq?.correctAnswer && styles.partMcqOptionWrong
                        ]}
                        onPress={() => {
                          if (!showPartMcqFeedback[currentPartIndex]) {
                            setPartMcqAnswers(prev => ({ ...prev, [currentPartIndex]: index }));
                            setShowPartMcqFeedback(prev => ({ ...prev, [currentPartIndex]: true }));
                          }
                        }}
                        disabled={showPartMcqFeedback[currentPartIndex]}
                      >
                        <ThemedText style={styles.partMcqOptionText}>
                          {option}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                    
                    {showPartMcqFeedback[currentPartIndex] && currentPart.mcq.explanation && (
                      <View style={styles.partMcqExplanation}>
                        <ThemedText style={styles.partMcqExplanationText}>
                          {currentPart.mcq.explanation}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.lessonContainer}>
                <ThemedText style={styles.lessonTitle}>
                  {lessonData?.title || questionTitle}
                </ThemedText>
                <ThemedText style={styles.lessonText}>
                  Loading structured lesson content...
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.navigationButtons}>
            {currentPartIndex > 0 && (
              <TouchableOpacity 
                style={styles.prevButton} 
                onPress={() => setCurrentPartIndex(currentPartIndex - 1)}
              >
                <ThemedText style={styles.prevButtonText}>← Previous</ThemedText>
              </TouchableOpacity>
            )}
            
            {!isLastPart ? (
              <TouchableOpacity 
                style={styles.nextButton} 
                onPress={() => setCurrentPartIndex(currentPartIndex + 1)}
              >
                <ThemedText style={styles.nextButtonText}>Next →</ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.nextButton, (!lessonData || isGeneratingQuiz) && styles.nextButtonDisabled]} 
                onPress={handleStartQuiz}
                disabled={!lessonData || isGeneratingQuiz}
              >
                <ThemedText style={styles.nextButtonText}>
                  {isGeneratingQuiz ? 'Generating Quiz...' : 'Start Quiz →'}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
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
            <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleBubble}>
              <View style={styles.lessonDot} />
              <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                {decodeHtmlEntities(questionTitle || topicName || 'Quiz')}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.headerSpacer} />
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
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
                      <View style={styles.headerTitleBubble}>
              <View style={styles.lessonDot} />
              <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                {decodeHtmlEntities(questionTitle || topicName || 'Quiz')}
              </ThemedText>
            </View>
        </View>
        
        <View style={styles.headerSpacer} />
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
        {/* Progress Tracker */}
        <View style={styles.progressTracker}>
          <View style={styles.progressDots}>
            {quizQuestions.map((_, index) => (
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
            Question {currentQuestionIndex + 1} of {quizQuestions.length}
          </ThemedText>
        </View>

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
  progressTracker: {
    alignItems: 'center',
    marginBottom: 30,
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
  progressContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6564c7',
    marginBottom: 8,
    textAlign: 'center',
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
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prevButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#6564c7',
  },
  prevButtonText: {
    color: '#6564c7',
    fontSize: 16,
    fontWeight: '600',
  },
  partMcqContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  partMcqTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 8,
  },
  partMcqQuestion: {
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  partMcqOption: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  partMcqOptionSelected: {
    borderColor: '#6564c7',
    backgroundColor: '#f3f0ff',
  },
  partMcqOptionCorrect: {
    borderColor: '#28a745',
    backgroundColor: '#d4edda',
  },
  partMcqOptionWrong: {
    borderColor: '#dc3545',
    backgroundColor: '#f8d7da',
  },
  partMcqOptionText: {
    fontSize: 14,
    color: '#333',
  },
  partMcqExplanation: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  partMcqExplanationText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
}); 