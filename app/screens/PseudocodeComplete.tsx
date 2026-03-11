import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Purple, Neutral } from '../../constants/Colors';

export default function PseudocodeComplete() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const problemTitle = params.problemTitle as string || '';
  const problemId = params.problemId as string || '';
  const topicName = params.topicName as string || '';
  const difficulty = params.difficulty as string || '';
  const description = params.description as string || '';
  const code = params.code as string || '';
  const source = params.source as 'roadmap' | 'allquestions' || 'allquestions';
  const from = params.from as string || 'roadmap';

  console.log('PseudocodeComplete params:', { 
    problemTitle, 
    problemId, 
    topicName,
    difficulty,
    description,
    codeLength: code.length,
    source
  });

  const handleContinue = () => {
    console.log('PseudocodeComplete handleContinue:', { from, topicName });
    
    if (from === 'roadmap' && topicName) {
      console.log('Navigating back to roadmap with topicName:', topicName);
      router.replace({
        pathname: '/screens/LoadingRoadMap',
        params: { 
          topicName,
          from: 'pseudocomplete'
        }
      });
    } else if (from === 'question') {
      console.log('Navigating back to question');
      router.replace('/screens/question');
    } else {
      console.log('Using fallback navigation to tabs');
      // fallback
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {/* Completion Header */}
        <View style={styles.completionSection}>
          <View style={styles.iconCircle}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.completionTitle}>Pseudocode Complete</Text>
          <Text style={styles.completionSubtitle}>You've completed the pseudocode for</Text>
        </View>

        {/* Problem Title Card */}
        <View style={styles.problemCard}>
          <Text style={styles.problemTitle}>{problemTitle || 'Unknown Problem'}</Text>
        </View>

        {/* Success Message */}
        <View style={styles.successSection}>
          <Text style={styles.successText}>
            Excellent work! Keep building your problem-solving skills!
          </Text>
        </View>
      </View>

      {/* Action Button - Fixed to bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
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
