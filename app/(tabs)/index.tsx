import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { useStreak } from '../../contexts/StreakContext';
import { DailyChallengeService } from '../../lib/services/dailyChallengeService';
import { ProfileService } from '../../lib/services/profileService';
import { TopicService } from '../../lib/services/topicService';
import { supabase } from '../../lib/supabase';
import type { UserProfileStats } from '../../lib/types/profile';

interface TopicProgress {
  name: string;
  completion_percentage: number;
  lastEdited: string;
}

interface DailyStats {
  streak: number;
  todayProblems: number;
  totalProblems: number;
  totalSolved: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

interface DailyChallenge {
  date: string;
  problemId: number;
  problemTitle: string;
  completed: boolean;
}



interface RecapLesson {
  problem_id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completed_at: string;
}

const getTopicIcon = (topicName: string) => {
  const iconMap: { [key: string]: any } = {
    'Array': require('../../assets/images/icons/list-icon.png'),
    'String': require('../../assets/images/icons/code-icon.png'),
    'LinkedList': require('../../assets/images/icons/list-icon.png'),
    'Stack': require('../../assets/images/icons/list-icon.png'),
    'Queue': require('../../assets/images/icons/list-icon.png'),
    'Tree': require('../../assets/images/icons/book-icon.png'),
    'Graph': require('../../assets/images/icons/shuffle-icon.png'),
    'Hash': require('../../assets/images/icons/magnifying-glass-icon.png'),
    'Sort': require('../../assets/images/icons/up-arrow.png'),
    'Search': require('../../assets/images/icons/magnifying-glass-icon.png'),
    'DP': require('../../assets/images/icons/fire-icon.png'),
    'Greedy': require('../../assets/images/icons/star-icon.png'),
    'Backtrack': require('../../assets/images/icons/retry-icon.png'),
    'Math': require('../../assets/images/icons/checklist-icon.png'),
    'Bit': require('../../assets/images/icons/code-icon.png'),
    'Two': require('../../assets/images/icons/duel-icon.png'),
    'Sliding': require('../../assets/images/icons/shuffle-icon.png'),
    'Binary': require('../../assets/images/icons/search-icon.png'),
  };

  // Find matching key (case insensitive, partial match)
  const matchingKey = Object.keys(iconMap).find(key => 
    topicName.toLowerCase().includes(key.toLowerCase())
  );
  
  return matchingKey ? iconMap[matchingKey] : require('../../assets/images/icons/code-icon.png');
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Easy': return '#00B8A3';
    case 'Medium': return '#FFA116';
    case 'Hard': return '#FF375F';
    default: return '#6564c7';
  }
};

export default function HomeScreen() {
  console.log('HomeScreen component loaded');
  const { showStreakAnimation } = useStreak();
  const [profile, setProfile] = useState<UserProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topicsInProgress, setTopicsInProgress] = useState<TopicProgress[]>([]);
  const [roadmapTopics, setRoadmapTopics] = useState<{ name: string; color: string }[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    streak: 0,
    todayProblems: 0,
    totalProblems: 0,
    totalSolved: 0,
    easyCount: 0,
    mediumCount: 0,
    hardCount: 0
  });
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);

  const [recapLessons, setRecapLessons] = useState<RecapLesson[]>([]);
  const [recapQuestionCount, setRecapQuestionCount] = useState(0);

  // Refresh data when screen comes into focus (e.g., after lesson/quiz completion)
  useFocusEffect(
    useCallback(() => {
      console.log('🎯 HomeScreen: Screen focused, refreshing data');
      loadProfile();
      loadTopicsProgress();
      loadAllTopics();
      loadDailyChallenge();
      fetchRecapLessons();
    }, [])
  );

  useEffect(() => {
    if (profile) {
      loadDailyStats();
    }
  }, [profile]);

  const loadAllTopics = async () => {
    try {
      const topics = await TopicService.getAllTopics();
      const colorSchemes = [
        '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', 
        '#8B5CF6', '#F97316', '#06B6D4', '#84CC16', '#EC4899'
      ];
      
      setRoadmapTopics(topics.slice(0, 6).map((topic, index) => ({
        name: topic.name,
        color: colorSchemes[index % colorSchemes.length]
      })));
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const loadProfile = async () => {
    try {
      console.log('🔄 loadProfile: Starting...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ loadProfile: No user found');
        return;
      }

      const profileData = await ProfileService.getUserProfileStats(user.id);
      console.log('📊 loadProfile: Profile data loaded:', {
        current_streak: profileData?.current_streak,
        longest_streak: profileData?.longest_streak,
        total_xp: profileData?.total_xp
      });
      setProfile(profileData);
    } catch (error) {
      console.error('❌ loadProfile: Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyStats = async () => {
    try {
      console.log('🔄 loadDailyStats: Starting...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ loadDailyStats: No user found');
        return;
      }

      // Get user's solved problems with problem details
      const { data: solvedData } = await supabase
        .from('user_problem_progress')
        .select(`
          problem_id, 
          is_solved, 
          created_at,
          leetcode_problems (
            difficulty
          )
        `)
        .eq('user_id', user.id)
        .eq('is_solved', true);

      const totalSolved = solvedData?.length || 0;

      // Get today's solved problems
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayProblems = solvedData?.filter(item => {
        const itemDate = new Date(item.created_at);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === today.getTime();
      }).length || 0;

      // Get all problems data in one query
      const { data: allProblems } = await supabase
        .from('leetcode_problems')
        .select('difficulty');

      // Use actual LeetCode count if our database is incomplete
      const totalProblems = Math.max(allProblems?.length || 0, 3500);
      
      // Calculate dynamic difficulty counts based on user's solved problems
      const userEasyCount = solvedData?.filter(item => 
        item.leetcode_problems && (item.leetcode_problems as any).difficulty === 'Easy'
      ).length || 0;
      const userMediumCount = solvedData?.filter(item => 
        item.leetcode_problems && (item.leetcode_problems as any).difficulty === 'Medium'
      ).length || 0;
      const userHardCount = solvedData?.filter(item => 
        item.leetcode_problems && (item.leetcode_problems as any).difficulty === 'Hard'
      ).length || 0;

      const newDailyStats = {
        streak: profile?.current_streak || 0,
        todayProblems,
        totalProblems,
        totalSolved,
        easyCount: userEasyCount,
        mediumCount: userMediumCount,
        hardCount: userHardCount
      };

      console.log('📊 loadDailyStats: Updated daily stats:', {
        streak: newDailyStats.streak,
        profile_streak: profile?.current_streak,
        todayProblems: newDailyStats.todayProblems,
        totalSolved: newDailyStats.totalSolved
      });

      setDailyStats(newDailyStats);
    } catch (error) {
      console.error('❌ loadDailyStats: Error loading daily stats:', error);
    }
  };

  const loadTopicsProgress = useCallback(async () => {
    try {
      console.log('Loading topics progress');

      // Get user ID first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Get all topics and their stats
      const { data: topicStats, error: statsError } = await supabase
        .from('topic_stats')
        .select('*')
        .eq('user_id', user.id);

      if (statsError) {
        console.error('Error loading topic stats:', statsError);
        return;
      }

      // Convert to TopicProgress format and sort by completion percentage
      const progress = topicStats
        .map((stat): TopicProgress => ({
          name: stat.topic_name,
          completion_percentage: stat.completion_percentage || 0,
          lastEdited: new Date().toISOString()
        }))
        .sort((a, b) => b.completion_percentage - a.completion_percentage)
        .slice(0, 3); // Only take top 3 by completion percentage

      console.log('Topics progress loaded:', progress);
      setTopicsInProgress(progress);
    } catch (error) {
      console.error('Error loading topics progress:', error);
    }
  }, []);

  const handleTopicClick = async (topicName: string) => {
    console.log('handleTopicClick called with:', topicName);
    // Navigate to loading screen
    router.replace({
      pathname: '/screens/LoadingRoadMap',
      params: {
        topicName: topicName,
        from: 'home'
      }
    });
  };

  const handleRecapQuiz = () => {
    // Navigate to loading quiz with the last 3 lessons
    console.log('Starting recap quiz');
    const lessonTitles = recapLessons.map(lesson => lesson.title);
    console.log('Passing lesson titles:', lessonTitles);
    router.push({
      pathname: '/screens/LoadingQuiz',
      params: {
        lessonTitles: lessonTitles.join(',')
      }
    });
  };

  const getLastTopic = () => {
    if (topicsInProgress.length > 0) {
      return topicsInProgress[0].name;
    }
    return 'Arrays'; // Default fallback
  };

  const handleContinueLastTopic = () => {
    const lastTopic = getLastTopic();
    handleTopicClick(lastTopic);
  };



  const fetchRecapLessons = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch last 3 completed lessons
      const { data: lessonCompletions, error } = await supabase
        .from('user_lesson_completion')
        .select('problem_id, completed_at')
        .eq('user_id', user.id)
        .eq('quiz_completed', true)
        .order('completed_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching lesson completions:', error);
        return;
      }

      if (lessonCompletions && lessonCompletions.length > 0) {
        // Get problem details for each completed lesson
        const problemIds = lessonCompletions.map(lesson => lesson.problem_id);
        const { data: problems, error: problemsError } = await supabase
          .from('leetcode_problems')
          .select('leetcode_id, title, difficulty')
          .in('leetcode_id', problemIds);

        if (problemsError) {
          console.error('Error fetching problems:', problemsError);
          return;
        }

        // Combine lesson completions with problem details
        const recapData: RecapLesson[] = lessonCompletions.map(lesson => {
          const problem = problems?.find(p => p.leetcode_id === lesson.problem_id);
          return {
            problem_id: lesson.problem_id,
            title: problem?.title || 'Unknown Problem',
            difficulty: (problem?.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Easy',
            completed_at: lesson.completed_at
          };
        });

        setRecapLessons(recapData);
        setRecapQuestionCount(recapData.length * 3); // 3 questions per lesson
      }
    } catch (error) {
      console.error('Error in fetchRecapLessons:', error);
    }
  };

  const loadDailyChallenge = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Loading daily challenge for user:', user.id);
      
      // Use the new service to get or generate today's challenge
      const challenge = await DailyChallengeService.getOrGenerateTodayChallenge(user.id);
      
      if (challenge) {
        setDailyChallenge({
          date: challenge.challenge_date,
          problemId: challenge.problem_id,
          problemTitle: challenge.problem_title,
          completed: challenge.completed
        });
        console.log('Daily challenge loaded:', challenge);
      } else {
        // Fallback to generate challenge without database
        console.log('Using fallback challenge generation');
        const fallbackChallenge = await DailyChallengeService.generateFallbackChallenge(user.id);
        
        if (fallbackChallenge) {
          setDailyChallenge({
            date: fallbackChallenge.challenge_date,
            problemId: fallbackChallenge.problem_id,
            problemTitle: fallbackChallenge.problem_title,
            completed: fallbackChallenge.completed
          });
          console.log('Fallback challenge generated:', fallbackChallenge);
        }
      }
    } catch (error) {
      console.error('Error loading daily challenge:', error);
    }
  };

  const generateDailyChallenge = async (dateString: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all problems
      const { data: allProblems } = await supabase
        .from('leetcode_problems')
        .select('*');

      if (!allProblems || allProblems.length === 0) {
        console.error('No problems found');
        return;
      }

      // Generate random problem
      const randomIndex = Math.floor(Math.random() * allProblems.length);
      const randomProblem = allProblems[randomIndex];

      // Try to save the daily challenge to database (if table exists)
      try {
        const { data: insertData, error } = await supabase
          .from('user_daily_challenges')
          .insert({
            user_id: user.id,
            challenge_date: dateString,
            problem_id: randomProblem.leetcode_id,
            problem_title: randomProblem.title,
            completed: false
          })
          .select()
          .single();

        if (error) {
          console.log('Database table not available, using local state only');
        }
      } catch (dbError) {
        console.log('Database table not available, using local state only');
      }

      // Set challenge in local state regardless of database success
      setDailyChallenge({
        date: dateString,
        problemId: randomProblem.leetcode_id,
        problemTitle: randomProblem.title,
        completed: false
      });

      console.log(`Generated daily challenge: ${randomProblem.title} (ID: ${randomProblem.leetcode_id})`);
    } catch (error) {
      console.error('Error generating daily challenge:', error);
    }
  };

  const handleRandomQuestion = async () => {
    setChallengeLoading(true);
    
    try {
      let challenge = dailyChallenge;
      
      // If no challenge exists, generate one now
      if (!challenge) {
        console.log('No daily challenge available, generating one...');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('No user found');
          Alert.alert('Error', 'Please log in to access daily challenges');
          return;
        }

        // Use the service to generate today's challenge
        const newChallenge = await DailyChallengeService.getOrGenerateTodayChallenge(user.id);
        
        if (newChallenge) {
          challenge = {
            date: newChallenge.challenge_date,
            problemId: newChallenge.problem_id,
            problemTitle: newChallenge.problem_title,
            completed: newChallenge.completed
          };
          setDailyChallenge(challenge);
          console.log('Generated new daily challenge:', challenge);
        } else {
          // Fallback generation
          console.log('Using fallback generation...');
          const fallbackChallenge = await DailyChallengeService.generateFallbackChallenge(user.id);
          
          if (fallbackChallenge) {
            challenge = {
              date: fallbackChallenge.challenge_date,
              problemId: fallbackChallenge.problem_id,
              problemTitle: fallbackChallenge.problem_title,
              completed: fallbackChallenge.completed
            };
            setDailyChallenge(challenge);
            console.log('Generated fallback challenge:', challenge);
          } else {
            Alert.alert('Error', 'Unable to generate daily challenge. Please try again.');
            return;
          }
        }
      }

      // Check if challenge is completed
      if (challenge.completed) {
        Alert.alert(
          'Challenge Completed!', 
          'You\'ve already completed today\'s daily challenge. Come back tomorrow for a new one!',
          [{ text: 'OK' }]
        );
        return;
      }

      // Navigate to the roulette animation
      router.push(`/screens/dailyRoulette?problemId=${challenge.problemId}&title=${encodeURIComponent(challenge.problemTitle)}`);
      
    } catch (error) {
      console.error('Error handling daily challenge:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setChallengeLoading(false);
    }
  };

  // Function to mark daily challenge as completed (can be called from question screen)
  const markDailyChallengeCompleted = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !dailyChallenge) return;

      // Use the service to mark as completed
      const success = await DailyChallengeService.markChallengeCompleted(user.id);
      
      if (success) {
        // Update local state
        setDailyChallenge(prev => prev ? { ...prev, completed: true } : null);
        console.log('Daily challenge marked as completed!');
        
        // Trigger streak animation for daily challenge completion
        showStreakAnimation(1);
      }
    } catch (error) {
      console.error('Error marking daily challenge as completed:', error);
    }
  };

  // Reset daily streak for testing purposes
  const resetDailyStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clear last activity from both tables to allow streak animation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Delete today's activities from both tables
      const [problemResult, lessonResult] = await Promise.all([
        supabase
          .from('user_problem_progress')
          .delete()
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString()),
        supabase
          .from('user_lesson_completion')
          .delete()
          .eq('user_id', user.id)
          .gte('completed_at', today.toISOString())
      ]);

      if (problemResult.error) {
        console.error('Error clearing problem progress:', problemResult.error);
      }
      if (lessonResult.error) {
        console.error('Error clearing lesson completion:', lessonResult.error);
      }

      console.log('✅ Last activity cleared successfully');
      
      // Show alert to user
      Alert.alert(
        'Reset Complete! 🎯',
        'Today\'s activities have been cleared.\n\nYou can now test the streak animation by completing a lesson or problem!',
        [{ text: 'OK', style: 'default' }]
      );
      
      // Refresh profile data
      loadProfile();
    } catch (error) {
      console.error('Error clearing last activity:', error);
      Alert.alert('Error', 'Failed to clear activities. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <ThemedText style={styles.loadingText}>Loading your progress...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* User Profile Header */}
      <View style={styles.profileContainer}>
        {/* Left Container - Equal Width */}
        <View style={styles.sideContainer}>
          <TouchableOpacity style={styles.userSection} onPress={() => router.push('/(tabs)/profile')}>
            <Image source={require('../../assets/images/icons/profile-icon.png')} style={styles.avatar} />
            <ThemedText style={styles.userName} numberOfLines={1} ellipsizeMode="tail">{profile?.name || 'User'}</ThemedText>
          </TouchableOpacity>
        </View>
        
        {/* App Icon in Middle - Centered */}
        <View style={styles.appIconCenterContainer}>
          <View style={styles.appIconContainer}>
            <Image 
              source={require('../../assets/images/icons/codeonthego-bird-icon.png')} 
              style={styles.appIcon}
            />
          </View>
        </View>
        
        {/* Right Container - Equal Width */}
        <View style={styles.sideContainer}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Image source={require('../../assets/images/icons/fire-icon.png')} style={styles.statIcon} />
              <ThemedText style={styles.statValue} numberOfLines={1} ellipsizeMode="tail">{dailyStats.streak} days</ThemedText>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Learning Journey - Moved to Top */}
        <View style={styles.sectionWithTopPadding}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Image 
                source={require('../../assets/images/icons/codeonthego-bird-icon.png')} 
                style={styles.sectionIcon}
                tintColor="#8B5CF6"
              />
              <ThemedText style={styles.sectionTitle}>Your Learning Journey</ThemedText>
            </View>
          </View>
          
          {/* Learning Action Buttons */}
          <View style={styles.subsection}>
            <View style={styles.learningActionsGrid}>
              {/* Continue Last Topic Button - 70% width */}
              <TouchableOpacity 
                style={[styles.learningActionCard, styles.continueLastTopicCard, { backgroundColor: '#E0F2FE', borderColor: '#0288D1' }]} 
                onPress={handleContinueLastTopic}
              >
                <View style={[styles.learningActionIconContainer, { backgroundColor: '#0288D1' }]}>
                  <Image 
                    source={require('../../assets/images/icons/lesson-icon.png')} 
                    style={[styles.learningActionIcon, { tintColor: '#FFFFFF' }]}
                  />
                </View>
                <ThemedText style={[styles.learningActionTitle, { color: '#01579B' }]}>Continue doing {getLastTopic()}!</ThemedText>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${topicsInProgress.length > 0 ? topicsInProgress[0].completion_percentage : 0}%` }
                      ]} 
                    />
                  </View>
                  <ThemedText style={styles.progressText}>
                    {topicsInProgress.length > 0 ? `${topicsInProgress[0].completion_percentage}%` : '0%'} complete
                  </ThemedText>
                </View>
                <View style={styles.learningActionArrow}>
                  <Image 
                    source={require('../../assets/images/icons/up-arrow.png')} 
                    style={[styles.smallArrowIcon, { tintColor: '#0288D1' }]}
                  />
                </View>
              </TouchableOpacity>

              {/* Topical Roadmap Button - 30% width */}
              <TouchableOpacity 
                style={[styles.learningActionCard, styles.topicalRoadmapCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]} 
                onPress={() => router.push('/(tabs)/learn')}
              >
                <View style={[styles.learningActionIconContainer, { backgroundColor: '#F59E0B' }]}>
                  <Image 
                    source={require('../../assets/images/icons/book-icon.png')} 
                    style={[styles.learningActionIcon, { tintColor: '#FFFFFF' }]}
                  />
                </View>
                <ThemedText style={[styles.learningActionTitle, { color: '#92400E' }]}>Topical Roadmap</ThemedText>
                <ThemedText style={[styles.learningActionSubtitle, { color: '#B45309' }]}>12 topics available</ThemedText>
                <View style={styles.learningActionArrow}>
                  <Image 
                    source={require('../../assets/images/icons/up-arrow.png')} 
                    style={[styles.smallArrowIcon, { tintColor: '#F59E0B' }]}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Recap Quiz Button - Full Width */}
            <TouchableOpacity 
              style={[styles.recapCard, { 
                opacity: recapLessons.length === 0 ? 0.6 : 1,
                backgroundColor: '#F3E8FF',
                borderColor: '#8B5CF6'
              }]} 
              onPress={handleRecapQuiz}
              disabled={recapLessons.length === 0}
            >
              <View style={styles.recapIconContainer}>
                <Image 
                  source={require('../../assets/images/icons/retry-icon.png')} 
                  style={styles.recapIcon}
                />
              </View>
              <View style={styles.recapContent}>
                <ThemedText style={styles.recapTitle}>Active Recall</ThemedText>
                <ThemedText style={styles.recapDescription}>
                  Recap questions your last 3 completed lessons
                </ThemedText>
                <View style={styles.recapTagsContainer}>
                  {recapLessons.length === 0 ? (
                    <View style={styles.recapTag}>
                      <ThemedText style={styles.recapTagText}>No lessons completed</ThemedText>
                    </View>
                  ) : (
                    recapLessons.map((lesson, index) => (
                      <View key={index} style={styles.recapTag}>
                        <ThemedText style={styles.recapTagText}>{lesson.title}</ThemedText>
                      </View>
                    ))
                  )}
                </View>
              </View>
              <View style={styles.recapArrow}>
                <Image 
                  source={require('../../assets/images/icons/up-arrow.png')} 
                  style={styles.arrowIcon}
                />
              </View>
            </TouchableOpacity>


          </View>
        </View>



        {/* Quick Practice */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Image 
                source={require('../../assets/images/icons/duel-icon.png')} 
                style={styles.sectionIcon}
                tintColor="#8B5CF6"
              />
              <ThemedText style={styles.sectionTitle}>Quick Practice</ThemedText>
            </View>
            <View style={styles.testButtonsContainer}>
              {/* Reset Streak Button (for testing) */}
              <TouchableOpacity style={styles.testButton} onPress={resetDailyStreak}>
                <ThemedText style={styles.testButtonText}>Reset</ThemedText>
              </TouchableOpacity>
              
              {/* Streak Animation Button (for testing) */}
              <TouchableOpacity 
                style={styles.testButton} 
                onPress={() => {
                  router.push({
                    pathname: '/screens/StreakAnimation',
                    params: {
                      source: 'index',
                      isTestStreak: 'true'
                    }
                  });
                }}
              >
                <ThemedText style={styles.testButtonText}>Test Streak</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.quickActionsGrid}>
            {/* Daily Question Card */}
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]} 
              onPress={handleRandomQuestion}
              disabled={challengeLoading}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#EF4444' }]}>
                <Image 
                  source={require('../../assets/images/icons/fire-icon.png')} 
                  style={[styles.actionIcon, { tintColor: '#FFFFFF' }]}
                />
              </View>
              <ThemedText style={[styles.actionTitle, { color: '#991B1B' }]}>Daily Question</ThemedText>
              <ThemedText style={[styles.actionSubtitle, { color: '#DC2626' }]}>Find out the question!</ThemedText>
              <View style={styles.actionArrow}>
                {challengeLoading ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Image 
                    source={require('../../assets/images/icons/up-arrow.png')} 
                    style={[styles.smallArrowIcon, { tintColor: '#EF4444' }]}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* Practice Problems Card */}
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' }]} 
              onPress={() => router.push('/(tabs)/questions')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#3B82F6' }]}>
                <Image 
                  source={require('../../assets/images/icons/question-icon.png')} 
                  style={[styles.actionIcon, { tintColor: '#FFFFFF' }]}
                />
              </View>
              <ThemedText style={[styles.actionTitle, { color: '#1E40AF' }]}>Practice Problems</ThemedText>
              <ThemedText style={[styles.actionSubtitle, { color: '#1D4ED8' }]}>See all 3800 questions</ThemedText>
              <View style={styles.actionArrow}>
                <Image 
                  source={require('../../assets/images/icons/up-arrow.png')} 
                  style={[styles.smallArrowIcon, { tintColor: '#3B82F6' }]}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6FF',
  },
  mainContent: {
    flex: 1,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  
  // Profile Header
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  sideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginHorizontal: 8,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0, // Allow flex shrinking
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 120,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 90,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  statIcon: {
    width: 20,
    height: 20,
    marginRight: 6,
    // Removed tintColor to keep original icon colors
  },
  resetStreakButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetStreakText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // App Icon Styles
  appIconCenterContainer: {
    flex: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  appIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appIcon: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
  },

  // Sections
  section: {
    paddingHorizontal: 20,
  },
  sectionWithTopPadding: {
    paddingHorizontal: 20,
    marginBottom: 0,
    paddingTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 25,
    height: 25,
    marginRight: 8,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  subsection: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },



  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    width: 20,
    height: 20,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },

  actionArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  smallArrowIcon: {
    width: 12,
    height: 12,
    transform: [{ rotate: '90deg' }],
  },

  // Test Buttons Container
  testButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
    marginRight: 16,
  },
  testButton: {
    backgroundColor: '#F3F0FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  testButtonIcon: {
    width: 20,
    height: 20,
    tintColor: '#8B5CF6',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },

  // Topic Roadmap
  topicsScrollContent: {
    paddingLeft: 0,
  },
  topicsRow: {
    marginBottom: 12,
  },
  topicCard: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 20,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topicName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modernTopicCard: {
    width: 120,
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  topicIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topicCardIcon: {
    width: 24,
    height: 24,
  },
  modernTopicName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: '100%',
  },

  // Progress Grid
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 90,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  progressTopicName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    textAlign: 'center',
  },
  progressStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statCardIcon: {
    width: 24,
    height: 24,
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  bottomSpacing: {
    height: 20,
  },

  // Learning Actions Grid
  learningActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
  },
  continueLastTopicCard: {
    width: '60%',
  },
  topicalRoadmapCard: {
    width: '40%',
  },
  learningActionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    minHeight: 120,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  learningActionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  learningActionIcon: {
    width: 20,
    height: 20,
  },
  learningActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  learningActionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  learningActionArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  // Activity Dashboard Styles
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIcon: {
    width: 16,
    height: 16,
  },
  activityBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    lineHeight: 18,
  },
  activityDetails: {
    gap: 6,
  },
  activityDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  starIcon: {
    width: 12,
    height: 12,
  },
  activityDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'right',
  },


  recapTag: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  recapTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recapTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },

  // Recap Quiz Card Styles (from quiz.tsx)
  recapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 16,
  },
  recapIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recapIcon: {
    width: 24,
    height: 24,
    tintColor: '#8B5CF6',
  },
  recapContent: {
    flex: 1,
  },
  recapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  recapDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
    maxWidth: '90%',
  },
  recapBadge: {
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  recapBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  recapArrow: {
    marginLeft: 12,
  },
  arrowIcon: {
    width: 16,
    height: 16,
    tintColor: '#8B5CF6',
    transform: [{ rotate: '90deg' }],
  },

  // Progress Bar Styles
  progressContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 4,
    width: '80%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0288D1',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#0277BD',
    fontWeight: '500',
  },
});
