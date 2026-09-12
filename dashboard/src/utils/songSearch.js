/**
 * Normalize text for accent-insensitive song search.
 * @param {string | null | undefined} text
 * @returns {string}
 */
export function normalizeText(text) {
    return text
        ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        : '';
}

/**
 * Filter songs by title or artist using accent-insensitive matching.
 * @param {Array<{ id: string, title?: string, artist?: string }>} songs
 * @param {string} searchTerm
 * @returns {Array<{ id: string, title?: string, artist?: string }>}
 */
export function filterSongsBySearch(songs, searchTerm) {
    if (!Array.isArray(songs)) {
        return [];
    }

    const normalizedTerm = normalizeText(typeof searchTerm === 'string' ? searchTerm.trim() : '');
    if (!normalizedTerm) {
        return songs;
    }

    return songs.filter((song) => {
        if (!song || typeof song !== 'object') {
            return false;
        }

        return (
            normalizeText(song.title).includes(normalizedTerm) ||
            normalizeText(song.artist).includes(normalizedTerm)
        );
    });
}
