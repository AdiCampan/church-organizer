import React from 'react';
import { X, FileText, Play, Music, ExternalLink, Youtube } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const SongPreviewModal = ({ song, onClose }) => {
    const { t } = useLanguage();

    if (!song) return null;

    return (
        <div style={styles.modalOverlay}>
            <div className="card" style={styles.modal}>
                <div style={styles.modalHeader}>
                    <div>
                        <h2 style={{ margin: 0 }}>{song.title}</h2>
                        <p style={{ margin: '4px 0 0', color: '#64748b' }}>{song.artist} • {t('key')}: {song.key}</p>
                    </div>
                    <button onClick={onClose} style={styles.closeBtn}>
                        <X size={24} />
                    </button>
                </div>

                <div style={styles.modalBody}>
                    <div style={styles.lyricsSection}>
                        <h3 style={styles.sectionTitle}>{t('lyrics')}</h3>
                        <div style={styles.lyricsContainer}>
                            {song.lyrics ? (
                                <pre style={styles.lyricsText}>{song.lyrics}</pre>
                            ) : (
                                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No hay letra disponible.</p>
                            )}
                        </div>
                    </div>

                    <div style={styles.infoSection}>
                        <h3 style={styles.sectionTitle}>{t('files')} & Links</h3>
                        <div style={styles.linksGrid}>
                            {song.pdfUrl && (
                                <a href={song.pdfUrl} target="_blank" rel="noreferrer" style={styles.linkCard}>
                                    <FileText size={20} color="#007bff" />
                                    <span>{t('chords')} (PDF)</span>
                                </a>
                            )}
                            {song.mp3Url && (
                                <a href={song.mp3Url} target="_blank" rel="noreferrer" style={styles.linkCard}>
                                    <Play size={20} color="#007bff" />
                                    <span>{t('audio')} (MP3)</span>
                                </a>
                            )}
                            {song.youtubeUrl && (
                                <a href={song.youtubeUrl} target="_blank" rel="noreferrer" style={styles.linkCard}>
                                    <Youtube size={20} color="#ef4444" />
                                    <span>YouTube</span>
                                </a>
                            )}
                            {song.spotifyUrl && (
                                <a href={song.spotifyUrl} target="_blank" rel="noreferrer" style={styles.linkCard}>
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
