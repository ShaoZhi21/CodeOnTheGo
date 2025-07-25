import { ThemedText } from '@/components/ThemedText';
import { TopicService } from '@/lib/services/topicService';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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

interface TopicProgressHome {
  name: string;
  completion_percentage: number;
  lastEdited: string;
}

interface TopicCardProps {
  topic: Topic;
  index: number;
  progress?: TopicProgress;
  onPress: () => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 cards per row with 16px margins
const STATS_CARD_WIDTH = (width - 64) / 3; // 3 cards per row with margins and gaps

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
  
  // Always have a default progress object, even if progress is undefined
  const displayProgress = {
    topic_name: topic.name,
    completed_problems: progress?.completed_problems || 0,
    total_problems: progress?.total_problems || 0,
    completion_percentage: progress?.completion_percentage || 0
  };
  
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
        
        {/* ALWAYS show progress badge - NO CONDITIONAL */}
        <View style={styles.progressBadge}>
          <ThemedText style={styles.progressText}>
            {displayProgress.completed_problems}/{displayProgress.total_problems || '?'}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <ThemedText style={[styles.topicTitle, { color: colors.accent }]} numberOfLines={2}>
          {topic.name}
        </ThemedText>
        
        <ThemedText style={styles.topicDescription} numberOfLines={2}>
          {topic.description}
        </ThemedText>
        
        {/* ALWAYS show progress container - NO CONDITIONAL */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${displayProgress.completion_percentage}%`,
                  backgroundColor: colors.accent 
                }
              ]} 
            />
          </View>
          <ThemedText style={styles.progressLabel}>
            {Math.round(displayProgress.completion_percentage)}% complete
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function LearnScreen() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicProgress, setTopicProgress] = useState<{ [key: string]: TopicProgress }>({});
  const [topicsInProgress, setTopicsInProgress] = useState<TopicProgressHome[]>([]);

  useEffect(() => {
    loadTopics();
  }, []);

  // Load progress when topics are available
  useEffect(() => {
    if (topics.length > 0) {
      loadTopicProgress();
      loadTopicsProgress();
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

  const loadTopicProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && topics.length > 0) {
        // Use the same topic_stats view that "Your Progress" uses for consistency
        const { data: topicStats, error: statsError } = await supabase
          .from('topic_stats')
          .select('*')
          .eq('user_id', user.id);

        if (statsError) {
          console.error('Error loading topic stats:', statsError);
          return;
        }

        // Create progress map from topic_stats data
        const progressMap: { [key: string]: TopicProgress } = {};
        
        for (const topic of topics) {
          const topicStat = topicStats.find(stat => stat.topic_name === topic.name);
          
          if (topicStat) {
            progressMap[topic.name] = {
              topic_name: topic.name,
              completed_problems: topicStat.completed_problems || 0,
              total_problems: topicStat.total_problems || 0,
              completion_percentage: topicStat.completion_percentage || 0,
            };
          } else {
            // If no stats found for this topic, set default values
            progressMap[topic.name] = {
              topic_name: topic.name,
              completed_problems: 0,
              total_problems: 0,
              completion_percentage: 0,
            };
          }
        }

        setTopicProgress(progressMap);
      }
    } catch (error) {
      console.error('Error loading topic progress:', error);
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
        .map((stat): TopicProgressHome => ({
          name: stat.topic_name,
          completion_percentage: stat.completion_percentage || 0,
          lastEdited: new Date().toISOString()
        }))
        .sort((a, b) => b.completion_percentage - a.completion_percentage)
        .slice(0, 3); // Only take top 3 by completion percentage

      setTopicsInProgress(progress);
    } catch (error) {
      console.error('Error loading topics progress:', error);
    }
  }, []);

  const handleTopicPress = async (topic: Topic) => {
    try {
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

        {/* Progress Statistics Section */}
        {topicsInProgress.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Image 
                  source={require('@/assets/images/icons/trophy-icon.png')} 
                  style={styles.sectionIcon}
                  tintColor="#6564c7"
                />
                <ThemedText style={styles.sectionTitle}>Your Progress</ThemedText>
              </View>
            </View>
            
            <View style={styles.progressGrid}>
              {topicsInProgress.map((topic, index) => (
                <TouchableOpacity 
                  key={topic.name} 
                  style={[styles.progressCard, { backgroundColor: getTopicColors(index).bg }]} 
                  onPress={() => {
                    const topicObj = topics.find(t => t.name === topic.name);
                    if (topicObj) {
                      handleTopicPress(topicObj);
                    }
                  }}
                >
                  <View style={styles.progressCircleContainer}>
                    <View style={[styles.progressCircle, { borderColor: getTopicColors(index).accent }]}>
                      <View 
                        style={[
                          styles.progressCircleFill, 
                          { 
                            backgroundColor: getTopicColors(index).accent,
                            transform: [{ rotate: `${(topic.completion_percentage / 100) * 360}deg` }]
                          }
                        ]} 
                      />
                      <View style={styles.progressCircleInner}>
                        <ThemedText style={styles.progressPercentage}>{Math.round(topic.completion_percentage)}%</ThemedText>
                      </View>
                    </View>
                  </View>
                  <ThemedText 
                    style={[styles.progressTopicName, { color: getTopicColors(index).accent }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {topic.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
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
    marginBottom: 10,
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
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  topicCard: {
    width: CARD_WIDTH,
    backgroundColor: '#F3F0FF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0D7FF',
    padding: 12,
    marginBottom: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#8B5CF6', // This will be overridden by dynamic colors
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicIcon: {
    width: 20,
    height: 20,
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B5CF6', // This will be overridden by dynamic colors
    marginBottom: 6,
    lineHeight: 18,
  },
  topicDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 8,
  },
  progressContainer: {
    marginBottom: 8,
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
  bottomSpacing: {
    height: 32,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 8,
  },
  progressCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 150,
  },
  progressCircleContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  progressCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  progressCircleFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 35,
    borderWidth: 5,
    borderColor: 'transparent',
    borderTopColor: 'currentColor',
    borderRightColor: 'currentColor',
  },
  progressCircleInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  progressTopicName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
  },
}); 