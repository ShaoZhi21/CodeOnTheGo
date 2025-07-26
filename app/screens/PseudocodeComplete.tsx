import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Completion Header */}
        <View style={styles.completionSection}>
          <Text style={styles.completionEmoji}>✨</Text>
          <Text style={styles.completionTitle}>You&apos;ve completed the pseudocode for</Text>
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
    backgroundColor: '#F3E8FF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
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
    color: '#7C3AED',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  problemCard: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#7C3AED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
  },
  problemTitle: {
    color: '#7C3AED',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  successSection: {
    paddingHorizontal: 20,
  },
  successText: {
    color: '#5B21B6',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  continueButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 18,
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