import assert from 'node:assert/strict';
import {
    buildTagTree,
    expandTagFilters,
    getChildTagIds,
    getEffectiveParentId,
    getParentOptions,
    getTagLabel,
    sanitizeParentId,
    songMatchesTagFilters,
} from './songTags.js';

const tags = [
    { id: 'worship', name: 'Adoración', color: '#3b82f6' },
    { id: 'fast', name: 'Rápida', color: '#ef4444', parentId: 'worship' },
    { id: 'slow', name: 'Lenta', color: '#10b981', parentId: 'worship' },
    { id: 'hymn', name: 'Himno', color: '#8b5cf6' },
    { id: 'orphan', name: 'Huérfana', color: '#64748b', parentId: 'deleted-tag' },
];

function testBuildsTreeWithSortedChildren() {
    const tree = buildTagTree(tags);
    assert.deepEqual(tree.map((tag) => tag.id), ['worship', 'hymn', 'orphan']);
    assert.deepEqual(tree[0].children.map((tag) => tag.id), ['slow', 'fast']);
    assert.deepEqual(tree[1].children, []);
}

function testOrphanAndInvalidParentsAreTopLevel() {
    assert.equal(getEffectiveParentId(tags, tags[4]), null);
    assert.equal(getEffectiveParentId(tags, { id: 'x', parentId: 'x' }), null);
    // A tag whose parent is itself a subcategory is not nested a second level.
    const deep = [...tags, { id: 'deep', name: 'Profunda', parentId: 'fast' }];
    assert.equal(getEffectiveParentId(deep, deep[5]), null);
    assert.ok(buildTagTree(deep).some((tag) => tag.id === 'deep'));
}

function testHandlesMissingInput() {
    assert.deepEqual(buildTagTree(undefined), []);
    assert.deepEqual(getChildTagIds(null, 'worship'), []);
    assert.equal(getTagLabel(undefined, 'worship'), '');
}

function testParentFilterIncludesSubcategories() {
    const expanded = expandTagFilters(tags, ['worship']);
    assert.deepEqual([...expanded].sort(), ['fast', 'slow', 'worship']);
    assert.deepEqual([...expandTagFilters(tags, ['fast'])], ['fast']);
    assert.deepEqual([...expandTagFilters(tags, [])], []);
}

function testSongMatching() {
    const fastSong = { tags: ['fast'] };
    const hymnSong = { tags: ['hymn'] };
    const untagged = {};

    assert.equal(songMatchesTagFilters(fastSong, tags, ['worship']), true);
    assert.equal(songMatchesTagFilters(fastSong, tags, ['slow']), false);
    assert.equal(songMatchesTagFilters(hymnSong, tags, ['worship']), false);
    assert.equal(songMatchesTagFilters(hymnSong, tags, ['worship', 'hymn']), true);
    assert.equal(songMatchesTagFilters(untagged, tags, ['worship']), false);
    assert.equal(songMatchesTagFilters(untagged, tags, []), true);
}

function testLabels() {
    assert.equal(getTagLabel(tags, 'fast'), 'Adoración / Rápida');
    assert.equal(getTagLabel(tags, 'worship'), 'Adoración');
    assert.equal(getTagLabel(tags, 'missing'), '');
}

function testParentOptions() {
    // New tag: any top-level tag can be its parent.
    assert.deepEqual(getParentOptions(tags).map((tag) => tag.id), ['worship', 'hymn', 'orphan']);
    // Editing a subcategory: its own parent stays selectable, itself never listed.
    assert.deepEqual(getParentOptions(tags, 'fast').map((tag) => tag.id), ['worship', 'hymn', 'orphan']);
    // A tag with subcategories cannot become a subcategory.
    assert.deepEqual(getParentOptions(tags, 'worship'), []);
    // A childless top-level tag cannot be its own parent.
    assert.deepEqual(getParentOptions(tags, 'hymn').map((tag) => tag.id), ['worship', 'orphan']);
}

function testSanitizeParentId() {
    assert.equal(sanitizeParentId(tags, null, 'worship'), 'worship');
    assert.equal(sanitizeParentId(tags, null, ''), null);
    assert.equal(sanitizeParentId(tags, null, undefined), null);
    assert.equal(sanitizeParentId(tags, 'hymn', 'hymn'), null);
    assert.equal(sanitizeParentId(tags, 'worship', 'hymn'), null);
    assert.equal(sanitizeParentId(tags, null, 'fast'), null);
    assert.equal(sanitizeParentId(tags, null, 'deleted-tag'), null);
}

testBuildsTreeWithSortedChildren();
testOrphanAndInvalidParentsAreTopLevel();
testHandlesMissingInput();
testParentFilterIncludesSubcategories();
testSongMatching();
testLabels();
testParentOptions();
testSanitizeParentId();
console.log('songTags.test.js: all tests passed');
