const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTournamentTables() {
  console.log('🔍 Verifying Tournament System Setup...');
  console.log('');
  
  const tables = [
    'tournaments',
    'tournament_players', 
    'tournament_matches',
    'tournament_submissions',
    'tournament_queue'
  ];
  
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Table ${table} not found or accessible`);
        console.error(`   Error: ${error.message}`);
        allTablesExist = false;
      } else {
        console.log(`✅ Table ${table} is ready`);
      }
    } catch (error) {
      console.error(`❌ Error checking table ${table}:`, error.message);
      allTablesExist = false;
    }
  }
  
  console.log('');
  
  if (allTablesExist) {
    console.log('🎉 All tournament tables are set up correctly!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start your backend server: npm run dev (in backend directory)');
    console.log('2. Start your frontend: npm start (in root directory)');
    console.log('3. Navigate to the tournament screen in your app');
    console.log('');
  } else {
    console.log('❌ Some tables are missing. Please run the setup script first:');
    console.log('node scripts/setup-tournament-system.js');
    console.log('');
    console.log('Then manually execute the SQL in your Supabase dashboard.');
    console.log('');
  }
}

// Run the verification
verifyTournamentTables(); 