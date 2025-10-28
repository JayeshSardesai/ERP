const axios = require('axios');

// Your JWT token from the browser console
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJLVlMtQS0wMDAyIiwicm9sZSI6ImFkbWluIiwic2Nob29sQ29kZSI6IktWUyIsInVzZXJUeXBlIjoic2Nob29sX3VzZXIiLCJpYXQiOjE3NjE2MjY1NzgsImV4cCI6MTc2MTcxMjk3OH0.ekzeTy7eXydaw3kDhno_sUAYnY35YYv0YzE8_nJruFU';

async function testAttendanceAPI() {
  try {
    console.log('🧪 Testing Attendance API...\n');
    
    // Test data
    const attendanceData = {
      date: '2025-10-28',
      class: '1',
      section: 'A',
      session: 'morning',
      students: [
        { studentId: 'KVS-S-0001', status: 'present' },
        { studentId: 'KVS-S-0002', status: 'present' }
      ]
    };
    
    console.log('📝 Sending request to mark attendance...');
    console.log('Data:', JSON.stringify(attendanceData, null, 2));
    console.log('Token:', token.substring(0, 50) + '...\n');
    
    const response = await axios.post(
      'http://localhost:5050/api/attendance/mark-session',
      attendanceData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.statusText);
    console.error('Error details:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.data?.debug) {
      console.log('\n🔍 Debug Information:');
      console.log('Role:', error.response.data.debug.role);
      console.log('Required Permission:', error.response.data.debug.requiredPermission);
      console.log('Available Permissions:', error.response.data.debug.availablePermissions);
      console.log('Has Permission:', error.response.data.debug.hasPermission);
    }
  }
}

testAttendanceAPI();
