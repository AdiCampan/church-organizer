import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Edit2, Trash2, Plus, Tag } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';


const SongTagSettings = () => {
    const { t } = useLanguage();
    const [tags, setTags] = useState([]);

    const [showForm, setShowForm] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6' });

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
        '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'
    ];

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'song_tags'));
            setTags(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error("Error fetching tags:", err);
        }
    };

    const handleAddTag = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'song_tags'), newTag);
            setNewTag({ name: '', color: '#3b82f6' });
            setShowForm(false);
            fetchTags();
        } catch (err) {
            console.error("Error adding tag:", err);
        }
    };

    const handleDeleteTag = async (e, tagId) => {
        e.stopPropagation();
        if (!window.confirm(t('confirmDeleteTag'))) return;

        try {
            await deleteDoc(doc(db, 'song_tags', tagId));
            fetchTags();
        } catch (err) {
            console.error("Error deleting tag:", err);
        }
    };

    const handleEditTag = (e, tag) => {
        e.stopPropagation();
        setEditingTag(tag);
        setShowForm(false);
    };

    const handleUpdateTag = async (e) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, 'song_tags', editingTag.id), {
                name: editingTag.name,
                color: editingTag.color
            });
            setEditingTag(null);
            fetchTags();
        } catch (err) {
            console.error("Error updating tag:", err);
        }
    };

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
                {tags.map(tag => (
                    <div key={tag.id} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                backgroundColor: tag.color + '20', // 20% opacity
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: tag.color
                            }}>
                                <Tag size={16} />
                            </div>
                            <span style={{ fontWeight: '500', color: '#334155' }}>{tag.name}</span>
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
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', borderRadius: '4px', transition: 'background 0.2s', display: 'flex', alignItems: 'center' },
};

export default SongTagSettings;
