const functions = require('firebase-functions/v1');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { Expo } = require('expo-server-sdk');
const {
    buildAssignmentMessage,
    buildDeclineMessage,
    sendExpoMessages,
    collectUnregisteredUserIds,
    deleteStalePushTokens,
    readValidPushToken,
} = require('./pushNotifications');

initializeApp();
const expo = new Expo();
const db = getFirestore();

const TOKEN_READ_BATCH_SIZE = 25;

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

function getRetriableExpoFailure(tickets) {
    return tickets.find((ticket) => (
        ticket?.status === 'error' && ticket.details?.error !== 'DeviceNotRegistered'
    ));
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
    try {
        await docRef.update({ [fieldName]: FieldValue.delete() });
    } catch (error) {
        console.warn(`[CLAIM] Failed to release ${fieldName} on ${docRef.path}:`, error);
    }
}

/**
 * Keep claim on success. On total failure, release for non-retriable cases and
 * release+throw for retriable Expo errors so failurePolicy can retry.
 */
async function finalizeExpoTickets(docRef, fieldName, tickets) {
    if (hasAcceptedTicket(tickets)) {
        return tickets;
    }

    await releaseNotificationField(docRef, fieldName);

    const failedTicket = getRetriableExpoFailure(tickets);
    if (failedTicket) {
        throw new Error(`Expo push failed: ${failedTicket.message || failedTicket.details?.error || 'unknown'}`);
    }

    return tickets;
}

async function safeCleanupUnregisteredTokens(messages, tickets) {
    try {
        await cleanupUnregisteredTokens(messages, tickets);
    } catch (error) {
        console.warn('[CLEANUP] Token cleanup failed after successful push:', error);
    }
}

async function readTokenDocsInBatches(userIds) {
    const tokenDocs = [];

    for (let index = 0; index < userIds.length; index += TOKEN_READ_BATCH_SIZE) {
        const batchIds = userIds.slice(index, index + TOKEN_READ_BATCH_SIZE);
        const refs = batchIds.map((userId) => db.collection('fcmTokens').doc(userId));
        const batchDocs = await db.getAll(...refs);
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

            const finalized = await finalizeExpoTickets(snap.ref, 'pushNotifiedAt', tickets);
            if (hasAcceptedTicket(finalized)) {
                await safeCleanupUnregisteredTokens([message], finalized);
            }
            return finalized;
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

        const claimed = await claimNotificationField(snap.ref, 'pushNotifiedAt');
        if (!claimed) {
            console.log(`[INFO] Announcement push already claimed/sent for ${announcementId}. Skipping.`);
            return null;
        }

        try {
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
                await releaseNotificationField(snap.ref, 'pushNotifiedAt');
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
                await releaseNotificationField(snap.ref, 'pushNotifiedAt');
                return null;
            }

            console.log(`[EXPO] Sending ${messages.length} notifications...`);
            const tickets = await sendExpoMessages(expo, messages);
            console.log(`[RESULT] Sent ${tickets.length} notifications. Tickets:`, JSON.stringify(tickets));

            const finalized = await finalizeExpoTickets(snap.ref, 'pushNotifiedAt', tickets);
            if (hasAcceptedTicket(finalized)) {
                await safeCleanupUnregisteredTokens(messages, finalized);
            }
            return finalized;
        } catch (error) {
            await releaseNotificationField(snap.ref, 'pushNotifiedAt');
            throw error;
        }
    });

/**
 * Trigger: When a schedule is updated (e.g. status changes to declined)
 * Action: Send push notification to leaders of the declined assignment's team
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
            if (!after.teamId) {
                console.warn('[WARN] Declined schedule has no teamId. Skipping leader notification.');
                await releaseNotificationField(change.after.ref, 'declineNotifiedAt');
                return null;
            }

            const teamDoc = await db.collection('teams').doc(after.teamId).get();
            let leaderIds = [];

            if (teamDoc.exists) {
                leaderIds = teamDoc.data().leaders || [];
            }

            leaderIds = leaderIds.filter((leaderId) => leaderId && leaderId !== after.userId);

            if (leaderIds.length === 0) {
                console.warn(`[WARN] No leaders found for team ${after.teamId}. Skipping decline notification.`);
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

                messages.push(buildDeclineMessage({
                    pushToken: pushTokenData.token,
                    language: pushTokenData.language,
                    eventTitle,
                    userName: after.userName || '',
                    declineReason: after.declineReason || '',
                    eventId: after.eventId,
                    scheduleId: context.params.scheduleId,
                    recipientUserId: tokenDoc.id,
                }));
            });

            if (messages.length === 0) {
                console.log('[INFO] No valid push tokens found for team leaders.');
                await releaseNotificationField(change.after.ref, 'declineNotifiedAt');
                return null;
            }

            console.log(`[EXPO] Sending ${messages.length} decline notifications...`);
            const tickets = await sendExpoMessages(expo, messages);
            console.log('[RESULT] Decline notifications sent. Tickets:', JSON.stringify(tickets));

            const finalized = await finalizeExpoTickets(change.after.ref, 'declineNotifiedAt', tickets);
            if (hasAcceptedTicket(finalized)) {
                await safeCleanupUnregisteredTokens(messages, finalized);
            }
            return finalized;
        } catch (error) {
            await releaseNotificationField(change.after.ref, 'declineNotifiedAt');
            throw error;
        }
    });
