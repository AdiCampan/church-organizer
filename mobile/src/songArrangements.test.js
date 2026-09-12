import assert from 'node:assert/strict';
import { resolveSongWithArrangement } from './songArrangements.js';

async function testResolveUsesSelectedArrangement() {
    const song = {
        title: 'Song',
        lyrics: 'Lyrics',
        arrangements: [
            {
                id: 'a1',
                name: 'Acoustic',
                key: 'C',
                bpm: '',
                meter: '',
                pdfUrl: 'a.pdf',
                mp3Url: null,
                youtubeUrl: '',
                isDefault: true,
            },
            {
                id: 'a2',
                name: 'Band',
                key: 'E',
                bpm: '120',
                meter: '4/4',
                pdfUrl: 'b.pdf',
                mp3Url: 'b.mp3',
                youtubeUrl: 'https://youtube.com/x',
                isDefault: false,
            },
        ],
    };

    const resolved = resolveSongWithArrangement(song, 'a2');
    assert.equal(resolved.key, 'E');
    assert.equal(resolved.pdfUrl, 'b.pdf');
    assert.equal(resolved.mp3Url, 'b.mp3');
    assert.equal(resolved.lyrics, 'Lyrics');
}

async function testLegacyFallback() {
    const resolved = resolveSongWithArrangement({
        title: 'Legacy',
        key: 'G',
        pdfUrl: 'legacy.pdf',
    }, null);

    assert.equal(resolved.key, 'G');
    assert.equal(resolved.pdfUrl, 'legacy.pdf');
}

async function run() {
    await testResolveUsesSelectedArrangement();
    await testLegacyFallback();
    console.log('songArrangements.test.js: all tests passed');
}

run();
