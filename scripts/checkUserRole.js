const { MongoClient } = require('mongodb');

async function checkUserRole() {
  const uri = 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/institute_erp?retryWrites=true&w=majority&appName=erp';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // Check the school_kvs database
    const schoolDb = client.db('school_kvs');
    const adminsCollection = schoolDb.collection('admins');

    // Find the admin user KVS-A-0002
    const admin = await adminsCollection.findOne({ userId: 'KVS-A-0002' });
    
    if (admin) {
      console.log('🔍 Found admin user: KVS-A-0002');
      console.log('📋 User document keys:', Object.keys(admin));
      console.log('\n📝 User role field:', admin.role);
      console.log('📝 User role type:', typeof admin.role);
      console.log('\n📄 Full user document:');
      console.log(JSON.stringify(admin, null, 2));
      
      // Check if role field exists and what its value is
      if (admin.hasOwnProperty('role')) {
        console.log('\n✅ User has role property');
        console.log('Value:', admin.role);
        console.log('Value length:', admin.role ? admin.role.length : 'null');
        
        if (admin.role !== 'admin') {
          console.log('\n⚠️  PROBLEM FOUND: Role is not "admin", it is:', admin.role);
          console.log('🔧 Fixing role...');
          
          await adminsCollection.updateOne(
            { userId: 'KVS-A-0002' },
            { $set: { role: 'admin' } }
          );
          
          console.log('✅ Role updated to "admin"');
          
          // Verify
          const updated = await adminsCollection.findOne({ userId: 'KVS-A-0002' });
          console.log('✅ Verified role:', updated.role);
        } else {
          console.log('\n✅ Role is correctly set to "admin"');
        }
      } else {
        console.log('\n⚠️  PROBLEM FOUND: User does NOT have role property');
        console.log('🔧 Adding role property...');
        
        await adminsCollection.updateOne(
          { userId: 'KVS-A-0002' },
          { $set: { role: 'admin' } }
        );
        
        console.log('✅ Role property added');
      }
    } else {
      console.log('❌ Admin user KVS-A-0002 not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

checkUserRole();
