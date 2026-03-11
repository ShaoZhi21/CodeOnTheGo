import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Purple, Neutral } from '../../constants/Colors';

export default function RecapQuizComplete() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const lessonTitles = params.lessonTitles as string || '';
  const quizData = params.quizData as string || '';

  console.log('RecapQuizComplete params:', { lessonTitles, quizData });

  // Parse lesson titles from comma-separated string
  const lessonTitleArray = lessonTitles ? lessonTitles.split(',').map(title => title.trim()) : [];
  
  // Format lesson names for display
  const formatLessonNames = () => {
    if (lessonTitleArray.length === 0) return 'your recent lessons';
    if (lessonTitleArray.length === 1) return lessonTitleArray[0];
    if (lessonTitleArray.length === 2) return `${lessonTitleArray[0]} and ${lessonTitleArray[1]}`;
    return `${lessonTitleArray[0]}, ${lessonTitleArray[1]}, and ${lessonTitleArray[2]}`;
  };

  const handleComplete = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {/* Completion Header */}
        <View style={styles.completionSection}>
          <View style={styles.iconCircle}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.completionTitle}>Recap Complete</Text>
          <Text style={styles.completionSubtitle}>Great job on the recap!</Text>
        </View>

        {/* Lesson Names Card */}
        <View style={styles.lessonCard}>
          <Text style={styles.lessonLabel}>Recapped</Text>
          <Text style={styles.lessonTitle}>{formatLessonNames()}</Text>
        </View>

        {/* Success Message */}
        <View style={styles.successSection}>
          <Text style={styles.successText}>
            Nice work! Good active recall practice here. You're strengthening your problem-solving skills.
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
  lessonCard: {
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
    alignItems: 'center',
  },
  lessonLabel: {
    color: Neutral.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  lessonTitle: {
    color: Purple.primary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
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
