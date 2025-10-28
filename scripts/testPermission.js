const { MongoClient } = require('mongodb');

async function testPermission() {
  const uri = 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/institute_erp?retryWrites=true&w=majority&appName=erp';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('institute_erp');
    const schools = db.collection('schools');

    // Find KVS school
    const kvsSchool = await schools.findOne({ code: 'KVS' });
    
    if (kvsSchool) {
      console.log('🏫 School: KVS');
      console.log('📋 Testing Permission Check:\n');
      
      // Test admin role
      const adminHasMarkAttendance = kvsSchool.accessMatrix?.admin?.markAttendance;
      console.log(`✓ Admin markAttendance: ${adminHasMarkAttendance ? '✅ GRANTED' : '❌ DENIED'}`);
      
      // Test teacher role
      const teacherHasMarkAttendance = kvsSchool.accessMatrix?.teacher?.markAttendance;
      console.log(`✓ Teacher markAttendance: ${teacherHasMarkAttendance ? '✅ GRANTED' : '❌ DENIED'}`);
      
      // Test student role
      const studentHasMarkAttendance = kvsSchool.accessMatrix?.student?.markAttendance;
      console.log(`✓ Student markAttendance: ${studentHasMarkAttendance ? '❌ GRANTED (SHOULD BE DENIED!)' : '✅ DENIED'}`);
      
      // Test parent role
      const parentHasMarkAttendance = kvsSchool.accessMatrix?.parent?.markAttendance;
      console.log(`✓ Parent markAttendance: ${parentHasMarkAttendance ? '❌ GRANTED (SHOULD BE DENIED!)' : '✅ DENIED'}`);
      
      console.log('\n📊 Summary:');
      if (adminHasMarkAttendance && teacherHasMarkAttendance && 
          !studentHasMarkAttendance && !parentHasMarkAttendance) {
        console.log('✅ ALL PERMISSIONS CONFIGURED CORRECTLY!');
        console.log('✅ Admin users can now mark attendance');
        console.log('✅ The 403 Forbidden error should be resolved');
      } else {
        console.log('⚠️  PERMISSION CONFIGURATION ISSUE DETECTED');
      }
      
      // Check school-specific database
      if (kvsSchool.databaseName) {
        console.log(`\n🔍 Checking school-specific database: ${kvsSchool.databaseName}`);
        const schoolDb = client.db(kvsSchool.databaseName);
        const accessMatrices = schoolDb.collection('access_matrices');
        
        const matrixDoc = await accessMatrices.findOne({ schoolCode: 'KVS' });
        if (matrixDoc) {
          const schoolDbAdminPerm = matrixDoc.accessMatrix?.admin?.markAttendance;
          console.log(`✓ School DB Admin markAttendance: ${schoolDbAdminPerm ? '✅ GRANTED' : '❌ DENIED'}`);
          
          if (schoolDbAdminPerm) {
            console.log('✅ School-specific database is in sync');
          } else {
            console.log('⚠️  School-specific database needs update');
          }
        } else {
          console.log('⚠️  No access matrix found in school database');
        }
      }
    } else {
      console.log('❌ KVS School not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Test completed');
  }
}

testPermission();
