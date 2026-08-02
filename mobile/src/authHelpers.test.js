const assert = require('assert');
const { normalizeLoginCredentials, getAuthErrorMessage } = require('./authHelpers');

function t(key) {
  const map = {
    authInvalidEmail: 'Invalid email',
    authInvalidCredential: 'Wrong email or password',
    authUserDisabled: 'User disabled',
    authTooManyRequests: 'Too many requests',
    authNetworkError: 'Network error',
    authEmailRequired: 'Email required',
    authGenericError: 'Auth error',
  };
  return map[key] || key;
}

assert.deepStrictEqual(
  normalizeLoginCredentials('  Adi@Example.com ', '  Secret123!  '),
  { email: 'adi@example.com', password: 'Secret123!' }
);

assert.strictEqual(
  getAuthErrorMessage({ code: 'auth/invalid-credential' }, t),
  'Wrong email or password (auth/invalid-credential)'
);

assert.strictEqual(
  getAuthErrorMessage({ code: 'auth/network-request-failed' }, t),
  'Network error (auth/network-request-failed)'
);

assert.strictEqual(
  getAuthErrorMessage({ message: 'boom' }, t),
  'Auth error (unknown)'
);

console.log('authHelpers.test.js passed');
