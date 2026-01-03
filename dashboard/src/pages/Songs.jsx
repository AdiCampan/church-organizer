import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc, limit, startAfter } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Music, Plus, Search, FileText, Play, Trash2, X, Upload, Save, MoreVertical, ExternalLink } from 'lucide-react';
import { useLanguage } from '../LanguageContext';


const Songs = () => {
    const { t } = useLanguage();
    const [songs, setSongs] = useState([]);

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        artist: '',
        key: '',
        lyrics: '',
        youtubeUrl: '',
        spotifyUrl: '',
        pdfUrl: '',
        mp3Url: ''
    });
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
        fetchSongs();
    }, []);

    const fetchSongs = async (isLoadMore = false) => {
        setLoading(true);
        try {
            let q;
            if (isLoadMore && lastDoc) {
                q = query(collection(db, 'songs'), orderBy('title', 'asc'), startAfter(lastDoc), limit(20));
            } else {
                q = query(collection(db, 'songs'), orderBy('title', 'asc'), limit(20));
            }

            const snapshot = await getDocs(q);
            const songsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (isLoadMore) {
                setSongs(prev => [...prev, ...songsData]);
            } else {
                setSongs(songsData);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === 20);
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
            fetchSongs();
            return;
        }
        if (term.length < 2) return; // Prevent searching for single chars to save reads

        // Retrieve more songs to filter client-side for better ux (case/accent insensitive)
        // Note: For very large databases, we should store a normalized "searchKey" field instead.
        const q = query(
            collection(db, 'songs'),
            orderBy('title', 'asc'),
            limit(100) // Limit to 100 for safety, or increase if catalog is larger
        );

        try {
            const snapshot = await getDocs(q);
            const allFetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const normalizedTerm = normalizeText(term);
            const filtered = allFetched.filter(song =>
                normalizeText(song.title).includes(normalizedTerm) ||
                normalizeText(song.artist).includes(normalizedTerm)
            );

            setSongs(filtered);
            setHasMore(false);
        } catch (error) {
            console.error("Search error:", error);
        }
    };

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
                await updateDoc(doc(db, 'songs', isEditing.id), songData);
            } else {
                await addDoc(collection(db, 'songs'), {
                    ...songData,
                    createdAt: new Date()
                });
            }

            setShowAddModal(false);
            setIsEditing(null);
            setFormData({ title: '', artist: '', key: '', lyrics: '', youtubeUrl: '', spotifyUrl: '', pdfUrl: '', mp3Url: '' });
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
                <button className="btn-primary" onClick={() => setShowAddModal(true)} style={styles.addBtn}>
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
            </div>

            <div style={styles.songsGrid}>
                {songs.map(song => (
                    <div key={song.id} className="card" style={styles.songCard}>
                        <div style={styles.songMain}>
                            <div style={styles.musicIcon}>
                                <Music size={24} color="#007bff" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>{song.title}</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>{song.artist} • {t('key')}: {song.key}</p>
                            </div>
                            <div style={styles.actions}>
                                <button style={styles.iconBtn} onClick={() => { setIsEditing(song); setFormData(song); setShowAddModal(true); }}>
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                        </div>
                        <div style={styles.songFooter}>
                            <div style={styles.attachments}>
                                {song.pdfUrl && (
                                    <a href={song.pdfUrl} target="_blank" rel="noreferrer" style={styles.attachmentLink}>
                                        <FileText size={14} /> {t('chords')}
                                    </a>
                                )}
                                {song.mp3Url && (
                                    <a href={song.mp3Url} target="_blank" rel="noreferrer" style={styles.attachmentLink}>
                                        <Play size={14} /> {t('audio')}
                                    </a>
                                )}
                            </div>
                            <button onClick={() => handleDelete(song.id)} style={styles.deleteBtn}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {hasMore && !searchTerm && (
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
                            <button onClick={() => { setShowAddModal(false); setIsEditing(null); }} style={styles.closeBtn}>

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

                            <div style={styles.inputGroup}>
                                <label>{t('lyrics')}</label>
                                <textarea
                                    value={formData.lyrics}
                                    onChange={e => setFormData({ ...formData, lyrics: e.target.value })}
                                    style={{ ...styles.input, minHeight: '120px' }}
                                />
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
        </div>
    );
};

const styles = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
    addBtn: { display: 'flex', alignItems: 'center', gap: '8px' },
    searchContainer: { marginBottom: '32px' },
    searchBox: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '500px' },
    searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '16px' },
    songsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
    songCard: { padding: '20px' },
    songMain: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' },
    musicIcon: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    actions: { alignSelf: 'flex-start' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' },
    songFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' },
    attachments: { display: 'flex', gap: '8px' },
    attachmentLink: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#007bff', backgroundColor: '#eff6ff', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' },
    deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' },

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
