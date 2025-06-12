import { ThemedText } from '@/components/ThemedText';
import { ProfileService } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';
import type { UserProfileStats } from '@/lib/types/profile';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<'Beginner' | 'Intermediate' | 'Professional'>('Beginner');

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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to view your profile');
        return;
      }

      const profileData = await ProfileService.getUserProfileStats(user.id);
      if (profileData) {
        setProfile(profileData);
        setSelectedLevel(profileData.skill_level);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const updateSkillLevel = async (level: 'Beginner' | 'Intermediate' | 'Professional') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedProfile = await ProfileService.updateUserProfile(user.id, {
        skill_level: level
      });

      if (updatedProfile) {
        setProfile(prev => prev ? { ...prev, skill_level: level } : null);
        Alert.alert('Success', 'Skill level updated successfully!');
      }
    } catch (error) {
      console.error('Error updating skill level:', error);
      Alert.alert('Error', 'Failed to update skill level');
    }
  };

  const handleSaveSkillLevel = () => {
    Alert.alert(
      'Confirm Skill Level Change',
      `Are you sure you want to change your skill level to ${selectedLevel}? This will affect your gameplay experience.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          style: 'default',
          onPress: () => updateSkillLevel(selectedLevel),
        },
      ],
      { cancelable: true }
    );
  };

  const getProgressSteps = (level: 'Beginner' | 'Intermediate' | 'Professional') => {
    switch(level) {
      case 'Beginner': return 1;
      case 'Intermediate': return 2;
      case 'Professional': return 3;
      default: return 1;
    }
  };

  const renderLevelButton = (level: 'Beginner' | 'Intermediate' | 'Professional') => (
    <TouchableOpacity
      key={level}
              style={[
          styles.levelButton,
          selectedLevel === level && styles.levelButtonActive,
          selectedLevel === level && { borderColor: levelColors[level] }
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6564c7" />
          <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Failed to load profile</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <ThemedText style={styles.profileName}>{profile.name}</ThemedText>
          <ThemedText style={styles.profileLevel}>Level {profile.level} • {profile.skill_level}</ThemedText>
        </View>

        {/* Stats Container */}
        <View style={styles.statsContainer}>
          <ThemedText style={styles.sectionTitle}>Statistics</ThemedText>
          
          {/* Questions Stats Combined */}
          <View style={styles.questionsCard}>
            <ThemedText style={styles.mainStatNumber}>{profile.total_questions}</ThemedText>
            <ThemedText style={styles.mainStatLabel}>Questions Solved</ThemedText>
            
            {/* Difficulty Breakdown */}
            <View style={styles.difficultyContainer}>
              <View style={[styles.difficultyItem, { borderLeftColor: '#4CAF50' }]}>
                <ThemedText style={styles.difficultyNumber}>{profile.easy_solved}</ThemedText>
                <ThemedText style={[styles.difficultyLabel, { color: '#4CAF50' }]}>Easy</ThemedText>
              </View>
              <View style={[styles.difficultyItem, { borderLeftColor: '#FF9800' }]}>
                <ThemedText style={styles.difficultyNumber}>{profile.medium_solved}</ThemedText>
                <ThemedText style={[styles.difficultyLabel, { color: '#FF9800' }]}>Medium</ThemedText>
              </View>
              <View style={[styles.difficultyItem, { borderLeftColor: '#F44336' }]}>
                <ThemedText style={styles.difficultyNumber}>{profile.hard_solved}</ThemedText>
                <ThemedText style={[styles.difficultyLabel, { color: '#F44336' }]}>Hard</ThemedText>
              </View>
            </View>
          </View>

          {/* Other Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{profile.completion_percentage.toFixed(1)}%</ThemedText>
              <ThemedText style={styles.statLabel}>Complete</ThemedText>
            </View>
            <View style={styles.statItem}>
              <View style={styles.trophyContainer}>
                <Image 
                  source={require('@/assets/images/icons/trophy-icon.png')}
                  style={styles.trophyIcon}
                />
                <ThemedText style={styles.statNumber}>{profile.trophy_count}</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Trophies</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>🔥 {profile.current_streak}</ThemedText>
              <ThemedText style={styles.statLabel}>Streak</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{profile.available_hints || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Hints</ThemedText>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsContainer}>
          <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
          
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <ThemedText style={styles.settingLabel}>Skill Level</ThemedText>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveSkillLevel}>
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </TouchableOpacity>
            </View>
            
            {/* Warning Note */}
            <ThemedText style={styles.warningText}>
              Note: the skill level will affect gameplay.
            </ThemedText>
            
            <View style={styles.levelButtons}>
              {(['Beginner', 'Intermediate', 'Professional'] as const).map(renderLevelButton)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6564c7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#6564c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
}); 