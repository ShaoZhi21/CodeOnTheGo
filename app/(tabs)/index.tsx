import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import CircularProgress from '@/components/CircularProgress';
import { ThemedText } from '@/components/ThemedText';
import { ProfileService } from '@/lib/services/profileService';
import { TopicService } from '@/lib/services/topicService';
import { supabase } from '@/lib/supabase';
import type { UserProfileStats } from '@/lib/types/profile';
import { router } from 'expo-router';

interface TopicProgress {
  name: string;
  percentage: number;
  lastEdited: string;
}

export default function HomeScreen() {
  console.log('HomeScreen component loaded');
  const [profile, setProfile] = useState<UserProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topicsInProgress, setTopicsInProgress] = useState<TopicProgress[]>([]);
  const [roadmapTopics, setRoadmapTopics] = useState<{ name: string; color: string }[]>([]);

  useEffect(() => {
    loadProfile();
    loadTopicsProgress();
    loadAllTopics();
  }, []);

  const loadAllTopics = async () => {
    try {
      const topics = await TopicService.getAllTopics();
      setRoadmapTopics(topics.map(topic => ({
        name: topic.name,
        color: '#6564c7'
      })));
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profileData = await ProfileService.getUserProfileStats(user.id);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopicsProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get recent topic navigation history
      const navigationHistory = await TopicService.getRecentTopicNavigation(user.id);
      console.log('Navigation history:', navigationHistory);
      
      // Get unique topics from navigation history (most recent first)
      const uniqueTopics = navigationHistory
        .filter((item, index, self) => 
          index === self.findIndex(t => t.topic_name === item.topic_name)
        )
        .slice(0, 3);

      console.log('Unique topics:', uniqueTopics);

      // Get progress for each recently visited topic
      const progressPromises = uniqueTopics.map(async (navItem) => {
        const topicName = navItem.topic_name;
        
        // Get all problems for this topic
        const problems = await TopicService.getTopicProblems(topicName);
        
        // Get user's progress for these problems
        const { data: progressData } = await supabase
          .from('user_problem_progress')
          .select('problem_id, is_solved')
          .eq('user_id', user.id)
          .in('problem_id', problems.map(p => p.leetcode_id));

        // Calculate completion percentage
        const completedProblems = progressData?.filter(p => p.is_solved) || [];
        const totalProblems = problems.length;
        const percentage = totalProblems > 0 
          ? Math.round((completedProblems.length / totalProblems) * 100)
          : 0;

        return {
          name: topicName,
          percentage,
          lastEdited: navItem.visited_at
        };
      });

      const allProgress = await Promise.all(progressPromises);
      console.log('All progress:', allProgress);
      setTopicsInProgress(allProgress);
    } catch (error) {
      console.error('Error loading topics progress:', error);
    }
  };

  const handleTopicClick = async (topicName: string) => {
    console.log('handleTopicClick called with:', topicName);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User found:', user?.id);
      if (user) {
        // Record the topic navigation
        console.log('Recording navigation for topic:', topicName);
        await TopicService.recordTopicNavigation(user.id, topicName);
        console.log('Navigation recorded successfully');
      }
      // Navigate to the topic
      console.log('Navigating to topic:', topicName);
      router.push(`/screens/roadmaptopic?topic=${topicName}`);
    } catch (error) {
      console.error('Error handling topic click:', error);
      // Still navigate even if recording fails
      router.push(`/screens/roadmaptopic?topic=${topicName}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6564c7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.profileContainer}>
        <TouchableOpacity style={styles.avatarNameContainer} onPress={() => router.push('/(tabs)/profile')}>
          <Image source={require('@/assets/images/icons/profile-icon.png')} style={styles.avatar} />
          <ThemedText style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">{profile?.name || 'User'}</ThemedText>
        </TouchableOpacity>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Image source={require('@/assets/images/icons/fire-icon.png')} style={styles.statIcon} />
            <ThemedText style={styles.statText}>{profile?.current_streak || 0}</ThemedText>
          </View>
          <View style={styles.statChip}>
            <Image source={require('@/assets/images/icons/trophy-icon.png')} style={styles.statIcon} />
            <ThemedText style={styles.statText}>{profile?.trophy_count || 0}</ThemedText>
          </View>
          <View style={styles.statChip}>
            <Image source={require('@/assets/images/icons/magnifying-glass-icon.png')} style={styles.statIcon} />
            <ThemedText style={styles.statText}>{profile?.available_hints || 5}</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.topicRoadMapContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Topic Roadmap</ThemedText>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false} 
          style={styles.topicsScrollView}
          contentContainerStyle={styles.topicsScrollContent}
        >
          <View style={styles.topicsGrid}>
            {roadmapTopics.map((topic, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.topicBubble, { backgroundColor: topic.color }]} 
                onPress={() => handleTopicClick(topic.name)}
              >
                <ThemedText style={styles.topicName}>{topic.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        <ThemedText type="subtitle" style={styles.sectionTitle}>Recent Topics</ThemedText>
        <View style={styles.progressCircles}>
          {topicsInProgress.map((topic) => (
            <TouchableOpacity 
              key={topic.name} 
              style={styles.progressItem} 
              onPress={() => handleTopicClick(topic.name)}
            >
              <CircularProgress percentage={topic.percentage}>
                <ThemedText>{topic.percentage}%</ThemedText>
              </CircularProgress>
              <ThemedText>{topic.name}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.practiceQuestionsContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Practice questions</ThemedText>
        <View style={styles.practiceButtonsContainer}>
          <TouchableOpacity style={styles.practiceButton} onPress={() => router.push('/screens/randomquestion')}>
            <Image source={require('@/assets/images/icons/shuffle-icon.png')} style={styles.practiceButtonIcon} />
            <ThemedText>Random</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.practiceButton} onPress={() => router.push('/screens/allquestions')}>
            <Image source={require('@/assets/images/icons/list-icon.png')} style={styles.practiceButtonIcon} />
            <ThemedText>See All</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.gameModeContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Game mode</ThemedText>
        <View style={styles.gameModeButtonsContainer}>
          <View style={styles.gameModeItem}>
            <TouchableOpacity style={[styles.gameModeButton, { backgroundColor: '#453d83' }]} onPress={() => router.push('/screens/tournament')}>
              <Image source={require('@/assets/images/icons/tournament-icon.png')} style={styles.tournamentIcon} />
              <ThemedText style={[styles.gameModeText, { color: '#fff' }]}>Tournament</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.gameModeItem}>
            <TouchableOpacity style={[styles.gameModeButton, { backgroundColor: '#FF4D4D' }]} onPress={() => router.push('/screens/duel')}>
              <Image source={require('@/assets/images/icons/duel-icon.png')} style={styles.duelIcon} />
              <ThemedText style={[styles.gameModeText, { color: '#fff' }]}>Duel</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.gameModeItem}>
            <TouchableOpacity style={[styles.gameModeButton, { backgroundColor: '#FFA500' }]} onPress={() => router.push('/screens/quizselection')}>
              <Image source={require('@/assets/images/icons/quiz-icon.png')} style={styles.quizIcon} />
              <ThemedText style={[styles.gameModeText, { color: '#fff' }]}>Quiz</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EEFF'
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6564c7',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    overflow: 'hidden',
  },
  avatarNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0D7FF',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
    marginRight: 16,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 18,
    marginRight: 10,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    width: 20,
    height: 20,
    marginRight: 4,
  },
  statText: {
    fontSize: 15,
    fontWeight: '500',
  },
  topicRoadMapContainer: {
    padding: 16,
    backgroundColor: '#F4EEFF',
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    paddingLeft: 8,
    fontSize: 18,
    fontWeight: 'bold',
  },
  topicsScrollView: {
    flexGrow: 0,
    height: 140,
  },
  topicsScrollContent: {
    paddingHorizontal: 16,
  },
  topicsGrid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    height: 120,
    width: '100%',
    gap: 12,
    columnGap: 16,
  },
  topicBubble: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 120,
    maxWidth: 180,
  },
  topicName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressCircles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  progressItem: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
    maxWidth: '33%',
    paddingHorizontal: 4,
  },
  practiceQuestionsContainer: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    backgroundColor: '#F4EEFF'
  },
  practiceButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 16,
    height: 60,
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b4aaf4',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    width: '48%',
    paddingVertical: 12,
  },
  practiceButtonIcon: {
    width: 30,
    height: 30,
    marginRight: 8,
    tintColor: '#6564c7',
  },
  gameModeContainer: {
    padding: 16,
    backgroundColor: '#F4EEFF'
  },
  gameModeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  gameModeItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameModeButton: {
    width: 110,
    height: 110,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  tournamentIcon: {
    width: 65,
    height: 65,
  },
  duelIcon: {
    width: 65,
    height: 65,
  },
  quizIcon: {
    width: 60,
    height: 60,
    marginBottom: 5,
  },
  gameModeText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
