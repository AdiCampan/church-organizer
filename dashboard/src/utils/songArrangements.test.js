import assert from 'node:assert/strict';
import {
    buildSongSavePayload,
    createEmptyArrangement,
    ensureSongArrangements,
    findArrangement,
    getDefaultArrangement,
    resolveSongWithArrangement,
    setDefaultArrangement,
} from './songArrangements.js';

async function testLegacySongBecomesDefaultArrangement() {
    const song = {
        title: 'Amazing Grace',
        key: 'G',
        bpm: '90',
        meter: '3/4',
        pdfUrl: 'https://example.com/chords.pdf',
        mp3Url: 'https://example.com/audio.mp3',
        youtubeUrl: 'https://youtube.com/watch?v=1',
    };

    const arrangements = ensureSongArrangements(song, { defaultName: 'Principal' });
    assert.equal(arrangements.length, 1);
    assert.equal(arrangements[0].name, 'Principal');
    assert.equal(arrangements[0].key, 'G');
    assert.equal(arrangements[0].bpm, '90');
    assert.equal(arrangements[0].isDefault, true);
    assert.equal(arrangements[0].pdfUrl, 'https://example.com/chords.pdf');
}

async function testExistingArrangementsArePreserved() {
    const song = {
        title: 'Song',
        arrangements: [
            createEmptyArrangement({ id: 'a1', name: 'Acoustic', key: 'C', isDefault: false }),
            createEmptyArrangement({ id: 'a2', name: 'Band', key: 'D', isDefault: true }),
        ],
    };

    const arrangements = ensureSongArrangements(song);
    assert.equal(arrangements.length, 2);
    assert.equal(getDefaultArrangement(song).id, 'a2');
    assert.equal(findArrangement(song, 'a1').key, 'C');
}

async function testResolveSongWithArrangementOverridesMedia() {
    const song = {
        title: 'Song',
        lyrics: 'Hello',
        key: 'C',
        pdfUrl: 'legacy.pdf',
        arrangements: [
            createEmptyArrangement({ id: 'a1', name: 'A', key: 'C', pdfUrl: 'a.pdf', isDefault: true }),
            createEmptyArrangement({ id: 'a2', name: 'B', key: 'E', pdfUrl: 'b.pdf', mp3Url: 'b.mp3', isDefault: false }),
        ],
    };

    const resolved = resolveSongWithArrangement(song, 'a2');
    assert.equal(resolved.title, 'Song');
    assert.equal(resolved.lyrics, 'Hello');
    assert.equal(resolved.key, 'E');
    assert.equal(resolved.pdfUrl, 'b.pdf');
    assert.equal(resolved.mp3Url, 'b.mp3');
    assert.equal(resolved.arrangement.id, 'a2');
}

async function testSetDefaultArrangement() {
    const arrangements = setDefaultArrangement([
        createEmptyArrangement({ id: 'a1', name: 'A', isDefault: true }),
        createEmptyArrangement({ id: 'a2', name: 'B', isDefault: false }),
    ], 'a2');

    assert.equal(arrangements[0].isDefault, false);
    assert.equal(arrangements[1].isDefault, true);
}

async function testBuildSongSavePayloadSyncsDefaultToTopLevel() {
    const payload = buildSongSavePayload({
        title: 'Song',
        artist: 'Artist',
        lyrics: 'Lyrics',
        duration: '4',
        tags: ['tag1'],
        arrangements: [
            createEmptyArrangement({ id: 'a1', name: 'Acoustic', key: 'C', pdfUrl: 'a.pdf', isDefault: false }),
            createEmptyArrangement({ id: 'a2', name: 'Band', key: 'D', bpm: '110', mp3Url: 'b.mp3', isDefault: true }),
        ],
    }, { defaultName: 'Principal' });

    assert.equal(payload.title, 'Song');
    assert.equal(payload.arrangements.length, 2);
    assert.equal(payload.key, 'D');
    assert.equal(payload.bpm, '110');
    assert.equal(payload.pdfUrl, null);
    assert.equal(payload.mp3Url, 'b.mp3');
    assert.equal(payload.arrangements.find((item) => item.isDefault).id, 'a2');
}

async function testEmptySongGetsDefaultArrangement() {
    const arrangements = ensureSongArrangements(null, { defaultName: 'Principal' });
    assert.equal(arrangements.length, 1);
    assert.equal(arrangements[0].isDefault, true);
    assert.equal(arrangements[0].name, 'Principal');
}

async function testEnsureSongArrangementsKeepsOnlyFirstDefault() {
    const song = {
        title: 'Song',
        arrangements: [
            createEmptyArrangement({ id: 'a1', name: 'A', isDefault: true }),
            createEmptyArrangement({ id: 'a2', name: 'B', isDefault: true }),
            createEmptyArrangement({ id: 'a3', name: 'C', isDefault: false }),
        ],
    };

    const arrangements = ensureSongArrangements(song);
    assert.equal(arrangements.filter((item) => item.isDefault).length, 1);
    assert.equal(arrangements[0].isDefault, true);
    assert.equal(arrangements[1].isDefault, false);
    assert.equal(arrangements[2].isDefault, false);
}

async function testEnsureSongArrangementsMarksFirstWhenNoneDefault() {
    const song = {
        title: 'Song',
        arrangements: [
            createEmptyArrangement({ id: 'a1', name: 'A', isDefault: false }),
            createEmptyArrangement({ id: 'a2', name: 'B', isDefault: false }),
        ],
    };

    const arrangements = ensureSongArrangements(song);
    assert.equal(arrangements[0].isDefault, true);
    assert.equal(arrangements[1].isDefault, false);
}

async function testLegacyResolveKeepsArrangementIdInCollection() {
    const resolved = resolveSongWithArrangement({
        title: 'Legacy',
        key: 'G',
        pdfUrl: 'legacy.pdf',
    }, null, { defaultName: 'Principal' });

    assert.ok(resolved);
    assert.equal(resolved.arrangements.length, 1);
    assert.equal(resolved.arrangement.id, resolved.arrangements[0].id);
    assert.equal(resolved.key, 'G');
    assert.equal(resolved.pdfUrl, 'legacy.pdf');
}

async function run() {
    await testLegacySongBecomesDefaultArrangement();
    await testExistingArrangementsArePreserved();
    await testResolveSongWithArrangementOverridesMedia();
    await testSetDefaultArrangement();
    await testBuildSongSavePayloadSyncsDefaultToTopLevel();
    await testEmptySongGetsDefaultArrangement();
    await testEnsureSongArrangementsKeepsOnlyFirstDefault();
    await testEnsureSongArrangementsMarksFirstWhenNoneDefault();
    await testLegacyResolveKeepsArrangementIdInCollection();
    console.log('songArrangements.test.js: all tests passed');
}

run();
