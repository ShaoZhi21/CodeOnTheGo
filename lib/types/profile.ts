export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  level: number;
  total_xp: number;
  skill_level: 'Beginner' | 'Intermediate' | 'Professional';
  total_questions: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  completion_percentage: number;
  trophy_count: number;
  current_streak: number;
  longest_streak: number;
  hints_used: number;
  available_hints: number;
  last_activity_date: string;
  created_at: string;
  updated_at: string;
}

export interface UserProblemProgress {
  id: string;
  user_id: string;
  problem_id: number;
  is_solved: boolean;
  attempts: number;
  hints_used: number;
  time_spent_minutes: number;
  first_solved_at?: string;
  last_attempt_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfileStats extends UserProfile {
  total_solved: number;
  calculated_skill_level: string;
}

export interface ProfileUpdateData {
  name?: string;
  skill_level?: 'Beginner' | 'Intermediate' | 'Professional';
  level?: number;
  total_xp?: number;
  trophy_count?: number;
  current_streak?: number;
  longest_streak?: number;
  available_hints?: number;
}

export interface ProblemProgressUpdate {
  problem_id: number;
  is_solved?: boolean;
  attempts?: number;
  hints_used?: number;
  time_spent_minutes?: number;
} 