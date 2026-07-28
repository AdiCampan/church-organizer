const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const REVIEWER_EMAIL = 'reviewer@googleplay.beteldej.com';
const NEW_PASSWORD = 'ReviewBetel2026!';

// Load service account
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || path.join(__dirname, '../mobile/firebase-secrets/beteldej/service-account.json');

let serviceAccount;
try {
  const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(serviceAccountData);
  
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    console.error('❌ Error: Service account JSON is incomplete');
    console.error('Required fields: project_id, client_email, private_key');
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ Error loading service account from ${serviceAccountPath}:`);
  console.error(error.message);
  console.error('\n💡 To get the service account file:');
  console.error('1. Go to: https://console.firebase.google.com');
  console.error('2. Select project: beteldej-teams');
  console.error('3. Go to: Project Settings → Service accounts');
  console.error('4. Click: "Generate new private key"');
  console.error(`5. Save to: ${serviceAccountPath}`);
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

async function resetReviewerPassword() {
  console.log('\n🔐 Resetting Google Play reviewer password...\n');
  console.log(`Email: ${REVIEWER_EMAIL}`);
  console.log(`New password: ${NEW_PASSWORD}\n`);
  console.log('─'.repeat(60) + '\n');

  try {
    // Get user by email
    console.log('📧 Finding user in Firebase Authentication...');
    const userRecord = await admin.auth().getUserByEmail(REVIEWER_EMAIL);
    console.log(`✅ User found: ${userRecord.uid}`);
    console.log();

    // Update password
    console.log('🔒 Updating password...');
    await admin.auth().updateUser(userRecord.uid, {
      password: NEW_PASSWORD,
      emailVerified: true
    });
    console.log('✅ Password updated successfully');
    console.log('✅ Email marked as verified');
    console.log();

    // Verify Firestore profile
    console.log('📄 Checking Firestore profile...');
    const userDoc = await admin.firestore().collection('users').doc(userRecord.uid).get();
    
    if (userDoc.exists) {
      const profile = userDoc.data();
      console.log('✅ Firestore profile exists');
      console.log(`   Role: ${profile.role || 'Not set'}`);
      
      if (profile.role !== 'admin') {
        console.log('\n⚠️  Warning: User role is not "admin"');
        console.log('   Current role:', profile.role);
        console.log('\n🔧 Updating role to "admin"...');
        await admin.firestore().collection('users').doc(userRecord.uid).update({
          role: 'admin'
        });
        console.log('✅ Role updated to "admin"');
      }
    } else {
      console.log('⚠️  Firestore profile does NOT exist');
      console.log('\n🔧 Creating Firestore profile...');
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        email: REVIEWER_EMAIL,
        displayName: 'Google Play Reviewer',
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        phoneNumber: '+40700000002',
        teams: []
      });
      console.log('✅ Firestore profile created');
    }

    console.log('\n' + '─'.repeat(60) + '\n');
    console.log('✅ SUCCESS: Account is ready for Google Play review\n');
    console.log('📋 Account details:');
    console.log(`   Email: ${REVIEWER_EMAIL}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log('   Role: admin');
    console.log('   Email verified: ✅');
    console.log();
    console.log('🧪 Next steps:');
    console.log('1. Test the login in the app to verify it works');
    console.log('2. Update credentials in Google Play Console');
    console.log('3. Submit the app for review');
    console.log();
    console.log('📝 See GOOGLE_PLAY_REVIEWER_FIX.md for detailed instructions\n');

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error('\n❌ Error: User not found');
      console.error(`   Email ${REVIEWER_EMAIL} does not exist in Firebase Authentication`);
      console.error('\n💡 Solution: Create the user first');
      console.error('   Run: node create-test-user.js');
      console.error('   Or use Firebase Console to create the user manually');
    } else {
      console.error('\n❌ Error:', error.message);
      console.error('\n💡 Troubleshooting:');
      console.error('- Verify service account has correct permissions');
      console.error('- Check Firebase rules allow admin access');
      console.error('- Ensure project ID is correct: beteldej-teams');
    }
    process.exit(1);
  }
}

resetReviewerPassword()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
