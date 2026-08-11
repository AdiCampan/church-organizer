const functions = require('firebase-functions/v1');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { Expo } = require('expo-server-sdk');
const {
    buildAssignmentMessage,
    sendExpoMessages,
    collectUnregisteredUserIds,
    deleteStalePushTokens,
    readValidPushToken,
} = require('./pushNotifications');

initializeApp();
const expo = new Expo();
const db = getFirestore();

const TOKEN_READ_BATCH_SIZE = 25;

const declineNotificationText = {
    es: {
        title: '⚠️ Asignación rechazada',
        body: (eventTitle) => `Se ha rechazado una asignación para "${eventTitle}". Abre la app para ver el detalle.`
    },
    ro: {
        title: '⚠️ Alocare refuzată',
        body: (eventTitle) => `O alocare pentru "${eventTitle}" a fost refuzată. Deschide aplicația pentru detalii.`
    },
    en: {
        title: '⚠️ Assignment declined',
        body: (eventTitle) => `An assignment for "${eventTitle}" was declined. Open the app to view details.`
    }
};

const getDeclineNotificationText = (language) => {
    return declineNotificationText[language] || declineNotificationText.es;
};

const firestoreFunction = functions.runWith({
    failurePolicy: true,
    timeoutSeconds: 60,
    memory: '256MB',
});

async function cleanupUnregisteredTokens(messages, tickets) {
    const staleUserIds = collectUnregisteredUserIds(messages, tickets);
    if (staleUserIds.length === 0) {
        return;
    }

    console.warn(`[CLEANUP] Removing stale push tokens for users: ${staleUserIds.join(', ')}`);
    await deleteStalePushTokens(db, staleUserIds);
}

function hasAcceptedTicket(tickets) {
    return tickets.some((ticket) => ticket?.status === 'ok');
}

function toEventDate(eventDate) {
    if (!eventDate || typeof eventDate.toDate !== 'function') {
        return null;
    }
    return eventDate.toDate();
}

async function claimNotificationField(docRef, fieldName) {
    return db.runTransaction(async (transaction) => {
        const freshSnap = await transaction.get(docRef);
        if (!freshSnap.exists || freshSnap.get(fieldName)) {
            return false;
        }
        transaction.update(docRef, { [fieldName]: FieldValue.serverTimestamp() });
        return true;
    });
}

async function releaseNotificationField(docRef, fieldName) {
    await docRef.update({ [fieldName]: FieldValue.delete() });
}

async function readTokenDocsInBatches(userIds) {
    const tokenDocs = [];

    for (let index = 0; index < userIds.length; index += TOKEN_READ_BATCH_SIZE) {
        const batchIds = userIds.slice(index, index + TOKEN_READ_BATCH_SIZE);
        const batchDocs = await Promise.all(
            batchIds.map((userId) => db.collection('fcmTokens').doc(userId).get())
        );
        tokenDocs.push(...batchDocs);
    }

    return tokenDocs;
}

/**
 * Trigger: When a new schedule (assignment) is created
 * Action: Send push notification to the assigned volunteer
 */
exports.onScheduleCreated = firestoreFunction.firestore
    .document('schedules/{scheduleId}')
    .onCreate(async (snap, context) => {
        const schedule = snap.data();
        const userId = schedule.userId;
        const scheduleId = context.params.scheduleId;

        console.log(`[TRIGGER] New assignment detected. scheduleId: ${scheduleId}, userId: ${userId}`);

        const claimed = await claimNotificationField(snap.ref, 'pushNotifiedAt');
        if (!claimed) {
            console.log(`[INFO] Assignment push already claimed/sent for schedule ${scheduleId}. Skipping.`);
            return null;
        }

        try {
            const tokenDoc = await db.collection('fcmTokens').doc(userId).get();
            const pushTokenData = readValidPushToken(tokenDoc);

            if (!pushTokenData) {
                console.warn(`[NOT-FOUND] No valid push token for user: ${userId}`);
                await releaseNotificationField(snap.ref, 'pushNotifiedAt');
                return null;
            }

            const eventDoc = await db.collection('events').doc(schedule.eventId).get();
            if (!eventDoc.exists) {
                console.warn(`[NOT-FOUND] Event ${schedule.eventId} not found`);
                await releaseNotificationField(snap.ref, 'pushNotifiedAt');
                return null;
            }

            const event = eventDoc.data();
            const eventDate = toEventDate(event.date);
            if (!eventDate) {
                console.warn(`[INVALID-EVENT] Event ${schedule.eventId} has invalid date`);
                await releaseNotificationField(snap.ref, 'pushNotifiedAt');
                return null;
            }

            const message = buildAssignmentMessage({
                pushToken: pushTokenData.token,
                language: pushTokenData.language,
                eventTitle: event.title,
                eventDate,
                position: schedule.position,
                eventId: schedule.eventId,
                scheduleId,
            });
            message.data.userId = userId;

            console.log(`[EXPO] Sending assignment notification to ${pushTokenData.token.substring(0, 15)}...`);
            const tickets = await sendExpoMessages(expo, [message]);
            console.log('[RESULT] Expo Ticket:', JSON.stringify(tickets));
            await cleanupUnregisteredTokens([message], tickets);

            if (!hasAcceptedTicket(tickets)) {
                await releaseNotificationField(snap.ref, 'pushNotifiedAt');
                const failedTicket = tickets.find((ticket) => ticket.status === 'error' && ticket.details?.error !== 'DeviceNotRegistered');
                if (failedTicket) {
                    throw new Error(`Expo push failed: ${failedTicket.message || failedTicket.details?.error || 'unknown'}`);
                }
                return tickets;
            }

            return tickets;
        } catch (error) {
            await releaseNotificationField(snap.ref, 'pushNotifiedAt');
            throw error;
        }
    });

/**
 * Trigger: When a new announcement is created
 * Action: Send push notification to all users or specific team
 */
exports.onAnnouncementCreated = firestoreFunction.firestore
    .document('announcements/{announcementId}')
    .onCreate(async (snap, context) => {
        const announcement = snap.data();
        const announcementId = context.params.announcementId;

        console.log(`[TRIGGER] New announcement detected: ${announcement.title} (${announcementId})`);

        let tokenDocs = [];
        let titlePrefix = '';

        if (announcement.targetTeamId === 'all') {
            console.log('[AUDIENCE] Targeting ALL users');
            const tokensSnapshot = await db.collection('fcmTokens').get();
            tokenDocs = tokensSnapshot.docs;
        } else {
            console.log(`[AUDIENCE] Targeting team: ${announcement.targetTeamId}`);
            const teamDoc = await db.collection('teams').doc(announcement.targetTeamId).get();

            if (teamDoc.exists) {
                const teamData = teamDoc.data();
                const targetUserIds = teamData.members || [];
                titlePrefix = `[${teamData.name}] `;
                tokenDocs = await readTokenDocsInBatches(targetUserIds);
            }
        }

        console.log(`[AUDIENCE] Found ${tokenDocs.length} potential users`);

        if (tokenDocs.length === 0) {
            console.warn('[AUDIENCE] No target users found');
            return null;
        }

        const messages = [];

        for (const tokenDoc of tokenDocs) {
            const pushTokenData = readValidPushToken(tokenDoc);
            if (!pushTokenData) {
                console.log(`[DB] No valid token found for user ${tokenDoc.id}`);
                continue;
            }

            messages.push({
                to: pushTokenData.token,
                sound: 'default',
                title: `📢 ${titlePrefix}${announcement.title}`,
                body: announcement.content.substring(0, 100) + (announcement.content.length > 100 ? '...' : ''),
                data: {
                    type: 'announcement',
                    announcementId,
                    targetTeamId: announcement.targetTeamId,
                    userId: tokenDoc.id,
                },
                priority: 'high',
                channelId: 'default',
                badge: 1,
            });
        }

        if (messages.length === 0) {
            console.warn('[EXPO] No valid push tokens to send to');
            return null;
        }

        console.log(`[EXPO] Sending ${messages.length} notifications...`);
        const tickets = await sendExpoMessages(expo, messages);
        console.log(`[RESULT] Sent ${tickets.length} notifications. Tickets:`, JSON.stringify(tickets));
        await cleanupUnregisteredTokens(messages, tickets);
        return tickets;
    });

/**
 * Trigger: When a schedule is updated (e.g. status changes to declined)
 * Action: Send push notification to team leaders (or all admins if no leaders)
 */
exports.onScheduleUpdated = firestoreFunction.firestore
    .document('schedules/{scheduleId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        if (before.status === 'declined' || after.status !== 'declined') {
            return null;
        }

        console.log(`[TRIGGER] Assignment declined. scheduleId: ${context.params.scheduleId}, userId: ${after.userId}`);

        const claimed = await claimNotificationField(change.after.ref, 'declineNotifiedAt');
        if (!claimed) {
            console.log(`[INFO] Decline notification already claimed/sent for schedule ${context.params.scheduleId}.`);
            return null;
        }

        try {
            const teamDoc = await db.collection('teams').doc(after.teamId).get();
            let leaderIds = [];

            if (teamDoc.exists) {
                leaderIds = teamDoc.data().leaders || [];
            }

            leaderIds = leaderIds.filter((leaderId) => leaderId && leaderId !== after.userId);

            if (leaderIds.length === 0) {
                console.log(`[INFO] No leaders assigned to team ${after.teamId}. Falling back to all admins.`);
                const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
                leaderIds = adminsSnap.docs
                    .map((doc) => doc.id)
                    .filter((adminId) => adminId !== after.userId);
            }

            if (leaderIds.length === 0) {
                console.warn('[WARN] No leaders or admins found to notify for decline.');
                await releaseNotificationField(change.after.ref, 'declineNotifiedAt');
                return null;
            }

            const eventDoc = await db.collection('events').doc(after.eventId).get();
            const eventTitle = eventDoc.exists ? eventDoc.data().title : 'Evento Desconocido';

            const messages = [];
            const tokenDocs = await readTokenDocsInBatches(leaderIds);

            tokenDocs.forEach((tokenDoc) => {
                const pushTokenData = readValidPushToken(tokenDoc);
                if (!pushTokenData) {
                    return;
                }

                const strings = getDeclineNotificationText(pushTokenData.language);
                messages.push({
                    to: pushTokenData.token,
                    sound: 'default',
                    title: strings.title,
                    body: strings.body(eventTitle),
                    data: {
                        type: 'assignment_declined',
                        eventId: after.eventId,
                        scheduleId: context.params.scheduleId,
                        userName: after.userName || null,
                        declineReason: after.declineReason || null,
                        userId: tokenDoc.id,
                    },
                    priority: 'high',
                    channelId: 'default',
                });
            });

            if (messages.length === 0) {
                console.log('[INFO] No valid push tokens found for leaders/admins.');
                await releaseNotificationField(change.after.ref, 'declineNotifiedAt');
                return null;
            }

            console.log(`[EXPO] Sending ${messages.length} decline notifications...`);
            const tickets = await sendExpoMessages(expo, messages);
            console.log('[RESULT] Decline notifications sent. Tickets:', JSON.stringify(tickets));
            await cleanupUnregisteredTokens(messages, tickets);

            if (!hasAcceptedTicket(tickets)) {
                await releaseNotificationField(change.after.ref, 'declineNotifiedAt');
                return tickets;
            }

            return tickets;
        } catch (error) {
            await releaseNotificationField(change.after.ref, 'declineNotifiedAt');
            throw error;
        }
    });
