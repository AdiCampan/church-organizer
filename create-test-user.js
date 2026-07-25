const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Validate required environment variables first, before accessing any credentials
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const TEST_USER_DISPLAY_NAME = process.env.TEST_USER_DISPLAY_NAME || 'Test User';
const TEST_USER_ROLE = process.env.TEST_USER_ROLE || 'member'; // Default to 'member', not 'admin'

if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
  console.error('Error: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required');
  console.error('Usage: Configure these variables in .env file or use a secrets manager');
  console.error('See .env.example for required configuration');
  process.exit(1);
}

// Load and validate service account JSON
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || path.join(__dirname, '../mobile/firebase-secrets/beteldej/service-account.json');

let serviceAccount;
try {
  const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(serviceAccountData);
  
  // Validate required fields
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    console.error('Error: Service account JSON is incomplete');
    console.error('Required fields: project_id, client_email, private_key');
    process.exit(1);
  }
} catch (error) {
  console.error(`Error loading service account from ${serviceAccountPath}:`, error.message);
  console.error('Ensure the file exists and contains valid JSON');
  process.exit(1);
}

// Initialize Firebase Admin with validated service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

// Create test user with compensating transaction
async function createTestUser() {
  let userRecord = null;
  
  try {
    // Step 1: Create Auth user
    userRecord = await admin.auth().createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      displayName: TEST_USER_DISPLAY_NAME,
      emailVerified: true
    });
    
    console.log('Auth user created successfully:', userRecord.uid);
    
    // Step 2: Create Firestore profile
    try {
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        email: TEST_USER_EMAIL,
        displayName: TEST_USER_DISPLAY_NAME,
        role: TEST_USER_ROLE,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        teams: [],
        phoneNumber: ''
      });
      
      console.log(`User profile created in Firestore with role: ${TEST_USER_ROLE}`);
      console.log('Note: To grant admin access, update the role field manually in Firestore Console');
      console.log('\n✓ Test user creation completed successfully');
    } catch (firestoreError) {
      // Compensating transaction: delete Auth user if Firestore write fails
      console.error('Error creating Firestore profile:', firestoreError.message);
      console.error('Rolling back: Deleting Auth user...');
      
      try {
        await admin.auth().deleteUser(userRecord.uid);
        console.log('✓ Auth user deleted successfully (rollback completed)');
      } catch (deleteError) {
        console.error('✗ Failed to delete Auth user during rollback:', deleteError.message);
        console.error(`Manual cleanup required: Delete user ${userRecord.uid} from Firebase Console`);
      }
      
      process.exitCode = 1;
      throw firestoreError;
    }
  } catch (error) {
    console.error('\n✗ Test user creation failed:', error.message);
    process.exitCode = 1;
    throw error;
  }
}

createTestUser()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
