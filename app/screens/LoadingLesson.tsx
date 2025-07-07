import { apiCall } from '@/lib/api-config';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Platform, StyleSheet, Text, View } from 'react-native';

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
  const { questionId, questionTitle, questionDescription, topicName, questionDifficulty, from } = params;
  
  const [isReady, setIsReady] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [birdFlightStarted, setBirdFlightStarted] = useState(false);
  const [fetchedData, setFetchedData] = useState<any>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [apiCompleted, setApiCompleted] = useState(false);
  const [apiCompletedTime, setApiCompletedTime] = useState<number>(0);
  
  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const birdFloatAnim = useRef(new Animated.Value(0)).current;
  const birdScaleAnim = useRef(new Animated.Value(0)).current;
  const birdFlyAnim = useRef(new Animated.Value(0)).current;
  const captionFadeAnim = useRef(new Animated.Value(0)).current;
  const effectRun = useRef(false);
  const speedUpTriggered = useRef(false);
  const animationsStarted = useRef(false);
  const progressUpdateRef = useRef(onProgressUpdate);
  const onLoadingCompleteRef = useRef(onLoadingComplete);
  const onDataFetchedRef = useRef(onDataFetched);

  // Update refs when props change
  useEffect(() => {
    progressUpdateRef.current = onProgressUpdate;
    onLoadingCompleteRef.current = onLoadingComplete;
    onDataFetchedRef.current = onDataFetched;
  }, [onProgressUpdate, onLoadingComplete, onDataFetched]);

  const appName = 'CodeOnTheGo';
  const caption = 'Generating your personalized lesson...';

  // Fun loading messages
  const loadingMessages = [
    "Turning complex code into simple steps... like untangling headphones! 🎧",
    "Making this lesson as easy as copy & paste... but you'll actually learn! 📚",
    "Brewing the perfect mix of theory and practice... ☕️",
    "Finding the easiest way to explain this... no big words, promise! 🤝",
    "Loading examples that will make you go 'Aha!' 💡",
    "Sprinkling some magic to make coding fun... ✨",
    "Preparing a lesson so good, even your cat could understand it! 🐱",
    "Making sure this is easier than finding the TV remote 📺",
    "Cooking up code examples that'll make you smile 👨‍🍳",
    "Don't worry, we're making this byte-sized! 🍪",
    "Why did the programmer quit his job? He didn't get arrays! 🤓",
    "What's a programmer's favorite snack? Computer chips! 🍪",
    "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
    "Why did the programmer go broke? Because he used up all his cache! 💰",
    "What did the HTML tag say to the other? You're looking so bold today! 😎"
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const messageAnim = useRef(new Animated.Value(1)).current;

  // Cycle through messages every 6 seconds
  useEffect(() => {
    if (fetchProgress >= 100) return;

    const cycleMessages = () => {
      Animated.sequence([
        // Fade out
        Animated.timing(messageAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        // Change message and fade in
        Animated.timing(messageAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ]).start(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      });
    };

    const interval = setInterval(cycleMessages, 6000);
    return () => clearInterval(interval);
  }, [fetchProgress]);

  // Fetch lesson data with dynamic timing
  const fetchLessonData = async () => {
    try {
      console.log('🔄 Fetching lesson data...');
      setStartTime(Date.now());
      
      const response = await apiCall('/generate-lesson', {
        method: 'POST',
        body: JSON.stringify({
          questionId: questionId,
          questionTitle: questionTitle,
          questionDescription: questionDescription,
          topicName: topicName,
          difficulty: questionDifficulty
        })
      });

      if (response.ok) {
        const lessonData = await response.json();
        console.log('✅ Lesson data fetched successfully');
        setFetchedData(lessonData);
        setApiCompleted(true);
        setApiCompletedTime(Date.now());
        
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
  };

  // Start lesson generation and slow progress simulation
  useEffect(() => {
    if (effectRun.current) return;
    effectRun.current = true;
    
    console.log('🔄 Starting lesson generation...');
    
    // Start actual lesson generation
    fetchLessonData();
    
    // Slow progress steps (8 seconds total, but stops at 90% until API completes)
    const slowProgressSteps = [
      { time: 800, progress: 10 },
      { time: 1600, progress: 20 },
      { time: 2400, progress: 30 },
      { time: 3200, progress: 40 },
      { time: 4000, progress: 50 },
      { time: 4800, progress: 60 },
      { time: 5600, progress: 70 },
      { time: 6400, progress: 80 },
      { time: 7200, progress: 85 },
      { time: 8000, progress: 90 },
    ];

    // Set up slow progress updates
    const timeouts: number[] = [];
    slowProgressSteps.forEach(({ time, progress }) => {
      const timeout = setTimeout(() => {
        setFetchProgress(prev => Math.max(prev, progress));
        if (progressUpdateRef.current) {
          progressUpdateRef.current(progress);
        }
      }, time);
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Speed up progress when API completes
  useEffect(() => {
    if (!apiCompleted || !apiCompletedTime || speedUpTriggered.current) return;
    speedUpTriggered.current = true;
    
    console.log('🚀 API completed, speeding up progress bar');
    
    const speedUpSteps = [
      { time: 100, progress: 95 },
      { time: 300, progress: 100 },
    ];

    const timeouts: number[] = [];
    speedUpSteps.forEach(({ time, progress }) => {
      const timeout = setTimeout(() => {
        setFetchProgress(progress);
        if (progressUpdateRef.current) {
          progressUpdateRef.current(progress);
        }
      }, time);
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [apiCompleted, apiCompletedTime]);

  // Update progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: fetchProgress,
      duration: apiCompleted ? 200 : 300,
      useNativeDriver: false,
    }).start();
  }, [fetchProgress]);

  // Start animations immediately and reliably
  useEffect(() => {
    if (animationsStarted.current) return;
    animationsStarted.current = true;
    
    console.log('🔄 LoadingLesson: Starting animations...');

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

  // Watch for 95% progress to trigger bird flight
  useEffect(() => {
    if (fetchProgress < 95 || birdFlightStarted) return;
    
    console.log('🦅 95% progress reached! Bird starting to fly away...');
    setBirdFlightStarted(true);

    Animated.timing(birdFlyAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      if (onLoadingCompleteRef.current) {
        onLoadingCompleteRef.current();
      }
    });
  }, [fetchProgress]);

  // Handle completion and navigation
  useEffect(() => {
    if (fetchProgress < 100) return;
    
    const finalTimer = setTimeout(() => {
      console.log('🎯 Lesson generation complete, transitioning to lesson screen');
      setIsReady(true);
      
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
    }, 300);

    return () => clearTimeout(finalTimer);
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
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(fetchProgress)}%</Text>
          </View>

          {/* Fun loading message container */}
          <View style={styles.messageContainer}>
            <Animated.Text
              style={[
                styles.loadingMessage,
                {
                  opacity: messageAnim
                }
              ]}
            >
              {loadingMessages[currentMessageIndex]}
            </Animated.Text>
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
  messageContainer: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingMessage: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 1,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.select({
      ios: 'Avenir-Medium',
      android: 'sans-serif-medium'
    }),
  },
}); 