/**
 * Test script for ID card cleanup functionality
 * Run this to verify cleanup works correctly
 */

const { cleanupOldIDCards, cleanupAllIDCards } = require('./utils/cleanupIDCards');

async function testCleanup() {
  console.log('🧪 Testing ID Card Cleanup Functionality\n');
  console.log('=' .repeat(60));
  
  // Test 1: Check for old files (older than 1 minute for testing)
  console.log('\n📋 Test 1: Cleanup files older than 1 minute');
  console.log('-'.repeat(60));
  const result1 = await cleanupOldIDCards(1);
  console.log('Result:', result1);
  
  // Test 2: Check for old files (older than 30 minutes - production setting)
  console.log('\n📋 Test 2: Cleanup files older than 30 minutes (production)');
  console.log('-'.repeat(60));
  const result2 = await cleanupOldIDCards(30);
  console.log('Result:', result2);
  
  // Test 3: List remaining files
  console.log('\n📋 Test 3: Check remaining files');
  console.log('-'.repeat(60));
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const uploadsDir = path.join(__dirname, 'uploads', 'generated-idcards');
    const files = await fs.readdir(uploadsDir);
    
    console.log(`📂 Found ${files.length} files in generated-idcards directory:`);
    
    if (files.length > 0) {
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        const ageMinutes = Math.round((Date.now() - stats.mtimeMs) / 60000);
        console.log(`  - ${file} (age: ${ageMinutes} minutes)`);
      }
    } else {
      console.log('  ✅ Directory is clean!');
    }
  } catch (err) {
    console.log('  ℹ️ Directory does not exist or is empty');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Cleanup test completed!\n');
}

// Run the test
testCleanup().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
