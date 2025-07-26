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

interface LoadingQuizProps {
  onLoadingComplete?: () => void;
  loadingDuration?: number;
  onProgressUpdate?: (progress: number) => void;
  onDataFetched?: (data: any) => void;
}

const { width, height } = Dimensions.get('window');

export default function LoadingQuiz({ 
  onLoadingComplete, 
  loadingDuration = 1000,
  onProgressUpdate,
  onDataFetched
}: LoadingQuizProps) {
  const params = useLocalSearchParams();
  const lessonTitles = params.lessonTitles as string;
  
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
  const [caption, setCaption] = useState('Preparing your recap quiz...');

  // Fetch quiz data
  const fetchQuizData = async () => {
    if (!lessonTitles) {
      return;
    }
    
    try {
      
      // Get current user and session
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      let quizResponse;
      
      // Check if user is authenticated and has a valid session
      if (!user || !session?.access_token) {
        quizResponse = await apiCall('/api/generate-recap-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lessonTitles: lessonTitles,
          }),
        });
      } else {
        quizResponse = await apiCall('/api/generate-recap-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            lessonTitles: lessonTitles,
            userId: user?.id,
          }),
        });

      }

      if (!quizResponse.ok) {
        console.error('❌ LoadingQuiz: API call failed with status:', quizResponse.status);
        const errorText = await quizResponse.text();
        console.error('❌ LoadingQuiz: Error response:', errorText);
        throw new Error(`Failed to generate quiz: ${quizResponse.status}`);
      }

      const quizResult = await quizResponse.json();
      console.log('✅ LoadingQuiz: Quiz data fetched successfully');
      console.log('✅ LoadingQuiz: Quiz has', quizResult.quiz?.length || 0, 'questions');
      
      // Store quiz data in AsyncStorage
      await AsyncStorage.setItem(`quiz_${lessonTitles}`, JSON.stringify(quizResult));
      
      setFetchedData(quizResult);
      if (onDataFetched) {
        onDataFetched(quizResult);
      }
      
      // Set progress to 100% after successful fetch
      setFetchProgress(100);
    } catch (error) {
      console.error('Error in fetchQuizData:', error);
      // On error, still set progress to 100% to allow navigation
      setFetchProgress(100);
    }
  };

  // Simulate fetch progress with actual data fetching
  useEffect(() => {
    console.log('🔄 Starting quiz fetch progress simulation...');
    console.log('🔄 LoadingQuiz: lessonTitles from params:', lessonTitles);
    
    // Start actual data fetching
    fetchQuizData();
    
    // Define progress steps - 10 seconds total, gets stuck at 90% until quiz is fetched
    const progressSteps = [
      { time: 1000, progress: 20 },   // Initial connection
      { time: 2500, progress: 35 },   // Database query
      { time: 4000, progress: 50 },   // Data processing
      { time: 6000, progress: 65 },   // Content preparation
      { time: 8000, progress: 80 },   // AI processing
      { time: 10000, progress: 90 },  // Content processing (stuck at 90%)
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

  }, [lessonTitles, onProgressUpdate]);

  // Start animations immediately and reliably
  useEffect(() => {
    if (animationsStarted.current) return;
    animationsStarted.current = true;
    
    console.log('🔄 LoadingQuiz: Starting animations...');

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
        console.log('🎯 Quiz fetch complete, transitioning to quiz screen');
        setIsReady(true);
        
        console.log('🎯 Navigating to quiz screen with pre-fetched data');
        await router.replace({
          pathname: '/screens/quizMCQ',
          params: {
            lessonTitles: lessonTitles,
            usePrefetchedData: 'true'
          },
        });

        // Clean up quiz data after navigation
        setTimeout(async () => {
          console.log('🧹 Cleaning up quiz data');
          if (lessonTitles) {
            await AsyncStorage.removeItem(`quiz_${lessonTitles}`);
          }
        }, 1000);
        
        if (onLoadingComplete) {
          onLoadingComplete();
        }
      }, 500);
      
      return () => clearTimeout(finalTimer);
    }
  }, [fetchProgress, lessonTitles, onLoadingComplete]);

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

  console.log('🎨 LoadingQuiz: Rendering component, progress:', fetchProgress, 'screen width:', width, 'progress bar width:', width * 0.6);

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