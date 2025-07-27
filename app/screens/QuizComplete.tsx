import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function QuizComplete() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const problemTitle = params.problemTitle as string || '';
  const problemId = params.problemId as string || '';
  const topicName = params.topicName as string || '';
  const quizData = params.quizData as string || '';

  console.log('QuizComplete params:', { problemTitle, problemId, topicName, quizData });

  const handleComplete = async () => {
    console.log('🎯 handleComplete called with topicName:', topicName);
    console.log('🎯 handleComplete called with problemTitle:', problemTitle);
    console.log('🎯 handleComplete called with problemId:', problemId);
    
    // Note: Lesson completion is already handled in LessonMCQ
    // This screen only handles navigation, no additional database updates needed
    
    console.log('🎯 Navigating to LoadingRoadMap with topicName:', topicName);
    router.replace({
      pathname: '/screens/LoadingRoadMap',
      params: { 
        topicName,
        from: 'quizcomplete'
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Completion Header */}
        <View style={styles.completionSection}>
          <Text style={styles.completionEmoji}>✨</Text>
          <Text style={styles.completionTitle}>You&apos;ve completed the quiz for</Text>
        </View>

        {/* Problem Title Card */}
        <View style={styles.problemCard}>
          <Text style={styles.problemTitle}>{problemTitle || 'Unknown Problem'}</Text>
        </View>

        {/* Success Message */}
        <View style={styles.successSection}>
          <Text style={styles.successText}>
            Great job! You&apos;ve mastered this concept and are one step closer to becoming a coding expert.
          </Text>
        </View>
      </View>

      {/* Action Button - Fixed to bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleComplete}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3E8FF', // More vibrant purple background
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60, // Add top margin
  },
  completionSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  completionEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  completionTitle: {
    color: '#7C3AED', // More vibrant purple text
    fontSize: 22, // Reduced from 28
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28, // Reduced from 36
  },
  problemCard: {
    backgroundColor: 'white', // Changed to white
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#7C3AED', // More vibrant purple border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
  },
  problemTitle: {
    color: '#7C3AED', // More vibrant purple text on white background
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  successSection: {
    paddingHorizontal: 20,
  },
  successText: {
    color: '#5B21B6', // Darker purple text for more color
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40, // Push button to bottom
    paddingTop: 20,
  },
  continueButton: {
    backgroundColor: '#7C3AED', // More vibrant purple
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
}); 