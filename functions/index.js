const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

admin.initializeApp();
const expo = new Expo();

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

/**
 * Trigger: When a new schedule (assignment) is created
 * Action: Send push notification to the assigned volunteer
 */
exports.onScheduleCreated = functions.firestore
    .document('schedules/{scheduleId}')
    .onCreate(async (snap, context) => {
        const schedule = snap.data();
        const userId = schedule.userId;
        const scheduleId = context.params.scheduleId;

        console.log(`[TRIGGER] New assignment detected. scheduleId: ${scheduleId}, userId: ${userId}`);

        try {
            // Get user's push token
            console.log(`[DB] Fetching token for user: ${userId}`);
            const tokenDoc = await admin.firestore()
                .collection('fcmTokens')
                .doc(userId)
                .get();

            if (!tokenDoc.exists) {
                console.warn(`[NOT-FOUND] No push token found in 'fcmTokens' collection for user: ${userId}`);
                return null;
            }

            const pushToken = tokenDoc.data().token;
            const userLang = tokenDoc.data().language || 'es';
            console.log(`[TOKEN] Found token: ${pushToken.substring(0, 20)}... Language: ${userLang}`);

            // Localized messages
            const localizedMsg = {
                es: { title: '🔔 Nueva Asignación', position: 'Posición' },
                ro: { title: '🔔 Alocare Nouă', position: 'Poziție' },
                en: { title: '🔔 New Assignment', position: 'Position' }
            };
            const strings = localizedMsg[userLang] || localizedMsg.es;

            // Validate Expo push token
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`[INVALID-TOKEN] The token is not a valid ExpoPushToken: ${pushToken}`);
                return null;
            }

            // Get event details
            console.log(`[DB] Fetching event details: ${schedule.eventId}`);
            const eventDoc = await admin.firestore()
                .collection('events')
                .doc(schedule.eventId)
                .get();

            if (!eventDoc.exists) {
                console.warn(`[NOT-FOUND] Event ${schedule.eventId} not found`);
                return null;
            }

            const event = eventDoc.data();
            const eventDate = event.date.toDate();

            const dateLocale = userLang === 'ro' ? 'ro-RO' : (userLang === 'en' ? 'en-US' : 'es-ES');
            const formattedDate = eventDate.toLocaleDateString(dateLocale, {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });

            // Send notification
            console.log(`[EXPO] Preparing to send notification to ${pushToken.substring(0, 15)}...`);
            const message = {
                to: pushToken,
                sound: 'default',
                title: strings.title,
                body: `${event.title} - ${formattedDate}\n${strings.position}: ${schedule.position}`,
                data: {
                    type: 'assignment',
                    eventId: schedule.eventId,
                    scheduleId: scheduleId
                },
                priority: 'high',
                channelId: 'default',
                badge: 1,
            };

            const ticket = await expo.sendPushNotificationsAsync([message]);
            console.log('[RESULT] Expo Ticket:', JSON.stringify(ticket));

            return ticket;
        } catch (error) {
            console.error('[ERROR] Failure in onScheduleCreated:', error);
            return null;
        }
    });

/**
 * Trigger: When a new announcement is created
 * Action: Send push notification to all users or specific team
 */
exports.onAnnouncementCreated = functions.firestore
    .document('announcements/{announcementId}')
    .onCreate(async (snap, context) => {
        const announcement = snap.data();
        const announcementId = context.params.announcementId;

        console.log(`[TRIGGER] New announcement detected: ${announcement.title} (${announcementId})`);

        try {
            let targetUserIds = [];

            let titlePrefix = '';

            // Determine target audience
            if (announcement.targetTeamId === 'all') {
                console.log('[AUDIENCE] Targeting ALL users');
                const tokensSnapshot = await admin.firestore()
                    .collection('fcmTokens')
                    .get();

                targetUserIds = tokensSnapshot.docs.map(doc => doc.id);
            } else {
                console.log(`[AUDIENCE] Targeting team: ${announcement.targetTeamId}`);
                const teamDoc = await admin.firestore()
                    .collection('teams')
                    .doc(announcement.targetTeamId)
                    .get();

                if (teamDoc.exists) {
                    const teamData = teamDoc.data();
                    targetUserIds = teamData.members || [];
                    // Add Team Name to prefix
                    titlePrefix = `[${teamData.name}] `;
                }
            }

            console.log(`[AUDIENCE] Found ${targetUserIds.length} potential users`);

            if (targetUserIds.length === 0) {
                console.warn('[AUDIENCE] No target users found');
                return null;
            }

            // Get push tokens for target users
            const messages = [];

            for (const userId of targetUserIds) {
                const tokenDoc = await admin.firestore()
                    .collection('fcmTokens')
                    .doc(userId)
                    .get();

                if (tokenDoc.exists) {
                    const pushToken = tokenDoc.data().token;

                    if (Expo.isExpoPushToken(pushToken)) {
                        messages.push({
                            to: pushToken,
                            sound: 'default',
                            title: `📢 ${titlePrefix}${announcement.title}`,
                            body: announcement.content.substring(0, 100) + (announcement.content.length > 100 ? '...' : ''),
                            data: {
                                type: 'announcement',
                                announcementId: announcementId,
                                targetTeamId: announcement.targetTeamId // Useful for client-side filtering if needed
                            },
                            priority: 'high',
                            channelId: 'default',
                            badge: 1,
                        });
                    } else {
                        console.warn(`[INVALID-TOKEN] Skipping invalid token for user ${userId}`);
                    }
                } else {
                    console.log(`[DB] No token found for user ${userId}`);
                }
            }

            if (messages.length === 0) {
                console.warn('[EXPO] No valid push tokens to send to');
                return null;
            }

            console.log(`[EXPO] Sending ${messages.length} notifications...`);

            // Send notifications in chunks
            const chunks = expo.chunkPushNotifications(messages);
            const tickets = [];

            for (const chunk of chunks) {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            }

            console.log(`[RESULT] Sent ${tickets.length} notifications. Tickets:`, JSON.stringify(tickets));
            return tickets;
        } catch (error) {
            console.error('[ERROR] Failure in onAnnouncementCreated:', error);
            return null;
        }
    });

/**
 * Trigger: When a schedule is updated (e.g. status changes to declined)
 * Action: Send push notification to team leaders (or all admins if no leaders)
 */
exports.onScheduleUpdated = functions.firestore
    .document('schedules/{scheduleId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if status changed to 'declined'
        if (before.status !== 'declined' && after.status === 'declined') {
            console.log(`[TRIGGER] Assignment declined. scheduleId: ${context.params.scheduleId}, userId: ${after.userId}`);

            try {
                // Get team details to find leaders
                const teamDoc = await admin.firestore().collection('teams').doc(after.teamId).get();
                let leaderIds = [];

                if (teamDoc.exists) {
                    const teamData = teamDoc.data();
                    leaderIds = teamData.leaders || [];
                }

                leaderIds = leaderIds.filter(leaderId => leaderId && leaderId !== after.userId);

                // If no leaders, fallback to all admins
                if (leaderIds.length === 0) {
                    console.log(`[INFO] No leaders assigned to team ${after.teamId}. Falling back to all admins.`);
                    const adminsSnap = await admin.firestore().collection('users').where('role', '==', 'admin').get();
                    leaderIds = adminsSnap.docs
                        .map(doc => doc.id)
                        .filter(adminId => adminId !== after.userId);
                }

                if (leaderIds.length === 0) {
                    console.warn(`[WARN] No leaders or admins found to notify for decline.`);
                    return null;
                }

                // Get event details
                const eventDoc = await admin.firestore().collection('events').doc(after.eventId).get();
                const eventTitle = eventDoc.exists ? eventDoc.data().title : 'Evento Desconocido';

                // Get tokens for leaders
                const messages = [];
                for (const leaderId of leaderIds) {
                    const tokenDoc = await admin.firestore().collection('fcmTokens').doc(leaderId).get();
                    if (tokenDoc.exists) {
                        const tokenData = tokenDoc.data();
                        const pushToken = tokenData.token;
                        const strings = getDeclineNotificationText(tokenData.language || 'es');
                        if (Expo.isExpoPushToken(pushToken)) {
                            messages.push({
                                to: pushToken,
                                sound: 'default',
                                title: strings.title,
                                body: strings.body(eventTitle),
                                data: {
                                    type: 'assignment_declined',
                                    eventId: after.eventId,
                                    scheduleId: context.params.scheduleId,
                                    userName: after.userName || null,
                                    declineReason: after.declineReason || null
                                },
                                priority: 'high',
                                channelId: 'default'
                            });
                        }
                    }
                }

                if (messages.length === 0) {
                    console.log(`[INFO] No valid push tokens found for leaders/admins.`);
                    return null;
                }

                console.log(`[EXPO] Sending ${messages.length} decline notifications...`);
                const chunks = expo.chunkPushNotifications(messages);
                const tickets = [];
                for (const chunk of chunks) {
                    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    tickets.push(...ticketChunk);
                }

                console.log(`[RESULT] Decline notifications sent. Tickets:`, JSON.stringify(tickets));
                return tickets;
            } catch (error) {
                console.error('[ERROR] Failure in onScheduleUpdated:', error);
                return null;
            }
        }
        return null;
    });
