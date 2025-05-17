import { ThemedText } from '@/components/ThemedText';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QuestionScreen() {
  const params = useLocalSearchParams();
  const { id, name, difficulty } = params;
  const [description] = useState(
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order."
  );
  const [examples] = useState([
    {
      input: "nums = [2,7,11,15], target = 9",
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
    }
  ]);
  const [showProblem, setShowProblem] = useState(true);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return '#00B8A3';
      case 'Medium':
        return '#FFA116';
      case 'Hard':
        return '#FF375F';
      default:
        return '#6564c7';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.titleContainer}>
          <View style={styles.questionHeader}>
            <ThemedText style={styles.questionId}>#{id}</ThemedText>
            <ThemedText style={styles.title}>{name}</ThemedText>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(difficulty as string) }]}>
              <ThemedText style={styles.difficultyText}>{difficulty}</ThemedText>
            </View>
          </View>
        </View>


        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{showProblem ? 'Problem Description' : 'Example'}</ThemedText>
          <View style={styles.descriptionBox}>
            <ThemedText style={styles.description}>
              {showProblem ? description : (
                <>
                  <ThemedText style={styles.exampleLabel}>Input:</ThemedText>
                  <ThemedText style={styles.exampleText}>{'\n'}{examples[0].input}</ThemedText>
                  <View style={{ height: 10 }} />
                  <ThemedText style={styles.exampleLabel}>{'\n'}Output:</ThemedText>
                  <ThemedText style={styles.exampleText}>{'\n'}{examples[0].output}</ThemedText>
                  <View style={{ height: 10 }} />
                  <ThemedText style={styles.exampleLabel}>{'\n'}Explanation:</ThemedText>
                  <ThemedText style={styles.exampleText}>{'\n'}{examples[0].explanation}</ThemedText>
                </>
              )}
            </ThemedText>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.toggleButton, { backgroundColor: showProblem ? '#6564c7' : '#897fef' }]} onPress={() => setShowProblem(true)}>
              <ThemedText style={styles.toggleButtonText}>Problem</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleButton, { backgroundColor: !showProblem ? '#6564c7' : '#897fef' }]} onPress={() => setShowProblem(false)}>
              <ThemedText style={styles.toggleButtonText}>Example</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={[styles.section, { flex: 1 }]}>
          <ThemedText style={styles.sectionTitle}>Solution</ThemedText>
          <View style={styles.codeInputContainer}>
            <TextInput
              style={styles.codeInput}
              multiline
              placeholder="Write your solution here...">
              </TextInput>
          </View>
        </View>
          
        <TouchableOpacity style={styles.solveButton}>
          <ThemedText style={styles.solveButtonText}>Solve Problem</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4EEFF',
  },
  header: {
    backgroundColor: '#6564c7',
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
    tintColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    marginBottom: 5,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    justifyContent: 'flex-start',
    gap: 0,
    paddingBottom: 8,
  },
  questionId: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6564c7',
    minWidth: 45,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d2d2d',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  difficultyText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 6,
    fontSize: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    marginLeft: '1%',
    fontWeight: '600',
    marginBottom: 8,
    color: '#2d2d2d',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  solveButton: {
    backgroundColor: '#6564c7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  solveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
    gap: 6,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  descriptionBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 200,
    maxHeight: 300,
  },
  codeInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 10,
  },
  codeInput: {
    flex: 1,
    fontSize: 16,
    color: '#444',
    textAlignVertical: 'top',
  },
  exampleBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8,
  },
  exampleText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 4,
  },
  exampleLabel: {
    fontWeight: 'bold',
    color: '#6564c7',
  },
}); 