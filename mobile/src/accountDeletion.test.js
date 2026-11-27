const assert = require('assert');
const { deleteUserAccount, getAccountDeletionErrorKey } = require('./accountDeletion');

function createMocks({ reauthReject, deleteUserReject, fcmReject, password = 'Secret123!' } = {}) {
  const calls = [];
  const authUser = { uid: 'user-1', email: 'demo@example.com' };

  const EmailAuthProvider = {
    credential: (email, nextPassword) => {
      calls.push({ type: 'credential', email, password: nextPassword });
      return { email, password: nextPassword };
    },
  };

  const reauthenticateWithCredential = async (user, credential) => {
    calls.push({ type: 'reauth', userId: user.uid, credential });
    if (reauthReject) throw reauthReject;
  };

  const deleteDoc = async (ref) => {
    calls.push({ type: 'deleteDoc', path: ref.path });
    if (ref.path === 'fcmTokens/user-1' && fcmReject) throw fcmReject;
  };

  const doc = (_db, collectionName, id) => ({
    path: `${collectionName}/${id}`,
  });

  const deleteUser = async (user) => {
    calls.push({ type: 'deleteUser', userId: user.uid });
    if (deleteUserReject) throw deleteUserReject;
  };

  return {
    authUser,
    calls,
    deps: {
      authUser,
      password,
      db: {},
      deleteDoc,
      doc,
      EmailAuthProvider,
      reauthenticateWithCredential,
      deleteUser,
      collection: (_db, name) => ({ name }),
      getDocs: async () => ({ docs: [] }),
      arrayRemove: (...values) => ({ values }),
      writeBatch: () => ({ update() {}, commit: async () => {} }),
    },
  };
}

async function run() {
  assert.strictEqual(
    getAccountDeletionErrorKey({ code: 'auth/wrong-password' }),
    'deleteAccountWrongPassword'
  );
  assert.strictEqual(
    getAccountDeletionErrorKey({ code: 'auth/requires-recent-login' }),
    'deleteAccountRequiresRecentLogin'
  );
  assert.strictEqual(
    getAccountDeletionErrorKey({ code: 'auth/missing-password' }),
    'deleteAccountPasswordRequired'
  );
  assert.strictEqual(
    getAccountDeletionErrorKey({ message: 'boom' }),
    'deleteAccountError'
  );

  {
    const { deps, calls } = createMocks();
    await deleteUserAccount(deps);
    assert.deepStrictEqual(
      calls.map((c) => c.type),
      ['credential', 'reauth', 'deleteDoc', 'deleteDoc', 'deleteUser']
    );
    assert.strictEqual(calls[2].path, 'users/user-1');
    assert.strictEqual(calls[3].path, 'fcmTokens/user-1');
  }

  {
    const { deps, calls } = createMocks();
    const teamCalls = [];
    await deleteUserAccount({
      ...deps,
      collection: (_db, name) => ({ name }),
      getDocs: async () => {
        teamCalls.push('getDocs');
        return { docs: [{ id: 'alabanza', data: () => ({ members: ['user-1', 'user-2'], leaders: ['user-1'] }) }] };
      },
      arrayRemove: (...values) => ({ values }),
      writeBatch: () => ({
        update: (ref, data) => teamCalls.push({ path: ref.path, data }),
        commit: async () => {
          teamCalls.push('commit');
        },
      }),
    });
    assert.deepStrictEqual(teamCalls, [
      'getDocs',
      {
        path: 'teams/alabanza',
        data: { members: { values: ['user-1'] }, leaders: { values: ['user-1'] } },
      },
      'commit',
    ]);
    assert.ok(calls.some((c) => c.type === 'deleteDoc' && c.path === 'users/user-1'));
    assert.ok(calls.some((c) => c.type === 'deleteUser'));
  }

  {
    const { deps, calls } = createMocks();
    await deleteUserAccount({
      ...deps,
      collection: (_db, name) => ({ name }),
      getDocs: async () => {
        throw Object.assign(new Error('permission-denied'), { code: 'permission-denied' });
      },
      arrayRemove: (...values) => ({ values }),
      writeBatch: () => ({ update() {}, commit: async () => {} }),
    });
    assert.ok(calls.some((c) => c.type === 'deleteDoc' && c.path === 'users/user-1'));
    assert.ok(calls.some((c) => c.type === 'deleteUser'));
  }

  {
    const passwordWithSpaces = '  Secret123!  ';
    const { deps, calls } = createMocks({ password: passwordWithSpaces });
    await deleteUserAccount(deps);
    assert.strictEqual(calls[0].password, passwordWithSpaces);
    assert.strictEqual(calls[1].credential.password, passwordWithSpaces);
  }

  {
    const { deps, calls } = createMocks({
      fcmReject: Object.assign(new Error('permission-denied'), { code: 'permission-denied' }),
    });
    await deleteUserAccount(deps);
    assert.ok(calls.some((c) => c.type === 'deleteUser'));
  }

  {
    const { deps } = createMocks({
      reauthReject: Object.assign(new Error('bad password'), { code: 'auth/wrong-password' }),
    });
    await assert.rejects(
      () => deleteUserAccount(deps),
      (err) => err.code === 'auth/wrong-password'
    );
  }

  {
    const { deps, calls } = createMocks({ password: '' });
    await assert.rejects(
      () => deleteUserAccount(deps),
      (err) => err.code === 'auth/missing-password'
    );
    assert.strictEqual(calls.length, 0);
  }

  {
    const { deps, calls } = createMocks();
    await assert.rejects(
      () => deleteUserAccount({ ...deps, authUser: null }),
      (err) => err.code === 'auth/no-current-user'
    );
    assert.strictEqual(calls.length, 0);
  }

  {
    const authDeleteError = Object.assign(new Error('auth delete failed'), {
      code: 'auth/internal-error',
    });
    const { deps } = createMocks({ deleteUserReject: authDeleteError });
    await assert.rejects(
      () => deleteUserAccount(deps),
      (err) => err === authDeleteError && err.code === 'auth/internal-error'
    );
  }

  {
    const fcmReject = Object.assign(new Error('permission-denied'), { code: 'permission-denied' });
    const authDeleteError = Object.assign(new Error('auth delete failed'), {
      code: 'auth/internal-error',
    });
    const { deps } = createMocks({ fcmReject, deleteUserReject: authDeleteError });
    await assert.rejects(
      () => deleteUserAccount(deps),
      (err) => err === authDeleteError && err.fcmCleanupError === fcmReject
    );
  }

  console.log('accountDeletion.test.js passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
