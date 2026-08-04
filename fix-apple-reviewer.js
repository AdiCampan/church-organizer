/**
 * Ensures the Apple App Review demo account exists in the Betel Dej Firebase project.
 * Target project: church-teams-8ea48 (the one used by the iOS/Android app builds).
 *
 * Usage:
 *   APPLE_REVIEW_PASSWORD='...' node fix-apple-reviewer.js
 *
 * Requires Firebase CLI login (uses ~/.config/configstore/firebase-tools.json tokens).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

const PROJECT_ID = 'church-teams-8ea48';
const API_KEY = process.env.BETEL_FIREBASE_API_KEY || 'AIzaSyAnuqZ9u7Rvz7_ntMFDTZG0JSrIabyML8Q';
const REVIEWER_EMAIL = 'applereview@beteldej.teams';
const REVIEWER_DISPLAY_NAME = 'Apple Review Team';
const REVIEWER_PHONE = '+40700000001';
const REQUEST_INACTIVITY_TIMEOUT_MS = 30000;
const INVALID_CREDENTIAL_CODES = new Set(['INVALID_PASSWORD', 'INVALID_LOGIN_CREDENTIALS']);

function getReviewerPassword() {
  return process.env.APPLE_REVIEW_PASSWORD;
}

function loadAccessToken() {
  const cfgPath = path.join(process.env.HOME || '', '.config/configstore/firebase-tools.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const token = cfg.tokens && cfg.tokens.access_token;
  if (!token) {
    throw new Error('Firebase CLI access token not found. Run: firebase login');
  }
  return token;
}

function getAuthErrorMessage(error) {
  return (error && error.body && error.body.error && error.body.error.message) || '';
}

function requestJson(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch {
          parsed = { raw: data };
        }
        if (res.statusCode && res.statusCode >= 400) {
          const error = new Error(`HTTP ${res.statusCode}: ${data}`);
          error.statusCode = res.statusCode;
          error.body = parsed;
          reject(error);
          return;
        }
        resolve(parsed);
      });
    });

    req.setTimeout(REQUEST_INACTIVITY_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request inactivity timeout after ${REQUEST_INACTIVITY_TIMEOUT_MS}ms`));
    });
    req.on('error', reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function ensureAuthUser(deps = {}) {
  const request = deps.requestJson || requestJson;
  const loadToken = deps.loadAccessToken || loadAccessToken;
  const password = deps.password || getReviewerPassword();
  if (!password) {
    throw new Error('APPLE_REVIEW_PASSWORD environment variable is required');
  }

  const signUpBody = JSON.stringify({
    email: REVIEWER_EMAIL,
    password,
    displayName: REVIEWER_DISPLAY_NAME,
    returnSecureToken: true
  });

  try {
    const created = await request(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(signUpBody) }
      },
      signUpBody
    );
    console.log('Auth user created:', created.localId);
    return created.localId;
  } catch (error) {
    const message = getAuthErrorMessage(error);
    if (message !== 'EMAIL_EXISTS') {
      throw error;
    }
  }

  const signInBody = JSON.stringify({
    email: REVIEWER_EMAIL,
    password,
    returnSecureToken: true
  });

  try {
    const signedIn = await request(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(signInBody) }
      },
      signInBody
    );
    console.log('Auth user exists and password works:', signedIn.localId);
    return signedIn.localId;
  } catch (error) {
    const message = getAuthErrorMessage(error);
    if (!INVALID_CREDENTIAL_CODES.has(message)) {
      throw error;
    }
    console.log('Auth user exists but password mismatch. Updating password...');
  }

  const accessToken = loadToken();
  const lookupBody = JSON.stringify({ email: [REVIEWER_EMAIL] });
  const lookup = await request(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(lookupBody)
      }
    },
    lookupBody
  );

  const uid = lookup.users && lookup.users[0] && lookup.users[0].localId;
  if (!uid) {
    throw new Error('Could not resolve existing user UID');
  }

  const updateBody = JSON.stringify({
    localId: uid,
    password,
    emailVerified: true,
    displayName: REVIEWER_DISPLAY_NAME
  });
  await request(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(updateBody)
      }
    },
    updateBody
  );
  console.log('Password updated for:', uid);
  return uid;
}

async function ensureProfile(uid, deps = {}) {
  const request = deps.requestJson || requestJson;
  const loadToken = deps.loadAccessToken || loadAccessToken;
  const accessToken = loadToken();
  const doc = {
    fields: {
      email: { stringValue: REVIEWER_EMAIL },
      displayName: { stringValue: REVIEWER_DISPLAY_NAME },
      role: { stringValue: 'admin' },
      phoneNumber: { stringValue: REVIEWER_PHONE },
      teams: { arrayValue: { values: [] } },
      createdAt: { timestampValue: new Date().toISOString() }
    }
  };
  const body = JSON.stringify(doc);

  try {
    await request(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?documentId=${uid}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      body
    );
    console.log('Firestore profile created with admin role');
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
    const patchUrl =
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}` +
      '?updateMask.fieldPaths=email&updateMask.fieldPaths=displayName&updateMask.fieldPaths=role&updateMask.fieldPaths=phoneNumber&updateMask.fieldPaths=teams';
    await request(
      patchUrl,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      body
    );
    console.log('Firestore profile updated with admin role');
  }
}

async function verifyEmail(uid, deps = {}) {
  const request = deps.requestJson || requestJson;
  const loadToken = deps.loadAccessToken || loadAccessToken;
  const accessToken = loadToken();
  const body = JSON.stringify({
    localId: uid,
    emailVerified: true,
    displayName: REVIEWER_DISPLAY_NAME
  });
  await request(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    },
    body
  );
  console.log('Email marked as verified');
}

async function verifyLogin(deps = {}) {
  const request = deps.requestJson || requestJson;
  const password = deps.password || getReviewerPassword();
  if (!password) {
    throw new Error('APPLE_REVIEW_PASSWORD environment variable is required');
  }
  const body = JSON.stringify({
    email: REVIEWER_EMAIL,
    password,
    returnSecureToken: true
  });
  const result = await request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    },
    body
  );
  console.log('Login verification OK:', result.localId);
  return result.localId;
}

async function main() {
  if (!getReviewerPassword()) {
    console.error('\nError: APPLE_REVIEW_PASSWORD environment variable is required\n');
    process.exit(1);
  }

  console.log('\nApple App Review account fix');
  console.log('Project:', PROJECT_ID);
  console.log('Email:', REVIEWER_EMAIL);

  const uid = await ensureAuthUser();
  await verifyEmail(uid);
  await ensureProfile(uid);
  await verifyLogin();

  console.log('\nReady for App Store Connect:');
  console.log('  Username:', REVIEWER_EMAIL);
  console.log('  Password: (from APPLE_REVIEW_PASSWORD)');
  console.log('');
}

module.exports = {
  PROJECT_ID,
  REVIEWER_EMAIL,
  REVIEWER_DISPLAY_NAME,
  REQUEST_INACTIVITY_TIMEOUT_MS,
  INVALID_CREDENTIAL_CODES,
  getAuthErrorMessage,
  requestJson,
  loadAccessToken,
  ensureAuthUser,
  ensureProfile,
  verifyEmail,
  verifyLogin,
  main
};

if (require.main === module) {
  main().catch((error) => {
    console.error('\nFailed:', error.message);
    process.exit(1);
  });
}
