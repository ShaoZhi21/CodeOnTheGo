import { ThemedText } from '@/components/ThemedText';
import { apiCall } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface Problem {
  id: number;
  leetcode_id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
}

interface UserProgress {
  id: number;
  user_id: string;
  problem_id: number;
  topic: string;
  completed: boolean;
  stars: number;
  last_answer: string;
  attempts: any[];
  updated_at: string;
}

const getDifficultyOrder = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
  if (difficulty === 'Easy') return 1;
  if (difficulty === 'Medium') return 2;
  if (difficulty === 'Hard') return 3;
  return 4;
};

export default function RoadmapTopic() {
  const { topic } = useLocalSearchParams();
  const [questions, setQuestions] = useState<Problem[]>([]);
  const [progress, setProgress] = useState<Record<number, UserProgress>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndData = async () => {
      setLoading(true);
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      // Fetch all questions for this topic
      const { data: allQuestions } = await supabase
        .from('leetcode_problems')
        .select('id, leetcode_id, title, difficulty, tags')
        .contains('tags', [topic]);
      // Sort by difficulty
      const sorted: Problem[] = [...(allQuestions || [])].sort((a, b) => getDifficultyOrder(a.difficulty) - getDifficultyOrder(b.difficulty));
      setQuestions(sorted);
      // Fetch user progress for this topic
      const res = await apiCall(`/api/user-progress/${user.id}/${topic}`);
      const { progress: userProgress } = await res.json();
      // Also fetch all progress for this user (for cross-topic completion)
      const allRes = await apiCall(`/api/user-progress/${user.id}/all`);
      const { progress: allProgress } = await allRes.json();
      // Map progress by problem_id for quick lookup
      const progressMap: Record<number, UserProgress> = {};
      (allProgress || []).forEach((p: UserProgress) => {
        progressMap[p.problem_id] = p;
      });
      setProgress(progressMap);
      setLoading(false);
    };
    fetchUserAndData();
  }, [topic]);

  const handleQuestionPress = (q: Problem, idx: number) => {
    if (!progress[q.id]?.completed && !isUnlocked(q, idx)) return;
    router.push({
      pathname: '/screens/question',
      params: {
        id: q.leetcode_id.toString(),
        name: q.title,
        difficulty: q.difficulty,
        topic,
      },
    });
  };

  // Only unlock if previous is completed or it's the first
  const isUnlocked = (q: Problem, idx: number) => {
    if (idx === 0) return true;
    const prev = questions[idx - 1];
    return progress[prev.id]?.completed;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6564c7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={require('@/assets/images/icons/back-icon.png')} style={styles.backIcon} />
          <ThemedText>Back</ThemedText>
        </TouchableOpacity>
      </View>
      <ThemedText type="title">{topic}</ThemedText>
      <ScrollView contentContainerStyle={styles.roadmapContainer}>
        {questions.map((q, idx) => {
          const unlocked = isUnlocked(q, idx) || progress[q.id]?.completed;
          const completed = progress[q.id]?.completed;
          const stars = progress[q.id]?.stars || 0;
          const lastAnswer = progress[q.id]?.last_answer;
          const zigzagStyle = idx % 2 === 0 ? styles.zigLeft : styles.zigRight;
          return (
            <View key={q.id} style={[styles.nodeRow, zigzagStyle]}>
              <TouchableOpacity
                style={[styles.node, completed ? styles.completedNode : unlocked ? styles.unlockedNode : styles.lockedNode]}
                disabled={!unlocked}
                onPress={() => handleQuestionPress(q, idx)}
              >
                {completed ? (
                  <Image source={require('@/assets/images/icons/star-icon.png')} style={styles.starIcon} />
                ) : unlocked ? (
                  <Image source={require('@/assets/images/icons/star-icon.png')} style={[styles.starIcon, { opacity: 0.3 }]} />
                ) : (
                  <Image source={require('@/assets/images/icons/lock-icon.png')} style={styles.lockIcon} />
                )}
                <ThemedText style={styles.nodeTitle}>{q.title}</ThemedText>
                <ThemedText style={styles.nodeDiff}>{q.difficulty}</ThemedText>
                {completed && <ThemedText style={styles.starsText}>{'★'.repeat(stars)}</ThemedText>}
                {lastAnswer && (
                  <ThemedText style={styles.lastAnswerText} numberOfLines={1}>
                    Last: {lastAnswer.slice(0, 20)}{lastAnswer.length > 20 ? '...' : ''}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
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
  roadmapContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  nodeRow: {
    width: '100%',
    marginBottom: 32,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  zigLeft: {
    justifyContent: 'flex-start',
  },
  zigRight: {
    justifyContent: 'flex-end',
  },
  node: {
    minWidth: 220,
    maxWidth: 300,
    minHeight: 90,
    borderRadius: 32,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginHorizontal: 12,
  },
  unlockedNode: {
    backgroundColor: '#e6e6fa',
    borderWidth: 2,
    borderColor: '#6564c7',
  },
  lockedNode: {
    backgroundColor: '#f4f4f4',
    borderWidth: 2,
    borderColor: '#ccc',
    opacity: 0.6,
  },
  completedNode: {
    backgroundColor: '#d1ffd6',
    borderWidth: 2,
    borderColor: '#00B894',
  },
  nodeTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  nodeDiff: {
    fontSize: 13,
    color: '#6564c7',
    marginTop: 2,
  },
  starsText: {
    color: '#FFD700',
    fontSize: 18,
    marginTop: 4,
  },
  lastAnswerText: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    maxWidth: 180,
  },
  starIcon: {
    width: 28,
    height: 28,
    marginBottom: 2,
  },
  lockIcon: {
    width: 28,
    height: 28,
    marginBottom: 2,
    tintColor: '#aaa',
  },
});