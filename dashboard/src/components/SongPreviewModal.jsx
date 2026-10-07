import React, { useState } from 'react';
import { X, FileText, Play, Youtube, ExternalLink } from 'lucide-react';
import { useLanguage } from '../useLanguage';
import {
    ensureSongArrangements,
    resolveSongWithArrangement,
} from '../utils/songArrangements';
import { formatSongUsageDate } from '../utils/songUsage';

const getInitialArrangementId = (song, arrangementId, defaultName) => {
    const arrangements = ensureSongArrangements(song, { defaultName });
    if (arrangementId && arrangements.some((item) => item.id === arrangementId)) {
        return arrangementId;
    }
    return arrangements.find((item) => item.isDefault)?.id || arrangements[0]?.id || '';
};

const SongPreviewModal = ({ song, arrangementId = null, usage = null, usageUnavailable = false, onClose }) => {
    const { t, language } = useLanguage();
    const arrangements = ensureSongArrangements(song, { defaultName: t('defaultArrangementName') });
    const fallbackArrangementId = getInitialArrangementId(song, arrangementId, t('defaultArrangementName'));
    const [selectedArrangementId, setSelectedArrangementId] = useState(fallbackArrangementId);

    if (!song) return null;

    const activeArrangementId = arrangements.some((item) => item.id === selectedArrangementId)
        ? selectedArrangementId
        : fallbackArrangementId;

    const resolved = resolveSongWithArrangement(song, activeArrangementId, {
        defaultName: t('defaultArrangementName'),
    });

    if (!resolved) return null;

    return (
        <div style={styles.modalOverlay}>
            <div className="card" style={styles.modal}>
                <div style={styles.modalHeader}>
                    <div>
                        <h2 style={{ margin: 0 }}>{resolved.title}</h2>
                        <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                            {resolved.artist}
                            {resolved.key ? ` • ${t('key')}: ${resolved.key}` : ''}
                            {resolved.arrangement?.name ? ` • ${resolved.arrangement.name}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} style={styles.closeBtn}>
                        <X size={24} />
                    </button>
                </div>

                {(usageUnavailable || usage) && (
                    <div style={styles.usageSection}>
                        <h3 style={styles.sectionTitle}>{t('usageTitle')}</h3>
                        {usageUnavailable ? (
                            <p style={styles.emptyUsage}>{t('usageUnavailable')}</p>
                        ) : (
                            <>
                                <div style={styles.usageCounts}>
                                    <span style={styles.usageChip}>{t('sungLastMonth')}: {usage.month}</span>
                                    <span style={styles.usageChip}>{t('sungLastQuarter')}: {usage.quarter}</span>
                                    <span style={styles.usageChip}>{t('sungLastYear')}: {usage.year}</span>
                                </div>
                                {usage.uses.length === 0 ? (
                                    <p style={styles.emptyUsage}>{t('notUsedInLastYear')}</p>
                                ) : (
                                    <ul style={styles.usageList}>
                                        {usage.uses.map((use, index) => (
                                            <li key={`${use.eventId}-${use.date.getTime()}-${index}`} style={styles.usageItem}>
                                                <span>{formatSongUsageDate(use.date, language)}</span>
                                                {use.title ? <span style={styles.usageEvent}>{use.title}</span> : null}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </>
                        )}
                    </div>
                )}

                {arrangements.length > 1 && (
                    <div style={styles.arrangementPicker}>
                        <label style={styles.arrangementLabel}>{t('arrangement')}</label>
                        <select
                            value={activeArrangementId}
                            onChange={(event) => setSelectedArrangementId(event.target.value)}
                            style={styles.select}
                        >
                            {arrangements.map((arrangement) => (
                                <option key={arrangement.id} value={arrangement.id}>
                                    {arrangement.name || t('arrangement')}
                                    {arrangement.isDefault ? ` (${t('defaultArrangement')})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={styles.modalBody}>
                    <div style={styles.lyricsSection}>
                        <h3 style={styles.sectionTitle}>{t('lyrics')}</h3>
                        <div style={styles.lyricsContainer}>
                            {resolved.lyrics ? (
                                <pre style={styles.lyricsText}>{resolved.lyrics}</pre>
                            ) : (
                                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>{t('noLyricsAvailable')}</p>
                            )}
                        </div>
                    </div>

                    <div style={styles.infoSection}>
                        <h3 style={styles.sectionTitle}>{t('files')} & Links</h3>
                        <div style={styles.linksGrid}>
                            {resolved.pdfUrl && (
                                <a href={resolved.pdfUrl} target="_blank" rel="noreferrer" style={styles.linkCard}>
                                    <FileText size={20} color="#007bff" />
                                    <span>{t('chords')} (PDF)</span>
                                </a>
                            )}
                            {resolved.mp3Url && (
                                <a href={resolved.mp3Url} target="_blank" rel="noreferrer" style={styles.linkCard}>
                                    <Play size={20} color="#007bff" />
                                    <span>{t('audio')} (MP3)</span>
                                </a>
                            )}
                            {resolved.youtubeUrl && (
                                <a href={resolved.youtubeUrl} target="_blank" rel="noreferrer" style={styles.linkCard}>
                                    <Youtube size={20} color="#ef4444" />
                                    <span>YouTube</span>
                                </a>
                            )}
                            {resolved.spotifyUrl && (
                                <a href={resolved.spotifyUrl} target="_blank" rel="noreferrer" style={styles.linkCard}>
                                    <ExternalLink size={20} color="#1db954" />
                                    <span>Spotify</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px'
    },
    modal: {
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px',
        backgroundColor: 'white',
        borderRadius: '16px'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '16px'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#64748b'
    },
    arrangementPicker: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '16px',
    },
    arrangementLabel: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
    },
    select: {
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '13px',
        outline: 'none',
        backgroundColor: 'white',
    },
    usageSection: {
        marginBottom: '20px',
    },
    usageCounts: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '12px',
    },
    usageChip: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#334155',
        backgroundColor: '#f1f5f9',
        borderRadius: '999px',
        padding: '4px 10px',
    },
    emptyUsage: {
        margin: 0,
        color: '#94a3b8',
        fontSize: '13px',
    },
    usageList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        maxHeight: '180px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    usageItem: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: '13px',
        color: '#1e293b',
        padding: '8px 12px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
    },
    usageEvent: {
        color: '#64748b',
        textAlign: 'right',
    },
    modalBody: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 250px',
        gap: '32px',
        overflow: 'hidden'
    },
    lyricsSection: {
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    sectionTitle: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '12px'
    },
    lyricsContainer: {
        backgroundColor: '#f8fafc',
        padding: '20px',
        borderRadius: '12px',
        overflowY: 'auto',
        flex: 1
    },
    lyricsText: {
        margin: 0,
        whiteSpace: 'pre-wrap',
        fontFamily: 'inherit',
        fontSize: '15px',
        lineHeight: '1.6',
        color: '#1e293b'
    },
    infoSection: {
        display: 'flex',
        flexDirection: 'column'
    },
    linksGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    linkCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        textDecoration: 'none',
        color: '#1e293b',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.2s ease'
    }
};

export default SongPreviewModal;
