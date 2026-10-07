import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, limit, startAfter } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Music, Plus, Search, FileText, Play, Trash2, X, Pencil, Youtube, Star } from 'lucide-react';
import { useLanguage } from '../useLanguage';
import SongPreviewModal from '../components/SongPreviewModal';
import { loadSongUsageMap } from '../services/loadSongUsage';
import {
    buildSongSavePayload,
    createEmptyArrangement,
    ensureSongArrangements,
    getDefaultArrangement,
    setDefaultArrangement,
} from '../utils/songArrangements';
import {
    formatSongUsageDate,
    getSongUsage,
    needsFullSongCatalog,
    songMatchesUsageFilter,
} from '../utils/songUsage';

const Songs = () => {
    const { t, language } = useLanguage();

    const createDefaultFormData = () => ({
        title: '',
        artist: '',
        lyrics: '',
        duration: '',
        spotifyUrl: '',
        tags: [],
        arrangements: [
            createEmptyArrangement({
                name: t('defaultArrangementName'),
                isDefault: true,
            }),
        ],
    });

    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [previewSong, setPreviewSong] = useState(null);
    const [isEditing, setIsEditing] = useState(null);
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTagFilters, setSelectedTagFilters] = useState([]);
    const [usageFilter, setUsageFilter] = useState('all');
    const [usageBySongId, setUsageBySongId] = useState({});
    const [formData, setFormData] = useState(createDefaultFormData);
    const [activeArrangementId, setActiveArrangementId] = useState('');
    const [arrangementFiles, setArrangementFiles] = useState({});
    const [uploadProgress, setUploadProgress] = useState({});
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const activeArrangement = formData.arrangements.find((item) => item.id === activeArrangementId)
        || formData.arrangements[0]
        || null;

    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            try {
                const [songsSnapshot, tagsSnapshot, usageMap] = await Promise.all([
                    getDocs(query(collection(db, 'songs'), orderBy('title', 'asc'), limit(20))),
                    getDocs(collection(db, 'song_tags')),
                    loadSongUsageMap().catch((usageError) => {
                        console.error('Error fetching song usage:', usageError);
                        return {};
                    }),
                ]);

                if (!isMounted) return;

                const songsData = songsSnapshot.docs.map((songDoc) => {
                    const data = songDoc.data();
                    return { ...data, id: songDoc.id };
                });

                setSongs(songsData);
                setLastDoc(songsSnapshot.docs[songsSnapshot.docs.length - 1]);
                setHasMore(songsSnapshot.docs.length === 20);
                setAvailableTags(tagsSnapshot.docs.map((tagDoc) => ({ id: tagDoc.id, ...tagDoc.data() })));
                setUsageBySongId(usageMap);
            } catch (err) {
                console.error('Error fetching songs page data:', err);
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
            const songsData = snapshot.docs.map((songDoc) => {
                const data = songDoc.data();
                return { ...data, id: songDoc.id };
            });

            if (isLoadMore) {
                setSongs((prev) => [...prev, ...songsData]);
            } else {
                setSongs(songsData);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(!loadAll && snapshot.docs.length === 20);
        } catch (err) {
            console.error('Error fetching songs:', err);
        } finally {
            setLoading(false);
        }
    };

    const normalizeText = (text) => {
        return text
            ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
            : '';
    };

    const resetModalState = () => {
        const nextForm = createDefaultFormData();
        setFormData(nextForm);
        setActiveArrangementId(nextForm.arrangements[0].id);
        setArrangementFiles({});
        setUploadProgress({});
        setIsEditing(null);
    };

    const handleSearch = async (e) => {
        const term = e.target.value;
        setSearchTerm(term);

        if (term.length === 0) {
            fetchSongs(false, needsFullSongCatalog({
                searchTerm: term,
                tagFilters: selectedTagFilters,
                usageFilter,
            }));
            return;
        }
        if (term.length < 2) return;

        fetchSongs(false, true);
    };

    const openEditSong = (song) => {
        const arrangements = ensureSongArrangements(song, { defaultName: t('defaultArrangementName') });
        const nextForm = {
            title: song.title || '',
            artist: song.artist || '',
            lyrics: song.lyrics || '',
            duration: song.duration || '',
            spotifyUrl: song.spotifyUrl || '',
            tags: song.tags || [],
            arrangements,
        };
        setIsEditing(song);
        setFormData(nextForm);
        setActiveArrangementId(getDefaultArrangement(nextForm).id);
        setArrangementFiles({});
        setUploadProgress({});
        setShowAddModal(true);
    };

    const openNewSong = () => {
        resetModalState();
        setShowAddModal(true);
    };

    const toggleTagFilter = (tagId) => {
        const nextFilters = selectedTagFilters.includes(tagId)
            ? selectedTagFilters.filter((id) => id !== tagId)
            : [...selectedTagFilters, tagId];

        setSelectedTagFilters(nextFilters);
        fetchSongs(false, needsFullSongCatalog({
            searchTerm,
            tagFilters: nextFilters,
            usageFilter,
        }));
    };

    const handleUsageFilter = (event) => {
        const nextFilter = event.target.value;
        setUsageFilter(nextFilter);
        fetchSongs(false, needsFullSongCatalog({
            searchTerm,
            tagFilters: selectedTagFilters,
            usageFilter: nextFilter,
        }));
    };

    const filteredSongs = songs.filter((song) => {
        const normalizedTerm = normalizeText(searchTerm.trim());
        const matchesSearch = !normalizedTerm
            || normalizeText(song.title).includes(normalizedTerm)
            || normalizeText(song.artist).includes(normalizedTerm);
        const matchesTags = selectedTagFilters.length === 0
            || selectedTagFilters.some((tagId) => song.tags?.includes(tagId));

        return matchesSearch && matchesTags && songMatchesUsageFilter(getSongUsage(usageBySongId, song.id), usageFilter);
    });

    const updateActiveArrangement = (patch) => {
        if (!activeArrangement) return;

        setFormData((prev) => ({
            ...prev,
            arrangements: prev.arrangements.map((arrangement) => (
                arrangement.id === activeArrangement.id
                    ? { ...arrangement, ...patch }
                    : arrangement
            )),
        }));
    };

    const addArrangement = () => {
        const nextArrangement = createEmptyArrangement({
            name: `${t('arrangement')} ${formData.arrangements.length + 1}`,
            isDefault: false,
        });

        setFormData((prev) => ({
            ...prev,
            arrangements: [...prev.arrangements, nextArrangement],
        }));
        setActiveArrangementId(nextArrangement.id);
    };

    const removeActiveArrangement = () => {
        if (!activeArrangement || formData.arrangements.length <= 1) return;

        const remaining = formData.arrangements.filter((item) => item.id !== activeArrangement.id);
        const nextArrangements = activeArrangement.isDefault
            ? setDefaultArrangement(remaining, remaining[0].id)
            : remaining;

        setFormData((prev) => ({
            ...prev,
            arrangements: nextArrangements,
        }));
        setActiveArrangementId(nextArrangements[0].id);
        setArrangementFiles((prev) => {
            const next = { ...prev };
            delete next[activeArrangement.id];
            return next;
        });
    };

    const markActiveAsDefault = () => {
        if (!activeArrangement) return;
        setFormData((prev) => ({
            ...prev,
            arrangements: setDefaultArrangement(prev.arrangements, activeArrangement.id),
        }));
    };

    const uploadFile = async (file, path, progressKey) => {
        if (!file) return null;
        return new Promise((resolve, reject) => {
            const fileRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(fileRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress((prev) => ({ ...prev, [progressKey]: progress }));
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
            const arrangementsWithUploads = [];

            for (const arrangement of formData.arrangements) {
                const files = arrangementFiles[arrangement.id] || {};
                let pdfUrl = arrangement.pdfUrl || null;
                let mp3Url = arrangement.mp3Url || null;

                if (files.pdf) {
                    pdfUrl = await uploadFile(
                        files.pdf,
                        `songs/${formData.title}_${arrangement.id}_chords_${Date.now()}`,
                        `${arrangement.id}_pdf`
                    );
                }
                if (files.mp3) {
                    mp3Url = await uploadFile(
                        files.mp3,
                        `songs/${formData.title}_${arrangement.id}_audio_${Date.now()}`,
                        `${arrangement.id}_mp3`
                    );
                }

                arrangementsWithUploads.push({
                    ...arrangement,
                    pdfUrl,
                    mp3Url,
                });
            }

            const songData = {
                ...buildSongSavePayload({
                    ...formData,
                    arrangements: arrangementsWithUploads,
                }, { defaultName: t('defaultArrangementName') }),
                updatedAt: new Date(),
            };

            if (isEditing) {
                await updateDoc(doc(db, 'songs', isEditing.id), songData);
            } else {
                await addDoc(collection(db, 'songs'), {
                    ...songData,
                    createdAt: new Date(),
                });
            }

            setShowAddModal(false);
            resetModalState();
            fetchSongs();
        } catch (err) {
            console.error('Error saving song:', err);
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

    const getSongDisplayMeta = (song) => {
        const arrangement = getDefaultArrangement(song, { defaultName: t('defaultArrangementName') });
        const arrangementCount = ensureSongArrangements(song).length;
        return { arrangement, arrangementCount };
    };

    const activeFiles = activeArrangement ? (arrangementFiles[activeArrangement.id] || {}) : {};
    const activePdfProgress = activeArrangement ? (uploadProgress[`${activeArrangement.id}_pdf`] || 0) : 0;
    const activeMp3Progress = activeArrangement ? (uploadProgress[`${activeArrangement.id}_mp3`] || 0) : 0;

    return (
        <div className="page">
            <div style={styles.header}>
                <div>
                    <h1>{t('repertoire')}</h1>
                    <p style={{ color: '#64748b' }}>{t('songsDescription')}</p>
                </div>
                <button className="btn-primary" onClick={openNewSong} style={styles.addBtn}>
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
                        {availableTags.map((tag) => (
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
                            <button onClick={() => { setSelectedTagFilters([]); fetchSongs(false, needsFullSongCatalog({ searchTerm, usageFilter })); }} style={styles.clearFilterBtn}>
                                {t('showAll')}
                            </button>
                        )}
                    </div>
                )}
                <label style={styles.usageFilterRow}>
                    <span>{t('usageFilter')}</span>
                    <select value={usageFilter} onChange={handleUsageFilter} style={styles.usageSelect}>
                        <option value="all">{t('usageFilterAll')}</option>
                        <option value="month">{t('usageFilterMonth')}</option>
                        <option value="quarter">{t('usageFilterQuarter')}</option>
                        <option value="year">{t('usageFilterYear')}</option>
                        <option value="unused">{t('usageFilterUnused')}</option>
                    </select>
                </label>
            </div>

            <div style={styles.songsGrid}>
                {filteredSongs.map((song) => {
                    const { arrangement, arrangementCount } = getSongDisplayMeta(song);
                    const usage = getSongUsage(usageBySongId, song.id);
                    const visibleUses = usage.uses.slice(0, 3);
                    const hiddenUseCount = usage.uses.length - visibleUses.length;
                    const usedOnLabel = visibleUses
                        .map((use) => formatSongUsageDate(use.date, language))
                        .join(' · ');
                    return (
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
                                    <button
                                        type="button"
                                        onClick={() => setPreviewSong(song)}
                                        style={styles.titleButton}
                                        title={t('viewSong')}
                                    >
                                        {song.title}
                                    </button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                            {song.artist && `${song.artist} • `}{arrangement.key}
                                            {arrangement.bpm && ` • BPM: ${arrangement.bpm}`}
                                            {arrangement.meter && ` • ${arrangement.meter}`}
                                            {song.duration && ` • ⏱ ${song.duration} min`}
                                            {arrangementCount > 1 && ` • ${arrangementCount} ${t('arrangements').toLowerCase()}`}
                                        </p>
                                        {song.tags?.length > 0 && (
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {song.tags.map((tagId) => {
                                                    const tag = availableTags.find((item) => item.id === tagId);
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
                                            {arrangement.pdfUrl && (
                                                <a href={arrangement.pdfUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={styles.miniLink} title={t('chords')}>
                                                    <FileText size={12} />
                                                </a>
                                            )}
                                            {arrangement.mp3Url && (
                                                <a href={arrangement.mp3Url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={styles.miniLink} title={t('audio')}>
                                                    <Play size={12} />
                                                </a>
                                            )}
                                            {arrangement.youtubeUrl && (
                                                <a href={arrangement.youtubeUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={styles.miniLink} title="YouTube">
                                                    <Youtube size={12} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div style={styles.usageBlock}>
                                        <div style={styles.usageCounts}>
                                            <span style={styles.usageChip}>{t('sungLastMonth')}: {usage.month}</span>
                                            <span style={styles.usageChip}>{t('sungLastQuarter')}: {usage.quarter}</span>
                                            <span style={styles.usageChip}>{t('sungLastYear')}: {usage.year}</span>
                                        </div>
                                        <p style={styles.usageDates}>
                                            {usage.uses.length === 0
                                                ? t('notUsedInLastYear')
                                                : `${t('lastUsed')}: ${usedOnLabel}${hiddenUseCount > 0 ? ` +${hiddenUseCount}` : ''}`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openEditSong(song);
                                    }}
                                    style={{ ...styles.iconBtn, color: '#64748b' }}
                                    aria-label={t('edit')}
                                    title={t('edit')}
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(song.id); }}
                                    style={{ ...styles.iconBtn, color: '#ced4da' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#ced4da'; }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredSongs.length === 0 && !loading && (
                <p style={{ color: '#64748b', marginTop: '8px' }}>{t('noSongsFound')}</p>
            )}

            {hasMore && !needsFullSongCatalog({ searchTerm, tagFilters: selectedTagFilters, usageFilter }) && (
                <div style={{ textAlign: 'center', marginTop: '32px' }}>
                    <button className="btn-secondary" onClick={() => fetchSongs(true)} disabled={loading}>
                        {loading ? t('loading') : t('loadMore')}
                    </button>
                </div>
            )}

            {showAddModal && activeArrangement && (
                <div style={styles.modalOverlay}>
                    <div className="card" style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2>{isEditing ? t('editSong') : t('newSong')}</h2>
                            <button onClick={() => {
                                setShowAddModal(false);
                                resetModalState();
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
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label>{t('artist')}</label>
                                    <input
                                        type="text"
                                        value={formData.artist}
                                        onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={styles.inputGroup}>
                                <label>{t('durationMin')}</label>
                                <input
                                    type="number"
                                    placeholder={t('durationPlaceholder')}
                                    min="0"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    style={{ ...styles.input, width: '120px' }}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label>{t('lyrics')}</label>
                                <textarea
                                    value={formData.lyrics}
                                    onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                                    style={{ ...styles.input, minHeight: '120px' }}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label>{t('tags')}</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {availableTags.map((tag) => (
                                        <button
                                            type="button"
                                            key={tag.id}
                                            onClick={() => {
                                                const currentTags = formData.tags || [];
                                                const newTags = currentTags.includes(tag.id)
                                                    ? currentTags.filter((id) => id !== tag.id)
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
                                <span style={styles.dividerText}>{t('arrangements')}</span>
                            </div>

                            <div style={styles.arrangementTabs}>
                                {formData.arrangements.map((arrangement) => (
                                    <button
                                        key={arrangement.id}
                                        type="button"
                                        onClick={() => setActiveArrangementId(arrangement.id)}
                                        style={{
                                            ...styles.arrangementTab,
                                            ...(arrangement.id === activeArrangement.id ? styles.arrangementTabActive : {}),
                                        }}
                                    >
                                        {arrangement.isDefault && <Star size={12} />}
                                        <span>{arrangement.name || t('arrangement')}</span>
                                    </button>
                                ))}
                                <button type="button" onClick={addArrangement} style={styles.addArrangementBtn}>
                                    <Plus size={14} /> {t('addArrangement')}
                                </button>
                            </div>

                            <div style={styles.arrangementPanel}>
                                <div style={styles.formRow}>
                                    <div style={styles.inputGroup}>
                                        <label>{t('arrangementName')}</label>
                                        <input
                                            type="text"
                                            value={activeArrangement.name}
                                            onChange={(e) => updateActiveArrangement({ name: e.target.value })}
                                            style={styles.input}
                                            required
                                        />
                                    </div>
                                    <div style={styles.inputGroup}>
                                        <label>{t('key')}</label>
                                        <input
                                            type="text"
                                            value={activeArrangement.key}
                                            onChange={(e) => updateActiveArrangement({ key: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <div style={styles.formRow}>
                                    <div style={styles.inputGroup}>
                                        <label>{t('bpm')}</label>
                                        <input
                                            type="text"
                                            placeholder="120"
                                            value={activeArrangement.bpm}
                                            onChange={(e) => updateActiveArrangement({ bpm: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.inputGroup}>
                                        <label>{t('meter')}</label>
                                        <input
                                            type="text"
                                            placeholder="4/4"
                                            value={activeArrangement.meter}
                                            onChange={(e) => updateActiveArrangement({ meter: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <div style={styles.inputGroup}>
                                    <label>YouTube URL</label>
                                    <input
                                        type="url"
                                        value={activeArrangement.youtubeUrl}
                                        onChange={(e) => updateActiveArrangement({ youtubeUrl: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.uploadGrid}>
                                    <div style={styles.fileBox}>
                                        <label style={styles.fileLabel}>
                                            <FileText size={20} />
                                            <span>{t('pdfChords')}</span>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={(e) => setArrangementFiles((prev) => ({
                                                    ...prev,
                                                    [activeArrangement.id]: {
                                                        ...prev[activeArrangement.id],
                                                        pdf: e.target.files[0],
                                                    },
                                                }))}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                        {activeFiles.pdf && <span style={styles.fileName}>{activeFiles.pdf.name}</span>}
                                        {activePdfProgress > 0 && (
                                            <div style={styles.progress}>
                                                <div style={{ ...styles.progressFill, width: `${activePdfProgress}%` }} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={styles.fileBox}>
                                        <label style={styles.fileLabel}>
                                            <Play size={20} />
                                            <span>{t('audioMp3')}</span>
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                onChange={(e) => setArrangementFiles((prev) => ({
                                                    ...prev,
                                                    [activeArrangement.id]: {
                                                        ...prev[activeArrangement.id],
                                                        mp3: e.target.files[0],
                                                    },
                                                }))}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                        {activeFiles.mp3 && <span style={styles.fileName}>{activeFiles.mp3.name}</span>}
                                        {activeMp3Progress > 0 && (
                                            <div style={styles.progress}>
                                                <div style={{ ...styles.progressFill, width: `${activeMp3Progress}%` }} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={styles.inputGroup}>
                                    <label>{t('externalUrl')}</label>
                                    <div style={styles.formRow}>
                                        <input
                                            type="text"
                                            placeholder="PDF URL"
                                            value={activeArrangement.pdfUrl || ''}
                                            onChange={(e) => updateActiveArrangement({ pdfUrl: e.target.value })}
                                            style={styles.input}
                                        />
                                        <input
                                            type="text"
                                            placeholder="MP3 URL"
                                            value={activeArrangement.mp3Url || ''}
                                            onChange={(e) => updateActiveArrangement({ mp3Url: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <div style={styles.arrangementActions}>
                                    <button
                                        type="button"
                                        onClick={markActiveAsDefault}
                                        disabled={activeArrangement.isDefault}
                                        style={styles.secondaryActionBtn}
                                    >
                                        <Star size={14} />
                                        {activeArrangement.isDefault ? t('defaultArrangement') : t('setDefaultArrangement')}
                                    </button>
                                    {formData.arrangements.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={removeActiveArrangement}
                                            style={styles.dangerActionBtn}
                                        >
                                            <Trash2 size={14} />
                                            {t('removeArrangement')}
                                        </button>
                                    )}
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
                    usage={getSongUsage(usageBySongId, previewSong.id)}
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
    searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '14px' },
    tagFilters: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    tagFilterBtn: { padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s' },
    clearFilterBtn: { background: 'none', border: 'none', color: '#007bff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '6px' },
    songsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' },
    songCard: { padding: '12px 16px', transition: 'all 0.2s' },
    titleButton: { margin: 0, padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '15px', fontWeight: '700', color: 'inherit', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    usageFilterRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: '#64748b' },
    usageSelect: { padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#334155' },
    usageBlock: { marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' },
    usageCounts: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
    usageChip: { fontSize: '11px', fontWeight: '600', color: '#334155', backgroundColor: '#f1f5f9', borderRadius: '999px', padding: '2px 8px' },
    usageDates: { margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 },
    songMain: { display: 'flex', alignItems: 'center', gap: '12px' },
    musicIcon: { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' },
    miniLink: { color: '#007bff', background: '#eff6ff', width: '22px', height: '22px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
    tagBadge: { padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' },
    tagSelectBtn: { padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s' },
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
    arrangementTabs: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
    arrangementTab: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        backgroundColor: 'white',
        color: '#64748b',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    arrangementTabActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#007bff',
        color: '#007bff',
    },
    addArrangementBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px dashed #cbd5e1',
        backgroundColor: 'transparent',
        color: '#007bff',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    arrangementPanel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
    },
    arrangementActions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
    },
    secondaryActionBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        backgroundColor: 'white',
        color: '#475569',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    dangerActionBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #fecaca',
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    uploadGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    fileBox: { border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '16px', alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'white' },
    fileLabel: { cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#007bff' },
    fileName: { fontSize: '12px', color: '#64748b', textAlign: 'center' },
    progress: { width: '100%', height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#007bff' },
    modalFooter: { marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }
};

export default Songs;
