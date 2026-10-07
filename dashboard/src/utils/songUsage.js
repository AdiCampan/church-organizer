const USAGE_FILTERS = ['all', 'month', 'quarter', 'year', 'unused'];

export const EMPTY_SONG_USAGE = Object.freeze({
    month: 0,
    quarter: 0,
    year: 0,
    lastUsedAt: null,
    uses: Object.freeze([]),
});

/**
 * @param {Date} date
 * @param {number} months
 * @returns {Date}
 */
function addCalendarMonths(date, months) {
    const result = new Date(date.getTime());
    const originalDay = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(originalDay, lastDayOfTargetMonth));
    return result;
}

/**
 * @param {Date} date
 * @returns {Date}
 */
function startOfDay(date) {
    const result = new Date(date.getTime());
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * @param {Date} date
 * @returns {Date}
 */
function endOfDay(date) {
    const result = new Date(date.getTime());
    result.setHours(23, 59, 59, 999);
    return result;
}

/**
 * @param {Date | { toDate?: () => Date, seconds?: number } | string | number | null | undefined} value
 * @returns {Date | null}
 */
export function toEventDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'object' && typeof value.toDate === 'function') {
        const parsed = value.toDate();
        return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }

    if (typeof value === 'object' && typeof value.seconds === 'number') {
        const parsed = new Date(value.seconds * 1000);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
}

/**
 * Rolling windows ending today: 1 month, 3 months and 12 months.
 * @param {Date} now
 * @returns {{ month: Date, quarter: Date, year: Date, end: Date }}
 */
export function getUsagePeriodStarts(now = new Date()) {
    const today = startOfDay(now);
    return {
        month: startOfDay(addCalendarMonths(today, -1)),
        quarter: startOfDay(addCalendarMonths(today, -3)),
        year: startOfDay(addCalendarMonths(today, -12)),
        end: endOfDay(now),
    };
}

/**
 * @param {string} songId
 * @param {Record<string, { month: number, quarter: number, year: number, lastUsedAt: Date | null, uses: Array<{ eventId: string, title: string, date: Date }> }>} usageBySongId
 */
function ensureSongBucket(usageBySongId, songId) {
    if (!usageBySongId[songId]) {
        usageBySongId[songId] = {
            month: 0,
            quarter: 0,
            year: 0,
            lastUsedAt: null,
            uses: [],
        };
    }
    return usageBySongId[songId];
}

/**
 * Count how many times each song appears in past services inside the last year.
 * A song sung twice in the same service counts as two uses. Future services are ignored.
 * @param {Array<{ id?: string, title?: string, date?: Date | { toDate?: () => Date, seconds?: number } | string | number, orderOfService?: Array<{ songId?: string, song?: string }> }> | null | undefined} events
 * @param {Date} [now]
 * @returns {Record<string, { month: number, quarter: number, year: number, lastUsedAt: Date | null, uses: Array<{ eventId: string, title: string, date: Date }> }>}
 */
export function buildSongUsageMap(events, now = new Date()) {
    const periods = getUsagePeriodStarts(now);
    /** @type {Record<string, { month: number, quarter: number, year: number, lastUsedAt: Date | null, uses: Array<{ eventId: string, title: string, date: Date }> }>} */
    const usageBySongId = {};

    if (!Array.isArray(events)) {
        return usageBySongId;
    }

    events.forEach((event) => {
        if (!event || typeof event !== 'object') {
            return;
        }

        const eventDate = toEventDate(event.date);
        if (!eventDate || eventDate < periods.year || eventDate > periods.end) {
            return;
        }

        const items = Array.isArray(event.orderOfService) ? event.orderOfService : [];
        items.forEach((item) => {
            const songId = typeof item?.songId === 'string' && item.songId
                ? item.songId
                : (typeof item?.song === 'string' ? item.song : '');
            if (!songId) {
                return;
            }

            const bucket = ensureSongBucket(usageBySongId, songId);
            bucket.year += 1;
            if (eventDate >= periods.quarter) {
                bucket.quarter += 1;
            }
            if (eventDate >= periods.month) {
                bucket.month += 1;
            }
            bucket.uses.push({
                eventId: typeof event.id === 'string' ? event.id : '',
                title: typeof event.title === 'string' ? event.title : '',
                date: eventDate,
            });
        });
    });

    Object.values(usageBySongId).forEach((bucket) => {
        bucket.uses.sort((left, right) => right.date.getTime() - left.date.getTime());
        bucket.lastUsedAt = bucket.uses[0]?.date || null;
    });

    return usageBySongId;
}

/**
 * @param {Record<string, { month: number, quarter: number, year: number, lastUsedAt: Date | null, uses: Array<{ eventId: string, title: string, date: Date }> }> | null | undefined} usageBySongId
 * @param {string} songId
 */
export function getSongUsage(usageBySongId, songId) {
    if (!usageBySongId || !songId || !usageBySongId[songId]) {
        return EMPTY_SONG_USAGE;
    }
    return usageBySongId[songId];
}

/**
 * @param {{ month: number, quarter: number, year: number } | null | undefined} usage
 * @param {string} filter
 * @returns {boolean}
 */
export function songMatchesUsageFilter(usage, filter) {
    if (!USAGE_FILTERS.includes(filter) || filter === 'all') {
        return true;
    }

    const stats = usage || EMPTY_SONG_USAGE;
    if (filter === 'month') {
        return stats.month > 0;
    }
    if (filter === 'quarter') {
        return stats.quarter > 0;
    }
    if (filter === 'year') {
        return stats.year > 0;
    }
    return stats.year === 0;
}

/**
 * @param {{ searchTerm?: string, tagFilters?: string[], usageFilter?: string }} input
 * @returns {boolean}
 */
export function needsFullSongCatalog({ searchTerm = '', tagFilters = [], usageFilter = 'all' } = {}) {
    const term = typeof searchTerm === 'string' ? searchTerm.trim() : '';
    const tags = Array.isArray(tagFilters) ? tagFilters : [];
    return tags.length > 0 || term.length >= 2 || (usageFilter !== 'all' && USAGE_FILTERS.includes(usageFilter));
}

/**
 * @param {Date | null | undefined} date
 * @param {string} language
 * @returns {string}
 */
export function formatSongUsageDate(date, language) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }

    const locale = language === 'ro' ? 'ro-RO' : language === 'en' ? 'en-GB' : 'es-ES';
    return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}
