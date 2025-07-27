import { supabase } from '../supabase';

export interface Tournament {
  id: string;
  name: string;
  bracket_size: number;
  topic_id: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  max_players: number;
  current_players: number;
  entry_fee: number;
  prize_pool: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  winner_id?: string;
  created_by: string;
  topic?: { name: string };
  winner?: { id: string; email: string };
  creator?: { id: string; email: string };
}

export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  player_id: string;
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced';
  current_round: number;
  is_eliminated: boolean;
  total_score: number;
  matches_won: number;
  matches_played: number;
  joined_at: string;
  eliminated_at?: string;
  final_rank?: number;
  player?: { id: string; email: string };
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  player1_id?: string;
  player2_id?: string;
  question_id?: number;
  player1_score?: number;
  player2_score?: number;
  player1_submission_time?: string;
  player2_submission_time?: string;
  winner_id?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  player1?: { id: string; email: string };
  player2?: { id: string; email: string };
  winner?: { id: string; email: string };
  question?: { leetcode_id: number; title: string; difficulty: string; description?: string };
}

export interface TournamentSubmission {
  id: string;
  match_id: string;
  player_id: string;
  pseudocode: string;
  score?: number;
  analysis?: any;
  submitted_at: string;
  player?: { id: string; email: string };
}

export interface TournamentQueueEntry {
  id: string;
  player_id: string;
  bracket_size: number;
  topic_id: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced';
  joined_at: string;
  status: 'waiting' | 'matched' | 'cancelled';
}

export interface CreateTournamentData {
  name: string;
  bracketSize: number;
  topicId: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  entryFee?: number;
}

export interface JoinQueueData {
  bracketSize: number;
  topicId: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface TournamentStats {
  tournament: Tournament;
  totalPlayers: number;
  activePlayers: number;
  totalMatches: number;
  completedMatches: number;
  currentRound: number;
  players: (TournamentPlayer & { winRate: string })[];
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? 'http://localhost:3000' : 'https://codeonthego-backend.onrender.com');

export class TournamentService {
  /**
   * Create a new tournament
   */
  static async createTournament(data: CreateTournamentData): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`${API_BASE_URL}/api/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        createdBy: user.id
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create tournament');
    }

    const result = await response.json();
    return result.tournamentId;
  }

  /**
   * Join a tournament
   */
  static async joinTournament(tournamentId: string, skillLevel: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: user.id,
        skillLevel
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join tournament');
    }

    const result = await response.json();
    return result.success;
  }

  /**
   * Get tournament details
   */
  static async getTournament(tournamentId: string): Promise<Tournament> {
    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get tournament');
    }

    return response.json();
  }

  /**
   * Get all active tournaments
   */
  static async getActiveTournaments(): Promise<Tournament[]> {
    const response = await fetch(`${API_BASE_URL}/api/tournaments`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get tournaments');
    }

    return response.json();
  }

  /**
   * Get tournament bracket
   */
  static async getTournamentBracket(tournamentId: string): Promise<TournamentMatch[]> {
    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/bracket`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get bracket');
    }

    return response.json();
  }

  /**
   * Get tournament players
   */
  static async getTournamentPlayers(tournamentId: string): Promise<TournamentPlayer[]> {
    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/players`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get players');
    }

    return response.json();
  }

  /**
   * Get current match for a player
   */
  static async getCurrentMatch(tournamentId: string): Promise<TournamentMatch | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/current-match/${user.id}`);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      const error = await response.json();
      throw new Error(error.error || 'Failed to get current match');
    }

    return response.json();
  }

  /**
   * Start a match
   */
  static async startMatch(matchId: string): Promise<{ matchId: string; questionId: number }> {
    const response = await fetch(`${API_BASE_URL}/api/matches/${matchId}/start`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start match');
    }

    return response.json();
  }

  /**
   * Submit solution for a match
   */
  static async submitSolution(matchId: string, pseudocode: string): Promise<TournamentSubmission> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`${API_BASE_URL}/api/matches/${matchId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: user.id,
        pseudocode
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit solution');
    }

    return response.json();
  }

  /**
   * Complete a match
   */
  static async completeMatch(matchId: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/matches/${matchId}/complete`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete match');
    }

    const result = await response.json();
    return result.winnerId;
  }

  /**
   * Join tournament queue for matchmaking
   */
  static async joinQueue(data: JoinQueueData): Promise<TournamentQueueEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`${API_BASE_URL}/api/tournament-queue/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        playerId: user.id
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join queue');
    }

    return response.json();
  }

  /**
   * Leave tournament queue
   */
  static async leaveQueue(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`${API_BASE_URL}/api/tournament-queue/leave/${user.id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to leave queue');
    }

    return true;
  }

  /**
   * Get user's tournament history
   */
  static async getUserTournaments(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/tournaments`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get user tournaments');
    }

    return response.json();
  }

  /**
   * Get tournament statistics
   */
  static async getTournamentStats(tournamentId: string): Promise<TournamentStats> {
    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/stats`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get tournament stats');
    }

    return response.json();
  }

  /**
   * Get match submissions
   */
  static async getMatchSubmissions(matchId: string): Promise<TournamentSubmission[]> {
    const response = await fetch(`${API_BASE_URL}/api/matches/${matchId}/submissions`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get match submissions');
    }

    return response.json();
  }

  /**
   * Update submission with analysis
   */
  static async updateSubmissionAnalysis(submissionId: string, analysis: any): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}/analysis`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update submission analysis');
    }

    return true;
  }

  /**
   * Subscribe to tournament updates
   */
  static subscribeToTournament(tournamentId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`tournament:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `tournament_id=eq.${tournamentId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_players',
          filter: `tournament_id=eq.${tournamentId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to match updates
   */
  static subscribeToMatch(matchId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `id=eq.${matchId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_submissions',
          filter: `match_id=eq.${matchId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to queue updates
   */
  static subscribeToQueue(callback: (payload: any) => void) {
    return supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return null;

      return supabase
        .channel(`queue:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tournament_queue',
            filter: `player_id=eq.${user.id}`
          },
          callback
        )
        .subscribe();
    });
  }
} 