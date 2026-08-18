const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
    buildAssignmentMessage,
    buildDeclineMessage,
    collectUnregisteredUserIds,
    readValidPushToken,
} = require('./pushNotifications');

describe('buildAssignmentMessage', () => {
    test('uses locale and position labels', () => {
        const message = buildAssignmentMessage({
            pushToken: 'ExponentPushToken[test]',
            language: 'ro',
            eventTitle: 'Serviciu Duminica',
            eventDate: new Date('2026-08-16T10:00:00.000Z'),
            position: 'Chitară',
            eventId: 'event-1',
            scheduleId: 'schedule-1',
        });

        assert.equal(message.title, '🔔 Alocare Nouă');
        assert.ok(message.body.includes('Serviciu Duminica'));
        assert.ok(message.body.includes('Poziție: Chitară'));
        assert.deepEqual(message.data, {
            type: 'assignment',
            eventId: 'event-1',
            scheduleId: 'schedule-1',
        });
        assert.equal(message.channelId, 'default');
        assert.equal(message.priority, 'high');
    });

    test('falls back to Spanish for unknown languages', () => {
        const message = buildAssignmentMessage({
            pushToken: 'ExponentPushToken[test]',
            language: 'fr',
            eventTitle: 'Culto',
            eventDate: new Date('2026-08-16T10:00:00.000Z'),
            position: 'Voz',
            eventId: 'event-2',
            scheduleId: 'schedule-2',
        });

        assert.equal(message.title, '🔔 Nueva Asignación');
        assert.ok(message.body.includes('Posición: Voz'));
    });
});

describe('buildDeclineMessage', () => {
    test('includes who declined and the reason in Spanish', () => {
        const message = buildDeclineMessage({
            pushToken: 'ExponentPushToken[leader]',
            language: 'es',
            eventTitle: 'Culto domingo',
            userName: 'María López',
            declineReason: 'No puedo asistir',
            eventId: 'event-3',
            scheduleId: 'schedule-3',
            recipientUserId: 'leader-1',
        });

        assert.equal(message.title, '⚠️ Asignación rechazada');
        assert.equal(
            message.body,
            'María López rechazó la asignación de "Culto domingo". Motivo: No puedo asistir'
        );
        assert.deepEqual(message.data, {
            type: 'assignment_declined',
            eventId: 'event-3',
            scheduleId: 'schedule-3',
            userName: 'María López',
            declineReason: 'No puedo asistir',
            userId: 'leader-1',
        });
    });

    test('localizes Romanian and English bodies', () => {
        const roMessage = buildDeclineMessage({
            pushToken: 'ExponentPushToken[leader]',
            language: 'ro',
            eventTitle: 'Serviciu',
            userName: 'Ion',
            declineReason: 'Nu pot veni',
            eventId: 'event-4',
            scheduleId: 'schedule-4',
            recipientUserId: 'leader-2',
        });
        const enMessage = buildDeclineMessage({
            pushToken: 'ExponentPushToken[leader]',
            language: 'en',
            eventTitle: 'Sunday Service',
            userName: 'John',
            declineReason: 'I am sick',
            eventId: 'event-5',
            scheduleId: 'schedule-5',
            recipientUserId: 'leader-3',
        });

        assert.equal(roMessage.title, '⚠️ Alocare refuzată');
        assert.equal(
            roMessage.body,
            'Ion a refuzat alocarea pentru "Serviciu". Motiv: Nu pot veni'
        );
        assert.equal(enMessage.title, '⚠️ Assignment declined');
        assert.equal(
            enMessage.body,
            'John declined the assignment for "Sunday Service". Reason: I am sick'
        );
    });

    test('falls back when name or reason is missing', () => {
        const message = buildDeclineMessage({
            pushToken: 'ExponentPushToken[leader]',
            language: 'es',
            eventTitle: 'Ensayo',
            userName: '   ',
            declineReason: '',
            eventId: 'event-6',
            scheduleId: 'schedule-6',
            recipientUserId: 'leader-4',
        });

        assert.equal(
            message.body,
            'Un voluntario rechazó la asignación de "Ensayo". Motivo: Sin motivo indicado'
        );
        assert.equal(message.data.userName, 'Un voluntario');
        assert.equal(message.data.declineReason, 'Sin motivo indicado');
    });
});

describe('collectUnregisteredUserIds', () => {
    test('only returns DeviceNotRegistered users from data.userId', () => {
        const messages = [
            { to: 'ExponentPushToken[a]', data: { userId: 'user-a' } },
            { to: 'ExponentPushToken[b]', data: { userId: 'user-b' } },
            { to: 'ExponentPushToken[c]', data: { userId: 'user-c' } },
        ];
        const tickets = [
            { status: 'ok' },
            { status: 'error', details: { error: 'DeviceNotRegistered' } },
            { status: 'error', details: { error: 'InvalidCredentials' } },
        ];

        const userIds = collectUnregisteredUserIds(messages, tickets);
        assert.deepEqual(userIds, ['user-b']);
    });

    test('supports root-level userId and deduplicates repeats', () => {
        const messages = [
            { to: 'ExponentPushToken[a]', userId: 'user-a' },
            { to: 'ExponentPushToken[b]', userId: 'user-b' },
            { to: 'ExponentPushToken[c]', data: { userId: 'user-b' } },
        ];
        const tickets = [
            { status: 'error', details: { error: 'DeviceNotRegistered' } },
            { status: 'error', details: { error: 'DeviceNotRegistered' } },
            { status: 'error', details: { error: 'DeviceNotRegistered' } },
        ];

        const userIds = collectUnregisteredUserIds(messages, tickets);
        assert.deepEqual(userIds, ['user-a', 'user-b']);
    });
});

describe('readValidPushToken', () => {
    test('rejects missing or invalid tokens and accepts valid Expo tokens', () => {
        assert.equal(readValidPushToken({ exists: false }), null);
        assert.equal(
            readValidPushToken({
                exists: true,
                data: () => ({ token: 'not-an-expo-token', language: 'es' }),
            }),
            null
        );

        const valid = readValidPushToken({
            exists: true,
            data: () => ({ token: 'ExponentPushToken[abc123]', language: 'en' }),
        });
        assert.deepEqual(valid, {
            token: 'ExponentPushToken[abc123]',
            language: 'en',
        });
    });
});
