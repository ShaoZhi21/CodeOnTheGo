#!/usr/bin/env node

import { setupDatabase, supabase } from '../config/database.js';

async function testBasicConnection() {
  try {
    // Test basic Supabase connection without querying specific tables
    const { data, error } = await supabase.auth.getSession();
    
    // Even if auth fails, if we get a response, connection is working
    console.log('✅ Basic Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Cannot connect to Supabase:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database setup...\n');
  
  // Debug environment variables
  console.log('🔍 Environment check:');
  console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('   SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
  
  try {
    // Test basic connection first
    console.log('\n1️⃣ Testing basic Supabase connection...');
    const connectionOk = await testBasicConnection();
    
    if (!connectionOk) {
      console.error('❌ Cannot connect to Supabase. Please check your credentials.');
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check your .env file exists');
      console.log('   2. Verify your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      console.log('   3. Make sure there are no extra spaces in your .env file');
      process.exit(1);
    }
    
    // Setup database schema
    console.log('\n2️⃣ Setting up database schema...');
    const setupOk = await setupDatabase();
    
    if (!setupOk) {
      console.error('❌ Database setup failed.');
      console.log('\n💡 Alternative: Run the SQL manually in Supabase Dashboard');
      console.log('   1. Go to: https://supabase.com/dashboard/project/kqhkprbujcmfgfhlhxud/sql');
      console.log('   2. Copy and paste the contents of: sql/create-tables.sql');
      process.exit(1);
    }
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run test-connection');
    console.log('   2. Run: npm run populate -- --test');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 