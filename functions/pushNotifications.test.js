const assert = require('assert');
const {
    buildAssignmentMessage,
    collectUnregisteredUserIds,
    readValidPushToken,
} = require('./pushNotifications');

function testBuildAssignmentMessageUsesLocaleAndPosition() {
    const message = buildAssignmentMessage({
        pushToken: 'ExponentPushToken[test]',
        language: 'ro',
        eventTitle: 'Serviciu Duminica',
        eventDate: new Date('2026-08-16T10:00:00.000Z'),
        position: 'Chitară',
        eventId: 'event-1',
        scheduleId: 'schedule-1',
    });

    assert.strictEqual(message.title, '🔔 Alocare Nouă');
    assert.ok(message.body.includes('Serviciu Duminica'));
    assert.ok(message.body.includes('Poziție: Chitară'));
    assert.deepStrictEqual(message.data, {
        type: 'assignment',
        eventId: 'event-1',
        scheduleId: 'schedule-1',
    });
    assert.strictEqual(message.channelId, 'default');
    assert.strictEqual(message.priority, 'high');
}

function testBuildAssignmentMessageFallsBackToSpanish() {
    const message = buildAssignmentMessage({
        pushToken: 'ExponentPushToken[test]',
        language: 'fr',
        eventTitle: 'Culto',
        eventDate: new Date('2026-08-16T10:00:00.000Z'),
        position: 'Voz',
        eventId: 'event-2',
        scheduleId: 'schedule-2',
    });

    assert.strictEqual(message.title, '🔔 Nueva Asignación');
    assert.ok(message.body.includes('Posición: Voz'));
}

function testCollectUnregisteredUserIdsOnlyForDeviceNotRegistered() {
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
    assert.deepStrictEqual(userIds, ['user-b']);
}

function testReadValidPushTokenRejectsMissingOrInvalid() {
    assert.strictEqual(readValidPushToken({ exists: false }), null);
    assert.strictEqual(
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
    assert.deepStrictEqual(valid, {
        token: 'ExponentPushToken[abc123]',
        language: 'en',
    });
}

function run() {
    testBuildAssignmentMessageUsesLocaleAndPosition();
    testBuildAssignmentMessageFallsBackToSpanish();
    testCollectUnregisteredUserIdsOnlyForDeviceNotRegistered();
    testReadValidPushTokenRejectsMissingOrInvalid();
    console.log('pushNotifications.test.js passed');
}

run();
