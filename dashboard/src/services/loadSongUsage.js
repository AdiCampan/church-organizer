import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { buildSongUsageMap, getUsagePeriodStarts } from '../utils/songUsage';

/**
 * Load services from the last 12 months and count song uses.
 * @param {Date} [now]
 * @returns {Promise<Record<string, { month: number, quarter: number, year: number, lastUsedAt: Date | null, uses: Array<{ eventId: string, title: string, date: Date }> }>>}
 */
export async function loadSongUsageMap(now = new Date()) {
    const { year } = getUsagePeriodStarts(now);
    const snapshot = await getDocs(query(
        collection(db, 'events'),
        where('date', '>=', Timestamp.fromDate(year)),
        where('date', '<=', Timestamp.fromDate(now)),
        orderBy('date', 'asc')
    ));
    const events = snapshot.docs.map((eventDoc) => ({ id: eventDoc.id, ...eventDoc.data() }));
    return buildSongUsageMap(events, now);
}
