const assert = require('assert');
const {
  getTeamCleanupPlan,
  removeUsersFromTeams,
  getVisibleMemberIds,
} = require('./teamMembership');

const teams = [
  { id: 'alabanza', members: ['u1', 'u2', 'u3'], leaders: ['u1'] },
  { id: 'sonido', members: ['u2'], leaders: [] },
  { id: 'ninos', members: ['u4'] },
  { id: 'vacio' },
];

function createFirestoreMock(teamDocs) {
  const commits = [];
  return {
    commits,
    deps: {
      db: 'db',
      collection: (_db, name) => ({ name }),
      getDocs: async () => ({
        docs: teamDocs.map(({ id, ...data }) => ({ id, data: () => data })),
      }),
      doc: (_db, collectionName, id) => ({ path: `${collectionName}/${id}` }),
      arrayRemove: (...values) => ({ op: 'arrayRemove', values }),
      writeBatch: () => {
        const updates = [];
        return {
          update: (ref, data) => updates.push({ path: ref.path, data }),
          commit: async () => {
            commits.push(updates);
          },
        };
      },
    },
  };
}

async function run() {
  assert.deepStrictEqual(getTeamCleanupPlan(teams, 'u1'), [
    { teamId: 'alabanza', members: ['u1'], leaders: ['u1'] },
  ]);
  assert.deepStrictEqual(
    getTeamCleanupPlan(teams, ['u2']).map((entry) => entry.teamId),
    ['alabanza', 'sonido']
  );
  assert.deepStrictEqual(getTeamCleanupPlan(teams, []), []);
  assert.deepStrictEqual(getTeamCleanupPlan(null, ['u1']), []);

  {
    const { deps, commits } = createFirestoreMock(teams);
    const updated = await removeUsersFromTeams({ ...deps, userIds: ['u1', 'u2'] });
    assert.strictEqual(updated, 2);
    assert.strictEqual(commits.length, 1);
    assert.deepStrictEqual(commits[0], [
      {
        path: 'teams/alabanza',
        data: {
          members: { op: 'arrayRemove', values: ['u1', 'u2'] },
          leaders: { op: 'arrayRemove', values: ['u1'] },
        },
      },
      {
        path: 'teams/sonido',
        data: { members: { op: 'arrayRemove', values: ['u2'] } },
      },
    ]);
  }

  {
    const { deps, commits } = createFirestoreMock(teams);
    assert.strictEqual(await removeUsersFromTeams({ ...deps, userIds: ['nadie'] }), 0);
    assert.strictEqual(commits.length, 0);
  }

  {
    const manyTeams = Array.from({ length: 450 }, (_, index) => ({
      id: `team-${index}`,
      members: ['u1'],
    }));
    const { deps, commits } = createFirestoreMock(manyTeams);
    assert.strictEqual(await removeUsersFromTeams({ ...deps, userIds: ['u1'] }), 450);
    assert.deepStrictEqual(commits.map((batch) => batch.length), [400, 50]);
  }

  assert.deepStrictEqual(
    getVisibleMemberIds(['u1', 'borrado', 'u2'], { u1: {}, u2: {} }),
    ['u1', 'u2']
  );
  assert.deepStrictEqual(getVisibleMemberIds(['u1', 'u2'], {}), ['u1', 'u2']);
  assert.deepStrictEqual(getVisibleMemberIds(undefined, { u1: {} }), []);

  console.log('teamMembership tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
