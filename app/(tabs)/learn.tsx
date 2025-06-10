import { ThemedText } from '@/components/ThemedText';
import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

export default function LearnScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>Learn</ThemedText>
        <ThemedText style={styles.description}>
          Welcome to the Learn section! This is where you&apos;ll find educational content and tutorials.
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4EEFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 