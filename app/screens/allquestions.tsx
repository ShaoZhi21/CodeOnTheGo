import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Problem {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'Solved' | 'Attempted' | 'Todo';
}

const problems: Problem[] = [
  { id: '1', name: 'Two Sum', difficulty: 'Easy', status: 'Solved' },
  { id: '2', name: 'Add Two Numbers', difficulty: 'Medium', status: 'Todo' },
  { id: '3', name: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', status: 'Attempted' },
  { id: '4', name: 'Median of Two Sorted Arrays', difficulty: 'Hard', status: 'Todo' },
  { id: '5', name: 'Longest Palindromic Substring', difficulty: 'Medium', status: 'Solved' },
];

const getDifficultyColor = (difficulty: Problem['difficulty']) => {
  switch (difficulty) {
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

const getStatusColor = (status: Problem['status']) => {
  switch (status) {
    case 'Solved':
      return '#00B8A3';
    case 'Attempted':
      return '#FFA116';
    case 'Todo':
      return '#b4aaf4';
    default:
      return '#6564c7';
  }
};

export default function AllQuestionsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Problems</ThemedText>
      </View>
      
      <View style={styles.tableHeader}>
        <ThemedText style={[styles.headerCell, { flex: 1 }]}>ID</ThemedText>
        <ThemedText style={[styles.headerCell, { flex: 4 }]}>Name</ThemedText>
        <ThemedText style={[styles.headerCell, { flex: 2 }]}>Difficulty</ThemedText>
        <ThemedText style={[styles.headerCell, { flex: 2 }]}>Status</ThemedText>
      </View>

      <ScrollView style={styles.tableContainer}>
      {problems.map((problem) => (
          <TouchableOpacity 
            key={problem.id}
            style={styles.row}
            onPress={() => router.push({
              pathname: '/screens/question',
              params: {
                id: problem.id,
                name: problem.name,
                difficulty: problem.difficulty
              }
            })}
          >
            <ThemedText style={[styles.cell, { flex: 1 }]}>{problem.id}</ThemedText>
            <ThemedText style={[styles.cell, { flex: 4 }]}>{problem.name}</ThemedText>
            <View style={[styles.cell, { flex: 2 }]}>
              <ThemedText style={[styles.difficultyText, { color: getDifficultyColor(problem.difficulty) }]}>
                {problem.difficulty}
              </ThemedText>
            </View>
            <View style={[styles.cell, { flex: 2 }]}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(problem.status) }]}>
                <ThemedText style={styles.statusText}>{problem.status}</ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
    alignItems: 'center',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    paddingTop: 4,
  },
  tableContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#897fef',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  headerCell: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    paddingHorizontal: 5,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1ecfd',
  },
  cell: {
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  difficultyText: {
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    width: 80,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});