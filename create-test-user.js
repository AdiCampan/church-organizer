const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../mobile/firebase-secrets/beteldej/google-services.json');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: serviceAccount.project_info.project_id,
    clientEmail: `firebase-adminsdk@${serviceAccount.project_info.project_id}.iam.gserviceaccount.com`,
    privateKey: "dummy" // Will be replaced with actual key
  }),
  databaseURL: `https://${serviceAccount.project_info.project_id}.firebaseio.com`
});

// Create test user
async function createTestUser() {
  try {
    const userRecord = await admin.auth().createUser({
      email: 'reviewer@googleplay.com',
      password: 'GooglePlay2026Review!',
      displayName: 'Google Play Reviewer',
      emailVerified: true
    });
    
    console.log('Test user created successfully:', userRecord.uid);
    
    // Add user to Firestore with admin role
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: 'reviewer@googleplay.com',
      displayName: 'Google Play Reviewer',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      teams: [],
      phoneNumber: '+40700000000'
    });
    
    console.log('User profile created in Firestore');
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();
