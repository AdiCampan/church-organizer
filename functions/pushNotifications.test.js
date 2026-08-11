const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
    buildAssignmentMessage,
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
