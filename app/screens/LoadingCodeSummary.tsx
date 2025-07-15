import { apiCall } from '@/lib/api-config';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SummaryData {
  finalCode: string;
  explanation: string;
  pseudocodeSteps: string[];
  efficiency: {
    timeComplexity: string;
    spaceComplexity: string;
    explanation: string;
  };
}

export default function LoadingCodeSummary() {
  const params = useLocalSearchParams();
  const [fetchProgress, setFetchProgress] = useState(0);
  const [birdFlightStarted, setBirdFlightStarted] = useState(false);
  const [prefetchedSummary, setPrefetchedSummary] = useState<SummaryData | null>(null);
  const [prefetchError, setPrefetchError] = useState<string | null>(null);
  const animationsStarted = useRef(false);

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const birdFloatAnim = useRef(new Animated.Value(0)).current;
  const birdScaleAnim = useRef(new Animated.Value(0)).current;
  const birdFlyAnim = useRef(new Animated.Value(0)).current;
  const captionFadeAnim = useRef(new Animated.Value(0)).current;

  const appName = 'CodeOnTheGo';
  const caption = 'Generating your code summary...';

  // Parse the passed parameters
  const problemId = params.problemId as string;
  const title = params.title as string;
  const difficulty = params.difficulty as string;
  const description = params.description as string;
  const pseudocode = params.pseudocode as string;
  const mcqAnswers = params.mcqAnswers ? JSON.parse(params.mcqAnswers as string) : [];
  const language = params.language as string || 'javascript';

  // Prefetch the code summary
  const prefetchCodeSummary = async () => {
    try {
      console.log('🔄 Prefetching code summary...');
      console.log('📝 Problem title:', title);
      console.log('📝 Language:', language);
      console.log('📝 MCQ answers count:', mcqAnswers.length);
      
      const response = await apiCall('/api/generate-code-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problemTitle: title,
          problemDescription: description,
          pseudocode: pseudocode,
          language: language,
          mcqAnswers: mcqAnswers
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Code summary prefetched successfully');
      console.log('📊 Summary data keys:', Object.keys(data));
      setPrefetchedSummary(data);
    } catch (error) {
      console.error('❌ Error prefetching code summary:', error);
      setPrefetchError('Failed to generate code summary');
    }
  };

  // Update progress animation when fetchProgress changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: fetchProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [fetchProgress]);

  // Start loading data and progress simulation
  useEffect(() => {
    // Start prefetching immediately
    prefetchCodeSummary();

    // Quick progress to 90% (simulating initial loading)
    const quickProgressSteps = [
      { time: 1200, progress: 20 },
      { time: 2400, progress: 40 },
      { time: 3600, progress: 60 },
      { time: 4800, progress: 80 },
      { time: 6000, progress: 90 },
    ];
    
    quickProgressSteps.forEach(({ time, progress }) => {
      setTimeout(() => setFetchProgress(progress), time);
    });
  }, []);

  // Watch for prefetch completion and complete the loading
  useEffect(() => {
    if (prefetchedSummary || prefetchError) {
      console.log('🎯 Prefetch completed, completing loading...');
      // Jump to 100% and navigate after a short delay
      setTimeout(() => {
        setFetchProgress(100);
        setTimeout(() => {
          console.log('🚀 Navigating to codeSummary with prefetched data');
          router.replace({
            pathname: '/screens/codeSummary',
            params: { 
              ...params,
              preGeneratedSummary: prefetchedSummary ? JSON.stringify(prefetchedSummary) : undefined,
              prefetchError: prefetchError || undefined
            }
          });
        }, 500); // Small delay to show 100%
      }, 300);
    }
  }, [prefetchedSummary, prefetchError]);

  // Start animations
  useEffect(() => {
    if (animationsStarted.current) return;
    animationsStarted.current = true;
    Animated.timing(birdScaleAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(birdFloatAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(birdFloatAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(birdFloatAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        Animated.timing(birdFloatAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ])
    );
    floatingAnimation.start();
    Animated.timing(captionFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    return () => floatingAnimation.stop();
  }, []);

  useEffect(() => {
    if (fetchProgress >= 100 && !birdFlightStarted) {
      setBirdFlightStarted(true);
      Animated.timing(birdFlyAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [fetchProgress, birdFlightStarted]);

  // Interpolate animations
  const birdFloatTranslateY = birdFloatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const birdScale = birdScaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const birdFlyTranslateY = birdFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -height] });
  const birdFlyScale = birdFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.1] });
  const birdFlyOpacity = birdFlyAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.8, 0] });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={styles.gradient}>
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
          <View style={styles.titleContainer}>
            <Text style={styles.appName}>{appName}</Text>
          </View>
          {/* Caption */}
          <Animated.Text style={[styles.caption, { opacity: captionFadeAnim }]}>
            {caption}
          </Animated.Text>
          {/* Progress Bar */}
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
    alignItems: 'center',
    justifyContent: 'center',
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
  birdIcon: {
    width: 150,
    height: 150,
    tintColor: '#8B5CF6',
  },
  titleContainer: {
    marginBottom: 15,
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