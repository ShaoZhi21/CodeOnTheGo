#!/usr/bin/env node

import { supabase } from '../config/database.js';
import { TABLE_NAME } from '../types/leetcode.js';
import { LeetCodeClient } from '../utils/leetcode-client.js';

async function getExistingProblemIds() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('leetcode_id');
    
  if (error) {
    throw new Error(`Failed to fetch existing problems: ${error.message}`);
  }
  
  return new Set(data.map(p => p.leetcode_id));
}

async function main() {
  const startTime = Date.now();
  
  console.log('🔄 Starting LeetCode problems sync...\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRunFlag = args.includes('--dry-run');
  const forceFlag = args.includes('--force');
  const detailsFlag = args.includes('--with-details');
  
  try {
    // Initialize LeetCode client
    const client = new LeetCodeClient();
    
    // Get existing problems from database
    console.log('1️⃣ Checking existing problems in database...');
    const existingIds = await getExistingProblemIds();
    console.log(`📊 Found ${existingIds.size} existing problems`);
    
    // Fetch current problems from LeetCode
    console.log('\n2️⃣ Fetching current problems from LeetCode...');
    const currentProblems = await client.getAllProblems({
      includeDetails: detailsFlag
    });
    
    console.log(`📊 Found ${currentProblems.length} problems on LeetCode`);
    
    // Find new problems
    const newProblems = currentProblems.filter(problem => 
      !existingIds.has(parseInt(problem.questionId))
    );
    
    console.log(`\n3️⃣ Analysis:`);
    console.log(`   🆕 New problems found: ${newProblems.length}`);
    console.log(`   📈 Existing problems: ${existingIds.size}`);
    console.log(`   📊 Total on LeetCode: ${currentProblems.length}`);
    
    if (newProblems.length === 0) {
      console.log('\n✅ No new problems to sync. Database is up to date!');
      return;
    }
    
    // Show new problems
    console.log('\n🆕 New problems to add:');
    newProblems.slice(0, 10).forEach(problem => {
      console.log(`   • #${problem.questionId}: ${problem.title} (${problem.difficulty})`);
    });
    
    if (newProblems.length > 10) {
      console.log(`   ... and ${newProblems.length - 10} more`);
    }
    
    if (dryRunFlag) {
      console.log('\n🔍 Dry run mode - no changes will be made.');
      return;
    }
    
    // Confirm before proceeding (unless force flag is used)
    if (!forceFlag) {
      console.log('\n⚠️  This will add new problems to your database.');
      console.log('   Use --force to skip this confirmation.');
      console.log('   Use --dry-run to see what would be added without making changes.');
      
      // In a real scenario, you might want to add readline for user input
      // For now, we'll proceed automatically
    }
    
    // Transform new problems for database
    console.log('\n4️⃣ Preparing new problems for database...');
    const transformedProblems = newProblems.map(problem => 
      client.transformProblemForDatabase(problem, problem.details)
    );
    
    // Insert new problems
    console.log('\n5️⃣ Inserting new problems...');
    let inserted = 0;
    let errors = 0;
    
    const batchSize = 50;
    for (let i = 0; i < transformedProblems.length; i += batchSize) {
      const batch = transformedProblems.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from(TABLE_NAME)
          .insert(batch);
        
        if (error) {
          console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
          errors += batch.length;
        } else {
          inserted += batch.length;
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} problems added`);
        }
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
        errors += batch.length;
      }
    }
    
    // Update existing problems if details were requested
    if (detailsFlag && existingIds.size > 0) {
      console.log('\n6️⃣ Updating existing problems with new details...');
      
      const existingProblems = currentProblems.filter(problem => 
        existingIds.has(parseInt(problem.questionId))
      );
      
      let updated = 0;
      for (const problem of existingProblems.slice(0, 100)) { // Limit to avoid too many updates
        try {
          const transformed = client.transformProblemForDatabase(problem, problem.details);
          
          const { error } = await supabase
            .from(TABLE_NAME)
            .update({
              description: transformed.description,
              description_text: transformed.description_text,
              examples: transformed.examples,
              constraints: transformed.constraints,
              hints: transformed.hints,
              updated_at: new Date().toISOString()
            })
            .eq('leetcode_id', transformed.leetcode_id);
          
          if (!error) {
            updated++;
            if (updated % 10 === 0) {
              console.log(`📈 Updated ${updated} existing problems...`);
            }
          }
        } catch (error) {
          console.warn(`⚠️  Failed to update problem ${problem.questionId}:`, error.message);
        }
      }
      
      console.log(`✅ Updated ${updated} existing problems with details`);
    }
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n🎉 Sync completed!');
    console.log('📊 Summary:');
    console.log(`   🆕 New problems added: ${inserted}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   ⏱️  Duration: ${duration}s`);
    
    // Final count
    const { count: finalCount } = await supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });
    
    console.log(`   📈 Total problems in database: ${finalCount}`);
    
    if (errors > 0) {
      console.log('\n⚠️  Some problems failed to insert. You may want to re-run the sync.');
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🔄 LeetCode Problems Sync Script

Usage: npm run sync [options]

Options:
  --dry-run           Show what would be synced without making changes
  --force             Skip confirmation prompts
  --with-details      Update existing problems with full details
  --help, -h          Show this help message

Examples:
  npm run sync                    # Sync new problems
  npm run sync -- --dry-run       # Preview changes without applying
  npm run sync -- --force         # Sync without confirmation
  npm run sync -- --with-details  # Also update existing problems

This script:
  1. Compares your database with current LeetCode problems
  2. Identifies new problems that need to be added
  3. Adds them to your Supabase database
  4. Optionally updates existing problems with new details
  `);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 