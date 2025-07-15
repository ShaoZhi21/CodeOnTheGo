const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables from backend
require('dotenv').config({ path: path.join(process.cwd(), 'backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTournamentTables() {
  console.log('🚀 Creating Tournament Tables...');
  
  try {
    // Create tournaments table
    console.log('⏳ Creating tournaments table...');
    const { error: tournamentsError } = await supabase.rpc('create_tournaments_table');
    if (tournamentsError) {
      console.log('ℹ️  Tournaments table might already exist or will be created manually');
    } else {
      console.log('✅ Tournaments table created');
    }

    // Create tournament_players table
    console.log('⏳ Creating tournament_players table...');
    const { error: playersError } = await supabase.rpc('create_tournament_players_table');
    if (playersError) {
      console.log('ℹ️  Tournament players table might already exist or will be created manually');
    } else {
      console.log('✅ Tournament players table created');
    }

    // Create tournament_matches table
    console.log('⏳ Creating tournament_matches table...');
    const { error: matchesError } = await supabase.rpc('create_tournament_matches_table');
    if (matchesError) {
      console.log('ℹ️  Tournament matches table might already exist or will be created manually');
    } else {
      console.log('✅ Tournament matches table created');
    }

    // Create tournament_submissions table
    console.log('⏳ Creating tournament_submissions table...');
    const { error: submissionsError } = await supabase.rpc('create_tournament_submissions_table');
    if (submissionsError) {
      console.log('ℹ️  Tournament submissions table might already exist or will be created manually');
    } else {
      console.log('✅ Tournament submissions table created');
    }

    // Create tournament_queue table
    console.log('⏳ Creating tournament_queue table...');
    const { error: queueError } = await supabase.rpc('create_tournament_queue_table');
    if (queueError) {
      console.log('ℹ️  Tournament queue table might already exist or will be created manually');
    } else {
      console.log('✅ Tournament queue table created');
    }

    console.log('🎉 Tournament tables creation completed!');
    
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
    process.exit(1);
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
createTournamentTables(); 