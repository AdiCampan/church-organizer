/**
 * Normalize login credentials before calling Firebase Auth.
 */
function normalizeLoginCredentials(email, password) {
  return {
    email: String(email ?? '').trim().toLowerCase(),
    password: String(password ?? ''),
  };
}

/**
 * Map Firebase Auth errors to a user-facing message.
 * Includes the error code so production issues are diagnosable.
 */
function getAuthErrorMessage(error, t) {
  const code = typeof error?.code === 'string' ? error.code : 'unknown';
  const translate = typeof t === 'function' ? t : (key) => key;

  const messages = {
    'auth/invalid-email': translate('authInvalidEmail'),
    'auth/invalid-credential': translate('authInvalidCredential'),
    'auth/invalid-login-credentials': translate('authInvalidCredential'),
    'auth/wrong-password': translate('authInvalidCredential'),
    'auth/user-not-found': translate('authInvalidCredential'),
    'auth/user-disabled': translate('authUserDisabled'),
    'auth/too-many-requests': translate('authTooManyRequests'),
    'auth/network-request-failed': translate('authNetworkError'),
    'auth/missing-email': translate('authEmailRequired'),
  };

  const base = messages[code] || translate('authGenericError');
  return `${base} (${code})`;
}

module.exports = {
  normalizeLoginCredentials,
  getAuthErrorMessage,
};
