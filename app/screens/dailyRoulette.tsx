import { ThemedText } from '@/components/ThemedText';
import { ProfileService } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';
import type { UserProfileStats } from '@/lib/types/profile';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function DailyRouletteScreen() {
  const { problemId, title } = useLocalSearchParams<{ problemId: string; title: string }>();
  
  const [phase, setPhase] = useState<'loading' | 'spinning' | 'revealing' | 'revealed'>('loading');
  const [revealedNumber, setRevealedNumber] = useState<number | null>(null);
  const [currentSpinNumber, setCurrentSpinNumber] = useState<number>(1);
  const [profile, setProfile] = useState<UserProfileStats | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<{id: number, title: string} | null>(null);
  
  // Animation values
  const spinAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.3)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const numberScaleAnimation = useRef(new Animated.Value(1)).current;
  const particleAnimations = useRef(
    Array.from({ length: 8 }, () => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    loadProfile();
  }, []);

  // Start animation after profile and problem are loaded
  useEffect(() => {
    if (profile && selectedProblem) {
      startAnimation();
    }
  }, [profile, selectedProblem]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profileData = await ProfileService.getUserProfileStats(user.id);
      setProfile(profileData);
      
      // Select appropriate problem based on skill level
      if (profileData) {
        await selectProblemBySkillLevel(profileData.skill_level);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const selectProblemBySkillLevel = async (skillLevel: string) => {
    try {
      let difficultyFilter: string[] = [];
      
      switch (skillLevel) {
        case 'Beginner':
          difficultyFilter = ['Easy'];
          break;
        case 'Intermediate':
          difficultyFilter = ['Easy', 'Medium'];
          break;
        case 'Advanced':
        default:
          difficultyFilter = ['Easy', 'Medium', 'Hard'];
          break;
      }

      // Get problems matching the difficulty filter
      const { data: problems } = await supabase
        .from('leetcode_problems')
        .select('leetcode_id, title, difficulty')
        .in('difficulty', difficultyFilter)
        .eq('is_premium', false); // Only free problems

      if (problems && problems.length > 0) {
        // Select random problem from filtered list
        const randomIndex = Math.floor(Math.random() * problems.length);
        const randomProblem = problems[randomIndex];
        
        setSelectedProblem({
          id: randomProblem.leetcode_id,
          title: randomProblem.title
        });
      } else {
        // Fallback to provided problem
        setSelectedProblem({
          id: parseInt(problemId || '1'),
          title: decodeURIComponent(title || 'Daily Challenge')
        });
      }
    } catch (error) {
      console.error('Error selecting problem by skill level:', error);
      // Fallback to provided problem
      setSelectedProblem({
        id: parseInt(problemId || '1'),
        title: decodeURIComponent(title || 'Daily Challenge')
      });
    }
  };

  const startAnimation = () => {
    // Set initial values and show the wheel
    scaleAnimation.setValue(1);
    fadeAnimation.setValue(1);
    
    // Wait 2 seconds before starting the spin
    setTimeout(() => {
      setPhase('spinning');
      startSpinning();
    }, 2000);
  };

  const startSpinning = () => {
    const finalNumber = selectedProblem?.id || parseInt(problemId || '1');
    
    // Create more realistic roulette-like number progression
    let currentNumber = 1; // Start from 1
    let interval = 50; // Start with 50ms intervals (very fast)
    let totalTime = 0;
    const maxTime = 6000; // 6 seconds total spin time for more dramatic effect
    
    // Start a simple continuous spinning animation
    const spinWheel = () => {
      // Reset animation value
      spinAnimation.setValue(0);
      
      // Create a simple loop animation
      const animate = () => {
        Animated.timing(spinAnimation, {
          toValue: 1,
          duration: 800, // Slower for visibility
          useNativeDriver: true,
        }).start(() => {
          if (phase === 'spinning') {
            spinAnimation.setValue(0);
            animate();
          }
        });
      };
      
      animate();
    };
    
    // Create a more realistic number progression pattern
    const updateNumber = () => {
      if (phase !== 'spinning' || totalTime >= maxTime) {
        // Stop spinning and reveal final number
        setPhase('revealing');
        setRevealedNumber(finalNumber);
        setCurrentSpinNumber(finalNumber);
        revealNumber(finalNumber);
        return;
      }
      
      // Calculate progress (0 to 1)
      const progress = totalTime / maxTime;
      
      // Create smooth deceleration curve (more dramatic than before)
      const easeOut = 1 - Math.pow(1 - progress, 4); // Quartic ease-out for more dramatic slowdown
      
      // Slow down the interval as we progress (stronger deceleration)
      interval = 50 + (easeOut * 800); // From 50ms to 850ms
      
      // Update the displayed number with realistic roulette-like progression
      if (progress < 0.6) {
        // First 60%: Fast random-like progression with some jumps
        const randomRange = Math.max(5, Math.floor(80 * (1 - progress)));
        const jumpChance = 0.1 + (progress * 0.2); // Increase chance of jumps over time
        
        if (Math.random() < jumpChance) {
          // Occasionally make bigger jumps to simulate roulette randomness
          currentNumber = Math.max(1, currentNumber + Math.floor(Math.random() * randomRange * 2));
        } else {
          // Normal progression with slight bias towards final number
          const bias = Math.floor((finalNumber - currentNumber) * progress * 0.1);
          currentNumber = Math.max(1, currentNumber + Math.floor(Math.random() * randomRange) + bias);
        }
      } else if (progress < 0.85) {
        // 60-85%: More controlled approach with occasional overshooting
        const remaining = Math.abs(finalNumber - currentNumber);
        const step = Math.max(1, Math.floor(remaining * 0.4));
        
        if (currentNumber < finalNumber) {
          currentNumber = Math.min(finalNumber + 10, currentNumber + step); // Allow slight overshoot
        } else if (currentNumber > finalNumber) {
          currentNumber = Math.max(finalNumber - 10, currentNumber - step); // Allow slight undershoot
        }
      } else {
        // Final 15%: Oscillate around final number before settling
        const oscillation = Math.sin(progress * 20) * 3; // Create oscillation effect
        currentNumber = finalNumber + Math.floor(oscillation);
        currentNumber = Math.max(1, currentNumber);
        
        // In the very last moments, settle on final number
        if (progress > 0.95) {
          currentNumber = finalNumber;
        }
      }
      
      setCurrentSpinNumber(currentNumber);
      totalTime += interval;
      
      // Add subtle scale animation to number when it changes
      Animated.sequence([
        Animated.timing(numberScaleAnimation, {
          toValue: 1.1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(numberScaleAnimation, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
      
      setTimeout(updateNumber, interval);
    };
    
    // Start both the spinning animation and number updates
    spinWheel();
    updateNumber();
  };

  const revealNumber = (number: number) => {
    // Stop spinning and show final number with enhanced animation
    Animated.parallel([
      Animated.spring(scaleAnimation, {
        toValue: 1.3,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(numberScaleAnimation, {
          toValue: 1.4,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(numberScaleAnimation, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnimation, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnimation, {
            toValue: 0.2,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Trigger particle explosion
    triggerParticleExplosion();
    
    // Set to revealed phase after 2.5 seconds for more dramatic effect
    setTimeout(() => {
      setPhase('revealed');
    }, 2500);
  };

  const triggerParticleExplosion = () => {
    particleAnimations.forEach((particle, index) => {
      const angle = (index * 45) * (Math.PI / 180); // 45 degrees apart
      const distance = 100;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;

      Animated.parallel([
        Animated.timing(particle.opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(particle.translateX, {
          toValue: targetX,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.translateY, {
          toValue: targetY,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Fade out particles
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    });
  };

  const handleContinue = () => {
    const finalProblemId = selectedProblem?.id || problemId;
    const finalTitle = selectedProblem?.title || title || 'Daily Challenge';
    router.push(`/screens/question?id=${finalProblemId}&title=${encodeURIComponent(finalTitle)}&isDaily=true`);
  };

  const handleBack = () => {
    router.replace('/(tabs)');
  };



  const getDisplayNumber = () => {
    if (phase === 'loading') {
      return '?';
    }
    if (phase === 'spinning') {
      return currentSpinNumber;
    }
    if (phase === 'revealing' || phase === 'revealed') {
      return revealedNumber;
    }
    return '?';
  };

  const getNumberStyle = () => {
    if (phase === 'spinning') {
      return [
        styles.numberText,
        {
          transform: [{ scale: numberScaleAnimation }],
        }
      ];
    }
    return styles.numberText;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        <View style={styles.gradientOverlay} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Image 
            source={require('@/assets/images/icons/back-icon.png')} 
            style={styles.backIcon}
          />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>Daily Challenge</ThemedText>
                  <ThemedText style={styles.headerSubtitle}>
          {phase === 'loading' && 'Loading...'}
          {phase === 'spinning' && 'Spinning the roulette...'}
          {phase === 'revealing' && 'Challenge found!'}
          {phase === 'revealed' && 'Ready to solve!'}
        </ThemedText>
        </View>
      </View>

      {/* Streak Section */}
      {profile && (
        <View style={styles.streakSection}>
          <View style={styles.streakCard}>
            <View style={styles.streakIconContainer}>
              <Image 
                source={require('@/assets/images/icons/fire-icon.png')} 
                style={styles.streakIcon}
              />
            </View>
            <ThemedText style={styles.streakTitle}>Current Streak</ThemedText>
            <ThemedText style={styles.streakValue}>{profile.current_streak} days</ThemedText>
          </View>
        </View>
      )}

      {/* Main Roulette Container */}
      <View style={styles.rouletteContainer}>
        {/* Outer Glow Ring */}
        <Animated.View 
          style={[
            styles.glowRing,
            {
              opacity: glowAnimation,
              transform: [{ scale: scaleAnimation }],
            }
          ]}
        />
        
        {/* Main Roulette Wheel */}
        <Animated.View
          style={[
            styles.rouletteWheel,
            {
              opacity: fadeAnimation,
              transform: [
                { scale: scaleAnimation },
                { 
                  rotate: phase === 'spinning' 
                    ? spinAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      })
                    : '0deg'
                },
              ],
            },
          ]}
        >
          {/* Inner Circle */}
          <View style={styles.innerCircle}>
            <ThemedText style={getNumberStyle()}>
              {getDisplayNumber()}
            </ThemedText>
          </View>
          
          {/* Outer Ring Decorations - Enhanced for more realistic look */}
          {Array.from({ length: 24 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.ringDot,
                {
                  transform: [
                    { rotate: `${index * 15}deg` },
                    { translateY: -85 },
                  ],
                },
              ]}
            />
          ))}
          
          {/* Additional decorative elements for more realistic roulette look */}
          {Array.from({ length: 8 }).map((_, index) => (
            <View
              key={`segment-${index}`}
              style={[
                styles.wheelSegment,
                {
                  transform: [
                    { rotate: `${index * 45}deg` },
                    { translateY: -70 },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>
        


        {/* Particles */}
        {particleAnimations.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                opacity: particle.opacity,
                transform: [
                  { translateX: particle.translateX },
                  { translateY: particle.translateY },
                  { scale: particle.scale },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {phase === 'revealed' && (
          <Animated.View style={[styles.actionContainer, { opacity: fadeAnimation }]}>
            <ThemedText style={styles.problemTitle} numberOfLines={2}>
              {selectedProblem?.title || decodeURIComponent(title || 'Daily Challenge')}
            </ThemedText>
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <ThemedText style={styles.continueButtonText}>Start Challenge</ThemedText>
              <Image 
                source={require('@/assets/images/icons/up-arrow.png')} 
                style={styles.arrowIcon}
              />
            </TouchableOpacity>
          </Animated.View>
        )}
        
        {phase !== 'revealed' && (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <ThemedText style={styles.loadingText}>
              {phase === 'loading' && 'Loading...'}
              {phase === 'spinning' && 'Watch the numbers spin...'}
              {phase === 'revealing' && 'Revealing your challenge...'}
            </ThemedText>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 8,
    paddingTop: 20,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  rouletteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  rouletteWheel: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#FFFFFF',
    borderWidth: 8,
    borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  innerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  numberText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    paddingTop: 10,
  },
  ringDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  wheelSegment: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E8E6FF',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: 120,
  },
  actionContainer: {
    alignItems: 'center',
  },
  problemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  arrowIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
    transform: [{ rotate: '90deg' }],
  },
  loadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  headerContent: {
    alignItems: 'center',
  },
  streakSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  streakCard: {
    backgroundColor: '#F3F0FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  streakIconContainer: {
    marginRight: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 8,
  },
  streakIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  streakValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
}); 