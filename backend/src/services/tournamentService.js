const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

class TournamentService {
  /**
   * Create a new tournament
   */
  static async createTournament(tournamentData) {
    try {
      const { name, bracketSize, topicId, difficulty, entryFee, createdBy } = tournamentData;
      
      const { data, error } = await supabase.rpc('create_tournament', {
        p_name: name,
        p_bracket_size: bracketSize,
        p_topic_id: topicId,
        p_difficulty: difficulty,
        p_entry_fee: entryFee || 0,
        p_created_by: createdBy
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  }

  /**
   * Join a tournament
   */
  static async joinTournament(tournamentId, playerId, skillLevel) {
    try {
      const { data, error } = await supabase.rpc('join_tournament', {
        p_tournament_id: tournamentId,
        p_player_id: playerId,
        p_skill_level: skillLevel
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error joining tournament:', error);
      throw error;
    }
  }

  /**
   * Get tournament details
   */
  static async getTournament(tournamentId) {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          topic:topics(name),
          winner:auth.users(id, email),
          creator:auth.users(id, email)
        `)
        .eq('id', tournamentId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting tournament:', error);
      throw error;
    }
  }

  /**
   * Get all active tournaments
   */
  static async getActiveTournaments() {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          topic:topics(name)
        `)
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting active tournaments:', error);
      throw error;
    }
  }

  /**
   * Get tournament bracket
   */
  static async getTournamentBracket(tournamentId) {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          player1:auth.users(id, email),
          player2:auth.users(id, email),
          winner:auth.users(id, email),
          question:problems(leetcode_id, title, difficulty, description)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting tournament bracket:', error);
      throw error;
    }
  }

  /**
   * Get tournament players
   */
  static async getTournamentPlayers(tournamentId) {
    try {
      const { data, error } = await supabase
        .from('tournament_players')
        .select(`
          *,
          player:auth.users(id, email)
        `)
        .eq('tournament_id', tournamentId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting tournament players:', error);
      throw error;
    }
  }

  /**
   * Get current match for a player
   */
  static async getCurrentMatch(tournamentId, playerId) {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          player1:auth.users(id, email),
          player2:auth.users(id, email),
          winner:auth.users(id, email),
          question:problems(leetcode_id, title, difficulty, description)
        `)
        .eq('tournament_id', tournamentId)
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
        .in('status', ['pending', 'active'])
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error getting current match:', error);
      throw error;
    }
  }

  /**
   * Start a match
   */
  static async startMatch(matchId) {
    try {
      // Get match details
      const { data: match, error: matchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      // Get tournament details
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', match.tournament_id)
        .single();

      if (tournamentError) throw tournamentError;

      // Select a question for this match
      const { data: questionId, error: questionError } = await supabase.rpc('select_match_question', {
        p_tournament_id: match.tournament_id,
        p_round_number: match.round_number,
        p_topic_id: tournament.topic_id,
        p_difficulty: tournament.difficulty
      });

      if (questionError) throw questionError;

      // Update match to active with question
      const { error: updateError } = await supabase
        .from('tournament_matches')
        .update({
          status: 'active',
          question_id: questionId,
          started_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (updateError) throw updateError;

      return { matchId, questionId };
    } catch (error) {
      console.error('Error starting match:', error);
      throw error;
    }
  }

  /**
   * Submit solution for a match
   */
  static async submitSolution(matchId, playerId, pseudocode) {
    try {
      // Check if submission already exists
      const { data: existingSubmission, error: checkError } = await supabase
        .from('tournament_submissions')
        .select('id')
        .eq('match_id', matchId)
        .eq('player_id', playerId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingSubmission) {
        throw new Error('Submission already exists for this player');
      }

      // Create submission
      const { data, error } = await supabase
        .from('tournament_submissions')
        .insert({
          match_id: matchId,
          player_id: playerId,
          pseudocode: pseudocode
        })
        .select()
        .single();

      if (error) throw error;

      // Update match with submission time
      const { data: match, error: matchError } = await supabase
        .from('tournament_matches')
        .select('player1_id, player2_id')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      const updateData = {};
      if (match.player1_id === playerId) {
        updateData.player1_submission_time = new Date().toISOString();
      } else if (match.player2_id === playerId) {
        updateData.player2_submission_time = new Date().toISOString();
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('tournament_matches')
          .update(updateData)
          .eq('id', matchId);

        if (updateError) throw updateError;
      }

      return data;
    } catch (error) {
      console.error('Error submitting solution:', error);
      throw error;
    }
  }

  /**
   * Complete a match and determine winner
   */
  static async completeMatch(matchId) {
    try {
      // Get match with submissions
      const { data: match, error: matchError } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          submissions:tournament_submissions(
            player_id,
            score,
            submitted_at
          )
        `)
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      if (match.submissions.length !== 2) {
        throw new Error('Both players must submit before completing match');
      }

      // Determine winner based on score, then submission time
      let winnerId = null;
      const player1Submission = match.submissions.find(s => s.player_id === match.player1_id);
      const player2Submission = match.submissions.find(s => s.player_id === match.player2_id);

      if (player1Submission.score > player2Submission.score) {
        winnerId = match.player1_id;
      } else if (player2Submission.score > player1Submission.score) {
        winnerId = match.player2_id;
      } else {
        // Tie - use submission time as tiebreaker
        const player1Time = new Date(player1Submission.submitted_at);
        const player2Time = new Date(player2Submission.submitted_at);
        winnerId = player1Time < player2Time ? match.player1_id : match.player2_id;
      }

      // Update match scores
      const { error: scoreError } = await supabase
        .from('tournament_matches')
        .update({
          player1_score: player1Submission.score,
          player2_score: player2Submission.score,
          winner_id: winnerId,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (scoreError) throw scoreError;

      // Advance winner to next round
      const { error: advanceError } = await supabase.rpc('advance_winner', {
        p_match_id: matchId,
        p_winner_id: winnerId
      });

      if (advanceError) throw advanceError;

      return winnerId;
    } catch (error) {
      console.error('Error completing match:', error);
      throw error;
    }
  }

  /**
   * Join tournament queue for matchmaking
   */
  static async joinQueue(queueData) {
    try {
      const { bracketSize, topicId, difficulty, skillLevel, playerId } = queueData;

      // Remove any existing queue entries for this player
      await this.leaveQueue(playerId);

      const { data, error } = await supabase
        .from('tournament_queue')
        .insert({
          player_id: playerId,
          bracket_size: bracketSize,
          topic_id: topicId,
          difficulty: difficulty,
          skill_level: skillLevel
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error joining queue:', error);
      throw error;
    }
  }

  /**
   * Leave tournament queue
   */
  static async leaveQueue(playerId) {
    try {
      const { error } = await supabase
        .from('tournament_queue')
        .delete()
        .eq('player_id', playerId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error leaving queue:', error);
      throw error;
    }
  }

  /**
   * Find matchmaking groups
   */
  static async findMatchmaking() {
    try {
      const { data, error } = await supabase
        .from('tournament_queue')
        .select('*')
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true });

      if (error) throw error;

      // Group players by bracket size, topic, difficulty, and skill level
      const groups = {};
      data.forEach(entry => {
        const key = `${entry.bracket_size}-${entry.topic_id}-${entry.difficulty}-${entry.skill_level}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(entry);
      });

      // Find groups that have enough players
      const matchmakingGroups = [];
      Object.entries(groups).forEach(([key, players]) => {
        const [bracketSize] = key.split('-');
        if (players.length >= parseInt(bracketSize)) {
          matchmakingGroups.push({
            key,
            players: players.slice(0, parseInt(bracketSize)),
            bracketSize: parseInt(bracketSize)
          });
        }
      });

      return matchmakingGroups;
    } catch (error) {
      console.error('Error finding matchmaking:', error);
      throw error;
    }
  }

  /**
   * Create tournament from matchmaking group
   */
  static async createTournamentFromMatchmaking(group) {
    try {
      const [bracketSize, topicId, difficulty, skillLevel] = group.key.split('-');
      const players = group.players;

      // Create tournament
      const tournamentId = await this.createTournament({
        name: `${bracketSize}-Player ${difficulty} Tournament`,
        bracketSize: parseInt(bracketSize),
        topicId: parseInt(topicId),
        difficulty: difficulty,
        createdBy: players[0].player_id
      });

      // Add all players to tournament
      for (const player of players) {
        await this.joinTournament(tournamentId, player.player_id, player.skill_level);
      }

      // Generate bracket
      await this.generateBracket(tournamentId);

      // Mark players as matched
      const playerIds = players.map(p => p.player_id);
      const { error } = await supabase
        .from('tournament_queue')
        .update({ status: 'matched' })
        .in('player_id', playerIds);

      if (error) throw error;

      return tournamentId;
    } catch (error) {
      console.error('Error creating tournament from matchmaking:', error);
      throw error;
    }
  }

  /**
   * Generate bracket for tournament
   */
  static async generateBracket(tournamentId) {
    try {
      const { error } = await supabase.rpc('generate_tournament_bracket', {
        p_tournament_id: tournamentId
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error generating bracket:', error);
      throw error;
    }
  }

  /**
   * Get user's tournament history
   */
  static async getUserTournaments(userId) {
    try {
      const { data, error } = await supabase
        .from('tournament_players')
        .select(`
          *,
          tournament:tournaments(
            *,
            topic:topics(name),
            winner:auth.users(id, email)
          )
        `)
        .eq('player_id', userId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user tournaments:', error);
      throw error;
    }
  }

  /**
   * Get tournament statistics
   */
  static async getTournamentStats(tournamentId) {
    try {
      const [tournament, players, matches] = await Promise.all([
        this.getTournament(tournamentId),
        this.getTournamentPlayers(tournamentId),
        this.getTournamentBracket(tournamentId)
      ]);

      const stats = {
        tournament,
        totalPlayers: players.length,
        activePlayers: players.filter(p => !p.is_eliminated).length,
        totalMatches: matches.length,
        completedMatches: matches.filter(m => m.status === 'completed').length,
        currentRound: Math.max(...matches.map(m => m.round_number)),
        players: players.map(player => ({
          ...player,
          winRate: player.matches_played > 0 ? (player.matches_won / player.matches_played * 100).toFixed(1) : '0.0'
        }))
      };

      return stats;
    } catch (error) {
      console.error('Error getting tournament stats:', error);
      throw error;
    }
  }

  /**
   * Get match submissions
   */
  static async getMatchSubmissions(matchId) {
    try {
      const { data, error } = await supabase
        .from('tournament_submissions')
        .select(`
          *,
          player:auth.users(id, email)
        `)
        .eq('match_id', matchId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting match submissions:', error);
      throw error;
    }
  }

  /**
   * Update submission with analysis
   */
  static async updateSubmissionAnalysis(submissionId, analysis) {
    try {
      const { error } = await supabase
        .from('tournament_submissions')
        .update({
          score: analysis.score,
          analysis: analysis
        })
        .eq('id', submissionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating submission analysis:', error);
      throw error;
    }
  }
}

module.exports = { TournamentService }; 