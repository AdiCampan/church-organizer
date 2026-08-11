const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const assignmentCopy = {
    es: { title: '🔔 Nueva Asignación', position: 'Posición' },
    ro: { title: '🔔 Alocare Nouă', position: 'Poziție' },
    en: { title: '🔔 New Assignment', position: 'Position' },
};

const EXPO_PUSH_UUID_PATTERN = /^[a-z\d]{8}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{12}$/i;

export function isExpoPushToken(token) {
    return typeof token === 'string'
        && (
            ((token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
                && token.endsWith(']'))
            || EXPO_PUSH_UUID_PATTERN.test(token)
        );
}

export function buildAssignmentPushMessage({
    pushToken,
    language,
    eventTitle,
    eventDate,
    position,
    eventId,
    scheduleId,
    userId,
}) {
    const userLang = assignmentCopy[language] ? language : 'es';
    const strings = assignmentCopy[userLang];
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
            userId,
        },
        priority: 'high',
        channelId: 'default',
        badge: 1,
    };
}

/**
 * Send an assignment push via Expo. Returns true when Expo accepted the ticket.
 */
export async function sendAssignmentPushNotification({
    pushToken,
    language,
    eventTitle,
    eventDate,
    position,
    eventId,
    scheduleId,
    userId,
    fetchImpl = fetch,
}) {
    if (!isExpoPushToken(pushToken)) {
        return false;
    }

    const message = buildAssignmentPushMessage({
        pushToken,
        language,
        eventTitle,
        eventDate,
        position,
        eventId,
        scheduleId,
        userId,
    });

    const response = await fetchImpl(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });

    if (!response.ok) {
        throw new Error(`Expo push request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const ticket = payload?.data;
    if (!ticket || ticket.status === 'error') {
        console.warn('Expo push ticket error:', ticket);
        return false;
    }

    return true;
}
