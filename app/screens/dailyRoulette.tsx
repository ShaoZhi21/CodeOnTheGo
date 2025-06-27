import { ThemedText } from '@/components/ThemedText';
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
  
  // Animation values
  const spinAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.3)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const particleAnimations = useRef(
    Array.from({ length: 8 }, () => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    startAnimation();
  }, []);

  const startAnimation = () => {
    // Phase 1: Loading and entrance
    setPhase('loading');
    
    Animated.parallel([
      Animated.spring(scaleAnimation, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Phase 2: Start spinning after 1 second
      setTimeout(() => {
        setPhase('spinning');
        startSpinning();
      }, 1000);
    });
  };

  const startSpinning = () => {
    // Create continuous spinning animation
    const spin = () => {
      spinAnimation.setValue(0);
      Animated.timing(spinAnimation, {
        toValue: 1,
        duration: 100, // Fast spin
        useNativeDriver: true,
      }).start(() => {
        if (phase === 'spinning') {
          spin(); // Continue spinning
        }
      });
    };
    
    spin();
    
    // Stop spinning after 3 seconds and reveal
    setTimeout(() => {
      setPhase('revealing');
      const finalNumber = parseInt(problemId || '1');
      setRevealedNumber(finalNumber);
      revealNumber(finalNumber);
    }, 3000);
  };

  const revealNumber = (number: number) => {
    // Stop spinning and show final number
    Animated.parallel([
      Animated.spring(scaleAnimation, {
        toValue: 1.2,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnimation, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Trigger particle explosion
    triggerParticleExplosion();
    
    // Set to revealed phase after 2 seconds
    setTimeout(() => {
      setPhase('revealed');
    }, 2000);
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
    router.push(`/screens/question?id=${problemId}&title=${encodeURIComponent(title || '')}&isDaily=true`);
  };

  const getSpinValue = () => {
    if (phase === 'spinning') {
      return spinAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      });
    }
    return '0deg';
  };

  const getDisplayNumber = () => {
    if (phase === 'spinning') {
      // Show random numbers while spinning
      return Math.floor(Math.random() * 9999) + 1;
    }
    return revealedNumber || parseInt(problemId || '1');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        <View style={styles.gradientOverlay} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Daily Challenge</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          {phase === 'loading' && 'Preparing your challenge...'}
          {phase === 'spinning' && 'Finding your question...'}
          {phase === 'revealing' && 'Challenge found!'}
          {phase === 'revealed' && 'Ready to solve!'}
        </ThemedText>
      </View>

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
                { rotate: getSpinValue() },
              ],
            },
          ]}
        >
          {/* Inner Circle */}
          <View style={styles.innerCircle}>
            <ThemedText style={styles.numberText}>
              {getDisplayNumber()}
            </ThemedText>
          </View>
          
          {/* Outer Ring Decorations */}
          {Array.from({ length: 12 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.ringDot,
                {
                  transform: [
                    { rotate: `${index * 30}deg` },
                    { translateY: -80 },
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
              {decodeURIComponent(title || 'Daily Challenge')}
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
              {phase === 'loading' && 'Initializing challenge...'}
              {phase === 'spinning' && 'Spinning the wheel...'}
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
    backgroundColor: '#0A0A0F',
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
    backgroundColor: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    paddingTop: 20,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#B0B0B0',
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
    backgroundColor: '#1F1F2E',
    borderWidth: 8,
    borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  innerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  numberText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
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
    color: '#FFFFFF',
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
    color: '#B0B0B0',
    marginTop: 16,
    textAlign: 'center',
  },
}); 