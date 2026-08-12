import assert from 'node:assert/strict';
import {
    buildAssignmentPushMessage,
    isExpoPushToken,
    sendAssignmentPushNotification,
} from './assignmentPush.js';

function testIsExpoPushToken() {
    assert.equal(isExpoPushToken('ExponentPushToken[abc]'), true);
    assert.equal(isExpoPushToken('ExpoPushToken[abc]'), true);
    assert.equal(isExpoPushToken('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(isExpoPushToken('ExponentPushToken[abc'), false);
    assert.equal(isExpoPushToken('ExponentPushToken[abc]x'), false);
    assert.equal(isExpoPushToken('ExpoPushToken[abc'), false);
    assert.equal(isExpoPushToken('invalid'), false);
}

function testBuildAssignmentPushMessage() {
    const message = buildAssignmentPushMessage({
        pushToken: 'ExponentPushToken[abc]',
        language: 'en',
        eventTitle: 'Sunday Service',
        eventDate: new Date('2026-08-16T10:00:00.000Z'),
        position: 'Guitar',
        eventId: 'event-1',
        scheduleId: 'schedule-1',
        userId: 'user-1',
    });

    assert.equal(message.title, '🔔 New Assignment');
    assert.match(message.body, /Sunday Service/);
    assert.match(message.body, /Position: Guitar/);
    assert.deepEqual(message.data, {
        type: 'assignment',
        eventId: 'event-1',
        scheduleId: 'schedule-1',
        userId: 'user-1',
    });
}

async function testSendAssignmentPushNotificationSuccess() {
    const calls = [];
    const fetchImpl = async (url, options) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ data: { status: 'ok', id: 'ticket-1' } }),
        };
    };

    const sent = await sendAssignmentPushNotification({
        pushToken: 'ExponentPushToken[abc]',
        language: 'es',
        eventTitle: 'Culto',
        eventDate: new Date('2026-08-16T10:00:00.000Z'),
        position: 'Voz',
        eventId: 'event-1',
        scheduleId: 'schedule-1',
        userId: 'user-1',
        fetchImpl,
    });

    assert.equal(sent, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://exp.host/--/api/v2/push/send');
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.to, 'ExponentPushToken[abc]');
    assert.equal(body.title, '🔔 Nueva Asignación');
}

async function testSendAssignmentPushNotificationRejectsInvalidToken() {
    const sent = await sendAssignmentPushNotification({
        pushToken: 'ExponentPushToken[abc',
        language: 'es',
        eventTitle: 'Culto',
        eventDate: new Date('2026-08-16T10:00:00.000Z'),
        position: 'Voz',
        eventId: 'event-1',
        scheduleId: 'schedule-1',
        userId: 'user-1',
        fetchImpl: async () => {
            throw new Error('fetch should not be called');
        },
    });
    assert.equal(sent, false);
}

async function run() {
    testIsExpoPushToken();
    testBuildAssignmentPushMessage();
    await testSendAssignmentPushNotificationSuccess();
    await testSendAssignmentPushNotificationRejectsInvalidToken();
    console.log('assignmentPush.test.js passed');
}

run();
