import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp, deleteDoc, doc, updateDoc, where, limit } from 'firebase/firestore';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Trash2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';


const Events = () => {
    const { t, language } = useLanguage();
    const navigate = useNavigate();

    const [events, setEvents] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [locations, setLocations] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', description: '', locationId: '', serviceTypeId: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchEvents();
        fetchServiceTypes();
        fetchLocations();
    }, []);

    const fetchEvents = async () => {
        try {
            const now = new Date();
            // Start of today (00:00:00) so "today's" events count as future/present
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // 1. Future events (including today)
            const futureQuery = query(
                collection(db, 'events'),
                where('date', '>=', Timestamp.fromDate(today)),
                orderBy('date', 'asc')
            );

            // 2. Past events (only last 10)
            const pastQuery = query(
                collection(db, 'events'),
                where('date', '<', Timestamp.fromDate(today)),
                orderBy('date', 'desc'),
                limit(10)
            );

            // Execute in parallel
            const [futureSnap, pastSnap] = await Promise.all([
                getDocs(futureQuery),
                getDocs(pastQuery)
            ]);

            const futureEvents = futureSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const pastEvents = pastSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Combine: [Future (ascending) ... ] + [Past (descending) ... ]
            // Wait - user wants a single list? Usually for a feed you want them sorted by date.
            // If we want the standard view: Oldest -> Newest? Or Newest -> Oldest?
            // "Events" usually implies a schedule.
            // Let's combine and sort globally by date DESCENDING so the newest (future) are at top
            // and the "limit 10" past ones are at the bottom.

            const allEvents = [...futureEvents, ...pastEvents];

            // Sort Descending (Newest date first)
            allEvents.sort((a, b) => b.date.toMillis() - a.date.toMillis());

            setEvents(allEvents);
        } catch (err) {
            console.error("Error fetching events:", err);
        }
    };

    const fetchServiceTypes = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'service_types'));
            setServiceTypes(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error("Error fetching service types:", err);
        }
    };

    const fetchLocations = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'locations'));
            setLocations(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error("Error fetching locations:", err);
        }
    };

    const handleAddEvent = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const eventDate = new Date(`${newEvent.date}T${newEvent.time}`);

            const selectedType = serviceTypes.find(t => t.id === newEvent.serviceTypeId);
            const selectedLocation = locations.find(l => l.id === newEvent.locationId);

            await addDoc(collection(db, 'events'), {
                title: newEvent.title,
                date: Timestamp.fromDate(eventDate),
                description: newEvent.description,
                locationId: newEvent.locationId || null,
                location: selectedLocation?.name || '',
                serviceTypeId: newEvent.serviceTypeId || null,
                serviceTypeName: selectedType?.name || null,
                color: selectedType?.color || '#3b82f6',
                status: 'draft',
                createdAt: new Date(),
            });

            setNewEvent({ title: '', date: '', time: '', description: '', locationId: '', serviceTypeId: '' });
            setShowAddForm(false);
            fetchEvents();
        } catch (err) {
            console.error("Error adding event:", err);
            alert(t('errorAddingEvent') === 'errorAddingEvent' ? 'Error al añadir evento' : t('errorAddingEvent'));
        } finally {

            setLoading(false);
        }
    };

    const handleDeleteEvent = async (e, eventId) => {
        e.stopPropagation(); // Prevent card click
        if (!window.confirm(t('confirmDeleteEvent'))) return;


        try {
            await deleteDoc(doc(db, 'events', eventId));
            fetchEvents();
        } catch (err) {
            console.error("Error removing event:", err);
            alert(t('errorDeleting') === 'errorDeleting' ? 'Error al eliminar' : t('errorDeleting'));
        }

    };

    const handleEditEvent = (e, event) => {
        e.stopPropagation();
        const eventDate = event.date.toDate();
        const dateStr = eventDate.toISOString().split('T')[0];
        const timeStr = eventDate.toTimeString().slice(0, 5);

        setEditingEvent({
            id: event.id,
            title: event.title,
            date: dateStr,
            time: timeStr,
            description: event.description || '',
            locationId: event.locationId || '',
            serviceTypeId: event.serviceTypeId || ''
        });
        setShowAddForm(false);
    };

    const handleUpdateEvent = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const eventDate = new Date(`${editingEvent.date}T${editingEvent.time}`);
            const selectedType = serviceTypes.find(t => t.id === editingEvent.serviceTypeId);
            const selectedLocation = locations.find(l => l.id === editingEvent.locationId);

            await updateDoc(doc(db, 'events', editingEvent.id), {
                title: editingEvent.title,
                date: Timestamp.fromDate(eventDate),
                description: editingEvent.description,
                locationId: editingEvent.locationId || null,
                location: selectedLocation?.name || '',
                serviceTypeId: editingEvent.serviceTypeId || null,
                serviceTypeName: selectedType?.name || null,
                color: selectedType?.color || '#3b82f6',
            });

            setEditingEvent(null);
            fetchEvents();
        } catch (err) {
            console.error("Error updating event:", err);
            alert(t('errorUpdatingEvent') === 'errorUpdatingEvent' ? 'Error al actualizar evento' : t('errorUpdatingEvent'));
        } finally {

            setLoading(false);
        }
    };


    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const locale = language === 'ro' ? 'ro-RO' : (language === 'en' ? 'en-US' : 'es-ES');
        return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const locale = language === 'ro' ? 'ro-RO' : (language === 'en' ? 'en-US' : 'es-ES');
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    };


    return (
        <div className="page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>{t('events')}</h1>
                <button
                    className="btn-primary"
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={18} />
                    {t('newEvent')}
                </button>
            </div>

            {showAddForm && (
                <div className="card" style={{ marginBottom: '24px', maxWidth: '600px' }}>
                    <h3>{t('scheduleNewEvent')}</h3>
                    <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                        <div style={styles.inputGroup}>
                            <label>{t('eventTitle')}</label>
                            <input
                                type="text"
                                value={newEvent.title}
                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                placeholder={t('eventTitlePlaceholder')}
                                required
                                style={styles.input}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                <label>{t('date')}</label>
                                <input
                                    type="date"
                                    value={newEvent.date}
                                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                    required
                                    style={styles.input}
                                />
                            </div>
                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                <label>{t('time')}</label>
                                <input
                                    type="time"
                                    value={newEvent.time}
                                    onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                    required
                                    style={styles.input}
                                />
                            </div>
                        </div>
                        <div style={styles.inputGroup}>
                            <label>{t('location')}</label>
                            <select
                                value={newEvent.locationId}
                                onChange={e => setNewEvent({ ...newEvent, locationId: e.target.value })}
                                style={styles.input}
                            >
                                <option value="">{t('noLocation')}</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.inputGroup}>
                            <label>{t('serviceType')}</label>
                            <select
                                value={newEvent.serviceTypeId}
                                onChange={e => setNewEvent({ ...newEvent, serviceTypeId: e.target.value })}
                                style={styles.input}
                            >
                                <option value="">{t('noCategory')}</option>
                                {serviceTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.inputGroup}>
                            <label>{t('description')}</label>
                            <textarea
                                value={newEvent.description}
                                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                placeholder={t('descriptionPlaceholder')}
                                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? t('saving') : t('saveEvent')}
                            </button>
                            <button type="button" onClick={() => setShowAddForm(false)} style={styles.btnSecondary}>
                                {t('cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {editingEvent && (
                <div className="card" style={{ marginBottom: '24px', maxWidth: '600px' }}>
                    <h3>{t('editEvent')}</h3>
                    <form onSubmit={handleUpdateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                        <div style={styles.inputGroup}>
                            <label>{t('eventTitle')}</label>
                            <input
                                type="text"
                                value={editingEvent.title}
                                onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                                placeholder={t('eventTitlePlaceholder')}
                                required
                                style={styles.input}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                <label>{t('date')}</label>
                                <input
                                    type="date"
                                    value={editingEvent.date}
                                    onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })}
                                    required
                                    style={styles.input}
                                />
                            </div>
                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                <label>{t('time')}</label>
                                <input
                                    type="time"
                                    value={editingEvent.time}
                                    onChange={e => setEditingEvent({ ...editingEvent, time: e.target.value })}
                                    required
                                    style={styles.input}
                                />
                            </div>
                        </div>
                        <div style={styles.inputGroup}>
                            <label>{t('location')}</label>
                            <select
                                value={editingEvent.locationId}
                                onChange={e => setEditingEvent({ ...editingEvent, locationId: e.target.value })}
                                style={styles.input}
                            >
                                <option value="">{t('noLocation')}</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.inputGroup}>
                            <label>{t('serviceType')}</label>
                            <select
                                value={editingEvent.serviceTypeId}
                                onChange={e => setEditingEvent({ ...editingEvent, serviceTypeId: e.target.value })}
                                style={styles.input}
                            >
                                <option value="">{t('noCategory')}</option>
                                {serviceTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.inputGroup}>
                            <label>{t('description')}</label>
                            <textarea
                                value={editingEvent.description}
                                onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                                placeholder={t('descriptionPlaceholder')}
                                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? t('updating') : t('updateEvent')}
                            </button>
                            <button type="button" onClick={() => setEditingEvent(null)} style={styles.btnSecondary}>{t('cancel')}</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={styles.list}>
                {events.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                        <CalendarIcon size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
                        <p style={{ color: '#64748b' }}>{t('noEventsScheduled')}</p>
                    </div>
                ) : (
                    events.map(event => (
                        <div
                            key={event.id}
                            className="card"
                            style={{ ...styles.eventCard, cursor: 'pointer' }}
                            onClick={() => navigate(`/events/${event.id}`)}
                        >
                            <div style={styles.eventDateBox}>
                                <span style={styles.dateDay}>{event.date.toDate().getDate()}</span>
                                <span style={styles.dateMonth}>{event.date.toDate().toLocaleDateString(language === 'ro' ? 'ro-RO' : (language === 'en' ? 'en-US' : 'es-ES'), { month: 'short' }).toUpperCase()}</span>
                            </div>
                            <div style={styles.eventInfo}>
                                <h3 style={{ margin: 0, fontSize: '18px' }}>{event.title}</h3>
                                <div style={styles.eventMeta}>
                                    <div style={styles.metaItem}>
                                        <Clock size={14} />
                                        <span>{formatTime(event.date)}</span>
                                    </div>
                                    <div style={styles.metaItem}>
                                        <MapPin size={14} />
                                        <span>{event.location || t('noLocation')}</span>
                                    </div>
                                </div>
                                <p style={styles.eventDescription}>{event.description}</p>
                            </div>
                            <div style={styles.eventActions}>
                                <button type="button" onClick={e => handleEditEvent(e, event)} style={styles.deleteBtn}><Edit2 size={18} /></button>
                                <button style={styles.deleteBtn} onClick={e => handleDeleteEvent(e, event.id)}><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const styles = {
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    eventCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '20px',
    },
    eventDateBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '64px',
        height: '64px',
        backgroundColor: '#eff6ff',
        borderRadius: '12px',
        color: '#007bff',
    },
    dateDay: {
        fontSize: '20px',
        fontWeight: '700',
    },
    dateMonth: {
        fontSize: '12px',
        fontWeight: '600',
    },
    eventInfo: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    eventMeta: {
        display: 'flex',
        gap: '16px',
        color: '#64748b',
        fontSize: '14px',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    eventDescription: {
        fontSize: '14px',
        color: '#475569',
        margin: 0,
        lineHeight: '1.5',
    },
    eventActions: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '12px',
    },
    btnAction: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#1e293b',
        cursor: 'pointer',
        transition: 'background 0.2s',
    },
    deleteBtn: {
        background: 'none',
        border: 'none',
        color: '#cbd5e1',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '8px',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBadge: {
        fontSize: '11px',
        fontWeight: '600',
        padding: '4px 8px',
        borderRadius: '6px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    input: {
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '14px',
        outline: 'none',
        fontFamily: 'inherit',
    },
    btnSecondary: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        backgroundColor: 'white',
        color: '#475569',
        fontWeight: '600',
        cursor: 'pointer',
    }
};

export default Events;
