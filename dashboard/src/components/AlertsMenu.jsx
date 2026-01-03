import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Bell, X, Calendar, UserX, Info } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const AlertsMenu = () => {
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        // Listen for unread notifications
        const q = query(
            collection(db, 'notifications'),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Client-side sort
            notifs.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB - dateA;
            });
            setNotifications(notifs);
        });

        return unsubscribe;
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDismiss = async (e, id) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, 'notifications', id), { read: true });
        } catch (err) {
            console.error("Error modifying notification:", err);
        }
    };

    const handleDismissAll = async () => {
        try {
            const promises = notifications.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
            await Promise.all(promises);
        } catch (err) {
            console.error("Error clearing all:", err);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'assignment_declined': return <UserX size={16} color="#ef4444" />;
            case 'blockout_created': return <Calendar size={16} color="#f59e0b" />;
            default: return <Info size={16} color="#3b82f6" />;
        }
    };

    const getTitle = (n) => {
        if (n.type === 'assignment_declined') return t('assignmentDeclined');
        if (n.type === 'blockout_created') return t('datesBlocked');
        return t('notification');
    };

    const renderContent = (n) => {
        if (n.type === 'assignment_declined') {
            return (
                <div style={styles.notifContent}>
                    <p style={styles.notifText}>
                        <strong>{n.userName}</strong> {t('declinedToServe')} <strong>{n.eventTitle}</strong>.
                    </p>
                </div>
            );
        }
        if (n.type === 'blockout_created') {
            return (
                <div style={styles.notifContent}>
                    <p style={styles.notifText}>
                        <strong>{n.userName}</strong> {t('unavailable')}: {n.dates}.
                    </p>
                    {n.reason && <p style={styles.notifSubtext}>"{n.reason}"</p>}
                </div>
            );
        }
        return <p style={styles.notifText}>{t('newSystemAlert')}</p>;
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <style>
                {`
                    @keyframes bell-pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.1); color: #3b82f6; }
                        100% { transform: scale(1); }
                    }
                    .bell-active {
                        animation: bell-pulse 2s infinite ease-in-out;
                    }
                `}
            </style>
            <div
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}
                className={notifications.length > 0 ? 'bell-active' : ''}
            >
                <Bell size={28} color={notifications.length > 0 ? "#3b82f6" : "#64748b"} />
                {notifications.length > 0 && (
                    <div style={styles.badge}>
                        {notifications.length > 9 ? '9+' : notifications.length}
                    </div>
                )}
            </div>

            {showDropdown && (
                <div style={styles.dropdown}>
                    <div style={styles.header}>
                        <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>{t('notifications')}</h4>
                        {notifications.length > 0 && (
                            <button onClick={handleDismissAll} style={styles.clearBtn}>
                                {t('clearAll')}
                            </button>
                        )}
                    </div>

                    <div style={styles.list}>
                        {notifications.length === 0 ? (
                            <div style={styles.empty}>
                                <Bell size={24} color="#cbd5e1" />
                                <p>{t('noNewNotifications')}</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} style={styles.item}>
                                    <div style={styles.iconBox}>{getIcon(n.type)}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={styles.itemHeader}>
                                            <span style={styles.itemTitle}>{getTitle(n)}</span>
                                            <span style={styles.time}>{t('today')}</span> {/* Simplify time for now */}
                                        </div>
                                        {renderContent(n)}
                                    </div>
                                    <button onClick={(e) => handleDismiss(e, n.id)} style={styles.dismissBtn}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    badge: {
        position: 'absolute',
        top: '-5px',
        right: '-5px',
        backgroundColor: '#ef4444',
        color: 'white',
        fontSize: '10px',
        fontWeight: 'bold',
        height: '15px',
        minWidth: '15px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 3px',
        border: '1px solid white'
    },
    dropdown: {
        position: 'absolute',
        top: '30px',
        right: '-10px',
        width: '320px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        border: '1px solid #e2e8f0',
        zIndex: 1000,
        overflow: 'hidden'
    },
    header: {
        padding: '12px 16px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc'
    },
    clearBtn: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        fontSize: '12px',
        cursor: 'pointer',
        textDecoration: 'underline'
    },
    list: {
        maxHeight: '400px',
        overflowY: 'auto'
    },
    item: {
        padding: '12px 16px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        gap: '12px',
        position: 'relative',
        transition: 'background 0.2s',
        ':hover': { backgroundColor: '#f8fafc' }
    },
    iconBox: {
        marginTop: '2px'
    },
    itemHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px'
    },
    itemTitle: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#1e293b'
    },
    time: {
        fontSize: '11px',
        color: '#94a3b8'
    },
    notifContent: {
        fontSize: '13px',
        color: '#475569',
        lineHeight: '1.4'
    },
    notifText: {
        margin: 0
    },
    notifSubtext: {
        margin: '4px 0 0 0',
        fontStyle: 'italic',
        fontSize: '12px',
        color: '#64748b'
    },
    dismissBtn: {
        background: 'none',
        border: 'none',
        color: '#cbd5e1',
        cursor: 'pointer',
        padding: '0',
        height: 'fit-content'
    },
    empty: {
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        color: '#94a3b8',
        fontSize: '14px'
    }
};

export default AlertsMenu;
