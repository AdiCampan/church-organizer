import React, { useEffect, useId, useRef, useState } from 'react';
import { Music, Search, X } from 'lucide-react';
import { filterSongsBySearch } from '../utils/songSearch';

const SongSearchSelect = ({
    songs,
    value,
    onChange,
    searchPlaceholder,
    noSongLabel,
    noResultsLabel,
    clearLabel,
}) => {
    const instanceId = useId();
    const listboxId = `song-search-listbox-${instanceId}`;
    const getOptionId = (index) => `song-search-option-${instanceId}-${index}`;

    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);
    const optionRefs = useRef({});

    const selectedSong = songs.find((song) => song.id === value) || null;
    const filteredSongs = filterSongsBySearch(songs, query);
    const inputValue = isOpen ? query : (selectedSong?.title || '');
    const selectableOptions = [
        { id: '' },
        ...filteredSongs.map((song) => ({ id: song.id })),
    ];

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, isOpen]);

    const setOptionRef = (index) => (element) => {
        optionRefs.current[index] = element;
    };

    const selectSong = (songId) => {
        const song = songs.find((item) => item.id === songId) || null;
        onChange(songId, song);
        setQuery('');
        setIsOpen(false);
        setActiveIndex(0);
    };

    const clearSelection = () => {
        onChange('', null);
        setQuery('');
        setIsOpen(true);
        setActiveIndex(0);
    };

    const openDropdown = () => {
        setQuery('');
        setIsOpen(true);
        setActiveIndex(0);
    };

    const handleKeyDown = (event) => {
        if (!isOpen) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((current) => Math.min(current + 1, selectableOptions.length - 1));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            const safeIndex = Math.min(activeIndex, selectableOptions.length - 1);
            const activeOption = selectableOptions[safeIndex];
            if (activeOption) {
                selectSong(activeOption.id);
            }
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setIsOpen(false);
            setQuery('');
            setActiveIndex(0);
        }
    };

    return (
        <div ref={containerRef} style={styles.container}>
            <div style={styles.inputWrap}>
                <Search size={14} color="#94a3b8" style={styles.searchIcon} />
                <input
                    type="text"
                    value={inputValue}
                    placeholder={searchPlaceholder}
                    onFocus={openDropdown}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setIsOpen(true);
                        setActiveIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    style={styles.input}
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? listboxId : undefined}
                    aria-activedescendant={isOpen ? getOptionId(activeIndex) : undefined}
                    role="combobox"
                />
                {(value || query) && (
                    <button
                        type="button"
                        onClick={clearSelection}
                        style={styles.clearBtn}
                        aria-label={clearLabel}
                        title={clearLabel}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {selectedSong && !isOpen && (
                <div style={styles.selectedBadge}>
                    <Music size={12} color="#007bff" />
                    <span style={styles.selectedText}>
                        {selectedSong.title}
                        {selectedSong.artist ? ` · ${selectedSong.artist}` : ''}
                    </span>
                </div>
            )}

            {isOpen && (
                <ul id={listboxId} style={styles.dropdown} role="listbox">
                    <li role="presentation">
                        <button
                            type="button"
                            id={getOptionId(0)}
                            ref={setOptionRef(0)}
                            role="option"
                            aria-selected={value === ''}
                            style={{
                                ...styles.option,
                                ...(activeIndex === 0 ? styles.optionActive : {}),
                            }}
                            onClick={() => selectSong('')}
                            onMouseEnter={() => setActiveIndex(0)}
                        >
                            {noSongLabel}
                        </button>
                    </li>
                    {filteredSongs.length === 0 ? (
                        <li style={styles.emptyState}>{noResultsLabel}</li>
                    ) : (
                        filteredSongs.map((song, index) => {
                            const optionIndex = index + 1;
                            return (
                                <li key={song.id} role="presentation">
                                    <button
                                        type="button"
                                        id={getOptionId(optionIndex)}
                                        ref={setOptionRef(optionIndex)}
                                        role="option"
                                        aria-selected={value === song.id}
                                        style={{
                                            ...styles.option,
                                            ...(activeIndex === optionIndex ? styles.optionActive : {}),
                                        }}
                                        onClick={() => selectSong(song.id)}
                                        onMouseEnter={() => setActiveIndex(optionIndex)}
                                    >
                                        <span style={styles.optionTitle}>{song.title}</span>
                                        {song.artist && (
                                            <span style={styles.optionArtist}>{song.artist}</span>
                                        )}
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>
            )}
        </div>
    );
};

const styles = {
    container: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    inputWrap: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: '10px',
        pointerEvents: 'none',
    },
    input: {
        width: '100%',
        padding: '10px 34px 10px 32px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '13px',
        outline: 'none',
        backgroundColor: 'white',
        boxSizing: 'border-box',
    },
    clearBtn: {
        position: 'absolute',
        right: '8px',
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
    },
    selectedBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        borderRadius: '8px',
        backgroundColor: '#eff6ff',
        color: '#1e293b',
        fontSize: '12px',
        fontWeight: '600',
    },
    selectedText: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    dropdown: {
        listStyle: 'none',
        margin: 0,
        padding: '4px',
        maxHeight: '180px',
        overflowY: 'auto',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: 'white',
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
        zIndex: 5,
    },
    option: {
        width: '100%',
        textAlign: 'left',
        border: 'none',
        background: 'transparent',
        padding: '8px 10px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        color: '#1e293b',
    },
    optionActive: {
        backgroundColor: '#eff6ff',
    },
    optionTitle: {
        fontSize: '13px',
        fontWeight: '600',
    },
    optionArtist: {
        fontSize: '11px',
        color: '#64748b',
    },
    emptyState: {
        padding: '10px',
        fontSize: '12px',
        color: '#94a3b8',
        textAlign: 'center',
    },
};

export default SongSearchSelect;
