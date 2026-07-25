const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin with proper service account
// Service account JSON should be provided via GOOGLE_APPLICATION_CREDENTIALS env var
// or the path should be set via SERVICE_ACCOUNT_PATH
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || '../mobile/firebase-secrets/beteldej/service-account.json';
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

// Credentials from environment variables
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const TEST_USER_DISPLAY_NAME = process.env.TEST_USER_DISPLAY_NAME || 'Test User';
const TEST_USER_ROLE = process.env.TEST_USER_ROLE || 'member'; // Default to 'member', not 'admin'

if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
  console.error('Error: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required');
  console.error('Usage: TEST_USER_EMAIL=user@example.com TEST_USER_PASSWORD=secure123 node create-test-user.js');
  process.exit(1);
}

// Create test user
async function createTestUser() {
  try {
    const userRecord = await admin.auth().createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      displayName: TEST_USER_DISPLAY_NAME,
      emailVerified: true
    });
    
    console.log('Test user created successfully:', userRecord.uid);
    
    // Add user to Firestore - role must be set manually by admin if elevated access is needed
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
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();
