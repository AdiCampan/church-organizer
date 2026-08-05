/**
 * Permanently delete the signed-in user's account and associated profile data.
 * Requires a recent password re-authentication (Firebase Auth).
 */
async function deleteUserAccount({
  authUser,
  password,
  db,
  deleteDoc,
  doc,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
}) {
  if (!authUser || typeof authUser.email !== 'string' || !authUser.email) {
    const error = new Error('Missing authenticated user');
    error.code = 'auth/no-current-user';
    throw error;
  }

  const rawPassword = String(password ?? '');
  if (!rawPassword) {
    const error = new Error('Password required');
    error.code = 'auth/missing-password';
    throw error;
  }

  const credential = EmailAuthProvider.credential(authUser.email, rawPassword);
  await reauthenticateWithCredential(authUser, credential);

  await deleteDoc(doc(db, 'users', authUser.uid));

  let fcmCleanupError = null;
  try {
    await deleteDoc(doc(db, 'fcmTokens', authUser.uid));
  } catch (error) {
    fcmCleanupError = error;
    console.warn('FCM token cleanup failed during account deletion:', error);
  }

  try {
    await deleteUser(authUser);
  } catch (authDeleteError) {
    if (fcmCleanupError) {
      authDeleteError.fcmCleanupError = fcmCleanupError;
      console.error('Auth delete failed after FCM cleanup error:', {
        authDeleteError,
        fcmCleanupError,
      });
    }
    throw authDeleteError;
  }
}

/**
 * Map account-deletion Auth/Firestore errors to i18n keys.
 */
function getAccountDeletionErrorKey(error) {
  const code = typeof error?.code === 'string' ? error.code : '';

  const map = {
    'auth/wrong-password': 'deleteAccountWrongPassword',
    'auth/invalid-credential': 'deleteAccountWrongPassword',
    'auth/invalid-login-credentials': 'deleteAccountWrongPassword',
    'auth/missing-password': 'deleteAccountPasswordRequired',
    'auth/requires-recent-login': 'deleteAccountRequiresRecentLogin',
    'auth/too-many-requests': 'authTooManyRequests',
    'auth/network-request-failed': 'authNetworkError',
    'auth/user-disabled': 'authUserDisabled',
    'auth/no-current-user': 'deleteAccountError',
  };

  return map[code] || 'deleteAccountError';
}

module.exports = {
  deleteUserAccount,
  getAccountDeletionErrorKey,
};
