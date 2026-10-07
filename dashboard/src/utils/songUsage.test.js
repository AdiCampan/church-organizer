import assert from 'node:assert/strict';
import {
    EMPTY_SONG_USAGE,
    buildSongUsageMap,
    formatSongUsageDate,
    getSongUsage,
    getUsagePeriodStarts,
    needsFullSongCatalog,
    songMatchesUsageFilter,
    toEventDate,
} from './songUsage.js';

const now = new Date(2026, 9, 7, 21, 0, 0);

function eventOn(id, year, monthIndex, day, songIds, title = 'Culto') {
    return {
        id,
        title,
        date: new Date(year, monthIndex, day, 11, 0, 0),
        orderOfService: songIds.map((songId) => ({ songId, title: 'Song' })),
    };
}

async function testPeriodStartsUseRollingMonths() {
    const periods = getUsagePeriodStarts(now);
    assert.equal(periods.month.getTime(), new Date(2026, 8, 7, 0, 0, 0, 0).getTime());
    assert.equal(periods.quarter.getTime(), new Date(2026, 6, 7, 0, 0, 0, 0).getTime());
    assert.equal(periods.year.getTime(), new Date(2025, 9, 7, 0, 0, 0, 0).getTime());
}

async function testCountsMonthQuarterAndYear() {
    const usage = buildSongUsageMap([
        eventOn('future', 2026, 9, 8, ['a']),
        eventOn('month', 2026, 8, 10, ['a', 'a']),
        eventOn('month-boundary', 2026, 8, 7, ['a']),
        eventOn('before-month', 2026, 8, 6, ['a']),
        eventOn('quarter', 2026, 6, 10, ['a']),
        eventOn('year', 2025, 10, 1, ['a']),
        eventOn('too-old', 2025, 9, 1, ['a']),
        eventOn('other', 2026, 8, 20, ['b']),
    ], now);

    assert.equal(usage.a.month, 3);
    assert.equal(usage.a.quarter, 5);
    assert.equal(usage.a.year, 6);
    assert.equal(usage.a.lastUsedAt.getTime(), new Date(2026, 8, 10, 11, 0, 0).getTime());
    assert.equal(usage.a.uses[0].eventId, 'month');
    assert.equal(usage.b.month, 1);
    assert.equal(usage.b.quarter, 1);
    assert.equal(usage.b.year, 1);
    assert.equal(usage.future, undefined);
}

async function testExcludesServiceLaterTheSameDay() {
    const usage = buildSongUsageMap([
        {
            id: 'later-today',
            title: 'Culto de noche',
            date: new Date(2026, 9, 7, 22, 0, 0),
            orderOfService: [{ songId: 'later-song' }],
        },
        eventOn('already-sung', 2026, 9, 7, ['later-song']),
    ], now);

    assert.equal(usage['later-song'].month, 1);
    assert.equal(usage['later-song'].uses.length, 1);
    assert.equal(usage['later-song'].uses[0].eventId, 'already-sung');
}

async function testParsesDateOnlyStringsAsLocalDates() {
    const dateOnly = toEventDate('2026-10-07');
    assert.equal(dateOnly.getFullYear(), 2026);
    assert.equal(dateOnly.getMonth(), 9);
    assert.equal(dateOnly.getDate(), 7);
    assert.equal(dateOnly.getHours(), 0);

    const withTime = toEventDate('2026-10-07T22:30:00');
    assert.equal(withTime.getFullYear(), 2026);
    assert.equal(withTime.getMonth(), 9);
    assert.equal(withTime.getDate(), 7);
    assert.equal(withTime.getHours(), 22);
    assert.equal(withTime.getMinutes(), 30);

    const withZone = toEventDate('2026-10-07T19:00:00Z');
    assert.equal(withZone.toISOString(), '2026-10-07T19:00:00.000Z');
    assert.equal(toEventDate('2026-02-31'), null);
}

async function testReadsLegacySongFieldAndTimestamp() {
    const usage = buildSongUsageMap([
        {
            id: 'legacy',
            title: 'Ensayo',
            date: { toDate: () => new Date(2026, 9, 1, 19, 0, 0) },
            orderOfService: [{ song: 'legacy-song' }],
        },
        {
            id: 'seconds',
            title: 'Domingo',
            date: { seconds: Math.floor(new Date(2026, 9, 5, 11, 0, 0).getTime() / 1000) },
            orderOfService: [{ songId: '' }, { songId: 'seconds-song' }, null],
        },
    ], now);

    assert.equal(usage['legacy-song'].month, 1);
    assert.equal(usage['legacy-song'].uses[0].title, 'Ensayo');
    assert.equal(usage['seconds-song'].month, 1);
}

async function testIgnoresInvalidEvents() {
    const usage = buildSongUsageMap([
        null,
        { id: 'no-date', orderOfService: [{ songId: 'a' }] },
        { id: 'bad-date', date: 'not-a-date', orderOfService: [{ songId: 'a' }] },
        { id: 'no-oos', date: new Date(2026, 9, 1), title: 'Sin orden' },
    ], now);

    assert.deepEqual(usage, {});
    assert.deepEqual(buildSongUsageMap(null, now), {});
    assert.equal(toEventDate(undefined), null);
    assert.equal(toEventDate({ toDate: () => 'nope' }), null);
}

async function testUsageFilters() {
    const usage = buildSongUsageMap([
        eventOn('recent', 2026, 9, 1, ['recent']),
        eventOn('quarter-only', 2026, 7, 1, ['quarter-only']),
        eventOn('year-only', 2025, 11, 1, ['year-only']),
    ], now);

    assert.equal(songMatchesUsageFilter(usage.recent, 'month'), true);
    assert.equal(songMatchesUsageFilter(usage['quarter-only'], 'month'), false);
    assert.equal(songMatchesUsageFilter(usage['quarter-only'], 'quarter'), true);
    assert.equal(songMatchesUsageFilter(usage['year-only'], 'quarter'), false);
    assert.equal(songMatchesUsageFilter(usage['year-only'], 'year'), true);
    assert.equal(songMatchesUsageFilter(getSongUsage(usage, 'missing'), 'unused'), true);
    assert.equal(songMatchesUsageFilter(usage.recent, 'unused'), false);
    assert.equal(songMatchesUsageFilter(usage.recent, 'all'), true);
    assert.equal(songMatchesUsageFilter(usage.recent, 'nope'), true);
    assert.equal(getSongUsage(null, 'recent'), EMPTY_SONG_USAGE);
}

async function testCatalogLoadRule() {
    assert.equal(needsFullSongCatalog({}), false);
    assert.equal(needsFullSongCatalog({ searchTerm: 'a' }), false);
    assert.equal(needsFullSongCatalog({ searchTerm: 'al' }), true);
    assert.equal(needsFullSongCatalog({ tagFilters: ['tag-1'] }), true);
    assert.equal(needsFullSongCatalog({ usageFilter: 'month' }), true);
    assert.equal(needsFullSongCatalog({ usageFilter: 'unused' }), true);
    assert.equal(needsFullSongCatalog({ usageFilter: 'custom' }), false);
}

async function testFormatsUsageDate() {
    const formatted = formatSongUsageDate(new Date(2026, 9, 7), 'es');
    assert.match(formatted, /2026/);
    assert.match(formatted, /7/);
    assert.equal(formatSongUsageDate(null, 'es'), '');
}

async function run() {
    await testPeriodStartsUseRollingMonths();
    await testCountsMonthQuarterAndYear();
    await testExcludesServiceLaterTheSameDay();
    await testParsesDateOnlyStringsAsLocalDates();
    await testReadsLegacySongFieldAndTimestamp();
    await testIgnoresInvalidEvents();
    await testUsageFilters();
    await testCatalogLoadRule();
    await testFormatsUsageDate();
    console.log('songUsage.test.js: all tests passed');
}

run();
