import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, limit, startAfter } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Music, Plus, Search, FileText, Play, Trash2, X, Upload, Save, Pencil, ExternalLink, Youtube } from 'lucide-react';
import { useLanguage } from '../useLanguage';
import SongPreviewModal from '../components/SongPreviewModal';


const Songs = () => {
    const { t } = useLanguage();
    const defaultSongFormData = {
        title: '',
        artist: '',
        key: '',
        lyrics: '',
        youtubeUrl: '',
        spotifyUrl: '',
        pdfUrl: '',
        mp3Url: '',
        bpm: '',
        meter: '',
        tags: []
    };
    const [songs, setSongs] = useState([]);

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [previewSong, setPreviewSong] = useState(null);
    const [isEditing, setIsEditing] = useState(null);
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTagFilters, setSelectedTagFilters] = useState([]);
    const [formData, setFormData] = useState(defaultSongFormData);
    const [files, setFiles] = useState({
        pdf: null,
        mp3: null
    });
    const [uploadProgress, setUploadProgress] = useState({
        pdf: 0,
        mp3: 0
    });
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            try {
                const [songsSnapshot, tagsSnapshot] = await Promise.all([
                    getDocs(query(collection(db, 'songs'), orderBy('title', 'asc'), limit(20))),
                    getDocs(collection(db, 'song_tags'))
                ]);

                if (!isMounted) return;

                const songsData = songsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return { ...data, id: doc.id };
                });

                setSongs(songsData);
                setLastDoc(songsSnapshot.docs[songsSnapshot.docs.length - 1]);
                setHasMore(songsSnapshot.docs.length === 20);
                setAvailableTags(tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Error fetching songs page data:", err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadInitialData();
        return () => {
            isMounted = false;
        };
    }, []);

    const fetchSongs = async (isLoadMore = false, loadAll = false) => {
        setLoading(true);
        try {
            let q;
            if (loadAll) {
                q = query(collection(db, 'songs'), orderBy('title', 'asc'));
            } else if (isLoadMore && lastDoc) {
                q = query(collection(db, 'songs'), orderBy('title', 'asc'), startAfter(lastDoc), limit(20));
            } else {
                q = query(collection(db, 'songs'), orderBy('title', 'asc'), limit(20));
            }

            const snapshot = await getDocs(q);
            const songsData = snapshot.docs.map(doc => {
                const data = doc.data();
                // Ensure the document ID is the primary ID, even if a legacy "id" field exists in data
                return { ...data, id: doc.id };
            });

            if (isLoadMore) {
                setSongs(prev => [...prev, ...songsData]);
            } else {
                setSongs(songsData);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(!loadAll && snapshot.docs.length === 20);
        } catch (err) {
            console.error("Error fetching songs:", err);
        } finally {
            setLoading(false);
        }
    };

    const normalizeText = (text) => {
        return text
            ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            : "";
    };

    const handleSearch = async (e) => {
        const term = e.target.value;
        setSearchTerm(term);

        if (term.length === 0) {
            fetchSongs(false, selectedTagFilters.length > 0);
            return;
        }
        if (term.length < 2) return; // Prevent searching for single chars to save reads

        // Retrieve the catalog before local filtering so search is not limited to the current page.
        // Note: For very large databases, we should store a normalized "searchKey" field instead.
        fetchSongs(false, true);
    };

    const openEditSong = (song) => {
        setIsEditing(song);
        setFormData({ ...defaultSongFormData, ...song, tags: song.tags || [] });
        setShowAddModal(true);
    };

    const toggleTagFilter = (tagId) => {
        const nextFilters = selectedTagFilters.includes(tagId)
            ? selectedTagFilters.filter(id => id !== tagId)
            : [...selectedTagFilters, tagId];

        setSelectedTagFilters(nextFilters);
        fetchSongs(false, nextFilters.length > 0 || searchTerm.trim().length >= 2);
    };

    const filteredSongs = songs.filter(song => {
        const normalizedTerm = normalizeText(searchTerm.trim());
        const matchesSearch = !normalizedTerm ||
            normalizeText(song.title).includes(normalizedTerm) ||
            normalizeText(song.artist).includes(normalizedTerm);
        const matchesTags = selectedTagFilters.length === 0 ||
            selectedTagFilters.some(tagId => song.tags?.includes(tagId));

        return matchesSearch && matchesTags;
    });

    const uploadFile = async (file, path) => {
        if (!file) return null;
        return new Promise((resolve, reject) => {
            const fileRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(fileRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    const type = path.includes('chords') ? 'pdf' : 'mp3';
                    setUploadProgress(prev => ({ ...prev, [type]: progress }));
                },
                (error) => reject(error),
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                }
            );
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let pdfUrl = formData.pdfUrl || null;
            let mp3Url = formData.mp3Url || null;

            if (files.pdf) {
                pdfUrl = await uploadFile(files.pdf, `songs/${formData.title}_chords_${Date.now()}`);
            }
            if (files.mp3) {
                mp3Url = await uploadFile(files.mp3, `songs/${formData.title}_audio_${Date.now()}`);
            }

            const songData = {
                ...formData,
                pdfUrl,
                mp3Url,
                updatedAt: new Date()
            };

            if (isEditing) {
                // Remove the 'id' field from data before updating to avoid pollution
                const { id: _id, ...saveData } = songData;
                await updateDoc(doc(db, 'songs', isEditing.id), saveData);
            } else {
                // Ensure we don't accidentally include an 'id' from a previous edit
                const { id: _id, ...saveData } = songData;
                await addDoc(collection(db, 'songs'), {
                    ...saveData,
                    createdAt: new Date()
                });
            }

            setShowAddModal(false);
            setIsEditing(null);
            setFormData(defaultSongFormData);
            setFiles({ pdf: null, mp3: null });
            setUploadProgress({ pdf: 0, mp3: 0 });
            fetchSongs();
        } catch (err) {
            console.error("Error saving song:", err);
            alert(t('errorSavingSong'));
        } finally {

            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('confirmDeleteSong'))) return;

        try {
            await deleteDoc(doc(db, 'songs', id));
            fetchSongs();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="page">
            <div style={styles.header}>
                <div>
                    <h1>{t('repertoire')}</h1>
                    <p style={{ color: '#64748b' }}>{t('songsDescription')}</p>
                </div>
                    <button className="btn-primary" onClick={() => { setFormData(defaultSongFormData); setShowAddModal(true); }} style={styles.addBtn}>
                    <Plus size={18} /> {t('newSong')}
                </button>
            </div>

            <div style={styles.searchContainer}>
                <div style={styles.searchBox}>
                    <Search size={20} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder={t('searchByTitle')}
                        value={searchTerm}
                        onChange={handleSearch}
                        style={styles.searchInput}
                    />
                </div>
                {availableTags.length > 0 && (
                    <div style={styles.tagFilters}>
                        {availableTags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => toggleTagFilter(tag.id)}
                                style={{
                                    ...styles.tagFilterBtn,
                                    backgroundColor: selectedTagFilters.includes(tag.id) ? tag.color : 'white',
                                    color: selectedTagFilters.includes(tag.id) ? 'white' : '#64748b',
                                    borderColor: selectedTagFilters.includes(tag.id) ? tag.color : '#e2e8f0'
                                }}
                            >
                                {tag.name}
                            </button>
                        ))}
                        {selectedTagFilters.length > 0 && (
                            <button onClick={() => { setSelectedTagFilters([]); fetchSongs(false, searchTerm.trim().length >= 2); }} style={styles.clearFilterBtn}>
                                {t('showAll')}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div style={styles.songsGrid}>
                {filteredSongs.map(song => (
                    <div 
                        key={song.id} 
                        className="card" 
                        style={styles.songCard}
                    >
                        <div style={styles.songMain}>
                            <div style={styles.musicIcon}>
                                <Music size={20} color="#94a3b8" />
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                        {song.artist && `${song.artist} • `}{song.key} 
                                        {song.bpm && ` • BPM: ${song.bpm}`} 
                                        {song.meter && ` • ${song.meter}`}
                                    </p>
                                    {song.tags?.length > 0 && (
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {song.tags.map(tagId => {
                                                const tag = availableTags.find(t => t.id === tagId);
                                                if (!tag) return null;
                                                return (
                                                    <span key={tagId} style={{ ...styles.tagBadge, backgroundColor: tag.color + '15', color: tag.color }}>
                                                        {tag.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
                                        {song.pdfUrl && (
                                            <a href={song.pdfUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={styles.miniLink} title={t('chords')}>
                                                <FileText size={12} />
                                            </a>
                                        )}
                                        {song.mp3Url && (
                                            <a href={song.mp3Url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={styles.miniLink} title={t('audio')}>
                                                <Play size={12} />
                                            </a>
                                        )}
                                        {song.youtubeUrl && (
                                            <a href={song.youtubeUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={styles.miniLink} title="YouTube">
                                                <Youtube size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => openEditSong(song)}
                                style={{ ...styles.iconBtn, color: '#64748b' }}
                                title={t('edit')}
                            >
                                <Pencil size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDelete(song.id); }} 
                                style={{ ...styles.iconBtn, color: '#ced4da' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = '#ced4da'}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {hasMore && !searchTerm && selectedTagFilters.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: '32px' }}>
                    <button className="btn-secondary" onClick={() => fetchSongs(true)} disabled={loading}>
                        {loading ? t('loading') : t('loadMore')}
                    </button>
                </div>
            )}

            {showAddModal && (
                <div style={styles.modalOverlay}>
                    <div className="card" style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2>{isEditing ? t('editSong') : t('newSong')}</h2>
                            <button onClick={() => {
                                setShowAddModal(false);
                                setIsEditing(null);
                                setFormData(defaultSongFormData);
                                setFiles({ pdf: null, mp3: null });
                            }} style={styles.closeBtn}>

                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            <div style={styles.formRow}>
                                <div style={styles.inputGroup}>
                                    <label>{t('title')}</label>

                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        required
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label>{t('artist')}</label>

                                    <input
                                        type="text"
                                        value={formData.artist}
                                        onChange={e => setFormData({ ...formData, artist: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                             <div style={styles.formRow}>
                                <div style={styles.inputGroup}>
                                    <label>{t('key')}</label>
                                    <input type="text" value={formData.key} onChange={e => setFormData({ ...formData, key: e.target.value })} style={styles.input} />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label>YouTube URL</label>
                                    <input type="url" value={formData.youtubeUrl} onChange={e => setFormData({ ...formData, youtubeUrl: e.target.value })} style={styles.input} />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.inputGroup}>
                                    <label>{t('bpm')}</label>
                                    <input type="text" placeholder="120" value={formData.bpm} onChange={e => setFormData({ ...formData, bpm: e.target.value })} style={styles.input} />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label>{t('meter')}</label>
                                    <input type="text" placeholder="4/4" value={formData.meter} onChange={e => setFormData({ ...formData, meter: e.target.value })} style={styles.input} />
                                </div>
                            </div>

                             <div style={styles.inputGroup}>
                                <label>{t('lyrics')}</label>
                                <textarea
                                    value={formData.lyrics}
                                    onChange={e => setFormData({ ...formData, lyrics: e.target.value })}
                                    style={{ ...styles.input, minHeight: '120px' }}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label>{t('tags')}</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {availableTags.map(tag => (
                                        <button
                                            type="button"
                                            key={tag.id}
                                            onClick={() => {
                                                const currentTags = formData.tags || [];
                                                const newTags = currentTags.includes(tag.id)
                                                    ? currentTags.filter(id => id !== tag.id)
                                                    : [...currentTags, tag.id];
                                                setFormData({ ...formData, tags: newTags });
                                            }}
                                            style={{
                                                ...styles.tagSelectBtn,
                                                backgroundColor: formData.tags?.includes(tag.id) ? tag.color : 'white',
                                                color: formData.tags?.includes(tag.id) ? 'white' : '#64748b',
                                                borderColor: formData.tags?.includes(tag.id) ? tag.color : '#e2e8f0'
                                            }}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                    {availableTags.length === 0 && (
                                        <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>{t('noTags')}</p>
                                    )}
                                </div>
                            </div>

                            <div style={{ ...styles.sectionDivider, margin: '20px 0' }}>
                                <span style={styles.dividerText}>{t('files')}</span>
                            </div>

                            <div style={styles.uploadGrid}>
                                <div style={styles.fileBox}>
                                    <label style={styles.fileLabel}>
                                        <FileText size={20} />
                                        <span>{t('pdfChords')}</span>

                                        <input type="file" accept=".pdf" onChange={e => setFiles({ ...files, pdf: e.target.files[0] })} style={{ display: 'none' }} />
                                    </label>
                                    {files.pdf && <span style={styles.fileName}>{files.pdf.name}</span>}
                                    {uploadProgress.pdf > 0 && <div style={styles.progress}><div style={{ ...styles.progressFill, width: `${uploadProgress.pdf}%` }} /></div>}
                                </div>
                                <div style={styles.fileBox}>
                                    <label style={styles.fileLabel}>
                                        <Play size={20} />
                                        <span>{t('audioMp3')}</span>

                                        <input type="file" accept="audio/*" onChange={e => setFiles({ ...files, mp3: e.target.files[0] })} style={{ display: 'none' }} />
                                    </label>
                                    {files.mp3 && <span style={styles.fileName}>{files.mp3.name}</span>}
                                    {uploadProgress.mp3 > 0 && <div style={styles.progress}><div style={{ ...styles.progressFill, width: `${uploadProgress.mp3}%` }} /></div>}
                                </div>
                            </div>

                            <div style={styles.inputGroup}>
                                <label>{t('externalUrl')}</label>
                                <div style={styles.formRow}>
                                    <input type="text" placeholder="PDF URL" value={formData.pdfUrl} onChange={e => setFormData({ ...formData, pdfUrl: e.target.value })} style={styles.input} />
                                    <input type="text" placeholder="MP3 URL" value={formData.mp3Url} onChange={e => setFormData({ ...formData, mp3Url: e.target.value })} style={styles.input} />
                                </div>
                            </div>

                            <div style={styles.modalFooter}>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? t('uploading') : t('saveSong')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {previewSong && (
                <SongPreviewModal
                    song={previewSong}
                    onClose={() => setPreviewSong(null)}
                />
            )}
        </div>
    );
};

const styles = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
    addBtn: { display: 'flex', alignItems: 'center', gap: '8px' },
    searchContainer: { marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' },
    searchBox: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '500px' },
    tagFilters: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    tagFilterBtn: { padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s' },
    clearFilterBtn: { background: 'none', border: 'none', color: '#007bff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '6px' },
    songsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' },
    songCard: { padding: '12px 16px', transition: 'all 0.2s' },
    songMain: { display: 'flex', alignItems: 'center', gap: '12px' },
    musicIcon: { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
    actions: { display: 'none' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' },
    miniLink: { color: '#007bff', background: '#eff6ff', width: '22px', height: '22px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
    tagBadge: { padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' },
    tagSelectBtn: { padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s' },
    deleteBtn: { display: 'none' },

    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' },
    form: { display: 'flex', flexDirection: 'column', gap: '16px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    input: { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' },

    sectionDivider: { borderTop: '1px solid #f1f5f9', position: 'relative', textAlign: 'center' },
    dividerText: { position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '0 12px', fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },

    uploadGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    fileBox: { border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '16px', alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '8px' },
    fileLabel: { cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#007bff' },
    fileName: { fontSize: '12px', color: '#64748b', textAlign: 'center' },
    progress: { width: '100%', height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#007bff' },
    modalFooter: { marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }
};

export default Songs;
