const { createClient } = require('@supabase/supabase-js');

// Load environment variables from backend
require('dotenv').config({ path: require('path').join(process.cwd(), 'backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SQL statements to create tournament tables
const sqlStatements = [
  // Create tournaments table
  `CREATE TABLE IF NOT EXISTS tournaments (
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
  )`,

  // Create tournament_players table
  `CREATE TABLE IF NOT EXISTS tournament_players (
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
  )`,

  // Create tournament_matches table
  `CREATE TABLE IF NOT EXISTS tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    player1_id UUID REFERENCES auth.users(id),
    player2_id UUID REFERENCES auth.users(id),
    question_id INTEGER REFERENCES problems(leetcode_id),
    player1_score INTEGER,
    player2_score INTEGER,
    player1_submission_time TIMESTAMP WITH TIME ZONE,
    player2_submission_time TIMESTAMP WITH TIME ZONE,
    winner_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(tournament_id, round_number, match_number)
  )`,

  // Create tournament_submissions table
  `CREATE TABLE IF NOT EXISTS tournament_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES tournament_matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pseudocode TEXT NOT NULL,
    score INTEGER,
    analysis JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, player_id)
  )`,

  // Create tournament_queue table
  `CREATE TABLE IF NOT EXISTS tournament_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bracket_size INTEGER NOT NULL CHECK (bracket_size IN (4, 8)),
    topic_id INTEGER REFERENCES topics(id),
    difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    skill_level VARCHAR(20) NOT NULL CHECK (skill_level IN ('Beginner', 'Intermediate', 'Advanced')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled'))
  )`,

  // Create indexes
  `CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tournaments_topic_difficulty ON tournaments(topic_id, difficulty)`,
  `CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament ON tournament_players(tournament_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tournament_players_player ON tournament_players(player_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round_number)`,
  `CREATE INDEX IF NOT EXISTS idx_tournament_submissions_match ON tournament_submissions(match_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tournament_queue_matchmaking ON tournament_queue(bracket_size, topic_id, difficulty, skill_level, status)`
];

async function setupTournamentDatabase() {
  console.log('🚀 Setting up Tournament Database...');
  
  try {
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i];
      console.log(`⏳ Executing statement ${i + 1}/${sqlStatements.length}...`);
      
      try {
        // Use the Supabase client to execute SQL
        const { error } = await supabase.rpc('exec_sql', { sql });
        
        if (error) {
          console.log(`ℹ️  Statement ${i + 1} might already exist or will be created manually`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (error) {
        console.log(`ℹ️  Statement ${i + 1} might already exist or will be created manually`);
        console.log(`   Error: ${error.message}`);
      }
    }
    
    console.log('🎉 Tournament database setup completed!');
    
    // Verify the setup
    console.log('🔍 Verifying setup...');
    await verifyTables();
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('\n📋 Manual setup instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the contents of scripts/setup-tournament-tables.sql');
    console.log('4. Execute the SQL');
  }
}

async function verifyTables() {
  const tables = ['tournaments', 'tournament_players', 'tournament_matches', 'tournament_submissions', 'tournament_queue'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Table ${table} not found or accessible`);
        console.error(`   Error: ${error.message}`);
      } else {
        console.log(`✅ Table ${table} is ready`);
      }
    } catch (error) {
      console.error(`❌ Error checking table ${table}:`, error.message);
    }
  }
}

// Run the setup
setupTournamentDatabase(); 