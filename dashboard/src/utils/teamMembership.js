const BATCH_LIMIT = 400;

function normalizeIds(userIds) {
    const list = Array.isArray(userIds) ? userIds : [userIds];
    return [...new Set(list.filter((id) => typeof id === 'string' && id))];
}

function pickMatches(list, ids) {
    return Array.isArray(list) ? list.filter((id) => ids.includes(id)) : [];
}

/**
 * Para cada equipo que referencia a alguno de los usuarios indicados (en
 * `members` o `leaders`), devuelve que ids hay que quitar. Funcion pura.
 */
function getTeamCleanupPlan(teams, userIds) {
    const ids = normalizeIds(userIds);
    if (ids.length === 0 || !Array.isArray(teams)) return [];

    return teams
        .map((team) => ({
            teamId: team.id,
            members: pickMatches(team.members, ids),
            leaders: pickMatches(team.leaders, ids),
        }))
        .filter((entry) => entry.members.length > 0 || entry.leaders.length > 0);
}

/**
 * Quita a los usuarios de `members` y `leaders` en todos los equipos donde
 * aparezcan. Las funciones de Firestore se inyectan para poder reutilizarlo
 * (dashboard, movil) y testearlo. Devuelve cuantos equipos se han actualizado.
 */
async function removeUsersFromTeams({
    db,
    userIds,
    getDocs,
    collection,
    writeBatch,
    doc,
    arrayRemove,
}) {
    const ids = normalizeIds(userIds);
    if (ids.length === 0) return 0;

    const snapshot = await getDocs(collection(db, 'teams'));
    const teams = snapshot.docs.map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() }));
    const plan = getTeamCleanupPlan(teams, ids);

    for (let index = 0; index < plan.length; index += BATCH_LIMIT) {
        const batch = writeBatch(db);
        plan.slice(index, index + BATCH_LIMIT).forEach(({ teamId, members, leaders }) => {
            const update = {};
            if (members.length > 0) update.members = arrayRemove(...members);
            if (leaders.length > 0) update.leaders = arrayRemove(...leaders);
            batch.update(doc(db, 'teams', teamId), update);
        });
        await batch.commit();
    }

    return plan.length;
}

export { getTeamCleanupPlan, removeUsersFromTeams };
