#!/usr/bin/env node

import { supabase } from '../config/database.js';
import { TABLE_NAME } from '../types/leetcode.js';
import { LeetCodeClient } from '../utils/leetcode-client.js';

async function insertProblems(problems, batchSize = 50) {
  console.log(`📦 Inserting ${problems.length} problems in batches of ${batchSize}...`);
  
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < problems.length; i += batchSize) {
    const batch = problems.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .upsert(batch, { 
          onConflict: 'leetcode_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        errors += batch.length;
      } else {
        inserted += batch.length;
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} problems inserted`);
      }
    } catch (error) {
      console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
      errors += batch.length;
    }
  }
  
  return { inserted, errors };
}

async function main() {
  const startTime = Date.now();
  
  console.log('🚀 Starting LeetCode problems population...\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitFlag = args.find(arg => arg.startsWith('--limit='));
  const detailsFlag = args.includes('--with-details');
  const testFlag = args.includes('--test');
  
  const limit = limitFlag ? parseInt(limitFlag.split('=')[1]) : null;
  const includeDetails = detailsFlag || false;
  
  if (testFlag) {
    console.log('🧪 Running in test mode (limit: 10 problems)');
  }
  
  try {
    // Initialize LeetCode client
    const client = new LeetCodeClient();
    
    // Check if table exists and is accessible
    console.log('1️⃣ Checking database connection...');
    const { count: existingCount } = await supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Current problems in database: ${existingCount || 0}`);
    
    // Fetch problems from LeetCode
    console.log('\n2️⃣ Fetching problems from LeetCode...');
    
    const fetchLimit = testFlag ? 10 : limit;
    
    const problems = await client.getAllProblems({
      limit: fetchLimit,
      includeDetails,
      onProgress: (current, total, title) => {
        const percentage = ((current / total) * 100).toFixed(1);
        console.log(`📈 ${percentage}% - Processing: ${title}`);
      }
    });
    
    if (problems.length === 0) {
      console.log('⚠️  No problems fetched. Exiting...');
      return;
    }
    
    // Transform problems for database
    console.log('\n3️⃣ Transforming problems for database...');
    const transformedProblems = problems.map(problem => 
      client.transformProblemForDatabase(problem, problem.details)
    );
    
    // Insert into database
    console.log('\n4️⃣ Inserting into database...');
    const { inserted, errors } = await insertProblems(transformedProblems);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n🎉 Population completed!');
    console.log('📊 Summary:');
    console.log(`   ✅ Problems inserted: ${inserted}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   ⏱️  Duration: ${duration}s`);
    
    if (includeDetails) {
      console.log(`   📝 Detailed information included`);
    }
    
    // Final count
    const { count: finalCount } = await supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });
    
    console.log(`   📈 Total problems in database: ${finalCount}`);
    
    if (errors > 0) {
      console.log('\n⚠️  Some problems failed to insert. You may want to re-run the script.');
    }
    
  } catch (error) {
    console.error('❌ Population failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🔧 LeetCode Problems Population Script

Usage: npm run populate [options]

Options:
  --test              Run with only 10 problems for testing
  --limit=N           Limit to N problems
  --with-details      Include full problem descriptions, examples, etc.
  --help, -h          Show this help message

Examples:
  npm run populate                    # Populate basic info for all problems
  npm run populate -- --test          # Test with 10 problems
  npm run populate -- --limit=100     # First 100 problems only
  npm run populate -- --with-details  # Include full details (slower)

Note: Use --with-details for complete problem information, but expect longer runtime.
  `);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 