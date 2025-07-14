import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Animated, Dimensions, Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { useStreak } from '../../contexts/StreakContext';

const { width, height } = Dimensions.get('window');

export default function StreakAnimationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentStreakCount, hideStreakAnimation } = useStreak();
  
  // Hardcoded streak messages
  const getStreakMessage = (streakCount: number) => {
    if (streakCount === 1) {
      return "Streak Started!";
    }
    
    const messages = [
      "Keep it up!",
      "You're on fire!",
      "Amazing progress!",
      "Unstoppable!",
      "Incredible streak!",
      "You're crushing it!",
      "Consistency wins!",
      "Pure dedication!",
      "Legendary streak!",
      "Unbelievable!"
    ];
    
    // Use streak count to cycle through messages, but keep it within bounds
    const messageIndex = (streakCount - 2) % messages.length;
    return messages[messageIndex];
  };
  
  // Animation values
  const birdScale = new Animated.Value(0);
  const birdOpacity = new Animated.Value(0);
  const birdRotate = new Animated.Value(0);
  const birdFloat = new Animated.Value(0);
  const birdExplode = new Animated.Value(0);
  const textOpacity = new Animated.Value(0);
  const fireScale = new Animated.Value(0);
  const fireOpacity = new Animated.Value(0);
  
  // Confetti animations - More confetti pieces
  const confettiPieces = Array.from({ length: 15 }, () => new Animated.Value(0));
  
  // Fire sparks animations - More sparks
  const fireSparks = Array.from({ length: 20 }, () => new Animated.Value(0));

  useEffect(() => {
    // Start animations
    Animated.sequence([
      // Bird appears with scale, opacity, rotation, and floating
      Animated.parallel([
        Animated.timing(birdScale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(birdOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(birdRotate, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(birdFloat, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
      // Bird explodes/disappears and fire appears with overlap, confetti appears
      Animated.parallel([
        // Bird explodes/disappears
        Animated.timing(birdExplode, {
          toValue: 1,
          duration: 600, // Smoother explosion
          useNativeDriver: true,
        }),
        Animated.timing(birdOpacity, {
          toValue: 0,
          duration: 500, // Smoother fade out
          delay: 200, // Start fading out after 0.2s
          useNativeDriver: true,
        }),
        Animated.timing(birdScale, {
          toValue: 1.5,
          duration: 500, // Smoother scale
          delay: 200, // Start scaling after 0.2s
          useNativeDriver: true,
        }),
        // Fire appears 0.2s before bird is fully gone
        Animated.timing(fireScale, {
          toValue: 1,
          duration: 600, // Smoother scale in
          useNativeDriver: true,
        }),
        Animated.timing(fireOpacity, {
          toValue: 1,
          duration: 500, // Smoother fade in
          useNativeDriver: true,
        }),
        // Confetti appears 1.5s earlier
        ...confettiPieces.map(confetti => 
          Animated.timing(confetti, {
            toValue: 1,
            duration: 1500, // Smoother confetti animation
            delay: -1500, // Start 1.5s earlier
            useNativeDriver: true,
          })
        ),
      ]),
      // Fire sparks explosion
      Animated.parallel(
        fireSparks.map(spark => 
          Animated.timing(spark, {
            toValue: 1,
            duration: 1200, // Smoother spark animation
            delay: -1000, // Start 1s earlier
            useNativeDriver: true,
          })
        )
      ),
      // Text appears
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-navigate after 6 seconds
    const timer = setTimeout(() => {
      hideStreakAnimation();
      
      // Check if this was triggered from the Test Streak button on index.tsx
      if (params.source === 'index' && params.isTestStreak === 'true') {
        router.replace('/(tabs)');
        return;
      }

      // Original navigation logic for all other cases
      const fromPseudocode = params.fromPseudocode === 'true';
      
      router.replace({
        pathname: fromPseudocode ? './PseudocodeComplete' : './QuizComplete',
        params: {
          problemTitle: params.problemTitle as string || '',
          problemId: params.problemId as string || '',
          topicName: params.topicName as string || '',
          quizData: params.quizData as string || '',
          difficulty: params.difficulty as string || '',
          description: params.description as string || '',
          code: params.code as string || '', // Pass the code for redoing
          fromPseudocode: 'true',
          source: params.source as string || 'allquestions' // Pass through the source parameter
        }
      });
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  // Create floating animation
  const floatingAnimation = birdFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  // Create rotation animation
  const rotationAnimation = birdRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Confetti animations
  const confettiAnimations = confettiPieces.map((anim, index) => ({
    translateX: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, (index % 2 === 0 ? 1 : -1) * (80 + Math.random() * 120)],
    }),
    translateY: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -200 - Math.random() * 150],
    }),
    rotate: anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${360 + Math.random() * 720}deg`],
    }),
    opacity: anim.interpolate({
      inputRange: [0, 0.3, 0.8, 1],
      outputRange: [0, 1, 1, 0],
    }),
    scale: anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0.8],
    }),
  }));

  // Fire sparks animations - More varied patterns
  const fireSparkAnimations = fireSparks.map((spark, index) => ({
    translateX: spark.interpolate({
      inputRange: [0, 1],
      outputRange: [0, Math.cos((index * 18) * Math.PI / 180) * (80 + Math.random() * 60)],
    }),
    translateY: spark.interpolate({
      inputRange: [0, 1],
      outputRange: [-80, Math.sin((index * 18) * Math.PI / 180) * (80 + Math.random() * 60) - 80], // Start higher and move up more
    }),
    opacity: spark.interpolate({
      inputRange: [0, 0.3, 0.7, 1],
      outputRange: [0, 1, 1, 0],
    }),
    scale: spark.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0.3],
    }),
  }));

  return (
    <View style={styles.container}>
      {/* Single centered container for both bird and fire */}
      <View style={styles.centeredContainer}>
        {/* Bird */}
        <Animated.View 
          style={[
            styles.birdContainer,
            {
              opacity: birdOpacity,
              transform: [
                { scale: birdScale },
                { translateY: floatingAnimation },
                { rotate: rotationAnimation }
              ],
            }
          ]}
        >
          <Image 
            source={require('../../assets/images/icons/codeonthego-bird-icon.png')}
            style={styles.birdIcon}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Fire emoji that appears after explosion */}
        <Animated.View
          style={[
            styles.fireContainer,
            {
              opacity: fireOpacity,
              transform: [{ scale: fireScale }],
            },
          ]}
        >
          <ThemedText style={styles.fireEmoji}>🔥</ThemedText>
        </Animated.View>

        {/* Confetti pieces */}
        {confettiAnimations.map((confetti, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                transform: [
                  { translateX: confetti.translateX },
                  { translateY: confetti.translateY },
                  { rotate: confetti.rotate },
                  { scale: confetti.scale },
                ],
                opacity: confetti.opacity,
              },
            ]}
          />
        ))}

        {/* Fire sparks */}
        {fireSparkAnimations.map((spark, index) => (
          <Animated.View
            key={index}
            style={[
              styles.fireSpark,
              {
                transform: [
                  { translateX: spark.translateX },
                  { translateY: spark.translateY },
                  { scale: spark.scale },
                ],
                opacity: spark.opacity,
              },
            ]}
          />
        ))}

        {/* Streak text */}
        <Animated.View 
          style={[
            styles.textContainer,
            { opacity: textOpacity }
          ]}
        >
          <ThemedText style={styles.streakTitle}>{getStreakMessage(currentStreakCount)}</ThemedText>
          <ThemedText style={styles.dayText}>
            Day {currentStreakCount}
          </ThemedText>
          <ThemedText style={styles.streakSubtitle}>
            of your coding journey
          </ThemedText>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  birdContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 180,
    height: 180,
    top: height * 0.3,
    zIndex: 2,
  },
  birdIcon: {
    width: 180,
    height: 180,
  },
  fireContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 180,
    height: 180,
    top: height * 0.28,
    zIndex: 1,
  },
  fireEmoji: {
    fontSize: 140,
    lineHeight: 180,
  },
  fireSpark: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  confetti: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#A855F7',
    borderRadius: 3,
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    top: height * 0.55,
    paddingHorizontal: 20,
    height: 300,
  },
  streakTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#7C3AED',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(124, 58, 237, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    paddingVertical: 10,
    lineHeight: 40,
  },
  dayText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 8,
    paddingVertical: 10,
    lineHeight: 60,
  },
  streakSubtitle: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    paddingVertical: 5,
  },
}); 