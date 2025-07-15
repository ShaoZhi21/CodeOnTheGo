import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6564c7" />
      <ThemedText style={styles.message}>{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf5fd',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#6564c7',
  },
}); 