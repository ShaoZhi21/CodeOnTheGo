import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Purple, Neutral } from '../../constants/Colors';

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {/* Completion Header */}
        <View style={styles.completionSection}>
          <View style={styles.iconCircle}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.completionTitle}>Quiz Complete</Text>
          <Text style={styles.completionSubtitle}>You've completed the quiz for</Text>
        </View>

        {/* Problem Title Card */}
        <View style={styles.problemCard}>
          <Text style={styles.problemTitle}>{problemTitle || 'Unknown Problem'}</Text>
        </View>

        {/* Success Message */}
        <View style={styles.successSection}>
          <Text style={styles.successText}>
            Great job! You've mastered this concept and are one step closer to becoming a coding expert.
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
    backgroundColor: Neutral.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  completionSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Purple.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Purple.primary,
  },
  checkmark: {
    fontSize: 40,
    color: Purple.primary,
    fontWeight: '700',
  },
  completionTitle: {
    color: Neutral.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  completionSubtitle: {
    color: Neutral.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  problemCard: {
    backgroundColor: Neutral.white,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Neutral.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    minWidth: 280,
    maxWidth: '90%',
  },
  problemTitle: {
    color: Purple.primary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
  successSection: {
    paddingHorizontal: 20,
    maxWidth: 400,
  },
  successText: {
    color: Neutral.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  continueButton: {
    backgroundColor: Purple.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Purple.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: Neutral.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
