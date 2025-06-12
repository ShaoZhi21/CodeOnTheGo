import { supabase } from '../supabase';
import type {
    ProblemProgressUpdate,
    ProfileUpdateData,
    UserProblemProgress,
    UserProfile,
    UserProfileStats
} from '../types/profile';

export class ProfileService {
  /**
   * Get user profile by user ID
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found, create one
          return await this.createUserProfile(userId);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Get user profile with calculated stats
   */
  static async getUserProfileStats(userId: string): Promise<UserProfileStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_profile_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found, create one and return basic stats
          const profile = await this.createUserProfile(userId);
          if (profile) {
            return {
              ...profile,
              total_solved: 0,
              calculated_skill_level: 'Beginner'
            };
          }
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile stats:', error);
      return null;
    }
  }

  /**
   * Create a new user profile
   */
  static async createUserProfile(userId: string, name?: string): Promise<UserProfile | null> {
    try {
      // Get user info from auth
      const { data: authUser } = await supabase.auth.getUser();
      const userName = name || authUser.user?.user_metadata?.full_name || 'User';

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          name: userName,
          available_hints: 5, // Default hints for new users
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, updates: ProfileUpdateData): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
  }

  /**
   * Get user's problem progress
   */
  static async getUserProblemProgress(userId: string, problemId?: number): Promise<UserProblemProgress[]> {
    try {
      let query = supabase
        .from('user_problem_progress')
        .select('*')
        .eq('user_id', userId);

      if (problemId) {
        query = query.eq('problem_id', problemId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user problem progress:', error);
      return [];
    }
  }

  /**
   * Update problem progress
   */
  static async updateProblemProgress(
    userId: string, 
    progressUpdate: ProblemProgressUpdate
  ): Promise<UserProblemProgress | null> {
    try {
      const updateData: any = {
        user_id: userId,
        problem_id: progressUpdate.problem_id,
        last_attempt_at: new Date().toISOString(),
      };

      // Add optional fields if provided
      if (progressUpdate.is_solved !== undefined) {
        updateData.is_solved = progressUpdate.is_solved;
        if (progressUpdate.is_solved) {
          updateData.first_solved_at = new Date().toISOString();
        }
      }
      if (progressUpdate.attempts !== undefined) {
        updateData.attempts = progressUpdate.attempts;
      }
      if (progressUpdate.hints_used !== undefined) {
        updateData.hints_used = progressUpdate.hints_used;
      }
      if (progressUpdate.time_spent_minutes !== undefined) {
        updateData.time_spent_minutes = progressUpdate.time_spent_minutes;
      }

      const { data, error } = await supabase
        .from('user_problem_progress')
        .upsert(updateData, {
          onConflict: 'user_id,problem_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating problem progress:', error);
      return null;
    }
  }

  /**
   * Get user's solved problems with details
   */
  static async getUserSolvedProblems(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_problem_progress')
        .select(`
          *,
          leetcode_problems (
            leetcode_id,
            title,
            difficulty,
            tags
          )
        `)
        .eq('user_id', userId)
        .eq('is_solved', true)
        .order('first_solved_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching solved problems:', error);
      return [];
    }
  }

  /**
   * Update user's streak
   */
  static async updateStreak(userId: string, increment: boolean = true): Promise<UserProfile | null> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) return null;

      const updates: ProfileUpdateData = {
        current_streak: increment ? profile.current_streak + 1 : 0,
        longest_streak: increment 
          ? Math.max(profile.longest_streak, profile.current_streak + 1)
          : profile.longest_streak
      };

      return await this.updateUserProfile(userId, updates);
    } catch (error) {
      console.error('Error updating streak:', error);
      return null;
    }
  }

  /**
   * Add XP to user profile
   */
  static async addXP(userId: string, xpAmount: number): Promise<UserProfile | null> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) return null;

      const newTotalXP = profile.total_xp + xpAmount;
      const newLevel = Math.floor(newTotalXP / 100) + 1; // 100 XP per level

      const updates: ProfileUpdateData = {
        total_xp: newTotalXP,
        level: newLevel
      };

      return await this.updateUserProfile(userId, updates);
    } catch (error) {
      console.error('Error adding XP:', error);
      return null;
    }
  }

  /**
   * Award trophy to user
   */
  static async awardTrophy(userId: string, trophyCount: number = 1): Promise<UserProfile | null> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) return null;

      const updates: ProfileUpdateData = {
        trophy_count: profile.trophy_count + trophyCount
      };

      return await this.updateUserProfile(userId, updates);
    } catch (error) {
      console.error('Error awarding trophy:', error);
      return null;
    }
  }

  /**
   * Use a hint (decrease available hints by 1)
   */
  static async useHint(userId: string): Promise<UserProfile | null> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile || profile.available_hints <= 0) {
        return null; // No hints available
      }

      const updates: ProfileUpdateData = {
        available_hints: profile.available_hints - 1
      };

      return await this.updateUserProfile(userId, updates);
    } catch (error) {
      console.error('Error using hint:', error);
      return null;
    }
  }

  /**
   * Add hints to user profile
   */
  static async addHints(userId: string, hintCount: number = 1): Promise<UserProfile | null> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) return null;

      const updates: ProfileUpdateData = {
        available_hints: profile.available_hints + hintCount
      };

      return await this.updateUserProfile(userId, updates);
    } catch (error) {
      console.error('Error adding hints:', error);
      return null;
    }
  }

  /**
   * Get leaderboard data
   */
  static async getLeaderboard(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('name, level, total_xp, total_questions, trophy_count')
        .order('total_xp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }
} 