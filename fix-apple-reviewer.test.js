const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');

const {
  ensureAuthUser,
  ensureProfile,
  verifyEmail,
  verifyLogin,
  REQUEST_INACTIVITY_TIMEOUT_MS
} = require('./fix-apple-reviewer');

function runWithoutPassword() {
  return spawnSync('node', [path.join(__dirname, 'fix-apple-reviewer.js')], {
    env: { ...process.env, APPLE_REVIEW_PASSWORD: '' },
    encoding: 'utf8'
  });
}

function createAuthError(message, statusCode = 400) {
  const error = new Error(`HTTP ${statusCode}`);
  error.statusCode = statusCode;
  error.body = { error: { message } };
  return error;
}

function testRequiresPassword() {
  const result = runWithoutPassword();
  assert.notStrictEqual(result.status, 0, 'script should exit with error without password');
  assert.match(
    result.stderr || result.stdout,
    /APPLE_REVIEW_PASSWORD/,
    'error message should mention APPLE_REVIEW_PASSWORD'
  );
}

async function testCreatesUserWhenMissing() {
  const calls = [];
  const uid = await ensureAuthUser({
    password: 'TestPassword123',
    requestJson: async (url, options, body) => {
      calls.push({ url, options, body });
      return { localId: 'uid-created' };
    }
  });
  assert.strictEqual(uid, 'uid-created');
  assert.strictEqual(calls.length, 1);
  assert.match(calls[0].url, /accounts:signUp/);
}

async function testEmailExistsWithValidLogin() {
  const calls = [];
  const uid = await ensureAuthUser({
    password: 'TestPassword123',
    requestJson: async (url) => {
      calls.push(url);
      if (url.includes('accounts:signUp')) {
        throw createAuthError('EMAIL_EXISTS');
      }
      if (url.includes('signInWithPassword')) {
        return { localId: 'uid-existing' };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }
  });
  assert.strictEqual(uid, 'uid-existing');
  assert.strictEqual(calls.length, 2);
  assert.ok(!calls.some((url) => url.includes('accounts:update')));
}

async function testInvalidCredentialsUpdateAccount(code) {
  const calls = [];
  const uid = await ensureAuthUser({
    password: 'NewPassword123',
    loadAccessToken: () => 'token',
    requestJson: async (url) => {
      calls.push(url);
      if (url.includes('accounts:signUp')) {
        throw createAuthError('EMAIL_EXISTS');
      }
      if (url.includes('signInWithPassword')) {
        throw createAuthError(code);
      }
      if (url.includes('accounts:lookup')) {
        return { users: [{ localId: 'uid-reset' }] };
      }
      if (url.includes('accounts:update')) {
        return { localId: 'uid-reset' };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }
  });
  assert.strictEqual(uid, 'uid-reset');
  assert.ok(calls.some((url) => url.includes('accounts:update')));
}

async function testUserDisabledPropagates() {
  await assert.rejects(
    () =>
      ensureAuthUser({
        password: 'TestPassword123',
        requestJson: async (url) => {
          if (url.includes('accounts:signUp')) {
            throw createAuthError('EMAIL_EXISTS');
          }
          throw createAuthError('USER_DISABLED');
        }
      }),
    (error) => getMessage(error) === 'USER_DISABLED'
  );
}

async function testNetworkErrorPropagatesWithoutPasswordUpdate() {
  let updateCalled = false;
  await assert.rejects(
    () =>
      ensureAuthUser({
        password: 'TestPassword123',
        requestJson: async (url) => {
          if (url.includes('accounts:signUp')) {
            throw createAuthError('EMAIL_EXISTS');
          }
          if (url.includes('signInWithPassword')) {
            throw new Error('socket hang up');
          }
          if (url.includes('accounts:update')) {
            updateCalled = true;
          }
          throw new Error(`Unexpected URL: ${url}`);
        }
      }),
    /socket hang up/
  );
  assert.strictEqual(updateCalled, false);
}

async function testEnsureProfilePatchesOnConflict() {
  const methods = [];
  await ensureProfile('uid-1', {
    loadAccessToken: () => 'token',
    requestJson: async (url, options) => {
      methods.push(options.method);
      if (options.method === 'POST') {
        const error = new Error('HTTP 409');
        error.statusCode = 409;
        throw error;
      }
      return {};
    }
  });
  assert.deepStrictEqual(methods, ['POST', 'PATCH']);
}

async function testVerifyEmailAndLogin() {
  const urls = [];
  await verifyEmail('uid-1', {
    loadAccessToken: () => 'token',
    requestJson: async (url) => {
      urls.push(url);
      return {};
    }
  });
  const loginUid = await verifyLogin({
    password: 'TestPassword123',
    requestJson: async (url) => {
      urls.push(url);
      return { localId: 'uid-1' };
    }
  });
  assert.strictEqual(loginUid, 'uid-1');
  assert.ok(urls.some((url) => url.includes('accounts:update')));
  assert.ok(urls.some((url) => url.includes('signInWithPassword')));
}

function testInactivityTimeoutConstant() {
  assert.strictEqual(REQUEST_INACTIVITY_TIMEOUT_MS, 30000);
}

function getMessage(error) {
  return (error && error.body && error.body.error && error.body.error.message) || error.message;
}

async function run() {
  testRequiresPassword();
  testInactivityTimeoutConstant();
  await testCreatesUserWhenMissing();
  await testEmailExistsWithValidLogin();
  await testInvalidCredentialsUpdateAccount('INVALID_PASSWORD');
  await testInvalidCredentialsUpdateAccount('INVALID_LOGIN_CREDENTIALS');
  await testUserDisabledPropagates();
  await testNetworkErrorPropagatesWithoutPasswordUpdate();
  await testEnsureProfilePatchesOnConflict();
  await testVerifyEmailAndLogin();
  console.log('fix-apple-reviewer.test.js: all mocks passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
