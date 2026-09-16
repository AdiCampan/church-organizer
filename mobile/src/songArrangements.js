/**
 * Mobile copy of song arrangement helpers (kept in sync with dashboard utils).
 */

let arrangementIdCounter = 0;

function createArrangementId() {
    arrangementIdCounter += 1;
    return `arr_${Date.now()}_${arrangementIdCounter}`;
}

function createEmptyArrangement(overrides = {}) {
    return {
        id: overrides.id || createArrangementId(),
        name: typeof overrides.name === 'string' ? overrides.name : '',
        key: typeof overrides.key === 'string' ? overrides.key : '',
        bpm: typeof overrides.bpm === 'string' ? overrides.bpm : '',
        meter: typeof overrides.meter === 'string' ? overrides.meter : '',
        pdfUrl: overrides.pdfUrl ?? null,
        mp3Url: overrides.mp3Url ?? null,
        youtubeUrl: typeof overrides.youtubeUrl === 'string' ? overrides.youtubeUrl : '',
        isDefault: Boolean(overrides.isDefault),
    };
}

function isValidArrangement(arrangement) {
    return Boolean(
        arrangement
        && typeof arrangement === 'object'
        && typeof arrangement.id === 'string'
        && arrangement.id.length > 0
    );
}

function ensureSongArrangements(song, options = {}) {
    const defaultName = options.defaultName || 'Default';

    if (!song || typeof song !== 'object') {
        return [createEmptyArrangement({ name: defaultName, isDefault: true })];
    }

    const existing = Array.isArray(song.arrangements)
        ? song.arrangements.filter(isValidArrangement).map((arrangement) => createEmptyArrangement({
            id: arrangement.id,
            name: typeof arrangement.name === 'string' ? arrangement.name : defaultName,
            key: typeof arrangement.key === 'string' ? arrangement.key : '',
            bpm: typeof arrangement.bpm === 'string' ? arrangement.bpm : '',
            meter: typeof arrangement.meter === 'string' ? arrangement.meter : '',
            pdfUrl: arrangement.pdfUrl || null,
            mp3Url: arrangement.mp3Url || null,
            youtubeUrl: typeof arrangement.youtubeUrl === 'string' ? arrangement.youtubeUrl : '',
            isDefault: Boolean(arrangement.isDefault),
        }))
        : [];

    if (existing.length === 0) {
        return [
            createEmptyArrangement({
                name: defaultName,
                key: song.key || '',
                bpm: song.bpm || '',
                meter: song.meter || '',
                pdfUrl: song.pdfUrl || null,
                mp3Url: song.mp3Url || null,
                youtubeUrl: song.youtubeUrl || '',
                isDefault: true,
            }),
        ];
    }

    const firstDefaultIndex = existing.findIndex((arrangement) => arrangement.isDefault);
    const defaultIndex = firstDefaultIndex >= 0 ? firstDefaultIndex : 0;

    return existing.map((arrangement, index) => ({
        ...arrangement,
        isDefault: index === defaultIndex,
    }));
}

function getDefaultArrangement(song, options = {}) {
    const arrangements = ensureSongArrangements(song, options);
    return arrangements.find((arrangement) => arrangement.isDefault) || arrangements[0];
}

function findArrangement(song, arrangementId, options = {}) {
    const arrangements = ensureSongArrangements(song, options);
    if (!arrangementId) {
        return getDefaultArrangement(song, options);
    }

    return arrangements.find((arrangement) => arrangement.id === arrangementId)
        || getDefaultArrangement(song, options);
}

function resolveSongWithArrangement(song, arrangementId, options = {}) {
    if (!song || typeof song !== 'object') {
        return null;
    }

    const arrangements = ensureSongArrangements(song, options);
    const arrangement = findArrangement(song, arrangementId, options);
    if (!arrangement) {
        return null;
    }

    return {
        ...song,
        arrangements,
        arrangement,
        key: arrangement.key,
        bpm: arrangement.bpm,
        meter: arrangement.meter,
        pdfUrl: arrangement.pdfUrl,
        mp3Url: arrangement.mp3Url,
        youtubeUrl: arrangement.youtubeUrl,
    };
}

module.exports = {
    createArrangementId,
    createEmptyArrangement,
    ensureSongArrangements,
    getDefaultArrangement,
    findArrangement,
    resolveSongWithArrangement,
};
