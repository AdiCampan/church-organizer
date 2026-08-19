import assert from 'node:assert/strict';
import { getDeclineNotificationReason } from './declineNotificationReason.js';

async function testReadsReasonFromMobileNotification() {
    assert.equal(
        getDeclineNotificationReason({
            type: 'assignment_declined',
            reason: 'No puedo asistir',
        }),
        'No puedo asistir'
    );
}

async function testFallsBackToDeclineReasonField() {
    assert.equal(
        getDeclineNotificationReason({
            type: 'assignment_declined',
            declineReason: 'Estoy enfermo',
        }),
        'Estoy enfermo'
    );
}

async function testReturnsNullWhenMissingOrBlank() {
    assert.equal(getDeclineNotificationReason(null), null);
    assert.equal(getDeclineNotificationReason({}), null);
    assert.equal(getDeclineNotificationReason({ reason: '   ' }), null);
    assert.equal(getDeclineNotificationReason({ reason: 123 }), null);
}

async function run() {
    await testReadsReasonFromMobileNotification();
    await testFallsBackToDeclineReasonField();
    await testReturnsNullWhenMissingOrBlank();
    console.log('declineNotificationReason.test.js: all tests passed');
}

run();
