import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, Timestamp, deleteDoc, doc, updateDoc, where, serverTimestamp, writeBatch, limit } from 'firebase/firestore';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Trash2, Edit2, Users, Music, ChevronDown, ChevronUp, CheckCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../useLanguage';

const getWeekRanges = (baseDate = new Date()) => {
    const ranges = [];
    const startOfCurrentWeek = new Date(baseDate);
    const day = baseDate.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    startOfCurrentWeek.setDate(baseDate.getDate() + diff);
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 4; i++) {
        const start = new Date(startOfCurrentWeek);
        start.setDate(startOfCurrentWeek.getDate() + (i * 7));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        ranges.push({ start, end });
    }
    return ranges;
};

const Events = () => {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const formRef = useRef(null);

    const [events, setEvents] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [locations, setLocations] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', description: '', locationId: '', serviceTypeId: '', repeatCount: 1 });
    const [filterDate, setFilterDate] = useState('');
    const [loading, setLoading] = useState(false);

    const getLocale = () => {
        if (language === 'ro') return 'ro-RO';
        if (language === 'en') return 'en-US';
        return 'es-ES';
    };

    const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const displayedWeekRanges = useMemo(() => {
        return getWeekRanges(filterDate ? new Date(filterDate + 'T00:00:00') : new Date());
    }, [filterDate]);

    const buildEventsQuery = useCallback(() => {
        if (filterDate) {
            const startOfDay = new Date(filterDate + 'T00:00:00');
            const endOfDay = new Date(filterDate + 'T23:59:59');

            return query(
                collection(db, 'events'),
                where('date', '>=', Timestamp.fromDate(startOfDay)),
                where('date', '<=', Timestamp.fromDate(endOfDay)),
                orderBy('date', 'asc')
            );
        }

        return query(
            collection(db, 'events'),
            where('date', '>=', Timestamp.fromDate(displayedWeekRanges[0].start)),
            where('date', '<=', Timestamp.fromDate(displayedWeekRanges[displayedWeekRanges.length - 1].end)),
            orderBy('date', 'asc')
        );
    }, [displayedWeekRanges, filterDate]);

    const fetchEvents = async () => {
        try {
            const snapshot = await getDocs(buildEventsQuery());
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error("Error fetching events:", err);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadPageData = async () => {
            try {
                const [eventsSnapshot, serviceTypesSnapshot, locationsSnapshot] = await Promise.all([
                    getDocs(buildEventsQuery()),
                    getDocs(collection(db, 'service_types')),
                    getDocs(collection(db, 'locations'))
                ]);

                if (!isMounted) return;

                setEvents(eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setServiceTypes(serviceTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLocations(locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Error fetching events page data:", err);
            }
        };

        loadPageData();
        return () => {
            isMounted = false;
        };
    }, [buildEventsQuery]);

    const handleAddEvent = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const selectedType = serviceTypes.find(t => t.id === newEvent.serviceTypeId);
            const selectedLocation = locations.find(l => l.id === newEvent.locationId);
            
            const iterations = parseInt(newEvent.repeatCount) || 1;
            const currentBaseDate = new Date(`${newEvent.date}T${newEvent.time}`);

            const batch = writeBatch(db);
            for (let i = 0; i < iterations; i++) {
                const eventDate = new Date(currentBaseDate);
                eventDate.setDate(currentBaseDate.getDate() + (i * 7));

                const eventRef = doc(collection(db, 'events'));
                batch.set(eventRef, {
                    title: newEvent.title,
                    date: Timestamp.fromDate(eventDate),
                    description: newEvent.description,
                    locationId: newEvent.locationId || null,
                    location: selectedLocation?.name || '',
                    serviceTypeId: newEvent.serviceTypeId || null,
                    serviceTypeName: selectedType?.name || null,
                    requiredTeams: selectedType?.requiredTeams || [],
                    color: selectedType?.color || '#3b82f6',
                    status: 'draft',
                    createdAt: serverTimestamp(),
                });
            }
            await batch.commit();

            setNewEvent({ title: '', date: '', time: '', description: '', locationId: '', serviceTypeId: '', repeatCount: 1 });
            setShowAddForm(false);
            fetchEvents();
        } catch (err) {
            console.error("Error adding event:", err);
        } finally {
            setLoading(false);
        }
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
                requiredTeams: selectedType?.requiredTeams || [],
                color: selectedType?.color || '#3b82f6',
            });

            setEditingEvent(null);
            fetchEvents();
        } catch (err) {
            console.error("Error updating event:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAdd = async (type) => {
        setLoading(true);
        try {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let targetDate = new Date();

            // Query all events from today onwards ordered by date
            const q = query(
                collection(db, 'events'),
                where('date', '>=', Timestamp.fromDate(startOfToday)),
                orderBy('date', 'asc')
            );
            const snap = await getDocs(q);
            
            // Filter events in memory by serviceTypeId
            const futureEventsOfType = snap.docs
                .map(doc => doc.data())
                .filter(e => e.serviceTypeId === type.id);

            let latestEventDate = null;
            if (futureEventsOfType.length > 0) {
                latestEventDate = futureEventsOfType[futureEventsOfType.length - 1].date.toDate();
            }

            if (latestEventDate) {
                // Since latestEventDate is >= startOfToday, schedule the next one exactly 7 days after it
                targetDate = new Date(latestEventDate);
                targetDate.setDate(targetDate.getDate() + 7);
            } else {
                // If no upcoming event exists yet, schedule for the next occurrence starting today
                if (type.dayOfWeek !== undefined && type.dayOfWeek !== '') {
                    const targetDayNum = parseInt(type.dayOfWeek);
                    const currentDayNum = now.getDay();
                    let diff = targetDayNum - currentDayNum;
                    if (diff < 0) diff += 7;
                    targetDate.setDate(now.getDate() + diff);
                }
            }

            const dateStr = formatLocalDate(targetDate);
            setNewEvent({
                title: type.name,
                date: dateStr,
                time: type.defaultStartTime || '',
                description: '',
                locationId: type.locationId || '',
                serviceTypeId: type.id,
                repeatCount: 1
            });
            setEditingEvent(null);
            setShowAddForm(true);
            setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (err) {
            console.error("Error in quick add:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h1>{t('events')}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{t('filterByDate')}:</span>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="date-filter-input"
                            style={{ border: 'none', outline: 'none', fontSize: '14px', color: '#1e293b' }}
                        />
                        {filterDate && (
                            <button
                                onClick={() => setFilterDate('')}
                                style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', cursor: 'pointer', color: '#475569' }}
                            >
                                {t('showAll')}
                            </button>
                        )}
                    </div>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => { 
                        setEditingEvent(null); 
                        setShowAddForm(!showAddForm); 
                        if (!showAddForm) {
                            setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                        }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={18} />
                    {t('newEvent')}
                </button>
            </div>

            {/* Forms */}
            {(showAddForm || editingEvent) && (
                <div ref={formRef} className="card" style={{ marginBottom: '24px', maxWidth: '600px' }}>
                    <h3>{editingEvent ? t('editEvent') : t('scheduleNewEvent')}</h3>
                    <form onSubmit={editingEvent ? handleUpdateEvent : handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                        <div style={styles.inputGroup}>
                            <label>{t('eventTitle')}</label>
                            <input
                                type="text"
                                value={editingEvent ? editingEvent.title : newEvent.title}
                                onChange={e => editingEvent ? setEditingEvent({ ...editingEvent, title: e.target.value }) : setNewEvent({ ...newEvent, title: e.target.value })}
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
                                    value={editingEvent ? editingEvent.date : newEvent.date}
                                    onChange={e => editingEvent ? setEditingEvent({ ...editingEvent, date: e.target.value }) : setNewEvent({ ...newEvent, date: e.target.value })}
                                    required
                                    style={styles.input}
                                />
                            </div>
                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                <label>{t('time')}</label>
                                <input
                                    type="time"
                                    value={editingEvent ? editingEvent.time : newEvent.time}
                                    onChange={e => editingEvent ? setEditingEvent({ ...editingEvent, time: e.target.value }) : setNewEvent({ ...newEvent, time: e.target.value })}
                                    required
                                    style={styles.input}
                                />
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                <label>{t('serviceType')}</label>
                                <select
                                    value={editingEvent ? editingEvent.serviceTypeId : newEvent.serviceTypeId}
                                    onChange={e => {
                                        const stId = e.target.value;
                                        const typeObj = serviceTypes.find(t => t.id === stId);
                                        const locId = typeObj?.locationId || '';
                                        if (editingEvent) {
                                            setEditingEvent({ ...editingEvent, serviceTypeId: stId, locationId: locId });
                                        } else {
                                            setNewEvent({ ...newEvent, serviceTypeId: stId, locationId: locId });
                                        }
                                    }}
                                    style={styles.input}
                                >
                                    <option value="">{t('noCategory')}</option>
                                    {serviceTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                <label>{t('location')}</label>
                                <select
                                    value={editingEvent ? (editingEvent.locationId || '') : (newEvent.locationId || '')}
                                    onChange={e => editingEvent ? setEditingEvent({ ...editingEvent, locationId: e.target.value }) : setNewEvent({ ...newEvent, locationId: e.target.value })}
                                    style={styles.input}
                                >
                                    <option value="">{t('noLocation')}</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            {!editingEvent && (
                                <div style={{ ...styles.inputGroup, flex: 1 }}>
                                    <label>{t('repeat')}</label>
                                    <select
                                        value={newEvent.repeatCount}
                                        onChange={e => setNewEvent({ ...newEvent, repeatCount: e.target.value })}
                                        style={styles.input}
                                    >
                                        <option value="1">1 {t('weeks')}</option>
                                        <option value="2">2 {t('weeks')}</option>
                                        <option value="3">3 {t('weeks')}</option>
                                        <option value="4">4 {t('weeks')}</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? t('saving') : (editingEvent ? t('save') : t('saveEvent'))}
                            </button>
                            <button type="button" onClick={() => { setShowAddForm(false); setEditingEvent(null); }} style={styles.btnSecondary}>
                                {t('cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Quick Add */}
            <div style={styles.quickAddContainer}>
                {serviceTypes.map(type => (
                    <button key={type.id} onClick={() => handleQuickAdd(type)} style={{ ...styles.quickAddBtn, borderLeft: `4px solid ${type.color}` }}>
                        <Plus size={14} /> {type.name}
                    </button>
                ))}
            </div>

            {/* 4-Week Grid */}
            <div className="events-grid" style={{ 
                gridTemplateColumns: 'repeat(4, 1fr)',
                transition: 'grid-template-columns 0.3s ease'
            }}>
                {displayedWeekRanges.map((range, weekIndex) => {
                    const weekEvents = events.filter(e => {
                        const d = e.date.toDate();
                        return d >= range.start && d <= range.end;
                    });

                    return (
                        <div key={weekIndex} className="week-column">
                            <div className="week-header">
                                {range.start.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })} -
                                {range.end.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })}
                            </div>
                            {weekEvents.length === 0 ? (
                                <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '10px' }}>{t('noEventsScheduled')}</p>
                            ) : (
                                weekEvents.map(event => (
                                    <React.Fragment key={event.id}>
                                        <div 
                                            className="event-card-compact"
                                            onClick={() => navigate(`/events/${event.id}`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="event-color-strip" style={{ backgroundColor: event.color || '#3b82f6' }}></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div className="event-time-compact">
                                                    <span className="event-day-badge">{event.date.toDate().toLocaleDateString(getLocale(), { weekday: 'short' }).toUpperCase()}</span>
                                                    {event.date.toDate().toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <div className="event-title-compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                                <span style={{ flex: 1, paddingRight: '12px' }}>{event.title}</span>
                                                <div style={{ display: 'flex', gap: '8px', zIndex: 2 }}>
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setEditingEvent({ 
                                                                ...event, 
                                                                date: formatLocalDate(event.date.toDate()),
                                                                time: event.date.toDate().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) 
                                                            }); 
                                                            setTimeout(() => {
                                                                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                            }, 100);
                                                        }} 
                                                        style={{ ...styles.btnActionIcon, color: '#64748b' }} 
                                                        title={t('edit')}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={async (e) => { 
                                                            e.stopPropagation(); 
                                                            if(window.confirm(t('confirmDeleteEvent'))) { 
                                                                await deleteDoc(doc(db, 'events', event.id)); 
                                                                fetchEvents(); 
                                                            } 
                                                        }} 
                                                        style={{ ...styles.btnActionIcon, color: '#ef4444' }} 
                                                        title={t('delete')}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                <MapPin size={10} /> {event.location || t('noLocation')}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                ))
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const styles = {
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    input: { padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' },
    btnSecondary: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' },
    quickAddContainer: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' },
    quickAddBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#1e293b', cursor: 'pointer', transition: 'all 0.2s' },
    btnActionIcon: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px', transition: 'background-color 0.2s' }
};

export default Events;
