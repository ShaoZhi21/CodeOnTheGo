import { Image, SafeAreaView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.profileContainer}>
        <View style={styles.profileNameContainer}>
          <Image source={require('@/assets/images/profile/profile-icon.png')} style={styles.icon} />
          <ThemedText type="subtitle">Chong Rui</ThemedText>
        </View>
        <View style={styles.iconTextContainer}>
          <Image source={require('@/assets/images/profile/fire-icon.png')} style={styles.icon} />
          <ThemedText>10</ThemedText>
        </View>
        <View style={styles.iconTextContainer}>
          <Image source={require('@/assets/images/profile/trophy-icon.png')} style={styles.icon} />
          <ThemedText>2040</ThemedText>
        </View>
        <View style={styles.iconTextContainer}>
          <Image source={require('@/assets/images/profile/magnifying-glass-icon.png')} style={styles.icon} />
          <ThemedText>5</ThemedText>
        </View>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 4: Enjoy!</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 5: Share with friends</ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F4EEFF',
    width: '100%',
    paddingVertical: 16,
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignSelf: 'center',
  },
  profileNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    gap: 12,
  },
  iconTextContainer: {
    width: 40,
    alignItems: 'center',
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  icon: {
    width: 24,
    height: 24,
  },
});
