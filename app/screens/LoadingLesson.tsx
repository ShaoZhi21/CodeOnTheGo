import { apiCall } from '@/lib/api-config';
import { ProfileService } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';
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
  const [userSkillLevel, setUserSkillLevel] = useState<string>('Beginner');
  const [personalizedMessage, setPersonalizedMessage] = useState<string>('Generating your personalized lesson...');
  
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

  // Get personalized messages based on skill level
  const getPersonalizedMessages = (skillLevel: string): string[] => {
    switch (skillLevel) {
      case 'Beginner':
        return [
          "🌱 Crafting your beginner-friendly lesson with simple explanations...",
          "🧠 Breaking down complex concepts into bite-sized pieces just for you...",
          "📚 Creating a lesson that speaks your language - no jargon allowed!",
          "🎯 Designing explanations that feel like chatting with a coding buddy...",
          "✨ Making sure every concept is crystal clear and easy to follow...",
          "🚀 Building your personalized learning journey from the ground up!"
        ];
      case 'Intermediate':
        return [
          "⚡ Cooking up an intermediate-level lesson with the right challenge...",
          "🔥 Balancing technical depth with clear explanations just for you...",
          "🎪 Juggling advanced concepts while keeping things engaging...",
          "🏗️ Constructing a lesson that builds on your solid foundation...",
          "🎨 Painting a picture that connects theory with practical insights...",
          "🚁 Taking your knowledge to the next level with strategic depth!"
        ];
      case 'Professional':
        return [
          "🎖️ Forging a professional-grade lesson with advanced insights...",
          "🧪 Distilling complex algorithms into powerful knowledge nuggets...",
          "🎯 Targeting sophisticated concepts that challenge your expertise...",
          "⚙️ Engineering a lesson that respects your advanced skillset...",
          "🔬 Analyzing deep patterns and optimization strategies for you...",
          "🏆 Crafting content worthy of your professional experience!"
        ];
      default:
        return [
          "🌟 Creating your personalized coding lesson...",
          "🎨 Tailoring the perfect learning experience for you...",
          "🚀 Building something amazing just for your skill level..."
        ];
    }
  };

  // Fetch user skill level and set personalized message
  const fetchUserSkillLevel = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userProfile = await ProfileService.getUserProfile(user.id);
        if (userProfile && userProfile.skill_level) {
          setUserSkillLevel(userProfile.skill_level);
          console.log(`User skill level: ${userProfile.skill_level}`);
          
          // Set a random personalized message based on skill level
          const messages = getPersonalizedMessages(userProfile.skill_level);
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          setPersonalizedMessage(randomMessage);
        }
      }
    } catch (error) {
      console.log('Could not fetch user profile, using default message');
      // Keep default values
    }
  }, []);

  // Fetch lesson data
  const fetchLessonData = useCallback(async () => {
    try {
      console.log('🔄 Fetching lesson data...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 User found for lesson generation:', !!user);
      
      const response = await apiCall('/api/generate-topic-lesson', {
        method: 'POST',
        body: JSON.stringify({
          problemId: questionId,
          questionTitle: questionTitle,
          questionDescription: questionDescription,
          topicName: topicName,
          difficulty: questionDifficulty,
          userId: user?.id,
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
    
    // Fetch user skill level first
    fetchUserSkillLevel();
    
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
  }, [fetchLessonData, fetchUserSkillLevel]);

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
    if (fetchProgress >= 100 && !birdFlightStarted) {
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
            {fetchProgress < 50 
              ? "Generating your lesson..." 
              : fetchProgress < 90 
                ? "Just a little more to go..." 
                : "Be patient! We're almost done..."
            }
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

        {/* Bottom Section with Skill Level and Personalized Message */}
        <View style={styles.bottomSection}>
          {/* Skill Level Badge */}
          <View style={styles.skillLevelContainer}>
            <View style={styles.skillLevelBadge}>
              <Text style={styles.skillLevelBadgeText}>{userSkillLevel}</Text>
              <View style={styles.skillLevelDecoration} />
            </View>
          </View>

          <Animated.View
            style={[
              styles.personalizedMessageContainer,
              {
                opacity: captionFadeAnim,
              },
            ]}
          >
            <Text style={styles.personalizedMessage}>
              {personalizedMessage}
            </Text>
          </Animated.View>
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
    color: '#000000',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    fontWeight: '500',
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
  bottomSection: {
    position: 'absolute',
    bottom: 70,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'space-evenly',
    height: 120,
  },
  skillLevelContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  skillLevelBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  skillLevelBadgeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  skillLevelDecoration: {
    position: 'absolute',
    right: -3,
    top: '50%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    transform: [{ translateY: -3 }],
  },
  personalizedMessageContainer: {
    backgroundColor: '#F0E6FF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 25,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  personalizedMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
}); 