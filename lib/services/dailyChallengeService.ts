import { supabase } from '@/lib/supabase';

export interface DailyChallenge {
  id?: number;
  user_id: string;
  challenge_date: string;
  problem_id: number;
  problem_title: string;
  completed: boolean;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export class DailyChallengeService {
  /**
   * Get today's date string in YYYY-MM-DD format
   */
  private static getTodayDateString(): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to 12am
    return today.getFullYear() + '-' + 
           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
           String(today.getDate()).padStart(2, '0');
  }

  /**
   * Generate a random problem from available problems
   */
  private static generateRandomProblem(allProblems: any[]): any {
    if (!allProblems || allProblems.length === 0) {
      throw new Error('No problems available');
    }

    // Just use Math.random() for simplicity
    const randomIndex = Math.floor(Math.random() * allProblems.length);
    return allProblems[randomIndex];
  }

  /**
   * Check if today's challenge exists for the user
   */
  static async getTodayChallenge(userId: string): Promise<DailyChallenge | null> {
    try {
      const todayDateString = this.getTodayDateString();
      
      const { data, error } = await supabase
        .from('user_daily_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('challenge_date', todayDateString)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching today\'s challenge:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error in getTodayChallenge:', error);
      return null;
    }
  }

  /**
   * Generate today's challenge if it doesn't exist
   */
  static async generateTodayChallenge(userId: string): Promise<DailyChallenge | null> {
    try {
      const todayDateString = this.getTodayDateString();
      
      // First check if challenge already exists
      const existingChallenge = await this.getTodayChallenge(userId);
      if (existingChallenge) {
        console.log('Today\'s challenge already exists:', existingChallenge);
        return existingChallenge;
      }

      // Get all problems from database
      const { data: allProblems, error: problemsError } = await supabase
        .from('leetcode_problems')
        .select('*');

      if (problemsError || !allProblems || allProblems.length === 0) {
        console.error('Error fetching problems:', problemsError);
        throw new Error('No problems available for daily challenge');
      }

      // Generate random problem
      const selectedProblem = this.generateRandomProblem(allProblems);

      // Save the challenge to database
      const { data: newChallenge, error: insertError } = await supabase
        .from('user_daily_challenges')
        .insert({
          user_id: userId,
          challenge_date: todayDateString,
          problem_id: selectedProblem.leetcode_id,
          problem_title: selectedProblem.title,
          completed: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating daily challenge:', insertError);
        throw new Error('Failed to create daily challenge');
      }

      console.log(`Generated new daily challenge for ${todayDateString}:`, newChallenge);
      return newChallenge;

    } catch (error) {
      console.error('Error in generateTodayChallenge:', error);
      return null;
    }
  }

  /**
   * Get or generate today's challenge (main function to use)
   */
  static async getOrGenerateTodayChallenge(userId: string): Promise<DailyChallenge | null> {
    try {
      // First try to get existing challenge
      let challenge = await this.getTodayChallenge(userId);
      
      if (!challenge) {
        // Generate new challenge if none exists
        console.log('No challenge found for today, generating new one...');
        challenge = await this.generateTodayChallenge(userId);
      }

      return challenge;
    } catch (error) {
      console.error('Error in getOrGenerateTodayChallenge:', error);
      return null;
    }
  }

  /**
   * Mark today's challenge as completed
   */
  static async markChallengeCompleted(userId: string): Promise<boolean> {
    try {
      const todayDateString = this.getTodayDateString();
      
      const { error } = await supabase
        .from('user_daily_challenges')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('challenge_date', todayDateString);

      if (error) {
        console.error('Error marking challenge as completed:', error);
        return false;
      }

      console.log('Daily challenge marked as completed');
      return true;
    } catch (error) {
      console.error('Error in markChallengeCompleted:', error);
      return false;
    }
  }

  /**
   * Get challenge statistics for the user
   */
  static async getChallengeStats(userId: string): Promise<{
    totalChallenges: number;
    completedChallenges: number;
    currentStreak: number;
    longestStreak: number;
  }> {
    try {
      // Get all user challenges
      const { data: challenges, error } = await supabase
        .from('user_daily_challenges')
        .select('*')
        .eq('user_id', userId)
        .order('challenge_date', { ascending: false });

      if (error) {
        console.error('Error fetching challenge stats:', error);
        return { totalChallenges: 0, completedChallenges: 0, currentStreak: 0, longestStreak: 0 };
      }

      const totalChallenges = challenges?.length || 0;
      const completedChallenges = challenges?.filter(c => c.completed).length || 0;

      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      if (challenges) {
        for (let i = 0; i < challenges.length; i++) {
          if (challenges[i].completed) {
            tempStreak++;
            if (i === 0) currentStreak = tempStreak; // Current streak starts from most recent
          } else {
            if (i === 0) currentStreak = 0; // Break current streak if most recent is not completed
            tempStreak = 0;
          }
          longestStreak = Math.max(longestStreak, tempStreak);
        }
      }

      return {
        totalChallenges,
        completedChallenges,
        currentStreak,
        longestStreak
      };
    } catch (error) {
      console.error('Error in getChallengeStats:', error);
      return { totalChallenges: 0, completedChallenges: 0, currentStreak: 0, longestStreak: 0 };
    }
  }

  /**
   * Fallback method when database table doesn't exist - just generates a simple random challenge
   */
  static async generateFallbackChallenge(userId: string): Promise<DailyChallenge | null> {
    try {
      const todayDateString = this.getTodayDateString();
      
      // Simple fallback - generate a random problem ID between 1-3000 (typical LeetCode range)
      const randomProblemId = Math.floor(Math.random() * 3000) + 1;
      
      // Return challenge object (without saving to database)
      return {
        user_id: userId,
        challenge_date: todayDateString,
        problem_id: randomProblemId,
        problem_title: `Problem ${randomProblemId}`,
        completed: false
      };
    } catch (error) {
      console.error('Error in generateFallbackChallenge:', error);
      return null;
    }
  }
} 