import { apiCall } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';

export interface TopicProblem {
  topic_id: number;
  topic_name: string;
  leetcode_id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  acceptance_rate: number;
  is_premium: boolean;
  difficulty_order: number;
  description?: string;
}

export interface TopicStats {
  topic_id: number;
  topic_name: string;
  total_problems: number;
  easy_problems: number;
  medium_problems: number;
  hard_problems: number;
  avg_acceptance_rate: number;
}

export class TopicService {
  /**
   * Get all problems for a specific topic, ordered by difficulty
   */
  static async getTopicProblems(topicName: string): Promise<TopicProblem[]> {
    try {
      const { data, error } = await supabase
        .from('topic_problems')
        .select('*')
        .eq('topic_name', topicName)
        .eq('is_premium', false)
        .not('title', 'is', null)
        .not('title', 'eq', '')
        .order('difficulty_order', { ascending: true });

      if (error) {
        console.error('Error fetching topic problems:', error);
        throw new Error(`Failed to fetch problems for topic ${topicName}: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.warn(`No problems found for topic ${topicName}`);
        return [];
      }
      
      // Additional client-side filtering for safety
      const filteredData = data.filter(problem => {
        // Ensure problem has valid structure
        if (!problem || !problem.leetcode_id) return false;
        
        // Ensure title is valid
        if (!problem.title || 
            problem.title === null || 
            problem.title === undefined ||
            typeof problem.title !== 'string' ||
            problem.title.trim() === '' ||
            problem.title.trim() === 'null' ||
            problem.title.trim() === 'undefined') {
          return false;
        }
        
        // Ensure not premium (double check)
        if (problem.is_premium === true) return false;
        
        // Ensure difficulty is valid
        if (!['Easy', 'Medium', 'Hard'].includes(problem.difficulty)) return false;
        
        return true;
      });
      
      return filteredData;
    } catch (error) {
      console.error('Error in getTopicProblems:', error);
      throw error;
    }
  }

  /**
   * Get statistics for a specific topic
   * Note: topic_stats is a view with one row per user per topic.
   * For global stats (total_problems, etc.), we can use any row since they're the same.
   */
  static async getTopicStats(topicName: string, userId?: string): Promise<TopicStats | null> {
    try {
      let query = supabase
        .from('topic_stats')
        .select('*')
        .eq('topic_name', topicName);

      // If userId is provided, filter by user for user-specific stats
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        console.error('Error fetching topic stats:', error);
        throw new Error(`Failed to fetch stats for topic ${topicName}: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.warn(`No stats found for topic ${topicName}`);
        return null;
      }
      
      // Return the first row (total_problems, easy_problems, etc. are the same for all users)
      return data[0];
    } catch (error) {
      console.error('Error in getTopicStats:', error);
      throw error;
    }
  }

  /**
   * Get all available topics
   */
  static async getAllTopics(): Promise<{ id: number; name: string; description: string }[]> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, description')
        .order('difficulty_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching topics:', error);
      return [];
    }
  }

  /**
   * Record topic navigation for a user
   */
  static async recordTopicNavigation(userId: string, topicName: string): Promise<void> {
    try {
      const response = await apiCall('/api/topic-navigation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          topicName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record topic navigation');
      }
    } catch (error) {
      console.error('Error recording topic navigation:', error);
      // Don't throw error to avoid breaking the user experience
    }
  }

  /**
   * Get recent topic navigation for a user
   */
  static async getRecentTopicNavigation(userId: string): Promise<{ topic_name: string; visited_at: string }[]> {
    try {
      const response = await apiCall(`/api/topic-navigation/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch topic navigation');
      }

      const data = await response.json();
      return data.navigation || [];
    } catch (error) {
      console.error('Error fetching topic navigation:', error);
      return [];
    }
  }
} 
