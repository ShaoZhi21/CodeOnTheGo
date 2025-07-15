import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import { Image, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function QuizSelection() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton}>
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          <ThemedText>Back</ThemedText>
        </TouchableOpacity>
      </View>
      <ThemedText type="title">Quiz Selection</ThemedText>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
});