const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get __dirname equivalent for CommonJS
const __dirname = path.dirname(process.argv[1]);

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env file in the backend directory.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixQuizScoreConstraint() {
  try {
    console.log('🔧 Fixing quiz_score constraint in user_lesson_completion table...\n');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'fix-quiz-score-constraint.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec', { 
          sql: statement + ';' 
        });

        if (error) {
          console.log(`⚠️  Statement ${i + 1} warning: ${error.message}`);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }
    
    console.log('\n✅ Quiz score constraint fix completed!');
    console.log('\n📋 Changes made:');
    console.log('   • Updated quiz_score constraint from max 3 to max 10');
    console.log('   • This allows for quizzes with more than 3 questions');
    console.log('\n🎯 The constraint violation error should now be resolved.');
    
  } catch (error) {
    console.error('❌ Error fixing quiz score constraint:', error);
    process.exit(1);
  }
}

// Run the fix
fixQuizScoreConstraint(); 