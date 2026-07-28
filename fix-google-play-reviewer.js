const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const REVIEWER_EMAIL = 'reviewer@googleplay.beteldej.com';
const REVIEWER_PASSWORD = process.env.REVIEWER_PASSWORD;
const REVIEWER_DISPLAY_NAME = 'Google Play Reviewer';
const REVIEWER_PHONE = '+40700000002';

if (!REVIEWER_PASSWORD) {
  console.error('\n❌ Error: REVIEWER_PASSWORD environment variable is required');
  console.error('\n💡 Set it in your .env file:');
  console.error('   REVIEWER_PASSWORD=your_secure_password\n');
  process.exit(1);
}

// Load service account
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || path.join(__dirname, '../mobile/firebase-secrets/beteldej/service-account.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function initialize() {
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
    console.error('\n❌ Error: Cannot load service account file');
    console.error(`   Path: ${serviceAccountPath}`);
    console.error(`   Error: ${error.message}\n`);
    console.error('🔧 How to get the service account file:');
    console.error('   1. Go to: https://console.firebase.google.com');
    console.error('   2. Select: beteldej-teams project');
    console.error('   3. Go to: Project Settings → Service accounts');
    console.error('   4. Click: "Generate new private key"');
    console.error(`   5. Save to: ${serviceAccountPath}\n`);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });

  return serviceAccount.project_id;
}

async function checkAccount() {
  try {
    const userRecord = await admin.auth().getUserByEmail(REVIEWER_EMAIL);
    const userDoc = await admin.firestore().collection('users').doc(userRecord.uid).get();
    const profile = userDoc.exists ? userDoc.data() : null;

    return {
      exists: true,
      uid: userRecord.uid,
      emailVerified: userRecord.emailVerified,
      profile: profile,
      hasCorrectRole: profile?.role === 'admin'
    };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return { exists: false };
    }
    throw error;
  }
}

async function createAccount() {
  console.log('\n📝 Creating new reviewer account...');
  
  try {
    const userRecord = await admin.auth().createUser({
      email: REVIEWER_EMAIL,
      password: REVIEWER_PASSWORD,
      displayName: REVIEWER_DISPLAY_NAME,
      emailVerified: true
    });
    
    console.log('✅ Authentication user created');
    console.log(`   UID: ${userRecord.uid}`);

    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: REVIEWER_EMAIL,
      displayName: REVIEWER_DISPLAY_NAME,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      phoneNumber: REVIEWER_PHONE,
      teams: []
    });
    
    console.log('✅ Firestore profile created');
    console.log('✅ Role set to: admin\n');
    
    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error('❌ Error creating account:', error.message);
    return { success: false, error: error.message };
  }
}

async function updateAccount(uid) {
  console.log('\n🔧 Updating existing account...');
  
  try {
    await admin.auth().updateUser(uid, {
      password: REVIEWER_PASSWORD,
      emailVerified: true
    });
    console.log('✅ Password updated');
    console.log('✅ Email marked as verified');

    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.log('⚠️  Firestore profile missing, creating...');
      await admin.firestore().collection('users').doc(uid).set({
        email: REVIEWER_EMAIL,
        displayName: REVIEWER_DISPLAY_NAME,
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        phoneNumber: REVIEWER_PHONE,
        teams: []
      });
      console.log('✅ Firestore profile created');
    } else {
      const profile = userDoc.data();
      const updates = {};
      
      if (profile.role !== 'admin') {
        updates.role = 'admin';
        console.log('✅ Role updated to: admin');
      }
      
      if (profile.displayName !== REVIEWER_DISPLAY_NAME) {
        updates.displayName = REVIEWER_DISPLAY_NAME;
      }
      
      if (Object.keys(updates).length > 0) {
        await admin.firestore().collection('users').doc(uid).update(updates);
        console.log('✅ Firestore profile updated');
      } else {
        console.log('✅ Firestore profile already correct');
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating account:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('  🔧 Google Play Reviewer Account - Automated Fix');
  console.log('═'.repeat(70) + '\n');
  
  console.log('This script will:');
  console.log('  1. Check if the reviewer account exists');
  console.log('  2. Create or update the account as needed');
  console.log('  3. Verify the setup is correct\n');
  
  console.log('Target account:');
  console.log(`  Email: ${REVIEWER_EMAIL}`);
  console.log(`  Password: ${REVIEWER_PASSWORD.substring(0, 4)}${'*'.repeat(REVIEWER_PASSWORD.length - 4)}`);
  console.log(`  Role: admin\n`);
  
  console.log('─'.repeat(70) + '\n');

  try {
    // Initialize Firebase
    console.log('🔌 Connecting to Firebase...');
    const projectId = await initialize();
    console.log(`✅ Connected to project: ${projectId}\n`);

    // Check current state
    console.log('🔍 Checking current account state...');
    const accountState = await checkAccount();
    
    if (!accountState.exists) {
      console.log('📋 Status: Account does NOT exist\n');
      
      const answer = await question('Do you want to create the account? (yes/no): ');
      
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        const result = await createAccount();
        if (!result.success) {
          console.error('\n❌ Failed to create account');
          process.exit(1);
        }
      } else {
        console.log('\n❌ Operation cancelled by user');
        process.exit(0);
      }
    } else {
      console.log('📋 Status: Account exists\n');
      console.log(`   UID: ${accountState.uid}`);
      console.log(`   Email verified: ${accountState.emailVerified ? '✅' : '❌'}`);
      console.log(`   Firestore profile: ${accountState.profile ? '✅' : '❌'}`);
      console.log(`   Role is admin: ${accountState.hasCorrectRole ? '✅' : '❌'}\n`);
      
      if (!accountState.emailVerified || !accountState.profile || !accountState.hasCorrectRole) {
        console.log('⚠️  Account needs updates\n');
        
        const answer = await question('Do you want to fix the account? (yes/no): ');
        
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          const result = await updateAccount(accountState.uid);
          if (!result.success) {
            console.error('\n❌ Failed to update account');
            process.exit(1);
          }
        } else {
          console.log('\n❌ Operation cancelled by user');
          process.exit(0);
        }
      } else {
        console.log('✅ Account is already correctly configured!\n');
        
        const answer = await question('Do you want to reset the password anyway? (yes/no): ');
        
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          const result = await updateAccount(accountState.uid);
          if (!result.success) {
            console.error('\n❌ Failed to update password');
            process.exit(1);
          }
        }
      }
    }

    // Final verification
    console.log('\n' + '─'.repeat(70) + '\n');
    console.log('🔍 Final verification...\n');
    
    const finalState = await checkAccount();
    
    if (finalState.exists && finalState.emailVerified && finalState.profile && finalState.hasCorrectRole) {
      console.log('✅ SUCCESS: Account is ready for Google Play review!\n');
      console.log('📋 Account credentials:');
      console.log(`   Email: ${REVIEWER_EMAIL}`);
      console.log(`   UID: ${finalState.uid}`);
      console.log('   Role: admin');
      console.log('   Email verified: ✅\n');
      
      console.log('🧪 Next steps:');
      console.log('   1. Test login in the app with these credentials');
      console.log('   2. If login works, update Google Play Console:');
      console.log('      - Go to: https://play.google.com/console');
      console.log('      - Select: Betel Dej Teams');
      console.log('      - Update "Sign-in details"');
      console.log('      - Submit for review\n');
      
      console.log('📖 For detailed instructions, see:');
      console.log('   QUICK_FIX_GOOGLE_PLAY.md (quick guide)');
      console.log('   GOOGLE_PLAY_REVIEWER_FIX.md (complete guide)\n');
    } else {
      console.log('⚠️  WARNING: Account may not be fully configured\n');
      console.log('Please run the check script to diagnose:');
      console.log('   npm run check-reviewer\n');
    }
    
    console.log('═'.repeat(70) + '\n');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify service account has correct permissions');
    console.error('   - Check Firebase rules allow admin access');
    console.error('   - Ensure project ID is correct\n');
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
