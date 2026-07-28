const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const REVIEWER_EMAIL = 'reviewer@googleplay.beteldej.com';
const REVIEWER_PASSWORD = process.env.REVIEWER_PASSWORD;

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

async function checkReviewerAccount() {
  console.log('\n🔍 Checking Google Play reviewer account...\n');
  console.log(`Email: ${REVIEWER_EMAIL}`);
  if (REVIEWER_PASSWORD) {
    console.log('Password: Configured ✓\n');
  } else {
    console.log('Password: Not configured (set REVIEWER_PASSWORD in .env)\n');
  }
  console.log('─'.repeat(60) + '\n');

  let authUser = null;
  let firestoreProfile = null;

  try {
    // Check Firebase Authentication
    console.log('📧 Checking Firebase Authentication...');
    try {
      authUser = await admin.auth().getUserByEmail(REVIEWER_EMAIL);
      console.log('✅ User exists in Firebase Authentication');
      console.log(`   UID: ${authUser.uid}`);
      console.log(`   Email verified: ${authUser.emailVerified}`);
      console.log(`   Created: ${new Date(authUser.metadata.creationTime).toLocaleString()}`);
      console.log(`   Last sign in: ${authUser.metadata.lastSignInTime ? new Date(authUser.metadata.lastSignInTime).toLocaleString() : 'Never'}`);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.log('❌ User NOT found in Firebase Authentication');
        console.log('   Action required: Create the user');
      } else {
        throw authError;
      }
    }

    console.log();

    // Check Firestore profile
    if (authUser) {
      console.log('📄 Checking Firestore profile...');
      try {
        const userDoc = await admin.firestore().collection('users').doc(authUser.uid).get();
        
        if (userDoc.exists) {
          firestoreProfile = userDoc.data();
          console.log('✅ User profile exists in Firestore');
          console.log(`   Display name: ${firestoreProfile.displayName || 'Not set'}`);
          console.log(`   Role: ${firestoreProfile.role || 'Not set'}`);
          console.log(`   Teams: ${firestoreProfile.teams ? firestoreProfile.teams.length : 0}`);
          console.log(`   Phone: ${firestoreProfile.phoneNumber || 'Not set'}`);
        } else {
          console.log('❌ User profile NOT found in Firestore');
          console.log('   Action required: Create Firestore profile');
        }
      } catch (firestoreError) {
        console.error('❌ Error checking Firestore:', firestoreError.message);
      }
    }

    console.log('\n' + '─'.repeat(60) + '\n');

    // Summary and recommendations
    console.log('📋 Summary:\n');
    
    if (!authUser) {
      console.log('❌ Status: ACCOUNT DOES NOT EXIST');
      console.log('\n🔧 Actions required:');
      console.log('1. Create user in Firebase Authentication');
      console.log('2. Create user profile in Firestore');
      console.log('\n💡 Options:');
      console.log('A. Use Firebase Console (fastest):');
      console.log('   - Go to: https://console.firebase.google.com/project/beteldej-teams/authentication/users');
      console.log('   - Click "Add user"');
      console.log(`   - Email: ${REVIEWER_EMAIL}`);
      console.log('   - Use a secure password');
      console.log('   - Then create Firestore profile manually');
      console.log('\nB. Use create-test-user.js script:');
      console.log('   - Configure .env file with credentials');
      console.log('   - Run: node create-test-user.js');
    } else if (!firestoreProfile) {
      console.log('⚠️  Status: AUTH EXISTS BUT NO FIRESTORE PROFILE');
      console.log('\n🔧 Actions required:');
      console.log('1. Create user profile in Firestore');
      console.log('\n💡 Manual creation:');
      console.log('   - Go to: https://console.firebase.google.com/project/beteldej-teams/firestore/data/~2Fusers');
      console.log(`   - Add document with ID: ${authUser.uid}`);
      console.log('   - Fields:');
      console.log(`     email: "${REVIEWER_EMAIL}"`);
      console.log('     displayName: "Google Play Reviewer"');
      console.log('     role: "admin"');
      console.log('     createdAt: [Current timestamp]');
      console.log('     phoneNumber: "+40700000002"');
      console.log('     teams: []');
    } else if (firestoreProfile.role !== 'admin') {
      console.log('⚠️  Status: EXISTS BUT NOT ADMIN');
      console.log(`   Current role: ${firestoreProfile.role}`);
      console.log('\n🔧 Actions required:');
      console.log('1. Update role to "admin" in Firestore');
      console.log('\n💡 Update role:');
      console.log('   - Go to: https://console.firebase.google.com/project/beteldej-teams/firestore/data/~2Fusers~2F' + authUser.uid);
      console.log('   - Edit field "role"');
      console.log('   - Set value: "admin"');
    } else if (!authUser.emailVerified) {
      console.log('⚠️  Status: EXISTS BUT EMAIL NOT VERIFIED');
      console.log('\n🔧 Actions required:');
      console.log('1. Mark email as verified in Firebase Authentication');
      console.log('\n💡 Verify email:');
      console.log('   - Go to: https://console.firebase.google.com/project/beteldej-teams/authentication/users');
      console.log(`   - Find user: ${REVIEWER_EMAIL}`);
      console.log('   - Click the three dots (⋮)');
      console.log('   - Mark email as verified');
    } else {
      console.log('✅ Status: ACCOUNT IS READY');
      console.log('\n🧪 Next steps:');
      console.log('1. Test login with the configured credentials');
      console.log(`   Email: ${REVIEWER_EMAIL}`);
      console.log('\n2. If login works, update Google Play Console:');
      console.log('   - Go to: https://play.google.com/console');
      console.log('   - Select app: Betel Dej Teams');
      console.log('   - Update "Sign-in details"');
      console.log('   - Submit for review');
      console.log('\n📝 See GOOGLE_PLAY_REVIEWER_FIX.md for detailed instructions');
    }

    console.log('\n' + '─'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('- Verify service account has correct permissions');
    console.error('- Check Firebase rules allow admin access');
    console.error('- Ensure project ID is correct: beteldej-teams');
    process.exitCode = 1;
  }
}

checkReviewerAccount();
