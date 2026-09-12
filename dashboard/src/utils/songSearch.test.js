import assert from 'node:assert/strict';
import { filterSongsBySearch, normalizeText } from './songSearch.js';

const songs = [
    { id: '1', title: 'Grande es Tú fidelidad', artist: 'Himnos' },
    { id: '2', title: 'Amazing Grace', artist: 'John Newton' },
    { id: '3', title: 'Alabaré', artist: 'Coro' },
];

async function testNormalizeTextStripsAccents() {
    assert.equal(normalizeText('Alabaré'), 'alabare');
    assert.equal(normalizeText('Tú'), 'tu');
    assert.equal(normalizeText(null), '');
    assert.equal(normalizeText(undefined), '');
}

async function testFilterByTitleIgnoreAccents() {
    const result = filterSongsBySearch(songs, 'alabare');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '3');
}

async function testFilterByArtist() {
    const result = filterSongsBySearch(songs, 'newton');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '2');
}

async function testEmptyTermReturnsAllSongs() {
    assert.equal(filterSongsBySearch(songs, '').length, 3);
    assert.equal(filterSongsBySearch(songs, '   ').length, 3);
}

async function testInvalidSongsInputReturnsEmpty() {
    assert.deepEqual(filterSongsBySearch(null, 'grace'), []);
    assert.deepEqual(filterSongsBySearch(undefined, 'grace'), []);
}

async function testNoMatchesReturnsEmpty() {
    assert.equal(filterSongsBySearch(songs, 'xyz-no-match').length, 0);
}

async function run() {
    await testNormalizeTextStripsAccents();
    await testFilterByTitleIgnoreAccents();
    await testFilterByArtist();
    await testEmptyTermReturnsAllSongs();
    await testInvalidSongsInputReturnsEmpty();
    await testNoMatchesReturnsEmpty();
    console.log('songSearch.test.js: all tests passed');
}

run();
