import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecentTopic {
  topic_name: string;
  last_visited: string;
  visit_order: number;
}

const DEFAULT_TOPICS = ['Array', 'String', 'LinkedList'];
const RECENT_TOPICS_KEY = 'user_recent_topics';

export class RecentTopicsService {
  /**
   * Get user's recent topics from local storage
   */
  static async getRecentTopics(): Promise<string[]> {
    try {
      const storedTopics = await AsyncStorage.getItem(RECENT_TOPICS_KEY);
      
      if (!storedTopics) {
        // Initialize with default topics for new users
        await this.initializeDefaultTopics();
        return DEFAULT_TOPICS;
      }

      const recentTopics: string[] = JSON.parse(storedTopics);
      console.log('RecentTopicsService: Retrieved topics from storage:', recentTopics);
      return recentTopics;
    } catch (error) {
      console.error('Error in getRecentTopics:', error);
      return DEFAULT_TOPICS;
    }
  }

  /**
   * Update recent topics when user visits a topic
   */
  static async updateRecentTopics(topicName: string): Promise<void> {
    try {
      console.log('RecentTopicsService: Updating recent topics with:', topicName);
      
      // Get current recent topics
      const currentTopics = await this.getRecentTopics();
      console.log('RecentTopicsService: Current topics:', currentTopics);
      
      // Remove the topic if it already exists (to avoid duplicates)
      const filteredTopics = currentTopics.filter(topic => topic !== topicName);
      
      // Add the new topic to the beginning (most recent)
      const updatedTopics = [topicName, ...filteredTopics];
      
      // Keep only the first 3 topics
      const finalTopics = updatedTopics.slice(0, 3);
      
      console.log('RecentTopicsService: Updated topics:', finalTopics);
      
      // Save to storage
      await AsyncStorage.setItem(RECENT_TOPICS_KEY, JSON.stringify(finalTopics));
      console.log('RecentTopicsService: Topics saved to storage');
    } catch (error) {
      console.error('Error in updateRecentTopics:', error);
    }
  }

  /**
   * Initialize default topics for new users
   */
  private static async initializeDefaultTopics(): Promise<void> {
    try {
      console.log('RecentTopicsService: Initializing default topics');
      await AsyncStorage.setItem(RECENT_TOPICS_KEY, JSON.stringify(DEFAULT_TOPICS));
      console.log('RecentTopicsService: Default topics initialized');
    } catch (error) {
      console.error('Error in initializeDefaultTopics:', error);
    }
  }

  /**
   * Clear recent topics (for testing/debugging)
   */
  static async clearRecentTopics(): Promise<void> {
    try {
      await AsyncStorage.removeItem(RECENT_TOPICS_KEY);
      console.log('RecentTopicsService: Recent topics cleared');
    } catch (error) {
      console.error('Error in clearRecentTopics:', error);
    }
  }
} 