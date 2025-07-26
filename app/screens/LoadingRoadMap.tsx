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
  
  console.log('🎯 LoadingRoadMap: Received params:', { topicName, from });
  console.log('🎯 LoadingRoadMap: topicName type:', typeof topicName);
  console.log('🎯 LoadingRoadMap: topicName value:', topicName);
  
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
    
    // Simulate realistic fetch progress with 1-second total duration
    const progressSteps = [
      { time: 200, progress: 30 },   // Initial connection
      { time: 400, progress: 60 },   // Database query/API call
      { time: 600, progress: 85 },   // Data processing
      { time: 800, progress: 95 },   // Content processing
      { time: 1000, progress: 100 }, // Complete
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
      console.log('🎯 LoadingRoadMap: loadRoadmapData called with topicName:', topicName);
      // Get user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        router.replace('/login');
        return;
      }

      // Get topic stats directly from the view
      const { data: topicStatsData, error: statsError } = await supabase
        .from('topic_stats')
        .select('*')
        .eq('topic_name', topicName)
        .eq('user_id', user.id)
        .single();

      if (statsError) {
        console.error('Error fetching topic stats:', statsError);
        return;
      }

      console.log('Topic stats from view:', topicStatsData);

      // Fetch topic problems
      console.log('🎯 LoadingRoadMap: Fetching problems for topic:', topicName);
      const problems = await TopicService.getTopicProblems(topicName as string);
      console.log('🎯 LoadingRoadMap: Problems fetched:', problems?.length || 0, 'problems');
      console.log('🎯 LoadingRoadMap: First problem:', problems?.[0]);
      
      // Get user progress for these problems
      const { data: progressData } = await supabase
        .from('user_problem_progress')
        .select('problem_id, is_solved, stars')
        .eq('user_id', user.id)
        .in('problem_id', problems.map(p => p.leetcode_id));

      console.log('🎯 LoadingRoadMap: Progress data:', progressData);

      // Get lesson completion data
      const { data: lessonData } = await supabase
        .from('user_lesson_completion')
        .select('problem_id, quiz_completed')
        .eq('user_id', user.id)
        .in('problem_id', problems.map(p => p.leetcode_id));

      console.log('🎯 LoadingRoadMap: Lesson completion data:', lessonData);

      // Create progress map with correct stars calculation
      const progressMap: Record<number, { problem_id: number; completed: boolean; stars: number }> = {};
      const lessonProgressMap: Record<number, boolean> = {};
      
      // First, create lesson progress map
      lessonData?.forEach(lesson => {
        if (lesson.problem_id) {
          lessonProgressMap[lesson.problem_id] = lesson.quiz_completed || false;
        }
      });
      
      // Then, create progress map with correct stars logic
      progressData?.forEach(p => {
        const hasCompletedLesson = lessonProgressMap[p.problem_id] || false;
        const hasCompletedPseudocode = p.is_solved;
        const isFullyCompleted = hasCompletedLesson && hasCompletedPseudocode;
        
        // Only show stars if both lesson and pseudocode are completed
        const stars = isFullyCompleted ? (p.stars || 0) : 0;
        
        progressMap[p.problem_id] = {
          problem_id: p.problem_id,
          completed: isFullyCompleted,
          stars: stars
        };
      });

      // Update problems with correct stars
      const problemsWithStars = problems.map(problem => {
        const progress = progressMap[problem.leetcode_id];
        const hasCompletedLesson = lessonProgressMap[problem.leetcode_id] || false;
        const hasCompletedPseudocode = progress?.completed || false;
        
        console.log(`🎯 LoadingRoadMap: Problem ${problem.leetcode_id} (${problem.title}):`, {
          lessonCompleted: hasCompletedLesson,
          pseudocodeCompleted: hasCompletedPseudocode,
          fullyCompleted: hasCompletedLesson && hasCompletedPseudocode,
          stars: progress?.stars || 0
        });
        
        return {
          ...problem,
          stars: progress?.stars || 0,
          completed: progress?.completed || false
        };
      });

      // Prepare data for roadmap screen
      const roadmapData = {
        problems: problemsWithStars,
        progress: progressMap,
        stats: {
          total_problems: topicStatsData.total_problems,
          completed_problems: topicStatsData.completed_problems,
          total_stars: topicStatsData.total_stars,
          percentage: topicStatsData.completion_percentage
        },
        lessonProgress: lessonData?.reduce((acc: Record<number, boolean>, lesson) => {
          if (lesson.problem_id) {
            acc[lesson.problem_id] = lesson.quiz_completed || false;
          }
          return acc;
        }, {})
      };

      // Wait for animations to complete (including bird flight animation)
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🎯 LoadingRoadMap: Navigating to roadmaptopic with data');
      console.log('🎯 LoadingRoadMap: from parameter:', from);
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('🎯 LoadingRoadMap: Error occurred, navigating without data');
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