import { apiCall } from '@/lib/api-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, View } from 'react-native';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface LoadingScreenProps {
  onLoadingComplete?: () => void;
  loadingDuration?: number;
  onProgressUpdate?: (progress: number) => void;
  problemId?: string;
  onDataFetched?: (data: any) => void;

  // Lesson mode props
  isLessonMode?: string;
  questionId?: string;
  questionTitle?: string;
  questionDescription?: string;
  topicName?: string;
  questionDifficulty?: string;
}

const { width, height } = Dimensions.get('window');

export default function LoadingScreen({
  onLoadingComplete,
  loadingDuration = 1000,
  onProgressUpdate,
  problemId,
  onDataFetched,

  // Lesson mode props
  isLessonMode,
  questionId,
  questionTitle,
  questionDescription,
  topicName,
  questionDifficulty
}: LoadingScreenProps) {
  const routeParams = useLocalSearchParams();

  // expo-router passes route params via hooks (not component props).
  // Support both usages: props (when embedded) and route params (when used as a screen).
  const effectiveIsLessonMode =
    isLessonMode ?? (routeParams.isLessonMode as string | undefined);

  const effectiveQuestionId =
    questionId ?? (routeParams.questionId as string | undefined);

  const effectiveTopicName =
    topicName ?? (routeParams.topicName as string | undefined);

  const effectiveQuestionTitle =
    questionTitle ??
    (routeParams.questionTitle as string | undefined) ??
    (routeParams.name as string | undefined);

  const effectiveQuestionDescription =
    questionDescription ?? (routeParams.questionDescription as string | undefined);

  const effectiveQuestionDifficulty =
    questionDifficulty ??
    (routeParams.questionDifficulty as string | undefined) ??
    (routeParams.difficulty as string | undefined);

  const effectiveProblemId =
    problemId ??
    (routeParams.problemId as string | undefined) ??
    (routeParams.id as string | undefined);

  const effectiveSource = routeParams.source as string | undefined;
  const effectivePlanId = routeParams.planId as string | undefined;

  const [isReady, setIsReady] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [birdFlightStarted, setBirdFlightStarted] = useState(false);
  const animationsStarted = useRef(false);
  const [fetchedData, setFetchedData] = useState<any>(null);

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const birdFloatAnim = useRef(new Animated.Value(0)).current;
  const birdScaleAnim = useRef(new Animated.Value(0)).current;
  const birdFlyAnim = useRef(new Animated.Value(0)).current;
  const captionFadeAnim = useRef(new Animated.Value(0)).current;

  const appName = 'CodeOnTheGo';
  const caption = effectiveIsLessonMode === 'true' ? 'Preparing your lesson...' : 'Loading your next challenge...';

  // Fetch lesson data for lesson mode
  const fetchLessonData = async () => {
    if (!effectiveQuestionId || !effectiveTopicName) return;

    try {
      console.log('🔄 LoadingScreen: Fetching lesson data for ID:', effectiveQuestionId);

      // Get current user and session
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();

      let lessonResponse;

      // Check if user is authenticated and has a valid session
      if (!user || !session?.access_token) {
        console.log('⚠️ User not authenticated, proceeding without auth header and userId');
        // Proceed without authentication header and userId
        lessonResponse = await apiCall('/api/generate-topic-lesson', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topicName: effectiveTopicName,
            problemId: parseInt(effectiveQuestionId),
            // Don't send userId when user is not authenticated
            fastStructuredLesson: true,
          }),
        });
      } else {
        // User is authenticated, include auth header and userId
        lessonResponse = await apiCall('/api/generate-topic-lesson', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            topicName: effectiveTopicName,
            problemId: parseInt(effectiveQuestionId),
            userId: user?.id,
            fastStructuredLesson: true,
          }),
        });
      }

      if (!lessonResponse.ok) {
        throw new Error('Failed to generate lesson');
      }

      const lessonResult = await lessonResponse.json();
      console.log('✅ LoadingScreen: Lesson data fetched successfully');

      // Store lesson data in AsyncStorage
      await AsyncStorage.setItem(`lesson_${effectiveQuestionId}`, JSON.stringify(lessonResult));

      setFetchedData(lessonResult);
      if (onDataFetched) {
        onDataFetched(lessonResult);
      }
    } catch (error) {
      console.error('Error in fetchLessonData:', error);
    }
  };

  // Actually fetch the problem data during loading
  const fetchProblemData = async () => {
    if (!effectiveProblemId) return;

    try {
      console.log('🔄 LoadingScreen: Fetching problem data for ID:', effectiveProblemId);

      console.log('🔄 LoadingScreen: Fetching problem data via Proxy for ID:', effectiveProblemId);

      const response = await apiCall(`/api/problems/${effectiveProblemId}`, { method: 'GET' });

      if (!response.ok) {
        console.error('Error fetching problem via proxy');
        return;
      }

      const data = await response.json();

      if (data) {
        console.log('✅ LoadingScreen: Problem data fetched successfully');

        // Store problem data in AsyncStorage
        await AsyncStorage.setItem(`problem_${effectiveProblemId}`, JSON.stringify(data));

        setFetchedData(data);
        if (onDataFetched) {
          onDataFetched(data);
        }
      }
    } catch (error) {
      console.error('Error in fetchProblemData:', error);
    }
  };

  // Simulate fetch progress with actual data fetching
  useEffect(() => {
    console.log('🔄 Starting fetch progress simulation...');
    console.log('🔄 IsLessonMode:', effectiveIsLessonMode);

    // Start actual data fetching based on mode
    if (effectiveIsLessonMode === 'true') {
      fetchLessonData();
    } else {
      fetchProblemData();
    }

    // Define progress steps with 1-second total duration
    const progressSteps = [
      { time: 200, progress: 30 },   // Initial connection
      { time: 400, progress: 60 },   // Database query/API call
      { time: 600, progress: 85 },   // Data processing
      { time: 800, progress: 95 },   // Content processing
      { time: 1000, progress: 100 }, // Complete
    ];

    // Set up progress updates at each step
    progressSteps.forEach(({ time, progress }) => {
      setTimeout(() => {
        setFetchProgress(progress);
        if (onProgressUpdate) {
          onProgressUpdate(progress);
        }
      }, time);
    });

  }, [effectiveProblemId, effectiveQuestionId, effectiveIsLessonMode, onProgressUpdate]);

  // Start animations immediately and reliably
  useEffect(() => {
    if (animationsStarted.current) return;
    animationsStarted.current = true;

    console.log('🔄 LoadingScreen: Starting animations...');

    // Bird scale in
    Animated.timing(birdScaleAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Bird floating loop - Smooth continuous bouncing
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        // Float up
        Animated.timing(birdFloatAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Small pause at top
        Animated.timing(birdFloatAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Float down
        Animated.timing(birdFloatAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Small pause at bottom
        Animated.timing(birdFloatAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    );
    floatingAnimation.start();

    // Caption fade in
    Animated.timing(captionFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    return () => {
      floatingAnimation.stop();
    };
  }, []);

  // Watch for 100% progress to trigger bird flight
  useEffect(() => {
    if (fetchProgress >= 100 && !birdFlightStarted) {
      console.log('🦅 100% progress reached! Bird starting to fly away...');
      setBirdFlightStarted(true);

      Animated.timing(birdFlyAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [fetchProgress, birdFlightStarted]);

  // Handle completion and navigation
  useEffect(() => {
    if (fetchProgress >= 100) {
      const finalTimer = setTimeout(async () => {
        console.log('🎯 Fetch complete, transitioning to appropriate screen');
        setIsReady(true);

        // Navigate to appropriate screen based on mode
        if (effectiveIsLessonMode === 'true') {
          console.log('🎯 Navigating to lesson screen with pre-fetched data');
          await router.replace({
            pathname: '/screens/lesson',
            params: {
              questionId: effectiveQuestionId,
              questionTitle: effectiveQuestionTitle,
              questionDescription: effectiveQuestionDescription,
              topicName: effectiveTopicName,
              usePrefetchedData: 'true'
            },
          });

          // Clean up lesson data after navigation
          setTimeout(async () => {
            console.log('🧹 Cleaning up lesson data');
            if (effectiveQuestionId) {
              await AsyncStorage.removeItem(`lesson_${effectiveQuestionId}`);
            }
          }, 1000);
        } else {
          console.log('🎯 Navigating to question screen with pre-fetched data');
          await router.replace({
            pathname: '/screens/question',
            params: {
              id: effectiveProblemId,
              name: effectiveQuestionTitle,
              difficulty: effectiveQuestionDifficulty,
              usePrefetchedData: 'true',
              ...(effectiveTopicName ? { topicName: effectiveTopicName } : {}),
              ...(effectiveSource ? { source: effectiveSource } : {}),
              ...(effectivePlanId ? { planId: effectivePlanId } : {}),
            },
          });

          // Clean up problem data after navigation
          setTimeout(async () => {
            console.log('🧹 Cleaning up problem data');
            if (effectiveProblemId) {
              await AsyncStorage.removeItem(`problem_${effectiveProblemId}`);
            }
          }, 1000);
        }

        if (onLoadingComplete) {
          onLoadingComplete();
        }
      }, 500);

      return () => clearTimeout(finalTimer);
    }
  }, [
    fetchProgress,
    effectiveIsLessonMode,
    effectiveQuestionId,
    effectiveQuestionTitle,
    effectiveQuestionDescription,
    effectiveTopicName,
    effectiveProblemId,
    effectiveQuestionDifficulty,
    onLoadingComplete,
  ]);

  // Interpolate animations
  const birdFloatTranslateY = birdFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30], // Reduced bounce height for smoother feel
  });

  const birdScale = birdScaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const birdFlyTranslateY = birdFlyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height], // Fly all the way up
  });

  const birdFlyScale = birdFlyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.1], // Smaller final size
  });

  const birdFlyOpacity = birdFlyAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 0.8, 0], // Slower fade out
  });

  // Update progress animation when fetchProgress changes
  useEffect(() => {
    // Animate to the new progress value
    Animated.timing(progressAnim, {
      toValue: fetchProgress,
      duration: 300, // Consistent duration for smooth animation
      useNativeDriver: false,
    }).start();
  }, [fetchProgress]);

  console.log('🎨 LoadingScreen: Rendering component, progress:', fetchProgress, 'screen width:', width, 'progress bar width:', width * 0.6);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#FFFFFF']}
        style={styles.gradient}
      >
        <View style={styles.content}>

          {/* Bird Logo */}
          <Animated.View
            style={[
              styles.birdContainer,
              {
                transform: [
                  { translateY: Animated.add(birdFloatTranslateY, birdFlyTranslateY) },
                  { scale: Animated.multiply(birdScale, birdFlyScale) },
                ],
                opacity: birdFlyOpacity,
              },
            ]}
          >
            <View style={styles.birdGlow}>
              <Image
                source={require('@/assets/images/icons/codeonthego-bird-icon.png')}
                style={styles.birdImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* App Name - Static */}
          <View style={styles.titleContainer}>
            <Text style={styles.appName}>
              {appName}
            </Text>
          </View>

          {/* Caption */}
          <Animated.Text style={[styles.caption, { opacity: captionFadeAnim }]}>
            {caption}
          </Animated.Text>

          {/* Progress Bar*/}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(fetchProgress)}%</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  birdContainer: {
    marginBottom: 50,
    marginTop: 40,
  },
  birdGlow: {
    // Remove shadow styles
  },
  birdImage: {
    width: 150,
    height: 150,
    tintColor: '#8B5CF6',
  },
  titleContainer: {
    marginBottom: 25,
  },
  appName: {
    fontSize: width > 768 ? 48 : 36,
    fontWeight: 'bold',
    color: '#8B5CF6',
    fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  caption: {
    fontSize: width > 768 ? 18 : 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 50,
    fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
    letterSpacing: 0.5,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },

  progressBarContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 250,
    alignSelf: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textAlign: 'center',
    marginTop: 12,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
}); 
