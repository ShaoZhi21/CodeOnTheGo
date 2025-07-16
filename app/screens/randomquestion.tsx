import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import { Image, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';


export default function RandomQuestion() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Image 
            source={require('@/assets/images/icons/back-icon.png')} 
            style={styles.backIcon} 
          />
          <ThemedText>Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Random Question</ThemedText>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.questionTitle}>Question Title Here</ThemedText>
        <ThemedText style={styles.questionDifficulty}>Medium</ThemedText>
        <ThemedText style={styles.questionDescription}>
          Question description and details will go here...
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  content: {
    padding: 16,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  questionDifficulty: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  questionDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
});