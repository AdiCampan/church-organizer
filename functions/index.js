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

        if (schedule.pushNotifiedAt) {
            console.log(`[INFO] Assignment push already sent for schedule ${scheduleId}. Skipping cloud function send.`);
            return null;
        }

        const tokenDoc = await db.collection('fcmTokens').doc(userId).get();
        const pushTokenData = readValidPushToken(tokenDoc);

        if (!pushTokenData) {
            console.warn(`[NOT-FOUND] No valid push token for user: ${userId}`);
            return null;
        }

        const eventDoc = await db.collection('events').doc(schedule.eventId).get();
        if (!eventDoc.exists) {
            console.warn(`[NOT-FOUND] Event ${schedule.eventId} not found`);
            return null;
        }

        const event = eventDoc.data();
        const message = buildAssignmentMessage({
            pushToken: pushTokenData.token,
            language: pushTokenData.language,
            eventTitle: event.title,
            eventDate: event.date.toDate(),
            position: schedule.position,
            eventId: schedule.eventId,
            scheduleId,
        });
        message.data.userId = userId;

        console.log(`[EXPO] Sending assignment notification to ${pushTokenData.token.substring(0, 15)}...`);
        const tickets = await sendExpoMessages(expo, [message]);
        console.log('[RESULT] Expo Ticket:', JSON.stringify(tickets));
        await cleanupUnregisteredTokens([message], tickets);

        const failedTicket = tickets.find((ticket) => ticket.status === 'error' && ticket.details?.error !== 'DeviceNotRegistered');
        if (failedTicket) {
            throw new Error(`Expo push failed: ${failedTicket.message || failedTicket.details?.error || 'unknown'}`);
        }

        const accepted = tickets.some((ticket) => ticket.status === 'ok');
        if (accepted) {
            await snap.ref.update({ pushNotifiedAt: FieldValue.serverTimestamp() });
        }

        return tickets;
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

        let targetUserIds = [];
        let titlePrefix = '';

        if (announcement.targetTeamId === 'all') {
            console.log('[AUDIENCE] Targeting ALL users');
            const tokensSnapshot = await db.collection('fcmTokens').get();
            targetUserIds = tokensSnapshot.docs.map((doc) => doc.id);
        } else {
            console.log(`[AUDIENCE] Targeting team: ${announcement.targetTeamId}`);
            const teamDoc = await db.collection('teams').doc(announcement.targetTeamId).get();

            if (teamDoc.exists) {
                const teamData = teamDoc.data();
                targetUserIds = teamData.members || [];
                titlePrefix = `[${teamData.name}] `;
            }
        }

        console.log(`[AUDIENCE] Found ${targetUserIds.length} potential users`);

        if (targetUserIds.length === 0) {
            console.warn('[AUDIENCE] No target users found');
            return null;
        }

        const messages = [];

        for (const userId of targetUserIds) {
            const tokenDoc = await db.collection('fcmTokens').doc(userId).get();
            const pushTokenData = readValidPushToken(tokenDoc);

            if (!pushTokenData) {
                console.log(`[DB] No valid token found for user ${userId}`);
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
                    userId,
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

        if (after.declineNotifiedAt) {
            console.log(`[INFO] Decline notification already sent for schedule ${context.params.scheduleId}.`);
            return null;
        }

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
            return null;
        }

        const eventDoc = await db.collection('events').doc(after.eventId).get();
        const eventTitle = eventDoc.exists ? eventDoc.data().title : 'Evento Desconocido';

        const messages = [];
        const tokenDocs = await Promise.all(
            leaderIds.map((leaderId) => db.collection('fcmTokens').doc(leaderId).get())
        );

        tokenDocs.forEach((tokenDoc, index) => {
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
                    userId: leaderIds[index],
                },
                priority: 'high',
                channelId: 'default',
            });
        });

        if (messages.length === 0) {
            console.log('[INFO] No valid push tokens found for leaders/admins.');
            return null;
        }

        console.log(`[EXPO] Sending ${messages.length} decline notifications...`);
        const tickets = await sendExpoMessages(expo, messages);
        console.log('[RESULT] Decline notifications sent. Tickets:', JSON.stringify(tickets));
        await cleanupUnregisteredTokens(messages, tickets);

        await change.after.ref.update({
            declineNotifiedAt: FieldValue.serverTimestamp(),
        });
        return tickets;
    });
