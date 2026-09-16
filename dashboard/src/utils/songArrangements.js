/**
 * @typedef {object} SongArrangement
 * @property {string} id
 * @property {string} name
 * @property {string} key
 * @property {string} bpm
 * @property {string} meter
 * @property {string | null} pdfUrl
 * @property {string | null} mp3Url
 * @property {string} youtubeUrl
 * @property {boolean} isDefault
 */

/**
 * @typedef {object} SongLike
 * @property {string} [title]
 * @property {string} [artist]
 * @property {string} [lyrics]
 * @property {string} [key]
 * @property {string} [bpm]
 * @property {string} [meter]
 * @property {string | null} [pdfUrl]
 * @property {string | null} [mp3Url]
 * @property {string} [youtubeUrl]
 * @property {string} [spotifyUrl]
 * @property {SongArrangement[]} [arrangements]
 */

let arrangementIdCounter = 0;

/**
 * @returns {string}
 */
export function createArrangementId() {
    arrangementIdCounter += 1;
    return `arr_${Date.now()}_${arrangementIdCounter}`;
}

/**
 * @param {Partial<SongArrangement>} [overrides]
 * @returns {SongArrangement}
 */
export function createEmptyArrangement(overrides = {}) {
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

/**
 * @param {unknown} arrangement
 * @returns {boolean}
 */
function isValidArrangement(arrangement) {
    return Boolean(
        arrangement
        && typeof arrangement === 'object'
        && typeof arrangement.id === 'string'
        && arrangement.id.length > 0
    );
}

/**
 * Normalize arrangements from a song document, migrating legacy top-level media fields.
 * @param {SongLike | null | undefined} song
 * @param {{ defaultName?: string }} [options]
 * @returns {SongArrangement[]}
 */
export function ensureSongArrangements(song, options = {}) {
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
        const hasLegacyMedia = Boolean(
            song.key || song.bpm || song.meter || song.pdfUrl || song.mp3Url || song.youtubeUrl
        );

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
                ...(hasLegacyMedia ? {} : {}),
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

/**
 * @param {SongLike | null | undefined} song
 * @param {{ defaultName?: string }} [options]
 * @returns {SongArrangement}
 */
export function getDefaultArrangement(song, options = {}) {
    const arrangements = ensureSongArrangements(song, options);
    return arrangements.find((arrangement) => arrangement.isDefault) || arrangements[0];
}

/**
 * @param {SongLike | null | undefined} song
 * @param {string | null | undefined} arrangementId
 * @param {{ defaultName?: string }} [options]
 * @returns {SongArrangement | null}
 */
export function findArrangement(song, arrangementId, options = {}) {
    const arrangements = ensureSongArrangements(song, options);
    if (!arrangementId) {
        return getDefaultArrangement(song, options);
    }

    return arrangements.find((arrangement) => arrangement.id === arrangementId)
        || getDefaultArrangement(song, options);
}

/**
 * Resolve song display/media fields for a specific arrangement.
 * Lyrics and identity remain at song level.
 * @param {SongLike | null | undefined} song
 * @param {string | null | undefined} arrangementId
 * @param {{ defaultName?: string }} [options]
 * @returns {(SongLike & SongArrangement & { arrangement: SongArrangement, arrangements: SongArrangement[] }) | null}
 */
export function resolveSongWithArrangement(song, arrangementId, options = {}) {
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

/**
 * Mark one arrangement as default and clear the flag on the others.
 * @param {SongArrangement[]} arrangements
 * @param {string} arrangementId
 * @returns {SongArrangement[]}
 */
export function setDefaultArrangement(arrangements, arrangementId) {
    if (!Array.isArray(arrangements) || arrangements.length === 0) {
        return [];
    }

    const hasTarget = arrangements.some((arrangement) => arrangement.id === arrangementId);
    return arrangements.map((arrangement, index) => ({
        ...arrangement,
        isDefault: hasTarget
            ? arrangement.id === arrangementId
            : index === 0,
    }));
}

/**
 * Build Firestore payload: keep arrangements and sync default media to top-level fields.
 * @param {SongLike & { arrangements?: SongArrangement[] }} formData
 * @param {{ defaultName?: string }} [options]
 * @returns {object}
 */
export function buildSongSavePayload(formData, options = {}) {
    const arrangements = ensureSongArrangements(formData, options).map((arrangement) => ({
        id: arrangement.id,
        name: arrangement.name.trim() || options.defaultName || 'Default',
        key: arrangement.key || '',
        bpm: arrangement.bpm || '',
        meter: arrangement.meter || '',
        pdfUrl: arrangement.pdfUrl || null,
        mp3Url: arrangement.mp3Url || null,
        youtubeUrl: arrangement.youtubeUrl || '',
        isDefault: Boolean(arrangement.isDefault),
    }));

    const withDefault = setDefaultArrangement(
        arrangements,
        (arrangements.find((arrangement) => arrangement.isDefault) || arrangements[0]).id
    );
    const defaultArrangement = withDefault.find((arrangement) => arrangement.isDefault) || withDefault[0];

    return {
        title: formData.title || '',
        artist: formData.artist || '',
        lyrics: formData.lyrics || '',
        duration: formData.duration || '',
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        spotifyUrl: formData.spotifyUrl || '',
        arrangements: withDefault,
        key: defaultArrangement.key || '',
        bpm: defaultArrangement.bpm || '',
        meter: defaultArrangement.meter || '',
        pdfUrl: defaultArrangement.pdfUrl || null,
        mp3Url: defaultArrangement.mp3Url || null,
        youtubeUrl: defaultArrangement.youtubeUrl || '',
    };
}
