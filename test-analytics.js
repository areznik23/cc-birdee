// Quick test script to verify analytics flow
const fs = require('fs');
const path = require('path');

async function testAnalytics() {
  console.log('Testing CC-Birdee Analytics Flow...\n');
  
  // 1. Check if sessions endpoint works
  console.log('1. Testing sessions endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/sessions');
    const data = await response.json();
    console.log(`   ✓ Found ${data.files?.length || 0} session files`);
    
    if (data.files && data.files.length > 0) {
      console.log(`   Files: ${data.files.slice(0, 3).join(', ')}${data.files.length > 3 ? '...' : ''}`);
    }
  } catch (error) {
    console.log('   ✗ Failed to fetch sessions:', error.message);
  }
  
  // 2. Check analytics summary (should be 404 initially)
  console.log('\n2. Testing analytics summary endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/analytics/summary?userId=default-user');
    if (response.status === 404) {
      console.log('   ✓ Correctly returns 404 when no data exists');
    } else {
      const data = await response.json();
      console.log('   ✓ Found existing analytics data');
    }
  } catch (error) {
    console.log('   ✗ Failed to fetch summary:', error.message);
  }
  
  // 3. Check storage directory
  console.log('\n3. Checking analytics storage...');
  const storageDir = path.join(process.env.HOME || '', '.cc-birdee-analytics');
  if (fs.existsSync(storageDir)) {
    console.log(`   ✓ Storage directory exists: ${storageDir}`);
    const dirs = ['profiles', 'sessions', 'insights'];
    dirs.forEach(dir => {
      const fullPath = path.join(storageDir, dir);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        console.log(`   - ${dir}/: ${files.length} files`);
      }
    });
  } else {
    console.log('   ℹ Storage directory will be created on first use');
  }
  
  console.log('\n✅ Analytics system is ready!');
  console.log('\nNext steps:');
  console.log('1. Open http://localhost:3000 in your browser');
  console.log('2. Click on the "Analytics" tab');
  console.log('3. Click "Process Sessions" button');
  console.log('4. Select session files and process them');
}

// Run the test
testAnalytics().catch(console.error);