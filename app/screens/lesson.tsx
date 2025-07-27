import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { API_BASE_URL } from '../../lib/api-config';
import { supabase } from '../../lib/supabase';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  optionExplanations?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

interface LessonCard {
  type: 'definition' | 'usage' | 'advantages' | 'examples' | 'complexity' | 'operation' | 'visualization' | 'common-mistakes' | 'tips' | 'algorithm';
  title: string;
  content: string;
  icon: string;
  operationType?: 'time' | 'space' | 'insert' | 'delete' | 'search' | 'access';
  complexity?: {
    best: string;
    average: string;
    worst: string;
    space: string;
  };
}

interface LessonPart {
  title: string;
  cards: LessonCard[];
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
  dataStructureImage?: string;
}

interface QuizData {
  questions: QuizQuestion[];
  lessonSummary: string;
}

// Add QuizModal compatible interfaces
interface QuizModalQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

interface QuizModalData {
  introductory_text: string;
  quiz: QuizModalQuestion[];
}

// Add LessonMCQ compatible interfaces
interface LessonMCQQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  optionExplanations?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

interface LessonMCQData {
  introductory_text: string;
  quiz: LessonMCQQuestion[];
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

// Helper function to break text into readable chunks
const breakTextIntoChunks = (text: string, maxLength: number = 200): string[] => {
  if (!text || typeof text !== 'string' || text.length <= maxLength) return text ? [text] : [];
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
        currentChunk = trimmedSentence;
      } else {
        chunks.push(trimmedSentence + '.');
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }
  
  return chunks;
};

// Function to get data structure image
const getDataStructureImage = (imageName: string) => {
  const imageMap: { [key: string]: any } = {
    'array': require('@/assets/images/datastructure/array.webp'),
    'linkedlist': require('@/assets/images/datastructure/linkedlist.png'),
    'hashmap': require('@/assets/images/datastructure/hashmap.png'),
    'priorityqueue': require('@/assets/images/datastructure/priorityqueue.png'),
    'undirectedgraph': require('@/assets/images/datastructure/undirectedgraph.png'),
    'directedgraph': require('@/assets/images/datastructure/directedgraph.png'),
    'weightedgraph': require('@/assets/images/datastructure/weightedgraph.png'),
  };
  
  return imageMap[imageName] || null;
};

// Data Structure Image Component
const DataStructureImage = ({ imageName }: { imageName: string }) => {
  const imageSource = getDataStructureImage(imageName);
  
  if (!imageSource) {
    return null;
  }
  
  return (
    <View style={styles.dataStructureImageContainer}>
      <ThemedText style={styles.dataStructureImageTitle}>Visual Representation</ThemedText>
      <Image 
        source={imageSource} 
        style={styles.dataStructureImage}
        resizeMode="contain"
      />
      </View>
    );
};

// Enhanced complexity explanation function
const getComplexityExplanation = (complexity: string): string => {
  const explanations: { [key: string]: string } = {
    'O(1)': 'Constant time - Always takes the same amount of time regardless of input size',
    'O(log n)': 'Logarithmic time - Time grows slowly as input size increases (very efficient)',
    'O(n)': 'Linear time - Time grows proportionally with input size',
    'O(n log n)': 'Linearithmic time - Common in efficient sorting algorithms',
    'O(n²)': 'Quadratic time - Time grows with the square of input size (less efficient for large inputs)',
    'O(2^n)': 'Exponential time - Time doubles with each additional input (very inefficient)',
  };
  
  return explanations[complexity] || 'Time complexity varies based on the operation';
};

// Enhanced Complexity Table Component
const ComplexityTable = ({ complexity }: { complexity: NonNullable<LessonCard['complexity']> }) => (
  <View style={styles.complexityTable}>
    <View style={styles.complexitySection}>
      <ThemedText style={styles.complexityHeader}>Time Complexity</ThemedText>
      
    <View style={styles.complexityRow}>
        <View style={styles.complexityLabelContainer}>
      <ThemedText style={styles.complexityLabel}>Best Case:</ThemedText>
      <ThemedText style={styles.complexityValue}>{complexity.best}</ThemedText>
    </View>
        <ThemedText style={styles.complexityExplanation}>
          {getComplexityExplanation(complexity.best)}
        </ThemedText>
      </View>
      
    <View style={styles.complexityRow}>
        <View style={styles.complexityLabelContainer}>
      <ThemedText style={styles.complexityLabel}>Average Case:</ThemedText>
      <ThemedText style={styles.complexityValue}>{complexity.average}</ThemedText>
    </View>
        <ThemedText style={styles.complexityExplanation}>
          {getComplexityExplanation(complexity.average)}
        </ThemedText>
      </View>
      
    <View style={styles.complexityRow}>
        <View style={styles.complexityLabelContainer}>
      <ThemedText style={styles.complexityLabel}>Worst Case:</ThemedText>
      <ThemedText style={styles.complexityValue}>{complexity.worst}</ThemedText>
    </View>
        <ThemedText style={styles.complexityExplanation}>
          {getComplexityExplanation(complexity.worst)}
        </ThemedText>
      </View>
    </View>
    
    <View style={styles.complexitySection}>
      <ThemedText style={styles.complexityHeader}>Space Complexity</ThemedText>
    <View style={styles.complexityRow}>
        <View style={styles.complexityLabelContainer}>
      <ThemedText style={styles.complexityLabel}>Space:</ThemedText>
      <ThemedText style={styles.complexityValue}>{complexity.space}</ThemedText>
    </View>
        <ThemedText style={styles.complexityExplanation}>
          {getComplexityExplanation(complexity.space)}
        </ThemedText>
  </View>
    </View>
  </View>
);

// Enhanced Lesson Card Component
const LessonCardComponent = ({ card, lessonData, isFirstPart }: { 
  card: LessonCard; 
  lessonData?: LessonData; 
  isFirstPart?: boolean; 
}) => {
  const textChunks = breakTextIntoChunks(card.content);
  
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardIcon}>{card.icon}</ThemedText>
        <ThemedText style={styles.cardTitle}>{card.title}</ThemedText>
      </View>
      
      <View style={styles.cardContent}>
        {card.type === 'complexity' ? (
          <View style={styles.efficiencyContainer}>
            {/* Time Complexity Card */}
            <View style={styles.efficiencyCard}>
              <View style={styles.efficiencyCardHeader}>
                <ThemedText style={styles.efficiencyIcon}>⏱️</ThemedText>
                <ThemedText style={styles.efficiencyCardTitle}>Time Complexity</ThemedText>
              </View>
              <View style={styles.efficiencyContent}>
                {(() => {
                  // Extract time complexity from content
                  const timeMatch = card.content.match(/time[^.]*?O\([^)]+\)[^.]*\./i);
                  const timeText = timeMatch ? timeMatch[0] : card.content.split('.')[0] + '.';
                  return (
                    <ThemedText style={styles.efficiencyText}>{timeText}</ThemedText>
                  );
                })()}
              </View>
            </View>

            {/* Space Complexity Card */}
            <View style={styles.efficiencyCard}>
              <View style={styles.efficiencyCardHeader}>
                <ThemedText style={styles.efficiencyIcon}>💾</ThemedText>
                <ThemedText style={styles.efficiencyCardTitle}>Space Complexity</ThemedText>
              </View>
              <View style={styles.efficiencyContent}>
                {(() => {
                  // Extract space complexity from content
                  const spaceMatch = card.content.match(/space[^.]*?O\([^)]+\)[^.]*\./i);
                  const spaceText = spaceMatch ? spaceMatch[0] : 
                    card.content.includes('space') ? 
                      card.content.split('.').find(s => s.toLowerCase().includes('space')) + '.' :
                      'Space complexity varies based on implementation.';
                  return (
                    <ThemedText style={styles.efficiencyText}>{spaceText}</ThemedText>
                  );
                })()}
              </View>
            </View>
          </View>
        ) : card.type === 'definition' ? (
          <View style={styles.definitionContent}>
            {/* Parse definition content - handle both numbered and plain text formats */}
            {(() => {
              console.log('Definition content:', card.content); // Debug log
              
              // First try to split by numbered points
              let points = card.content.split(/\d+\)/).filter(item => item.trim());
              
              // If we don't get 3 points, try splitting by sentences and create our own structure
              if (points.length < 3) {
                const sentences = card.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
                if (sentences.length >= 3) {
                  points = [sentences[0], sentences[1], sentences.slice(2).join('. ')];
    } else {
                  // Fallback: split the text into 3 roughly equal parts
                  const text = card.content.trim();
                  const third = Math.ceil(text.length / 3);
                  points = [
                    text.substring(0, third),
                    text.substring(third, third * 2),
                    text.substring(third * 2)
                  ];
                }
              }
              
              const labels = ['What it is:', 'How it works:', 'Advantages:'];
              
              return points.slice(0, 3).map((point, index) => {
                const cleanPoint = point.trim().replace(/^(What it is:|How it works:|Advantages:)/i, '').trim();
                
                return (
                  <View key={index}>
                    <View style={styles.definitionChunk}>
                      <View style={styles.definitionBullet} />
                      <ThemedText style={styles.definitionText}>
                        <ThemedText style={styles.definitionLabel}>
                          {labels[index]}
                        </ThemedText>
                        {' ' + cleanPoint}
                      </ThemedText>
                    </View>
                    {/* Show data structure image after the first bullet point in definition card on first part */}
                    {index === 0 && isFirstPart && card.type === 'definition' && lessonData?.dataStructureImage && (
                      <DataStructureImage imageName={lessonData.dataStructureImage} />
                    )}
                  </View>
                );
              });
            })()}
          </View>
        ) : card.type === 'usage' ? (
          <View style={styles.usageContent}>
            {textChunks.map((chunk, index) => (
              <View key={index} style={styles.usageStep}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                </View>
                <ThemedText style={styles.usageText}>{chunk}</ThemedText>
              </View>
            ))}
          </View>
        ) : card.type === 'advantages' ? (
          <View style={styles.advantagesContent}>
            {textChunks.map((chunk, index) => (
              <View key={index} style={styles.advantageItem}>
                <ThemedText style={styles.advantageIcon}>✓</ThemedText>
                <ThemedText style={styles.advantageText}>{chunk}</ThemedText>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.defaultContent}>
            {textChunks.map((chunk, index) => (
              <ThemedText key={index} style={styles.contentChunk}>
                {chunk}
              </ThemedText>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};



export default function LessonScreen() {
  const params = useLocalSearchParams();
  const { topicName, problemId, questionTitle, questionId } = params;
  const router = useRouter();
  
  // Get the actual problem ID from either problemId or questionId
  const actualProblemId = problemId || questionId;
  
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  
  // LessonMCQ Data State
  const [lessonMCQData, setLessonMCQData] = useState<LessonMCQData | null>(null);
  
  // Animation refs for glowing button
  const glowAnimation = useRef(new Animated.Value(0)).current;

  const currentPart = lessonData?.parts?.[currentPartIndex];

  // Transform quiz data for LessonMCQ
  const transformQuizData = (questions: QuizQuestion[]): LessonMCQData => {
    return {
      introductory_text: `Test your understanding of what you've learned! This quiz covers the key concepts from the lesson.`,
      quiz: questions.map(q => ({
        question: q.question,
        options: q.options,
        correct_answer: q.options[q.correctAnswer], // Convert index to actual answer text
        optionExplanations: q.optionExplanations // Preserve the option explanations
      }))
    };
  };

  // Prefetch quiz data in background
  const prefetchQuiz = async () => {
    if (quizLoading || quizData) return; // Don't fetch if already loading or have data
    
    setQuizLoading(true);
    try {
      // Get the problemId from params, ensure it's a number
      const currentProblemId = Array.isArray(actualProblemId) ? actualProblemId[0] : actualProblemId;
      const currentTopicName = Array.isArray(topicName) ? topicName[0] : topicName;
      const currentQuestionTitle = Array.isArray(questionTitle) ? questionTitle[0] : questionTitle;

      console.log('🎯 Prefetching quiz for:', { 
        problemId: currentProblemId, 
        topicName: currentTopicName, 
        questionTitle: currentQuestionTitle 
      });

      // Check if we have required data
      if (!currentProblemId || !currentTopicName) {
        console.warn('⚠️ Missing required data for quiz generation:', { currentProblemId, currentTopicName });
        return;
      }
      
      // Use the proper API configuration
      const apiUrl = API_BASE_URL;
      
      // Get current user for skill level
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await fetch(`${apiUrl}/api/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problemId: parseInt(currentProblemId as string) || currentProblemId,
          topicName: currentTopicName,
          questionTitle: currentQuestionTitle,
          userId: user?.id, // Add userId for skill level detection
        }),
      });

      if (!response.ok) {
        throw new Error(`Quiz generation failed: ${response.status} ${response.statusText}`);
      }

      const quizResponse = await response.json();
      
      // Handle both direct array and {questions: []} format
      const questions = Array.isArray(quizResponse) ? quizResponse : quizResponse.questions || [];
      
      setQuizData(questions);
      console.log('✅ Quiz prefetched successfully:', questions.length, 'questions');
      console.log('🔍 Setting quizData state to:', questions.length, 'questions');
      
      // Quiz data is ready, no need for waiting state
      console.log('✅ Quiz data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to prefetch quiz:', error);
      // Error occurred, but no waiting state to reset
    } finally {
      setQuizLoading(false);
      console.log('🔍 Setting quizLoading to false');
    }
  };

  // Auto-transform quiz data when it's loaded
  useEffect(() => {
    console.log('🔄 Auto-transform effect triggered:', { 
      quizDataLength: quizData?.length, 
      lessonMCQData: !!lessonMCQData 
    });
    if (quizData && quizData.length > 0 && !lessonMCQData) {
      const transformedData = transformQuizData(quizData);
      setLessonMCQData(transformedData);
      console.log('✅ Quiz data auto-transformed and ready for LessonMCQ');
      
      // Quiz data is ready
      console.log('✅ Quiz data is ready for use');
    }
  }, [quizData, lessonMCQData]);

  // Start quiz prefetching immediately when component mounts
  useEffect(() => {
    console.log('🚀 Component mounted, starting immediate quiz prefetch...');
    console.log('🔍 Available params:', { topicName, problemId, questionId, questionTitle, actualProblemId });
    
    // Start prefetching immediately if we have the required data
    if (actualProblemId && topicName) {
      prefetchQuiz();
    } else {
      console.warn('⚠️ Cannot start quiz prefetch - missing required params:', { actualProblemId, topicName });
    }
  }, []); // Empty dependency array to run only once on mount

  // Quiz loading completed effect
  useEffect(() => {
    if (!quizLoading && quizData && quizData.length > 0) {
      console.log('✅ Quiz loading completed with data');
    }
  }, [quizLoading, quizData]);

  // Start glowing animation when we reach the last part
  useEffect(() => {
    if (currentPart && currentPartIndex === (lessonData?.parts?.length || 0) - 1) {
      const startGlowAnimation = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnimation, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: false,
            }),
            Animated.timing(glowAnimation, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: false,
            }),
          ])
        ).start();
      };
      
      // Start the animation after a short delay
      const timeout = setTimeout(startGlowAnimation, 500);
      return () => clearTimeout(timeout);
    }
  }, [currentPartIndex, lessonData?.parts?.length, glowAnimation]);

  // Handle Complete Lesson button press
  const handleCompleteLesson = () => {
    if (lessonMCQData && quizData && quizData.length > 0) {
      // Quiz data is ready and already transformed
      router.push({
        pathname: '/screens/LessonMCQ',
        params: {
          quizData: JSON.stringify(lessonMCQData),
          questionTitle: Array.isArray(questionTitle) ? questionTitle[0] : questionTitle,
          problemId: Array.isArray(actualProblemId) ? actualProblemId[0] : actualProblemId,
          topicName: Array.isArray(topicName) ? topicName[0] : topicName
        }
      });
      console.log('🎯 Opening quiz with', quizData.length, 'questions');
    } else if (quizLoading) {
      // Quiz is still loading, show bounce animation and do nothing
      console.log('⏳ Quiz is still loading, button bounce - no action');
      // Create a bounce animation
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // No quiz data available, try to fetch it now
      console.warn('⚠️ No quiz data available, attempting to fetch...');
      prefetchQuiz();
    }
  };

  // Load lesson data and prefetch quiz immediately
  useEffect(() => {
    const loadLessonData = async () => {
      try {
        console.log('🔄 Starting lesson data loading...');
        setLoading(true);
        setError(null);

        if (!params.preFetchedData) {
          console.error('❌ No prefetched data found in params');
          throw new Error('No prefetched data available');
        }

        console.log('📦 Raw prefetched data:', params.preFetchedData);

        // Parse the prefetched data
        let parsedData: LessonData;
        try {
          parsedData = typeof params.preFetchedData === 'string' 
            ? JSON.parse(params.preFetchedData)
            : params.preFetchedData;
          
          console.log('✅ Successfully parsed lesson data:', {
            title: parsedData?.title,
            hasParts: !!parsedData?.parts,
            partsLength: parsedData?.parts?.length,
            hasContent: !!parsedData?.content
          });
        } catch (parseError) {
          console.error('❌ Failed to parse prefetched data:', parseError);
          console.error('Raw data that failed to parse:', params.preFetchedData);
          throw new Error('Invalid lesson data format');
        }

        // Validate the parsed data
        if (!parsedData || !parsedData.title) {
          console.error('❌ Invalid lesson data structure:', parsedData);
          throw new Error('Lesson data is incomplete - missing title');
        }



        setLessonData(parsedData);
        console.log('✅ Lesson data loaded successfully:', {
          title: parsedData.title,
          partsCount: parsedData.parts?.length || 0
        });

        // Quiz prefetching is handled separately in the immediate useEffect

    } catch (error) {
        console.error('❌ Error loading lesson:', error);
        setError(error instanceof Error ? error.message : 'Failed to load lesson');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadLessonData();
  }, [params.preFetchedData, router]);

  // Handle loading and error states
  useEffect(() => {
    if (error) {
      // Show error state and provide a way to go back
      Alert.alert(
        'Error Loading Lesson',
        error,
        [{ text: 'Go Back', onPress: () => router.replace('/(tabs)') }]
      );
    }
  }, [error, router]);

  // Debug lesson data loading
  useEffect(() => {
    if (lessonData) {
      console.log('🔄 Lesson data loaded:', {
        title: lessonData.title,
        partsCount: lessonData.parts?.length || 0,
        currentPartIndex,
        currentPartTitle: lessonData.parts?.[currentPartIndex]?.title
      });
    }
  }, [lessonData, currentPartIndex]);

  // Current part is already defined above, remove this duplicate

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <ThemedText style={styles.loadingText}>Loading lesson content...</ThemedText>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.errorButton}>
          <ThemedText style={styles.errorButtonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Render main content
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton}>
            <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleBubble}>
              <View style={styles.lessonDot} />
              <ThemedText style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {decodeHtmlEntities((Array.isArray(questionTitle) ? questionTitle[0] : questionTitle) || (Array.isArray(topicName) ? topicName[0] : topicName) || 'Lesson')}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Indicator */}
      {lessonData?.parts && lessonData.parts.length > 0 && (
          <View style={styles.progressContainer}>
            <ThemedText style={styles.progressText}>
            Part {currentPartIndex + 1} of {lessonData.parts.length}
            </ThemedText>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                { width: `${((currentPartIndex + 1) / lessonData.parts.length) * 100}%` }
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
                

                
              <View style={styles.cardsContainer}>
                {currentPart.cards?.map((card, index) => (
                  <LessonCardComponent 
                    key={index} 
                    card={card} 
                    lessonData={lessonData || undefined}
                    isFirstPart={currentPartIndex === 0}
                  />
                )) ?? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6564c7" />
                    <ThemedText style={styles.loadingText}>Loading lesson content...</ThemedText>
                  </View>
                )}
                </View>


              </>
            ) : (
              <View style={styles.lessonContainer}>
                <ThemedText style={styles.lessonTitle}>
                  {lessonData?.title || questionTitle}
                </ThemedText>
              
              {/* Show lesson content if available */}
              {lessonData?.content ? (
                <View style={styles.lessonContent}>
                  <ThemedText style={styles.lessonText}>
                    Loading structured lesson content...
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.lessonText}>
                  Loading structured lesson content...
                </ThemedText>
              )}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
        <View style={[styles.navigationButtons, currentPartIndex === 0 && styles.navigationButtonsFirstPage]}>
            {currentPartIndex > 0 && (
              <TouchableOpacity 
                style={styles.prevButton} 
                onPress={() => setCurrentPartIndex(currentPartIndex - 1)}
              >
                <ThemedText style={styles.prevButtonText}>← Previous</ThemedText>
              </TouchableOpacity>
            )}
            
          {currentPart && currentPartIndex < (lessonData?.parts?.length || 0) - 1 ? (
              <TouchableOpacity 
                style={styles.nextButton} 
                onPress={() => setCurrentPartIndex(currentPartIndex + 1)}
              >
                <ThemedText style={styles.nextButtonText}>Next →</ThemedText>
              </TouchableOpacity>
            ) : (
            <Animated.View
              style={[
                styles.nextButton,
                {
                  shadowColor: '#6564c7',
                  shadowOpacity: glowAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.8],
                  }),
                  shadowRadius: glowAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 12],
                  }),
                  elevation: glowAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 12],
                  }),
                  transform: [{
                    scale: glowAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.05],
                    }),
                  }],
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.completeButtonInner} 
                onPress={handleCompleteLesson}
              >
                <ThemedText style={styles.nextButtonText}>
                  {(() => {
                    console.log('🔍 Quiz button state:', { quizLoading, quizDataLength: quizData?.length, lessonMCQData: !!lessonMCQData });
                    return quizLoading && !quizData 
                      ? '⏳ Loading...' 
                      : '🎉 Quiz Time!';
                  })()}
                </ThemedText>
              </TouchableOpacity>
            </Animated.View>
            )}
          </View>
      </View>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    padding: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
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
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6564c7',
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  lessonContainer: {
    padding: 20,
  },
  lessonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingTop: 10,
    marginBottom: 24,
    color: '#6564c7',
    textAlign: 'center',
  },
  lessonContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lessonText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 15,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  cardContent: {
    flex: 1,
  },
  
  // Definition card styles
  definitionContent: {
    gap: 12,
  },
  definitionChunk: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  definitionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6564c7',
    marginTop: 8,
    marginRight: 12,
  },
  definitionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    flex: 1,
  },
  definitionLabel: {
    fontWeight: 'bold',
    color: '#6564c7',
  },
  
  // Usage card styles
  usageContent: {
    gap: 16,
  },
  usageStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6564c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  usageText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    flex: 1,
  },
  
  // Advantages card styles
  advantagesContent: {
    gap: 12,
  },
  advantageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  advantageIcon: {
    fontSize: 18,
    color: '#22c55e',
    marginRight: 12,
    marginTop: 2,
  },
  advantageText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    flex: 1,
  },
  
  // Default content styles
  defaultContent: {
    gap: 12,
  },
  contentChunk: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 8,
  },
  
  // Enhanced complexity table styles
  complexityTable: {
    gap: 20,
  },
  complexitySection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  complexityHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 12,
  },
  complexityRow: {
    marginBottom: 12,
  },
  complexityLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  complexityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 100,
  },
  complexityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6564c7',
    backgroundColor: '#E8E6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  complexityExplanation: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 4,
    fontStyle: 'italic',
  },
  

  
  // Operations list styles
  operationsList: {
    gap: 12,
  },
  operationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  operationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6564c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  operationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    flex: 1,
  },
  
  // Efficiency grid styles
  efficiencyGrid: {
    gap: 12,
  },
  efficiencyItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6564c7',
  },
  efficiencyOperation: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  efficiencyValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 8,
  },
  efficiencyExplanation: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Steps list styles
  stepsList: {
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6564c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepCircleText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    flex: 1,
  },
  
  // Algorithm complexity styles
  algorithmComplexity: {
    gap: 16,
  },
  algorithmComplexityItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  algorithmComplexityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  algorithmComplexityValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
    marginBottom: 8,
  },
  algorithmComplexityExplanation: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Footer styles
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navigationButtonsFirstPage: {
    justifyContent: 'flex-end',
  },
  prevButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6564c7',
  },
  prevButtonText: {
    color: '#6564c7',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#6564c7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButtonInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Data structure image styles
  dataStructureImageContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  dataStructureImageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 16,
    textAlign: 'center',
  },
  dataStructureImage: {
    width: '100%',
    height: 200,
    maxWidth: 300,
  },

  // New styles for efficiency grid
  efficiencyContainer: {
    gap: 16,
  },
  efficiencyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6564c7',
  },
  efficiencyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  efficiencyIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  efficiencyCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  efficiencyContent: {
    // No specific styles needed for content, it will be text
  },
  efficiencyText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },


}); 