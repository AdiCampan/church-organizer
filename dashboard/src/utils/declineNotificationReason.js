/**
 * Resolve the rejection reason stored on a dashboard notification.
 * Mobile writes `reason`; push payloads may use `declineReason`.
 * @param {{ reason?: string, declineReason?: string } | null | undefined} notification
 * @returns {string | null}
 */
export function getDeclineNotificationReason(notification) {
    if (!notification || typeof notification !== 'object') {
        return null;
    }

    const candidates = [notification.reason, notification.declineReason];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }

    return null;
}
