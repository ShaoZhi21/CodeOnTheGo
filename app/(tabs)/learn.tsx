import { ThemedText } from '@/components/ThemedText';
import { TopicService } from '@/lib/services/topicService';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

interface Topic {
  id: number;
  name: string;
  description: string;
}

interface TopicProgress {
  topic_name: string;
  completed_problems: number;
  total_problems: number;
  completion_percentage: number;
}

interface TopicCardProps {
  topic: Topic;
  index: number;
  progress?: TopicProgress;
  onPress: () => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 cards per row with 16px margins

// Topic icon mapping
const getTopicIcon = (topicName: string) => {
  const topicIcons: { [key: string]: any } = {
    'Arrays': require('@/assets/images/icons/list-icon.png'),
    'Strings': require('@/assets/images/icons/code-icon.png'),
    'Linked Lists': require('@/assets/images/icons/suggestion-icon.png'),
    'Trees': require('@/assets/images/icons/efficient-icon.png'),
    'Graphs': require('@/assets/images/icons/magnifying-glass-icon.png'),
    'Dynamic Programming': require('@/assets/images/icons/star-icon.png'),
    'Sorting': require('@/assets/images/icons/shuffle-icon.png'),
    'Searching': require('@/assets/images/icons/search-icon.png'),
    'Recursion': require('@/assets/images/icons/fire-icon.png'),
    'Hash Tables': require('@/assets/images/icons/checklist-icon.png'),
    'Two Pointers': require('@/assets/images/icons/duel-icon.png'),
    'Stack': require('@/assets/images/icons/trophy-icon.png'),
    'Queue': require('@/assets/images/icons/question-icon.png'),
    'Heap': require('@/assets/images/icons/up-arrow.png'),
    'Greedy': require('@/assets/images/icons/correct-icon.png'),
    'Backtracking': require('@/assets/images/icons/retry-icon.png'),
  };
  
  return topicIcons[topicName] || require('@/assets/images/icons/book-icon.png');
};

// Topic color mapping - pastel variety
const getTopicColors = (index: number) => {
  const colorSchemes = [
    { bg: '#F3F0FF', border: '#E0D7FF', accent: '#8B5CF6' }, // Purple
    { bg: '#FFF3E0', border: '#FFE0B2', accent: '#FF9800' }, // Orange
    { bg: '#E8F5E8', border: '#C8E6C9', accent: '#4CAF50' }, // Green
    { bg: '#E3F2FD', border: '#BBDEFB', accent: '#2196F3' }, // Blue
    { bg: '#FCE4EC', border: '#F8BBD9', accent: '#E91E63' }, // Pink
    { bg: '#F3E5F5', border: '#E1BEE7', accent: '#9C27B0' }, // Purple variant
    { bg: '#FFF8E1', border: '#FFECB3', accent: '#FFC107' }, // Amber
    { bg: '#E0F2F1', border: '#B2DFDB', accent: '#009688' }, // Teal
    { bg: '#FFEBEE', border: '#FFCDD2', accent: '#F44336' }, // Red
    { bg: '#F1F8E9', border: '#DCEDC8', accent: '#8BC34A' }, // Light Green
  ];
  
  return colorSchemes[index % colorSchemes.length];
};

const TopicCard: React.FC<TopicCardProps> = ({ topic, index, progress, onPress }) => {
  const colors = getTopicColors(index);
  
  return (
    <TouchableOpacity 
      style={[styles.topicCard, { backgroundColor: colors.bg, borderColor: colors.border }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
          <Image 
            source={getTopicIcon(topic.name)} 
            style={styles.topicIcon}
            tintColor="#FFFFFF"
          />
        </View>
        
        {progress && progress.total_problems > 0 && (
          <View style={styles.progressBadge}>
            <ThemedText style={styles.progressText}>
              {progress.completed_problems}/{progress.total_problems}
            </ThemedText>
          </View>
        )}
      </View>
      
      <View style={styles.cardContent}>
        <ThemedText style={[styles.topicTitle, { color: colors.accent }]} numberOfLines={2}>
          {topic.name}
        </ThemedText>
        
        <ThemedText style={styles.topicDescription} numberOfLines={2}>
          {topic.description}
        </ThemedText>
        
        {progress && progress.total_problems > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${progress.completion_percentage}%`,
                    backgroundColor: colors.accent 
                  }
                ]} 
              />
            </View>
            <ThemedText style={styles.progressLabel}>
              {Math.round(progress.completion_percentage)}% complete
            </ThemedText>
          </View>
        )}
        
        <View style={[styles.learnButton, { backgroundColor: colors.accent }]}>
          <ThemedText style={styles.learnButtonText}>
            {progress && progress.completed_problems > 0 ? 'Continue →' : 'Start →'}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function LearnScreen() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);
  const [topicProgress, setTopicProgress] = useState<{ [key: string]: TopicProgress }>({});

  useEffect(() => {
    loadTopics();
    loadRecentTopics();
  }, []);

  // Load progress when topics are available
  useEffect(() => {
    if (topics.length > 0) {
      loadTopicProgress();
    }
  }, [topics]);

  const loadTopics = async () => {
    try {
      const topicsData = await TopicService.getAllTopics();
      setTopics(topicsData);
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentTopics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const recentData = await TopicService.getRecentTopicNavigation(user.id);
        setRecentTopics(recentData.map(item => item.topic_name));
      }
    } catch (error) {
      console.error('Error loading recent topics:', error);
    }
  };

  const loadTopicProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && topics.length > 0) {
        // Calculate progress for each topic
        const progressMap: { [key: string]: TopicProgress } = {};
        
        for (const topic of topics) {
          // Get total problems for this topic
          const { data: topicProblems } = await supabase
            .from('topic_problems')
            .select('leetcode_id')
            .eq('topic_name', topic.name)
            .eq('is_premium', false);

          const totalProblems = topicProblems?.length || 0;

          // Get completed problems for this topic
          const { data: completedData } = await supabase
            .from('user_problem_progress')
            .select('problem_id')
            .eq('user_id', user.id)
            .eq('is_solved', true)
            .in('problem_id', topicProblems?.map(p => p.leetcode_id) || []);

          const completedProblems = completedData?.length || 0;

          if (totalProblems > 0) {
            progressMap[topic.name] = {
              topic_name: topic.name,
              completed_problems: completedProblems,
              total_problems: totalProblems,
              completion_percentage: (completedProblems / totalProblems) * 100,
            };
          }
        }

        setTopicProgress(progressMap);
      }
    } catch (error) {
      console.error('Error loading topic progress:', error);
    }
  };

  const handleTopicPress = async (topic: Topic) => {
    try {
      // Record topic navigation
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await TopicService.recordTopicNavigation(user.id, topic.name);
      }
      
      // Navigate to loading screen first
      router.replace({
        pathname: '/screens/LoadingRoadMap',
        params: {
          topicName: topic.name,
          from: 'learn'
        }
      });
    } catch (error) {
      console.error('Error navigating to topic:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6564c7" />
          <ThemedText style={styles.loadingText}>Loading topics...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const recentTopicData = topics.filter(topic => recentTopics.includes(topic.name));
  const allTopicsData = topics;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.mainTitle}>Learn & Practice</ThemedText>
          <ThemedText style={styles.subtitle}>
            Master data structures and algorithms through interactive lessons
          </ThemedText>
        </View>

        {/* Recent Topics Section */}
        {recentTopicData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Image 
                  source={require('@/assets/images/icons/fire-icon.png')} 
                  style={styles.sectionIcon}
                  tintColor="#6564c7"
                />
                <ThemedText style={styles.sectionTitle}>Continue Learning</ThemedText>
              </View>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {recentTopicData.map((topic, index) => (
                <View key={topic.id} style={styles.horizontalCard}>
                  <TopicCard 
                    topic={topic} 
                    index={index} 
                    progress={topicProgress[topic.name]}
                    onPress={() => handleTopicPress(topic)} 
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Topics Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Image 
                source={require('@/assets/images/icons/book-icon.png')} 
                style={styles.sectionIcon}
                tintColor="#6564c7"
              />
              <ThemedText style={styles.sectionTitle}>All Topics</ThemedText>
            </View>
            <ThemedText style={styles.topicCount}>{allTopicsData.length} topics</ThemedText>
          </View>
          
          <View style={styles.topicsGrid}>
            {allTopicsData.map((topic, index) => (
              <TopicCard 
                key={topic.id} 
                topic={topic} 
                index={index} 
                progress={topicProgress[topic.name]}
                onPress={() => handleTopicPress(topic)} 
              />
            ))}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6FF', // Purple-tinted background like duel.tsx
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F6FF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 8,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  topicCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D7FF',
  },
  horizontalScroll: {
    paddingLeft: 24,
  },
  horizontalCard: {
    marginRight: 16,
    width: CARD_WIDTH,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  topicCard: {
    width: CARD_WIDTH,
    backgroundColor: '#F3F0FF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0D7FF',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#8B5CF6', // This will be overridden by dynamic colors
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicIcon: {
    width: 24,
    height: 24,
  },
  progressBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  cardContent: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6', // This will be overridden by dynamic colors
    marginBottom: 8,
    lineHeight: 20,
  },
  topicDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  learnButton: {
    backgroundColor: '#8B5CF6', // This will be overridden by dynamic colors
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  learnButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 32,
  },
}); 