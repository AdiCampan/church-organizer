import assert from 'node:assert/strict';
import { getTeamCleanupPlan, removeUsersFromTeams } from './teamMembership.js';

const teams = [
    { id: 'alabanza', members: ['u1', 'u2', 'u3'], leaders: ['u1'] },
    { id: 'sonido', members: ['u2'], leaders: [] },
    { id: 'ninos', members: ['u4'] },
    { id: 'vacio' },
];

function testPlanFindsMembersAndLeaders() {
    assert.deepEqual(getTeamCleanupPlan(teams, 'u1'), [
        { teamId: 'alabanza', members: ['u1'], leaders: ['u1'] },
    ]);
}

function testPlanSkipsTeamsWithoutTheUser() {
    const plan = getTeamCleanupPlan(teams, ['u2']);
    assert.deepEqual(plan.map((entry) => entry.teamId), ['alabanza', 'sonido']);
}

function testPlanAcceptsSeveralUsersAndIgnoresInvalidIds() {
    const plan = getTeamCleanupPlan(teams, ['u1', 'u4', '', null, 'u1']);
    assert.deepEqual(plan, [
        { teamId: 'alabanza', members: ['u1'], leaders: ['u1'] },
        { teamId: 'ninos', members: ['u4'], leaders: [] },
    ]);
}

function testPlanHandlesEmptyInput() {
    assert.deepEqual(getTeamCleanupPlan(teams, []), []);
    assert.deepEqual(getTeamCleanupPlan(null, ['u1']), []);
}

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

async function testRemoveUsersWritesOneBatch() {
    const { deps, commits } = createFirestoreMock(teams);
    const updated = await removeUsersFromTeams({ ...deps, userIds: ['u1', 'u2'] });

    assert.equal(updated, 2);
    assert.equal(commits.length, 1);
    assert.deepEqual(commits[0], [
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

async function testRemoveUsersDoesNothingWhenNoTeamMatches() {
    const { deps, commits } = createFirestoreMock(teams);
    const updated = await removeUsersFromTeams({ ...deps, userIds: ['nadie'] });

    assert.equal(updated, 0);
    assert.equal(commits.length, 0);
}

async function testRemoveUsersSkipsReadWithoutIds() {
    const { deps } = createFirestoreMock(teams);
    deps.getDocs = async () => {
        throw new Error('no deberia leer equipos');
    };
    assert.equal(await removeUsersFromTeams({ ...deps, userIds: [] }), 0);
}

async function testRemoveUsersSplitsLargeBatches() {
    const manyTeams = Array.from({ length: 450 }, (_, index) => ({
        id: `team-${index}`,
        members: ['u1'],
    }));
    const { deps, commits } = createFirestoreMock(manyTeams);
    const updated = await removeUsersFromTeams({ ...deps, userIds: ['u1'] });

    assert.equal(updated, 450);
    assert.deepEqual(commits.map((batch) => batch.length), [400, 50]);
}

testPlanFindsMembersAndLeaders();
testPlanSkipsTeamsWithoutTheUser();
testPlanAcceptsSeveralUsersAndIgnoresInvalidIds();
testPlanHandlesEmptyInput();
await testRemoveUsersWritesOneBatch();
await testRemoveUsersDoesNothingWhenNoTeamMatches();
await testRemoveUsersSkipsReadWithoutIds();
await testRemoveUsersSplitsLargeBatches();

console.log('teamMembership tests passed');
