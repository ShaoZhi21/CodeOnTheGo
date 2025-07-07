import { TopicService } from '@/lib/services/topicService';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function LoadingRoadMap() {
  const params = useLocalSearchParams();
  const { topicName, from } = params;
  
  const [fetchProgress, setFetchProgress] = useState(0);
  const [birdFlightStarted, setBirdFlightStarted] = useState(false);
  const animationsStarted = useRef(false);
  
  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const birdFloatAnim = useRef(new Animated.Value(0)).current;
  const birdScaleAnim = useRef(new Animated.Value(0)).current;
  const birdFlyAnim = useRef(new Animated.Value(0)).current;
  const captionFadeAnim = useRef(new Animated.Value(0)).current;

  const appName = 'CodeOnTheGo';
  const caption = 'Building your learning roadmap...';

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
    console.log('🔄 Starting fetch progress simulation...');
    
    // Start actual data loading
    loadRoadmapData();
    
    // Simulate realistic fetch progress with 2-second total duration
    const progressSteps = [
      { time: 200, progress: 15 },   // Initial connection
      { time: 400, progress: 30 },   // Database query/API call
      { time: 600, progress: 45 },   // Data processing
      { time: 800, progress: 60 },   // Content processing
      { time: 1000, progress: 75 },  // Final processing
      { time: 1200, progress: 85 },  // Storage
      { time: 1400, progress: 90 },  // Almost done
      { time: 1600, progress: 95 },  // 95% - Bird should fly!
      { time: 2000, progress: 100 }, // Complete
    ];

    progressSteps.forEach(({ time, progress }) => {
      setTimeout(() => {
        console.log(`📊 Fetch progress: ${progress}%`);
        setFetchProgress(progress);
      }, time);
    });
  }, []);

  const loadRoadmapData = async () => {
    try {
      // Get user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        router.replace('/login');
        return;
      }

      // Fetch topic problems
      const problems = await TopicService.getTopicProblems(topicName as string);
      
      // Get user progress for these problems
      const { data: progressData } = await supabase
        .from('user_problem_progress')
        .select('problem_id, is_solved')
        .eq('user_id', user.id)
        .in('problem_id', problems.map(p => p.leetcode_id));

      // Calculate completion percentage
      const completedProblems = progressData?.filter(p => p.is_solved) || [];
      const totalProblems = problems.length;
      const percentage = totalProblems > 0 
        ? Math.round((completedProblems.length / totalProblems) * 100)
        : 0;

      // Prepare data for roadmap screen
      const roadmapData = {
        problems,
        progress: {
          completed: completedProblems.length,
          total: totalProblems,
          percentage
        }
      };

      // Wait for animations to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Navigate to roadmap screen with pre-fetched data
      router.replace({
        pathname: '/screens/roadmaptopic',
        params: {
          topic: topicName,
          preFetchedData: JSON.stringify(roadmapData),
          from: from
        }
      });

    } catch (error) {
      console.error('Error loading roadmap data:', error);
      // For errors, still wait for animations
      await new Promise(resolve => setTimeout(resolve, 3000));
      // Navigate to roadmap screen without pre-fetched data
      router.replace({
        pathname: '/screens/roadmaptopic',
        params: {
          topic: topicName,
          from: from
        }
      });
    }
  };

  // Start animations
  useEffect(() => {
    if (animationsStarted.current) return;
    animationsStarted.current = true;
    
    console.log('🔄 LoadingRoadMap: Starting animations...');

    // Bird scale in
    Animated.timing(birdScaleAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Bird floating loop - MORE BOUNCES and LONGER HOVER
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
    if (fetchProgress >= 95 && !birdFlightStarted) {
      console.log('🦅 95% progress reached! Bird starting to fly away...');
      setBirdFlightStarted(true);

      Animated.timing(birdFlyAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [fetchProgress, birdFlightStarted]);

  // Interpolate animations
  const birdFloatTranslateY = birdFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30], // Slightly reduced bounce height for smoother feel
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