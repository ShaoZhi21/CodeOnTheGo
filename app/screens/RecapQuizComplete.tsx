import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Completion Header */}
        <View style={styles.completionSection}>
          <Text style={styles.completionEmoji}>🎯</Text>
          <Text style={styles.completionTitle}>Great job on the recap!</Text>
        </View>

        {/* Lesson Names Card */}
        <View style={styles.lessonCard}>
          <Text style={styles.lessonTitle}>Recapped: {formatLessonNames()}</Text>
        </View>

        

        {/* Success Message */}
        <View style={styles.successSection}>
          <Text style={styles.successText}>
            Nice work! Good active recall practice here. You&apos;re strengthening your problem-solving skills.
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
    backgroundColor: '#F3E8FF', // Purple background
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
    color: '#7C3AED', // Purple text
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  lessonCard: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#7C3AED', // Purple border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
  },
  lessonTitle: {
    color: '#7C3AED', // Purple text on white background
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  successSection: {
    paddingHorizontal: 20,
  },
  successText: {
    color: '#5B21B6', // Darker purple text
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
    backgroundColor: '#7C3AED', // Purple
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