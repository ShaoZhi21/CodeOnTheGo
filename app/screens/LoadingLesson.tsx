import { apiCall } from '@/lib/api-config';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface LoadingLessonProps {
  onLoadingComplete?: () => void;
  onProgressUpdate?: (progress: number) => void;
  onDataFetched?: (data: any) => void;
}

export default function LoadingLesson({ 
  onLoadingComplete, 
  onProgressUpdate,
  onDataFetched
}: LoadingLessonProps) {
  const params = useLocalSearchParams();
  const { questionId, questionTitle, questionDescription, topicName, questionDifficulty } = params;
  
  const [isReady, setIsReady] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [birdFlightStarted, setBirdFlightStarted] = useState(false);
  const [fetchedData, setFetchedData] = useState<any>(null);
  const [apiCompleted, setApiCompleted] = useState(false);
  
  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const birdFloatAnim = useRef(new Animated.Value(0)).current;
  const birdScaleAnim = useRef(new Animated.Value(0)).current;
  const birdFlyAnim = useRef(new Animated.Value(0)).current;
  const captionFadeAnim = useRef(new Animated.Value(0)).current;
  const effectRun = useRef(false);
  const animationsStarted = useRef(false);
  const progressUpdateRef = useRef(onProgressUpdate);
  const onLoadingCompleteRef = useRef(onLoadingComplete);
  const onDataFetchedRef = useRef(onDataFetched);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Update refs when props change
  useEffect(() => {
    progressUpdateRef.current = onProgressUpdate;
    onLoadingCompleteRef.current = onLoadingComplete;
    onDataFetchedRef.current = onDataFetched;
  }, [onProgressUpdate, onLoadingComplete, onDataFetched]);

  const appName = 'CodeOnTheGo';
  const caption = 'Generating your personalized lesson...';

  // Fetch lesson data
  const fetchLessonData = useCallback(async () => {
    try {
      console.log('🔄 Fetching lesson data...');
      
      const response = await apiCall('/api/generate-topic-lesson', {
        method: 'POST',
        body: JSON.stringify({
          problemId: questionId,
          questionTitle: questionTitle,
          questionDescription: questionDescription,
          topicName: topicName,
          difficulty: questionDifficulty,
          fastStructuredLesson: true
        })
      });

      if (response.ok) {
        const lessonData = await response.json();
        console.log('✅ Lesson data fetched successfully');
        setFetchedData(lessonData);
        setApiCompleted(true);
        
        if (onDataFetchedRef.current) {
          onDataFetchedRef.current(lessonData);
        }
      } else {
        console.error('❌ Failed to fetch lesson data');
        setApiCompleted(true);
      }
    } catch (error) {
      console.error('❌ Error fetching lesson data:', error);
      setApiCompleted(true);
    }
  }, [questionId, questionTitle, questionDescription, topicName, questionDifficulty]);

  // Start lesson generation and progress simulation
  useEffect(() => {
    if (effectRun.current) return;
    effectRun.current = true;
    
    console.log('🔄 Starting lesson generation...');
    
    // Start actual lesson generation
    fetchLessonData();
    
    // Progress steps - 10% every second, stops at 90% until API completes
    const progressSteps = [
      { time: 1000, progress: 10 },
      { time: 2000, progress: 20 },
      { time: 3000, progress: 30 },
      { time: 4000, progress: 40 },
      { time: 5000, progress: 50 },
      { time: 6000, progress: 60 },
      { time: 7000, progress: 70 },
      { time: 8000, progress: 80 },
      { time: 9000, progress: 90 },
    ];

    // Set up progress updates
    progressSteps.forEach(({ time, progress }) => {
      const timeout = setTimeout(() => {
        setFetchProgress(prev => {
          const newProgress = Math.max(prev, progress);
          if (progressUpdateRef.current) {
            progressUpdateRef.current(newProgress);
          }
          return newProgress;
        });
      }, time);
      timeoutsRef.current.push(timeout);
    });

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [fetchLessonData]);

  // Complete progress when API is done
  useEffect(() => {
    if (apiCompleted && fetchProgress >= 90) {
      // Complete the progress
      setFetchProgress(100);
      if (progressUpdateRef.current) {
        progressUpdateRef.current(100);
      }
      if (onLoadingCompleteRef.current) {
        onLoadingCompleteRef.current();
      }

      // Add delay before navigation to allow animations to complete
      const navigationTimer = setTimeout(() => {
        router.replace({
          pathname: '/screens/lesson',
          params: {
            questionId: questionId as string,
            questionTitle: questionTitle as string,
            questionDescription: questionDescription as string,
            topicName: topicName as string,
            preFetchedData: JSON.stringify(fetchedData)
          }
        });
      }, 500);

      return () => clearTimeout(navigationTimer);
    }
  }, [apiCompleted, fetchProgress, questionId, questionTitle, questionDescription, topicName, fetchedData]);

  // Start animations when component mounts
  useEffect(() => {
    if (animationsStarted.current) return;
    animationsStarted.current = true;

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

  // Start bird flight animation when progress is complete
  useEffect(() => {
    if (fetchProgress >= 95 && !birdFlightStarted) {
      setBirdFlightStarted(true);
      Animated.timing(birdFlyAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [fetchProgress]);

  // Interpolate animations
  const birdFloatTranslateY = birdFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  const birdScale = birdScaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const birdFlyTranslateY = birdFlyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height],
  });

  const birdFlyScale = birdFlyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.1],
  });

  const birdFlyOpacity = birdFlyAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 0.8, 0],
  });

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
                  { translateY: birdFlightStarted ? birdFlyTranslateY : birdFloatTranslateY },
                  { scale: birdFlightStarted ? birdFlyScale : birdScale },
                ],
                opacity: birdFlightStarted ? birdFlyOpacity : 1,
              },
            ]}
          >
            <Image
              source={require('@/assets/images/icons/codeonthego-bird-icon.png')}
              style={[styles.birdIcon, { tintColor: '#8B5CF6' }]}
              resizeMode="contain"
            />
          </Animated.View>

          {/* App Name */}
          <Text style={styles.appName}>{appName}</Text>

          {/* Caption */}
          <Animated.Text
            style={[
              styles.caption,
              {
                opacity: captionFadeAnim,
              },
            ]}
          >
            {caption}
          </Animated.Text>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${fetchProgress}%`,
                  },
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
    paddingHorizontal: 40,
  },
  birdContainer: {
    marginBottom: 30,
  },
  birdIcon: {
    width: 150,
    height: 150,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 20,
    textAlign: 'center',
  },
  caption: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  progressContainer: {
    width: 250,
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0D7FF', // Light purple background
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden', // Ensure the fill doesn't overflow
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6', // Purple fill
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
}); 