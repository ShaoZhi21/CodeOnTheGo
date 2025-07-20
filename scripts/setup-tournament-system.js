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

async function setupTournamentSystem() {
  console.log('🚀 Setting up Tournament System...');
  console.log('');
  console.log('📋 Manual setup instructions:');
  console.log('');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to the SQL Editor');
  console.log('3. Copy and paste the contents of scripts/setup-tournament-tables.sql');
  console.log('4. Execute the SQL');
  console.log('');
  console.log('Or use the Supabase CLI:');
  console.log('supabase db push --include-all');
  console.log('');
  console.log('After setting up the database, you can verify the tables exist by running:');
  console.log('node scripts/verify-tournament-tables.js');
  console.log('');
}

// Run the setup
setupTournamentSystem(); 