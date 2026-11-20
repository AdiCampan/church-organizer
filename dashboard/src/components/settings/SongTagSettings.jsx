import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Edit2, Trash2, Plus, Tag } from 'lucide-react';
import { useLanguage } from '../../useLanguage';
import { buildTagTree, getChildTagIds, getParentOptions, sanitizeParentId } from '../../utils/songTags';


const SongTagSettings = () => {
    const { t } = useLanguage();
    const [tags, setTags] = useState([]);

    const [showForm, setShowForm] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6', parentId: '' });
    const isMountedRef = useRef(false);

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
        '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'
    ];

    const loadTagsData = useCallback(async () => {
        const querySnapshot = await getDocs(collection(db, 'song_tags'));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, []);

    const loadTags = useCallback(async (applyTags) => {
        try {
            const tagsData = await loadTagsData();
            applyTags(tagsData);
        } catch (err) {
            console.error("Error fetching tags:", err);
        }
    }, [loadTagsData]);

    const fetchTags = useCallback(() => loadTags((tagsData) => {
        if (isMountedRef.current) {
            setTags(tagsData);
        }
    }), [loadTags]);

    useEffect(() => {
        isMountedRef.current = true;
        loadTags((tagsData) => {
            if (isMountedRef.current) {
                setTags(tagsData);
            }
        });
        return () => {
            isMountedRef.current = false;
        };
    }, [loadTags]);

    const handleAddTag = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'song_tags'), {
                name: newTag.name,
                color: newTag.color,
                parentId: sanitizeParentId(tags, null, newTag.parentId),
            });
            setNewTag({ name: '', color: '#3b82f6', parentId: '' });
            setShowForm(false);
            fetchTags();
        } catch (err) {
            console.error("Error adding tag:", err);
        }
    };

    const handleDeleteTag = async (e, tagId) => {
        e.stopPropagation();
        const childIds = getChildTagIds(tags, tagId);
        const message = childIds.length > 0 ? t('confirmDeleteTagWithSubtags') : t('confirmDeleteTag');
        if (!window.confirm(message)) return;

        try {
            if (childIds.length > 0) {
                // Subcategories become top-level tags instead of being left pointing at a deleted parent.
                const batch = writeBatch(db);
                childIds.forEach((childId) => batch.update(doc(db, 'song_tags', childId), { parentId: null }));
                batch.delete(doc(db, 'song_tags', tagId));
                await batch.commit();
            } else {
                await deleteDoc(doc(db, 'song_tags', tagId));
            }
            fetchTags();
        } catch (err) {
            console.error("Error deleting tag:", err);
        }
    };

    const handleEditTag = (e, tag) => {
        e.stopPropagation();
        setEditingTag({ ...tag, parentId: tag.parentId || '' });
        setShowForm(false);
    };

    const handleUpdateTag = async (e) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, 'song_tags', editingTag.id), {
                name: editingTag.name,
                color: editingTag.color,
                parentId: sanitizeParentId(tags, editingTag.id, editingTag.parentId),
            });
            setEditingTag(null);
            fetchTags();
        } catch (err) {
            console.error("Error updating tag:", err);
        }
    };

    const parentOptions = getParentOptions(tags, editingTag ? editingTag.id : null);
    const tagTree = buildTagTree(tags);

    const renderTagRow = (tag, isChild = false) => (
        <div
            key={tag.id}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                ...(isChild ? styles.childRow : {}),
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: isChild ? '24px' : '32px',
                    height: isChild ? '24px' : '32px',
                    borderRadius: '8px',
                    backgroundColor: tag.color + '20', // 20% opacity
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: tag.color
                }}>
                    <Tag size={isChild ? 12 : 16} />
                </div>
                <span style={{ fontWeight: isChild ? '400' : '500', color: '#334155', fontSize: isChild ? '14px' : '16px' }}>{tag.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={(e) => handleEditTag(e, tag)} style={styles.iconBtn}>
                    <Edit2 size={16} />
                </button>
                <button onClick={(e) => handleDeleteTag(e, tag.id)} style={{ ...styles.iconBtn, color: '#ef4444' }}>
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '18px', margin: 0 }}>{t('songTagsTitle')}</h2>
                    <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>{t('songTagDescription')}</p>
                </div>

                {!showForm && !editingTag && (
                    <button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} />
                        {t('newTag')}
                    </button>
                )}

            </div>

            {/* Add / Edit Form */}
            {(showForm || editingTag) && (
                <div className="card" style={{ marginBottom: '24px', maxWidth: '500px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>
                        {editingTag ? t('editTag') : t('newTag')}
                    </h3>

                    <form onSubmit={editingTag ? handleUpdateTag : handleAddTag} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={styles.inputGroup}>
                            <label>{t('name')}</label>

                            <input
                                type="text"
                                value={editingTag ? editingTag.name : newTag.name}
                                onChange={e => editingTag ? setEditingTag({ ...editingTag, name: e.target.value }) : setNewTag({ ...newTag, name: e.target.value })}
                                placeholder={t('tagPlaceholder')}

                                required
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label>{t('color')}</label>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {colors.map(color => (
                                    <div
                                        key={color}
                                        onClick={() => editingTag ? setEditingTag({ ...editingTag, color }) : setNewTag({ ...newTag, color })}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: color,
                                            cursor: 'pointer',
                                            border: (editingTag ? editingTag.color : newTag.color) === color ? '2px solid #1e293b' : '2px solid transparent',
                                            boxShadow: (editingTag ? editingTag.color : newTag.color) === color ? '0 0 0 2px white' : 'none',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        {parentOptions.length > 0 && (
                            <div style={styles.inputGroup}>
                                <label>{t('parentTag')}</label>
                                <select
                                    value={editingTag ? editingTag.parentId : newTag.parentId}
                                    onChange={e => editingTag ? setEditingTag({ ...editingTag, parentId: e.target.value }) : setNewTag({ ...newTag, parentId: e.target.value })}
                                    style={styles.input}
                                >
                                    <option value="">{t('noParentTag')}</option>
                                    {parentOptions.map(option => (
                                        <option key={option.id} value={option.id}>{option.name}</option>
                                    ))}
                                </select>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t('parentTagHint')}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => { setShowForm(false); setEditingTag(null); }} style={styles.btnSecondary}>{t('cancel')}</button>
                            <button type="submit" className="btn-primary">
                                {editingTag ? t('update') : t('save')}
                            </button>
                        </div>

                    </form>
                </div>
            )}

            {/* Tags List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {tagTree.map(({ children, ...tag }) => (
                    <div key={tag.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {renderTagRow(tag)}
                        {children.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {children.map(child => renderTagRow(child, true))}
                            </div>
                        )}
                    </div>
                ))}
                {tags.length === 0 && !showForm && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>
                        {t('noTags')}
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' },
    btnSecondary: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', color: '#64748b', fontWeight: '500' },
    childRow: { marginLeft: '16px', paddingLeft: '12px', borderLeft: '2px solid #e2e8f0' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', borderRadius: '4px', transition: 'background 0.2s', display: 'flex', alignItems: 'center' },
};

export default SongTagSettings;
