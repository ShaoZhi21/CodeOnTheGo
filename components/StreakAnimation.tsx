import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';

const { width, height } = Dimensions.get('window');

interface StreakAnimationProps {
  visible: boolean;
  onComplete?: () => void;
  streakCount?: number;
}

export default function StreakAnimation({ visible, onComplete, streakCount = 1 }: StreakAnimationProps) {
  // Animation values
  const flameScale = useRef(new Animated.Value(0)).current;
  const flameOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textBounce = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  
  // Particle animations (8 particles in a circle)
  const particleAnimations = useRef(
    Array.from({ length: 8 }, () => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0),
      rotation: new Animated.Value(0),
    }))
  ).current;

  const flameFlicker = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      startAnimation();
    } else {
      resetAnimation();
    }
  }, [visible]);

  const startAnimation = () => {
    // Reset all animations
    resetAnimation();

    // Start the sequence
    Animated.sequence([
      // 1. Fade in container
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      
      // 2. Scale in flame with bounce
      Animated.parallel([
        Animated.spring(flameScale, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(flameOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      
      // 3. Small delay then show text
      Animated.delay(200),
      
      Animated.parallel([
        // Text scale in with overshoot
        Animated.spring(textScale, {
          toValue: 1,
          tension: 80,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Text bounce animation
        Animated.sequence([
          Animated.timing(textBounce, {
            toValue: -10,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(textBounce, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]),
      
      // 4. Trigger particle explosion
      Animated.delay(100),
    ]).start(() => {
      // Start particle explosion and flame flicker
      triggerParticleExplosion();
      startFlameFlicker();
      
      // Hide after total duration
      setTimeout(() => {
        hideAnimation();
      }, 2000);
    });
  };

  const triggerParticleExplosion = () => {
    particleAnimations.forEach((particle, index) => {
      const angle = (index * 45) * (Math.PI / 180); // 45 degrees apart
      const distance = 80;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;

      Animated.parallel([
        // Particle appear
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
        // Particle explosion movement
        Animated.timing(particle.translateX, {
          toValue: targetX,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(particle.translateY, {
          toValue: targetY,
          duration: 800,
          useNativeDriver: true,
        }),
        // Particle rotation
        Animated.timing(particle.rotation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Fade out particles
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    });
  };

  const startFlameFlicker = () => {
    const createFlicker = () => {
      Animated.sequence([
        Animated.timing(flameFlicker, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(flameFlicker, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(flameFlicker, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Continue flickering if still visible
        if (visible) {
          setTimeout(createFlicker, Math.random() * 500 + 200);
        }
      });
    };
    createFlicker();
  };

  const hideAnimation = () => {
    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(flameScale, {
        toValue: 1.2,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(textScale, {
        toValue: 0.8,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  };

  const resetAnimation = () => {
    containerOpacity.setValue(0);
    flameScale.setValue(0);
    flameOpacity.setValue(0);
    textScale.setValue(0);
    textOpacity.setValue(0);
    textBounce.setValue(0);
    flameFlicker.setValue(1);
    
    particleAnimations.forEach(particle => {
      particle.opacity.setValue(0);
      particle.translateX.setValue(0);
      particle.translateY.setValue(0);
      particle.scale.setValue(0);
      particle.rotation.setValue(0);
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View 
        style={[
          styles.animationContainer,
          {
            opacity: containerOpacity,
          }
        ]}
      >
        {/* Flame Icon */}
        <Animated.View
          style={[
            styles.flameContainer,
            {
              opacity: flameOpacity,
              transform: [
                { scale: Animated.multiply(flameScale, flameFlicker) },
              ],
            },
          ]}
        >
          <Image
            source={require('@/assets/images/icons/fire-icon.png')}
            style={styles.flameIcon}
            tintColor="#FF6B35"
          />
        </Animated.View>

        {/* Streak Text */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [
                { scale: textScale },
                { translateY: textBounce },
              ],
            },
          ]}
        >
          <ThemedText style={styles.streakText}>
            +{streakCount} Streak!
          </ThemedText>
          <ThemedText style={styles.congratsText}>
            🎉 Keep it up! 🎉
          </ThemedText>
        </Animated.View>

        {/* Confetti Particles */}
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
                  { 
                    rotate: particle.rotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  },
                ],
              },
            ]}
          >
            <View style={[
              styles.particleDot,
              { backgroundColor: index % 2 === 0 ? '#FF6B35' : '#FFD700' }
            ]} />
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  animationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flameContainer: {
    marginBottom: 20,
  },
  flameIcon: {
    width: 60,
    height: 60,
  },
  textContainer: {
    alignItems: 'center',
  },
  streakText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  congratsText: {
    fontSize: 16,
    color: '#8B5CF6',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  particle: {
    position: 'absolute',
  },
  particleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
}); 