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

interface TopicCardProps {
  topic: Topic;
  index: number;
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

// Topic color mapping for variety
const getTopicColors = (index: number) => {
  const colorSchemes = [
    { bg: '#F3F0FF', border: '#E0D7FF', accent: '#6564c7' },
    { bg: '#F8F6FF', border: '#E6E0FF', accent: '#7C4DFF' },
    { bg: '#F1EFFF', border: '#DDD5FF', accent: '#5E35B1' },
    { bg: '#F5F3FF', border: '#E3DEFF', accent: '#673AB7' },
    { bg: '#F9F7FF', border: '#E8E3FF', accent: '#9C27B0' },
    { bg: '#F2F0FF', border: '#DED6FF', accent: '#8E24AA' },
  ];
  
  return colorSchemes[index % colorSchemes.length];
};

const TopicCard: React.FC<TopicCardProps> = ({ topic, index, onPress }) => {
  const colors = getTopicColors(index);
  
  return (
    <TouchableOpacity 
      style={[styles.topicCard, { backgroundColor: colors.bg, borderColor: colors.border }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
        <Image 
          source={getTopicIcon(topic.name)} 
          style={styles.topicIcon}
          tintColor="#FFFFFF"
        />
      </View>
      
      <View style={styles.cardContent}>
        <ThemedText style={[styles.topicTitle, { color: colors.accent }]} numberOfLines={2}>
          {topic.name}
        </ThemedText>
        
        <ThemedText style={styles.topicDescription} numberOfLines={3}>
          {topic.description}
        </ThemedText>
        
        <View style={[styles.learnButton, { backgroundColor: colors.accent }]}>
          <ThemedText style={styles.learnButtonText}>Learn →</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function LearnScreen() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);

  useEffect(() => {
    loadTopics();
    loadRecentTopics();
  }, []);

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

  const handleTopicPress = async (topic: Topic) => {
    try {
      // Record topic navigation
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await TopicService.recordTopicNavigation(user.id, topic.name);
      }
      
      // Navigate to roadmap topic screen
      router.push({
        pathname: '/screens/roadmaptopic',
        params: { 
          topic: topic.name,
          topicId: topic.id.toString()
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
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6564c7',
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
    shadowColor: '#6564c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#6564c7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicIcon: {
    width: 24,
    height: 24,
  },
  cardContent: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6564c7',
    marginBottom: 8,
    lineHeight: 20,
  },
  topicDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
    flex: 1,
  },
  learnButton: {
    backgroundColor: '#6564c7',
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