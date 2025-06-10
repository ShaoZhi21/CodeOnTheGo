import { ThemedText } from '@/components/ThemedText';
import React, { useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const [selectedLevel, setSelectedLevel] = useState('Intermediate');

  const levelDescriptions = {
    Beginner: 'Little to no programming knowledge, have not done or done little leetcode.',
    Intermediate: 'Decent amount of knowledge, can do leetcode easy and medium questions with some assistance.',
    Professional: 'Lots of knowledge, can do leetcode medium and hard questions.'
  };

  const levelColors = {
    Beginner: '#4CAF50',
    Intermediate: '#FF9800', 
    Professional: '#F44336'
  };

  const getProgressSteps = (level: string) => {
    switch(level) {
      case 'Beginner': return 1;
      case 'Intermediate': return 2;
      case 'Professional': return 3;
      default: return 1;
    }
  };

  const renderLevelButton = (level: string) => (
    <TouchableOpacity
      key={level}
      style={[
        styles.levelButton,
        selectedLevel === level && styles.levelButtonActive,
        selectedLevel === level && { borderColor: levelColors[level as keyof typeof levelColors] }
      ]}
      onPress={() => setSelectedLevel(level)}
    >
      <ThemedText style={[
        styles.levelButtonText,
        selectedLevel === level && styles.levelButtonTextActive
      ]}>
        {level}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderProgressBar = () => {
    const steps = getProgressSteps(selectedLevel);
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressBar}>
            {[1, 2, 3].map((step) => (
              <View
                key={step}
                style={[
                  styles.progressStep,
                  step <= steps ? styles.progressStepActive : styles.progressStepInactive
                ]}
              />
            ))}
          </View>
          {/* Dashed dividers */}
          <View style={[styles.progressDivider, { left: '33.33%' }]} />
          <View style={[styles.progressDivider, { left: '66.66%' }]} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={require('@/assets/images/icons/codeonthego-bird-icon.png')}
              style={styles.profileImage}
            />
          </View>
          <ThemedText style={styles.profileName}>John Coder</ThemedText>
          <ThemedText style={styles.profileLevel}>Level 12 • Intermediate</ThemedText>
        </View>

        {/* Stats Container */}
        <View style={styles.statsContainer}>
          <ThemedText style={styles.sectionTitle}>Statistics</ThemedText>
          
          {/* Questions Stats Combined */}
          <View style={styles.questionsCard}>
            <ThemedText style={styles.mainStatNumber}>147</ThemedText>
            <ThemedText style={styles.mainStatLabel}>Questions Solved</ThemedText>
            
            {/* Difficulty Breakdown */}
            <View style={styles.difficultyContainer}>
              <View style={[styles.difficultyItem, { borderLeftColor: '#4CAF50' }]}>
                <ThemedText style={styles.difficultyNumber}>89</ThemedText>
                <ThemedText style={[styles.difficultyLabel, { color: '#4CAF50' }]}>Easy</ThemedText>
              </View>
              <View style={[styles.difficultyItem, { borderLeftColor: '#FF9800' }]}>
                <ThemedText style={styles.difficultyNumber}>45</ThemedText>
                <ThemedText style={[styles.difficultyLabel, { color: '#FF9800' }]}>Medium</ThemedText>
              </View>
              <View style={[styles.difficultyItem, { borderLeftColor: '#F44336' }]}>
                <ThemedText style={styles.difficultyNumber}>13</ThemedText>
                <ThemedText style={[styles.difficultyLabel, { color: '#F44336' }]}>Hard</ThemedText>
              </View>
            </View>
          </View>

          {/* Other Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>78%</ThemedText>
              <ThemedText style={styles.statLabel}>Topics</ThemedText>
            </View>
            <View style={styles.statItem}>
              <View style={styles.trophyContainer}>
                <Image 
                  source={require('@/assets/images/icons/trophy-icon.png')}
                  style={styles.trophyIcon}
                />
                <ThemedText style={styles.statNumber}>23</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Trophies</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>🔥 12</ThemedText>
              <ThemedText style={styles.statLabel}>Streaks</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>156</ThemedText>
              <ThemedText style={styles.statLabel}>Hints</ThemedText>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsContainer}>
          <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
          
          <View style={styles.settingCard}>
            <ThemedText style={styles.settingLabel}>Skill Level</ThemedText>
            
            {/* Warning Note */}
            <ThemedText style={styles.warningText}>
              Note: the skill level will affect gameplay.
            </ThemedText>
            
            <View style={styles.levelButtons}>
              {['Beginner', 'Intermediate', 'Professional'].map(renderLevelButton)}
            </View>
            
            {/* Progress Bar */}
            {renderProgressBar()}
            
            {selectedLevel && (
              <View style={styles.levelDescription}>
                <ThemedText style={styles.levelDescriptionText}>
                  {levelDescriptions[selectedLevel as keyof typeof levelDescriptions]}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4EEFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(101, 100, 199, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#6564c7',
  },
  profileImage: {
    width: 50,
    height: 50,
    tintColor: '#6564c7',
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 4,
    lineHeight: 36,
  },
  profileLevel: {
    fontSize: 16,
    color: '#666',
    lineHeight: 20,
  },
  statsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 20,
    lineHeight: 28,
  },
  questionsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mainStatNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6564c7',
    lineHeight: 38,
  },
  mainStatLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
    textAlign: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6564c7',
    lineHeight: 30,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
    textAlign: 'center',
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  difficultyItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
    borderLeftWidth: 3,
    marginHorizontal: 8,
  },
  difficultyNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 24,
  },
  difficultyLabel: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '600',
  },
  statsRow: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  trophyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyIcon: {
    width: 18,
    height: 18,
    tintColor: '#FFD700',
    marginRight: 6,
  },
  settingsContainer: {
    marginBottom: 80,
  },
  settingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6564c7',
    marginBottom: 8,
    lineHeight: 24,
  },
  warningText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  levelButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 2,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelButtonActive: {
    backgroundColor: 'rgba(101, 100, 199, 0.1)',
    borderWidth: 2,
  },
  levelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    lineHeight: 16,
    textAlign: 'center',
  },
  levelButtonTextActive: {
    color: '#6564c7',
  },
  progressContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  progressBarWrapper: {
    position: 'relative',
    width: '60%',
    height: 8,
  },
  progressBar: {
    flexDirection: 'row',
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressStep: {
    flex: 1,
    height: '100%',
  },
  progressStepActive: {
    backgroundColor: '#4CAF50',
  },
  progressStepInactive: {
    backgroundColor: '#E0E0E0',
  },
  progressDivider: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 1,
    backgroundColor: '#999',
    transform: [{ translateX: -0.5 }],
  },
  levelDescription: {
    backgroundColor: 'rgba(101, 100, 199, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6564c7',
  },
  levelDescriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
}); 