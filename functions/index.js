const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

admin.initializeApp();
const expo = new Expo();

/**
 * Trigger: When a new schedule (assignment) is created
 * Action: Send push notification to the assigned volunteer
 */
exports.onScheduleCreated = functions.firestore
    .document('schedules/{scheduleId}')
    .onCreate(async (snap, context) => {
        const schedule = snap.data();
        const userId = schedule.userId;

        console.log(`New assignment for user ${userId}`);

        try {
            // Get user's push token
            const tokenDoc = await admin.firestore()
                .collection('fcmTokens')
                .doc(userId)
                .get();

            if (!tokenDoc.exists) {
                console.log(`No push token found for user ${userId}`);
                return null;
            }

            const pushToken = tokenDoc.data().token;

            // Validate Expo push token
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Invalid Expo push token: ${pushToken}`);
                return null;
            }

            // Get event details
            const eventDoc = await admin.firestore()
                .collection('events')
                .doc(schedule.eventId)
                .get();

            if (!eventDoc.exists) {
                console.log(`Event ${schedule.eventId} not found`);
                return null;
            }

            const event = eventDoc.data();
            const eventDate = event.date.toDate();
            const formattedDate = eventDate.toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });

            // Send notification
            const message = {
                to: pushToken,
                sound: 'default',
                title: '🔔 Nueva Asignación',
                body: `${event.title} - ${formattedDate}\nPosición: ${schedule.position}`,
                data: {
                    type: 'assignment',
                    eventId: schedule.eventId,
                    scheduleId: snap.id
                },
                badge: 1,
            };

            const ticket = await expo.sendPushNotificationsAsync([message]);
            console.log('Notification sent:', ticket);

            return ticket;
        } catch (error) {
            console.error('Error sending notification:', error);
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

        console.log(`New announcement: ${announcement.title}`);

        try {
            let targetUserIds = [];

            // Determine target audience
            if (announcement.targetTeamId === 'all') {
                // Get all users with push tokens
                const tokensSnapshot = await admin.firestore()
                    .collection('fcmTokens')
                    .get();

                targetUserIds = tokensSnapshot.docs.map(doc => doc.id);
            } else {
                // Get team members
                const teamDoc = await admin.firestore()
                    .collection('teams')
                    .doc(announcement.targetTeamId)
                    .get();

                if (teamDoc.exists) {
                    targetUserIds = teamDoc.data().members || [];
                }
            }

            if (targetUserIds.length === 0) {
                console.log('No target users found');
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
                            title: `📢 ${announcement.title}`,
                            body: announcement.content.substring(0, 100) + (announcement.content.length > 100 ? '...' : ''),
                            data: {
                                type: 'announcement',
                                announcementId: snap.id
                            },
                            badge: 1,
                        });
                    }
                }
            }

            if (messages.length === 0) {
                console.log('No valid push tokens found');
                return null;
            }

            // Send notifications in chunks (Expo recommends max 100 per request)
            const chunks = expo.chunkPushNotifications(messages);
            const tickets = [];

            for (const chunk of chunks) {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            }

            console.log(`Sent ${tickets.length} notifications`);
            return tickets;
        } catch (error) {
            console.error('Error sending announcements:', error);
            return null;
        }
    });
