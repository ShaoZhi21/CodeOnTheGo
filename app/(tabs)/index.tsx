import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import CircularProgress from '@/components/CircularProgress';
import { ThemedText } from '@/components/ThemedText';
import { ProfileService } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';
import type { UserProfileStats } from '@/lib/types/profile';
import { router } from 'expo-router';

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [roadmapTopics] = useState([
    'Array',
    'Binary',
    'Recursion',
    'Linked List',
    'AVL Tree',
    'Hash table',
    '2 pointer',
    'Sliding Window',
    'String',
    'DP',
    'Greedy',
    'Deque',
  ]);

  const [topicsInProgress] = useState([
    { name: 'Array', percentage: 85 },
    { name: 'Deque', percentage: 70 },
    { name: 'Recursion', percentage: 35 },
  ]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // User not logged in, use default values
        setProfile({
          id: '',
          user_id: '',
          name: 'Guest User',
          level: 1,
          total_xp: 0,
          skill_level: 'Beginner',
          total_questions: 0,
          easy_solved: 0,
          medium_solved: 0,
          hard_solved: 0,
          completion_percentage: 0,
          trophy_count: 0,
          current_streak: 0,
          longest_streak: 0,
          hints_used: 0,
          available_hints: 5,
          last_activity_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_solved: 0,
          calculated_skill_level: 'Beginner'
        } as UserProfileStats & { available_hints: number });
        setLoading(false);
        return;
      }

      const profileData = await ProfileService.getUserProfileStats(user.id);
      if (profileData) {
        setProfile(profileData as UserProfileStats & { available_hints: number });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Set default values on error
      setProfile({
        id: '',
        user_id: '',
        name: 'User',
        level: 1,
        total_xp: 0,
        skill_level: 'Beginner',
        total_questions: 0,
        easy_solved: 0,
        medium_solved: 0,
        hard_solved: 0,
        completion_percentage: 0,
        trophy_count: 0,
        current_streak: 0,
        longest_streak: 0,
        hints_used: 0,
        available_hints: 5,
        last_activity_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_solved: 0,
        calculated_skill_level: 'Beginner'
      } as UserProfileStats & { available_hints: number });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6564c7" />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
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
        <ThemedText type="subtitle" style={styles.sectionTitle}>Topic roadmap</ThemedText>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.topicsScrollView}
        >
          <View style={styles.topicsGrid}>
            {roadmapTopics.map((topic, index) => (
              <TouchableOpacity key={index} style={styles.topicPill} onPress={() => router.push(`/screens/roadmaptopic?topic=${topic}`)}>
                <ThemedText>{topic}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        <ThemedText type="subtitle" style={styles.sectionTitle}>Topics in progress</ThemedText>
        <View style={styles.progressCircles}>
          {topicsInProgress.map((topic) => (
            <TouchableOpacity key={topic.name} style={styles.progressItem} onPress={() => router.push(`/screens/roadmaptopic?topic=${topic.name}`)}>
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
  },
  sectionTitle: {
    marginBottom: 16,
    paddingLeft: 8,
    fontSize: 18,
    fontWeight: 'bold',
  },
  topicsScrollView: {
    flexGrow: 0,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 650,
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  topicPill: {
    backgroundColor: '#b4aaf4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 2,
    borderWidth: 3,
    borderColor: '#897fef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  progressCircles: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  progressItem: {
    alignItems: 'center',
    gap: 8,
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
