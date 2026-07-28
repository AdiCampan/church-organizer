const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const REVIEWER_EMAIL = 'reviewer@googleplay.beteldej.com';
const REVIEWER_PASSWORD = process.env.REVIEWER_PASSWORD || 'ReviewBetel2026!';

const serviceAccountPath = path.join(__dirname, '../mobile/firebase-secrets/beteldej/service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function main() {
  console.log('\n🔧 Creating Google Play reviewer account...\n');
  
  try {
    // Check if user exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(REVIEWER_EMAIL);
      console.log('✅ User already exists:', userRecord.uid);
      console.log('   Updating password...');
      
      await admin.auth().updateUser(userRecord.uid, {
        password: REVIEWER_PASSWORD,
        emailVerified: true
      });
      console.log('✅ Password updated');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('📝 Creating new user...');
        userRecord = await admin.auth().createUser({
          email: REVIEWER_EMAIL,
          password: REVIEWER_PASSWORD,
          displayName: 'Google Play Reviewer',
          emailVerified: true
        });
        console.log('✅ User created:', userRecord.uid);
      } else {
        throw error;
      }
    }
    
    // Create/update Firestore profile
    const userDoc = await admin.firestore().collection('users').doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      console.log('📄 Creating Firestore profile...');
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        email: REVIEWER_EMAIL,
        displayName: 'Google Play Reviewer',
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        phoneNumber: '+40700000002',
        teams: []
      });
      console.log('✅ Firestore profile created');
    } else {
      console.log('📄 Updating Firestore profile...');
      await admin.firestore().collection('users').doc(userRecord.uid).update({
        role: 'admin',
        displayName: 'Google Play Reviewer'
      });
      console.log('✅ Firestore profile updated');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ SUCCESS! Account is ready');
    console.log('='.repeat(70));
    console.log('\n📋 Account details:');
    console.log('   Email:', REVIEWER_EMAIL);
    console.log('   UID:', userRecord.uid);
    console.log('   Role: admin');
    console.log('   Email verified: ✅\n');
    
    console.log('🧪 Next steps:');
    console.log('   1. Test login in the app');
    console.log('   2. Update Google Play Console');
    console.log('   3. Submit for review\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
