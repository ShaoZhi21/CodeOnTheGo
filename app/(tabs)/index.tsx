import React, { useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import CircularProgress from '@/components/CircularProgress';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.profileContainer}>
        <View style={styles.avatarNameContainer}>
          <Image source={require('@/assets/images/icons/profile-icon.png')} style={styles.avatar} />
          <ThemedText style={styles.profileName}>Chong Rui</ThemedText>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Image source={require('@/assets/images/icons/fire-icon.png')} style={styles.statIcon} />
            <ThemedText style={styles.statText}>20</ThemedText>
          </View>
          <View style={styles.statChip}>
            <Image source={require('@/assets/images/icons/trophy-icon.png')} style={styles.statIcon} />
            <ThemedText style={styles.statText}>2040</ThemedText>
          </View>
          <View style={styles.statChip}>
            <Image source={require('@/assets/images/icons/magnifying-glass-icon.png')} style={styles.statIcon} />
            <ThemedText style={styles.statText}>5</ThemedText>
          </View>
        </View>
      </ThemedView>

      <View style={styles.topicRoadMapContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Topic roadmap</ThemedText>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.topicsScrollView}
        >
          <View style={styles.topicsGrid}>
            {roadmapTopics.map((topic, index) => (
              <TouchableOpacity key={index} style={styles.topicPill}>
                <ThemedText>{topic}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        <ThemedText type="subtitle" style={styles.sectionTitle}>Topics in progress</ThemedText>
        <View style={styles.progressCircles}>
          {topicsInProgress.map((topic) => (
            <View key={topic.name} style={styles.progressItem}>
              <CircularProgress percentage={topic.percentage}>
                <ThemedText>{topic.percentage}%</ThemedText>
              </CircularProgress>
              <ThemedText>{topic.name}</ThemedText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.practiceQuestionsContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Practice questions</ThemedText>
        <View style={styles.practiceButtonsContainer}>
          <TouchableOpacity style={styles.practiceButton}>
            <Image source={require('@/assets/images/icons/shuffle-icon.png')} style={styles.practiceButtonIcon} />
            <ThemedText>Random</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.practiceButton}>
            <Image source={require('@/assets/images/icons/list-icon.png')} style={styles.practiceButtonIcon} />
            <ThemedText>See All</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.gameModeContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Game mode</ThemedText>
        <View style={styles.gameModeButtonsContainer}>
          <View style={styles.gameModeItem}>
            <TouchableOpacity style={[styles.gameModeButton, { backgroundColor: '#453d83' }]}>
              <Image source={require('@/assets/images/icons/tournament-icon.png')} style={styles.gameModeIcon} />
            </TouchableOpacity>
            <ThemedText style={styles.gameModeText}>Tournament</ThemedText>
          </View>
          
          <View style={styles.gameModeItem}>
            <TouchableOpacity style={[styles.gameModeButton, { backgroundColor: '#FF4D4D' }]}>
              <Image source={require('@/assets/images/icons/duel-icon.png')} style={styles.gameModeIcon} />
            </TouchableOpacity>
            <ThemedText style={styles.gameModeText}>Duel</ThemedText>
          </View>
          
          <View style={styles.gameModeItem}>
            <TouchableOpacity style={[styles.gameModeButton, { backgroundColor: '#FFA500' }]}>
              <Image source={require('@/assets/images/icons/quiz-icon.png')} style={styles.gameModeIcon} />
            </TouchableOpacity>
            <ThemedText style={styles.gameModeText}>Quiz</ThemedText>
          </View>
        </View>
      </View>
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
    justifyContent: 'space-between',
    backgroundColor: '#F4EEFF',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 8,
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
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
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
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 6,
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
    backgroundColor: 'white',
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
    backgroundColor: '#F4EEFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 2,
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
    backgroundColor: 'white',
  },
  practiceButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 16,
    height: 55,
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7FF',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    width: '48%',
  },
  practiceButtonIcon: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  gameModeContainer: {
    padding: 16,
    backgroundColor: 'white',
  },
  gameModeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 16,
  },
  gameModeItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameModeButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  gameModeIcon: {
    width: 70,
    height: 70,
  },
  gameModeText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
