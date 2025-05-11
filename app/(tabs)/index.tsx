import React, { useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import CircularProgress from '@/components/CircularProgress';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  // Step 1: Create the state for roadmap topics
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
        <View style={styles.profileNameContainer}>
          <Image source={require('@/assets/images/profile/profile-icon.png')} style={styles.icon} />
          <ThemedText>Chong Rui</ThemedText>
        </View>
        <View style={styles.profileStatsContainer}>
          <View style={styles.profileInfoContainer}>
            <Image source={require('@/assets/images/profile/fire-icon.png')} style={styles.icon} />
            <ThemedText>20</ThemedText>
          </View>
          <View style={styles.profileInfoContainer}>
            <Image source={require('@/assets/images/profile/trophy-icon.png')} style={styles.icon} />
            <ThemedText>2040</ThemedText>
          </View>
          <View style={styles.profileInfoContainer}>
            <Image source={require('@/assets/images/profile/magnifying-glass-icon.png')} style={styles.icon} />
            <ThemedText>5</ThemedText>
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
    backgroundColor: '#F4EEFF',
    width: '100%',
    paddingVertical: 12,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0', 
  },
  profileNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    gap: 12,
  },
  profileStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    gap: 10,
    fontSize: 10,
  },
  icon: {
    width: 24,
    height: 24,
  },
  topicRoadMapContainer: {
    padding: 16,
    backgroundColor: 'white',
  },
  sectionTitle: {
    marginBottom: 16,
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
    marginTop: 16,
  },
  progressItem: {
    alignItems: 'center',
    gap: 8,
  },
});
