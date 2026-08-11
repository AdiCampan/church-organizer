const { Expo } = require('expo-server-sdk');

/**
 * Build a localized assignment push message for Expo.
 * @param {object} params
 * @param {string} params.pushToken
 * @param {string} params.language
 * @param {string} params.eventTitle
 * @param {Date} params.eventDate
 * @param {string} params.position
 * @param {string} params.eventId
 * @param {string} params.scheduleId
 */
function buildAssignmentMessage({
    pushToken,
    language,
    eventTitle,
    eventDate,
    position,
    eventId,
    scheduleId,
}) {
    const localizedMsg = {
        es: { title: '🔔 Nueva Asignación', position: 'Posición' },
        ro: { title: '🔔 Alocare Nouă', position: 'Poziție' },
        en: { title: '🔔 New Assignment', position: 'Position' },
    };
    const userLang = localizedMsg[language] ? language : 'es';
    const strings = localizedMsg[userLang];
    const dateLocale = userLang === 'ro' ? 'ro-RO' : (userLang === 'en' ? 'en-US' : 'es-ES');
    const formattedDate = eventDate.toLocaleDateString(dateLocale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });

    return {
        to: pushToken,
        sound: 'default',
        title: strings.title,
        body: `${eventTitle} - ${formattedDate}\n${strings.position}: ${position}`,
        data: {
            type: 'assignment',
            eventId,
            scheduleId,
        },
        priority: 'high',
        channelId: 'default',
        badge: 1,
    };
}

/**
 * Send Expo push messages and collect tickets.
 * @param {Expo} expo
 * @param {Array<object>} messages
 */
async function sendExpoMessages(expo, messages) {
    if (!messages.length) {
        return [];
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
    }

    return tickets;
}

/**
 * Map Expo tickets that report DeviceNotRegistered back to Firestore user ids.
 * @param {Array<object>} messages
 * @param {Array<object>} tickets
 * @returns {string[]}
 */
function collectUnregisteredUserIds(messages, tickets) {
    const userIds = [];

    tickets.forEach((ticket, index) => {
        if (ticket?.status !== 'error') {
            return;
        }

        if (ticket.details?.error !== 'DeviceNotRegistered') {
            return;
        }

        const userId = messages[index]?.data?.userId || messages[index]?.userId;
        if (typeof userId === 'string' && userId) {
            userIds.push(userId);
        }
    });

    return [...new Set(userIds)];
}

/**
 * Delete stale fcmTokens docs for users whose Expo tokens are no longer valid.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string[]} userIds
 */
async function deleteStalePushTokens(db, userIds) {
    const results = await Promise.allSettled(
        userIds.map((userId) => db.collection('fcmTokens').doc(userId).delete())
    );

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.warn(`[CLEANUP] Failed to delete fcmTokens/${userIds[index]}:`, result.reason);
        }
    });
}

/**
 * Validate and return a usable Expo push token from a Firestore doc.
 * @param {FirebaseFirestore.DocumentSnapshot} tokenDoc
 * @returns {{ token: string, language: string } | null}
 */
function readValidPushToken(tokenDoc) {
    if (!tokenDoc.exists) {
        return null;
    }

    const data = tokenDoc.data() || {};
    const token = data.token;
    if (!Expo.isExpoPushToken(token)) {
        return null;
    }

    return {
        token,
        language: data.language || 'es',
    };
}

module.exports = {
    buildAssignmentMessage,
    sendExpoMessages,
    collectUnregisteredUserIds,
    deleteStalePushTokens,
    readValidPushToken,
};
