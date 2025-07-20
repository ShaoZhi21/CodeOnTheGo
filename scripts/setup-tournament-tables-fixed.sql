-- Tournament System Database Schema
-- Complete revamp for 4-player and 8-player knockout tournaments

-- 1. Tournaments table - stores tournament metadata
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    bracket_size INTEGER NOT NULL CHECK (bracket_size IN (4, 8)),
    topic_id INTEGER REFERENCES topics(id),
    difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
    max_players INTEGER NOT NULL,
    current_players INTEGER DEFAULT 0,
    entry_fee INTEGER DEFAULT 0,
    prize_pool INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    winner_id UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Tournament players table - tracks players in tournaments
CREATE TABLE IF NOT EXISTS tournament_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_level VARCHAR(20) NOT NULL CHECK (skill_level IN ('Beginner', 'Intermediate', 'Advanced')),
    current_round INTEGER DEFAULT 1,
    is_eliminated BOOLEAN DEFAULT FALSE,
    total_score INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    eliminated_at TIMESTAMP WITH TIME ZONE,
    final_rank INTEGER,
    UNIQUE(tournament_id, player_id)
);

-- 3. Tournament matches table - tracks individual matches
CREATE TABLE IF NOT EXISTS tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    player1_id UUID REFERENCES auth.users(id),
    player2_id UUID REFERENCES auth.users(id),
    question_id INTEGER REFERENCES leetcode_problems(leetcode_id),
    player1_score INTEGER,
    player2_score INTEGER,
    player1_submission_time TIMESTAMP WITH TIME ZONE,
    player2_submission_time TIMESTAMP WITH TIME ZONE,
    winner_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(tournament_id, round_number, match_number)
);

-- 4. Tournament submissions table - stores player solutions
CREATE TABLE IF NOT EXISTS tournament_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES tournament_matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pseudocode TEXT NOT NULL,
    score INTEGER,
    analysis JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, player_id)
);

-- 5. Tournament matchmaking queue table
CREATE TABLE IF NOT EXISTS tournament_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bracket_size INTEGER NOT NULL CHECK (bracket_size IN (4, 8)),
    topic_id INTEGER REFERENCES topics(id),
    difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    skill_level VARCHAR(20) NOT NULL CHECK (skill_level IN ('Beginner', 'Intermediate', 'Advanced')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_topic_difficulty ON tournaments(topic_id, difficulty);
CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_player ON tournament_players(player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_tournament_submissions_match ON tournament_submissions(match_id);
CREATE INDEX IF NOT EXISTS idx_tournament_queue_matchmaking ON tournament_queue(bracket_size, topic_id, difficulty, skill_level, status);

-- Functions for tournament management

-- Function to create a new tournament
CREATE OR REPLACE FUNCTION create_tournament(
    p_name VARCHAR(100),
    p_bracket_size INTEGER,
    p_topic_id INTEGER,
    p_difficulty VARCHAR(10),
    p_entry_fee INTEGER,
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    tournament_uuid UUID;
BEGIN
    INSERT INTO tournaments (
        name, bracket_size, topic_id, difficulty, 
        max_players, entry_fee, prize_pool, created_by
    ) VALUES (
        p_name, p_bracket_size, p_topic_id, p_difficulty,
        p_bracket_size, COALESCE(p_entry_fee, 0), p_bracket_size * COALESCE(p_entry_fee, 0), p_created_by
    ) RETURNING id INTO tournament_uuid;
    
    RETURN tournament_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to add player to tournament
CREATE OR REPLACE FUNCTION join_tournament(
    p_tournament_id UUID,
    p_player_id UUID,
    p_skill_level VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
    tournament_record RECORD;
BEGIN
    -- Get tournament info
    SELECT * INTO tournament_record FROM tournaments WHERE id = p_tournament_id;
    
    -- Check if tournament is full
    IF tournament_record.current_players >= tournament_record.max_players THEN
        RETURN FALSE;
    END IF;
    
    -- Check if player is already in tournament
    IF EXISTS (SELECT 1 FROM tournament_players WHERE tournament_id = p_tournament_id AND player_id = p_player_id) THEN
        RETURN FALSE;
    END IF;
    
    -- Add player to tournament
    INSERT INTO tournament_players (tournament_id, player_id, skill_level)
    VALUES (p_tournament_id, p_player_id, p_skill_level);
    
    -- Update tournament player count
    UPDATE tournaments 
    SET current_players = current_players + 1
    WHERE id = p_tournament_id;
    
    -- Check if tournament is ready to start
    IF tournament_record.current_players + 1 = tournament_record.max_players THEN
        UPDATE tournaments SET status = 'active', started_at = CURRENT_TIMESTAMP WHERE id = p_tournament_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to generate tournament bracket
CREATE OR REPLACE FUNCTION generate_tournament_bracket(p_tournament_id UUID) RETURNS VOID AS $$
DECLARE
    tournament_record RECORD;
    player_record RECORD;
    player_count INTEGER;
    round_count INTEGER;
    current_round INTEGER;
    match_number INTEGER;
    player_ids UUID[];
    i INTEGER;
BEGIN
    -- Get tournament info
    SELECT * INTO tournament_record FROM tournaments WHERE id = p_tournament_id;
    
    -- Get all players
    SELECT array_agg(player_id ORDER BY RANDOM()) INTO player_ids
    FROM tournament_players 
    WHERE tournament_id = p_tournament_id AND is_eliminated = FALSE;
    
    player_count := array_length(player_ids, 1);
    
    -- Calculate number of rounds
    round_count := CASE 
        WHEN player_count = 4 THEN 2
        WHEN player_count = 8 THEN 3
        ELSE 1
    END;
    
    -- Generate first round matches
    current_round := 1;
    match_number := 1;
    
    FOR i IN 1..player_count BY 2 LOOP
        INSERT INTO tournament_matches (
            tournament_id, round_number, match_number,
            player1_id, player2_id, status
        ) VALUES (
            p_tournament_id, current_round, match_number,
            player_ids[i], player_ids[i+1], 'pending'
        );
        match_number := match_number + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to advance winner to next round
CREATE OR REPLACE FUNCTION advance_winner(
    p_match_id UUID,
    p_winner_id UUID
) RETURNS VOID AS $$
DECLARE
    match_record RECORD;
    tournament_record RECORD;
    next_round INTEGER;
    next_match_number INTEGER;
    existing_match RECORD;
BEGIN
    -- Get match info
    SELECT * INTO match_record FROM tournament_matches WHERE id = p_match_id;
    
    -- Get tournament info
    SELECT * INTO tournament_record FROM tournaments WHERE id = match_record.tournament_id;
    
    -- Calculate next round
    next_round := match_record.round_number + 1;
    
    -- Check if this is the final round
    IF next_round > CASE 
        WHEN tournament_record.bracket_size = 4 THEN 2
        WHEN tournament_record.bracket_size = 8 THEN 3
        ELSE 1
    END THEN
        -- Tournament is complete
        UPDATE tournaments 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, winner_id = p_winner_id
        WHERE id = match_record.tournament_id;
        RETURN;
    END IF;
    
    -- Find the next match number for this round
    SELECT COALESCE(MAX(match_number), 0) + 1 INTO next_match_number
    FROM tournament_matches 
    WHERE tournament_id = match_record.tournament_id AND round_number = next_round;
    
    -- Check if there's already a match in the next round for this position
    SELECT * INTO existing_match
    FROM tournament_matches 
    WHERE tournament_id = match_record.tournament_id 
    AND round_number = next_round 
    AND match_number = next_match_number;
    
    IF existing_match IS NULL THEN
        -- Create new match in next round
        INSERT INTO tournament_matches (
            tournament_id, round_number, match_number,
            player1_id, status
        ) VALUES (
            match_record.tournament_id, next_round, next_match_number,
            p_winner_id, 'pending'
        );
    ELSE
        -- Add winner to existing match
        IF existing_match.player1_id IS NULL THEN
            UPDATE tournament_matches 
            SET player1_id = p_winner_id
            WHERE id = existing_match.id;
        ELSE
            UPDATE tournament_matches 
            SET player2_id = p_winner_id
            WHERE id = existing_match.id;
        END IF;
    END IF;
    
    -- Check if tournament is complete
    IF NOT EXISTS (
        SELECT 1 FROM tournament_matches 
        WHERE tournament_id = match_record.tournament_id 
        AND status IN ('pending', 'active')
    ) THEN
        UPDATE tournaments 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, winner_id = p_winner_id
        WHERE id = match_record.tournament_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to select fair question for match
CREATE OR REPLACE FUNCTION select_match_question(
    p_tournament_id UUID,
    p_round_number INTEGER,
    p_topic_id INTEGER,
    p_difficulty VARCHAR(10)
) RETURNS INTEGER AS $$
DECLARE
    question_id INTEGER;
    tournament_record RECORD;
    player_ids UUID[];
BEGIN
    -- Get tournament info
    SELECT * INTO tournament_record FROM tournaments WHERE id = p_tournament_id;
    
    -- Get all players in the tournament
    SELECT array_agg(player_id) INTO player_ids
    FROM tournament_players 
    WHERE tournament_id = p_tournament_id;
    
    -- Find a question that none of the players have completed
    SELECT p.leetcode_id INTO question_id
    FROM leetcode_problems p
    JOIN problem_topics pt ON p.id = pt.problem_id
    WHERE pt.topic_id = p_topic_id 
    AND p.difficulty = p_difficulty
    AND p.leetcode_id NOT IN (
        SELECT DISTINCT problem_id 
        FROM user_problem_progress 
        WHERE user_id = ANY(player_ids) AND is_solved = TRUE
    )
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- If no unseen questions, get a random question
    IF question_id IS NULL THEN
        SELECT p.leetcode_id INTO question_id
        FROM leetcode_problems p
        JOIN problem_topics pt ON p.id = pt.problem_id
        WHERE pt.topic_id = p_topic_id 
        AND p.difficulty = p_difficulty
        ORDER BY RANDOM()
        LIMIT 1;
    END IF;
    
    RETURN question_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers for tournament management

-- Trigger to automatically generate bracket when tournament becomes active
CREATE OR REPLACE FUNCTION trigger_generate_bracket() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status = 'waiting' THEN
        PERFORM generate_tournament_bracket(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tournament_status_change
    AFTER UPDATE ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_bracket(); 