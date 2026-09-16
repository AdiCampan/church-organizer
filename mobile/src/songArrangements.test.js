const assert = require('assert');
const { ensureSongArrangements, resolveSongWithArrangement } = require('./songArrangements');

function testResolveUsesSelectedArrangement() {
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

function testLegacyFallback() {
    const resolved = resolveSongWithArrangement({
        title: 'Legacy',
        key: 'G',
        pdfUrl: 'legacy.pdf',
    }, null);

    assert.equal(resolved.key, 'G');
    assert.equal(resolved.pdfUrl, 'legacy.pdf');
}

function testKeepsOnlyFirstDefaultFlag() {
    const arrangements = ensureSongArrangements({
        title: 'Song',
        arrangements: [
            {
                id: 'a1',
                name: 'A',
                key: 'C',
                bpm: '',
                meter: '',
                pdfUrl: null,
                mp3Url: null,
                youtubeUrl: '',
                isDefault: true,
            },
            {
                id: 'a2',
                name: 'B',
                key: 'D',
                bpm: '',
                meter: '',
                pdfUrl: null,
                mp3Url: null,
                youtubeUrl: '',
                isDefault: true,
            },
        ],
    });

    assert.equal(arrangements.filter((item) => item.isDefault).length, 1);
    assert.equal(arrangements[0].isDefault, true);
    assert.equal(arrangements[1].isDefault, false);
}

testResolveUsesSelectedArrangement();
testLegacyFallback();
testKeepsOnlyFirstDefaultFlag();
console.log('songArrangements.test.js: all tests passed');
