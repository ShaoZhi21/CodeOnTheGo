import { supabase } from '@/lib/supabase';

export interface UserProgress {
  id: string;
  user_id: string;
  problem_id: number;
  is_solved: boolean;
  score: number;
  stars: number;
  attempts: number;
  hints_used: number;
  time_spent_minutes: number;
  first_solved_at?: string;
  last_attempt_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CompleteQuestionParams {
  problemId: number;
  score: number;
  stars: number;
}

/**
 * Mark a question as completed for the current user
 */
export async function markQuestionComplete({
  problemId,
  score,
  stars
}: CompleteQuestionParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Validate and sanitize input values
    const validScore = Math.max(0, Math.min(100, Math.floor(Number(score) || 0)));
    const validStars = Math.max(0, Math.min(5, Math.floor(Number(stars) || 0)));

    console.log('Marking question complete:', {
      problemId,
      originalScore: score,
      validScore,
      originalStars: stars,
      validStars,
      userId: user.id
    });

    const now = new Date().toISOString();

    // First, get existing progress to check current best_score
    const { data: existingProgress } = await supabase
      .from('user_problem_progress')
      .select('best_score, attempts')
      .eq('user_id', user.id)
      .eq('problem_id', problemId)
      .single();

    const currentBestScore = existingProgress?.best_score || 0;
    const currentAttempts = existingProgress?.attempts || 0;
    const newBestScore = Math.max(currentBestScore, validScore);

    console.log('Best score logic:', {
      currentBestScore,
      newScore: validScore,
      newBestScore,
      isNewBest: validScore > currentBestScore
    });

    // Upsert user progress
    const { data, error } = await supabase
      .from('user_problem_progress')
      .upsert({
        user_id: user.id,
        problem_id: problemId,
        is_solved: true,
        score: validScore,
        best_score: newBestScore,
        stars: validStars,
        completed_at: now,
        first_solved_at: existingProgress ? undefined : now, // Only set on first completion
        last_attempt_at: now,
        attempts: currentAttempts + 1,
        updated_at: now
      }, {
        onConflict: 'user_id,problem_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Error marking question complete:', error);
      return { success: false, error: error.message };
    }

    console.log('Question marked as complete:', data);
    return { success: true };

  } catch (error) {
    console.error('Unexpected error marking question complete:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get user progress for a specific problem
 */
export async function getUserProgress(problemId: number): Promise<UserProgress | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_problem_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('problem_id', problemId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user hasn't attempted this problem
        return null;
      }
      console.error('Error fetching user progress:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching user progress:', error);
    return null;
  }
}

/**
 * Get user progress for multiple problems (for questions list)
 */
export async function getUserProgressForProblems(problemIds: number[]): Promise<Record<number, UserProgress>> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {};
    }

    const { data, error } = await supabase
      .from('user_problem_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('problem_id', problemIds);

    if (error) {
      console.error('Error fetching user progress for problems:', error);
      return {};
    }

    // Convert array to object with problem_id as key
    const progressMap: Record<number, UserProgress> = {};
    data?.forEach(progress => {
      progressMap[progress.problem_id] = progress;
    });

    return progressMap;
  } catch (error) {
    console.error('Unexpected error fetching user progress for problems:', error);
    return {};
  }
}

/**
 * Get user's overall statistics
 */
export async function getUserStats(): Promise<{
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  averageScore: number;
  totalStars: number;
} | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    // Get all completed problems for this user
    const { data, error } = await supabase
      .from('user_problem_progress')
      .select(`
        *,
        leetcode_problems!inner(difficulty)
      `)
      .eq('user_id', user.id)
      .eq('is_solved', true);

    if (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return {
        totalSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        averageScore: 0,
        totalStars: 0
      };
    }

    const stats = data.reduce((acc, progress: any) => {
      acc.totalSolved++;
      acc.totalStars += progress.stars;
      acc.scoreSum += progress.score;

      const difficulty = progress.leetcode_problems.difficulty;
      if (difficulty === 'Easy') acc.easySolved++;
      else if (difficulty === 'Medium') acc.mediumSolved++;
      else if (difficulty === 'Hard') acc.hardSolved++;

      return acc;
    }, {
      totalSolved: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      totalStars: 0,
      scoreSum: 0
    });

    return {
      totalSolved: stats.totalSolved,
      easySolved: stats.easySolved,
      mediumSolved: stats.mediumSolved,
      hardSolved: stats.hardSolved,
      averageScore: stats.totalSolved > 0 ? Math.round(stats.scoreSum / stats.totalSolved) : 0,
      totalStars: stats.totalStars
    };
  } catch (error) {
    console.error('Unexpected error fetching user stats:', error);
    return null;
  }
} 