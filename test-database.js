const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const supabaseUrl = 'https://kqhkprbujcmfgfhlhxud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGtwcmJ1amNtZmdmaGxoeHVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjY5MTg2NiwiZXhwIjoyMDYyMjY3ODY2fQ.O3sqZLCExEteVmzd2NN-xdLqCu4hifikJnkArWRTbQM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('Testing database connection...');
  
  try {
    // Test 1: Check if the table exists
    console.log('\n1. Checking if user_topic_navigation table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('user_topic_navigation')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table error:', tableError.message);
      return;
    }
    console.log('✅ Table exists and is accessible');
    
    // Test 2: Check if there are any users
    console.log('\n2. Checking for users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Users error:', usersError.message);
    } else {
      console.log(`✅ Found ${users.users.length} users`);
      if (users.users.length > 0) {
        console.log('First user ID:', users.users[0].id);
      }
    }
    
    // Test 3: Try to insert a test record
    console.log('\n3. Testing insert...');
    const testUserId = users?.users?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    const { data: insertData, error: insertError } = await supabase
      .from('user_topic_navigation')
      .insert({
        user_id: testUserId,
        topic_name: 'TEST_TOPIC_2',
        visited_at: new Date().toISOString()
      })
      .select();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError.message);
    } else {
      console.log('✅ Insert successful:', insertData);
      
      // Test 4: Try to read the data back
      console.log('\n4. Testing read...');
      const { data: readData, error: readError } = await supabase
        .from('user_topic_navigation')
        .select('*')
        .eq('topic_name', 'TEST_TOPIC_2')
        .order('visited_at', { ascending: false });
      
      if (readError) {
        console.error('❌ Read error:', readError.message);
      } else {
        console.log('✅ Read successful:', readData);
      }
    }
    
    // Test 5: Test the API endpoint
    console.log('\n5. Testing API endpoint...');
    try {
      const response = await fetch('http://localhost:3001/api/topic-navigation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUserId,
          topicName: 'API_TEST_TOPIC',
        }),
      });
      
      if (response.ok) {
        console.log('✅ API endpoint working');
      } else {
        console.log('❌ API endpoint error:', response.status, response.statusText);
      }
    } catch (apiError) {
      console.log('❌ API endpoint not reachable (backend might not be running):', apiError.message);
    }
    
  } catch (error) {
    console.error('❌ General error:', error);
  }
}

testDatabase(); 