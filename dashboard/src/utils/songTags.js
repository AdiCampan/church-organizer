/**
 * Song tags support one level of subcategories: a tag may have an optional
 * `parentId` pointing to a top-level tag. Songs keep storing a flat `tags`
 * array of tag ids, so no song data needs migrating.
 */

function byName(a, b) {
    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
}

/**
 * Returns the parent id of a tag only when that parent exists and is itself a
 * top-level tag. Anything else (missing, self-reference, nested deeper) is
 * treated as a top-level tag so old or inconsistent data never hides a tag.
 * @param {Array<{id: string, parentId?: string|null}>} tags
 * @param {{id: string, parentId?: string|null}} tag
 * @returns {string|null}
 */
export function getEffectiveParentId(tags, tag) {
    const parentId = tag?.parentId;
    if (!parentId || parentId === tag.id) {
        return null;
    }
    const parent = tags.find((item) => item.id === parentId);
    if (!parent || parent.parentId) {
        return null;
    }
    return parentId;
}

/**
 * Groups tags into top-level tags with their subcategories, sorted by name.
 * @param {Array<object>} tags
 * @returns {Array<object & { children: Array<object> }>}
 */
export function buildTagTree(tags) {
    const safeTags = Array.isArray(tags) ? tags : [];
    const childrenByParent = new Map();
    const roots = [];

    safeTags.forEach((tag) => {
        const parentId = getEffectiveParentId(safeTags, tag);
        if (parentId) {
            const list = childrenByParent.get(parentId) || [];
            list.push(tag);
            childrenByParent.set(parentId, list);
        } else {
            roots.push(tag);
        }
    });

    return roots.sort(byName).map((root) => ({
        ...root,
        children: (childrenByParent.get(root.id) || []).sort(byName),
    }));
}

/**
 * @param {Array<object>} tags
 * @param {string} parentId
 * @returns {string[]}
 */
export function getChildTagIds(tags, parentId) {
    const safeTags = Array.isArray(tags) ? tags : [];
    return safeTags
        .filter((tag) => getEffectiveParentId(safeTags, tag) === parentId)
        .map((tag) => tag.id);
}

/**
 * Selecting a parent tag also matches songs tagged only with one of its
 * subcategories. Selecting a subcategory matches just that subcategory.
 * @param {Array<object>} tags
 * @param {string[]} selectedIds
 * @returns {Set<string>}
 */
export function expandTagFilters(tags, selectedIds) {
    const expanded = new Set();
    (Array.isArray(selectedIds) ? selectedIds : []).forEach((tagId) => {
        expanded.add(tagId);
        getChildTagIds(tags, tagId).forEach((childId) => expanded.add(childId));
    });
    return expanded;
}

/**
 * @param {{ tags?: string[] }} song
 * @param {Array<object>} tags
 * @param {string[]} selectedIds
 * @returns {boolean}
 */
export function songMatchesTagFilters(song, tags, selectedIds) {
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
        return true;
    }
    const songTags = Array.isArray(song?.tags) ? song.tags : [];
    const expanded = expandTagFilters(tags, selectedIds);
    return songTags.some((tagId) => expanded.has(tagId));
}

/**
 * "Parent / Child" for subcategories, plain name otherwise.
 * @param {Array<object>} tags
 * @param {string} tagId
 * @returns {string}
 */
export function getTagLabel(tags, tagId) {
    const safeTags = Array.isArray(tags) ? tags : [];
    const tag = safeTags.find((item) => item.id === tagId);
    if (!tag) {
        return '';
    }
    const parentId = getEffectiveParentId(safeTags, tag);
    const parent = parentId ? safeTags.find((item) => item.id === parentId) : null;
    return parent ? `${parent.name} / ${tag.name}` : tag.name;
}

/**
 * Top-level tags that can be chosen as parent for the tag being edited. A tag
 * that already has subcategories cannot become a subcategory itself.
 * @param {Array<object>} tags
 * @param {string|null} editingTagId
 * @returns {Array<object>}
 */
export function getParentOptions(tags, editingTagId = null) {
    const safeTags = Array.isArray(tags) ? tags : [];
    if (editingTagId && getChildTagIds(safeTags, editingTagId).length > 0) {
        return [];
    }
    return safeTags
        .filter((tag) => getEffectiveParentId(safeTags, tag) === null && tag.id !== editingTagId)
        .sort(byName);
}

/**
 * Value to persist for `parentId`: the id when it is a valid choice, else null.
 * @param {Array<object>} tags
 * @param {string|null} editingTagId
 * @param {string|null|undefined} parentId
 * @returns {string|null}
 */
export function sanitizeParentId(tags, editingTagId, parentId) {
    if (!parentId) {
        return null;
    }
    return getParentOptions(tags, editingTagId).some((tag) => tag.id === parentId) ? parentId : null;
}
