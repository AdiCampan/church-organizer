import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, onSnapshot, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import { Calendar, Users, Clock, MapPin, UserPlus, Trash2, Edit2, ArrowLeft, CheckCircle, Plus, Music, Eye } from 'lucide-react';
import { useLanguage } from '../useLanguage';
import SongPreviewModal from '../components/SongPreviewModal';


const EventDetails = () => {
    const { t, language } = useLanguage();
    const { eventId } = useParams();

    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [teams, setTeams] = useState([]);
    const [availablePeople, setAvailablePeople] = useState([]);
    const [allSongs, setAllSongs] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddMember, setShowAddMember] = useState(null); // stores teamId
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedPosition, setSelectedPosition] = useState('');

    // Order of Service state
    const [oos, setOos] = useState([]);
    const [newItem, setNewItem] = useState({ title: '', duration: '', songId: '', details: '', targetTeams: ['all'] });
    const [editingOosId, setEditingOosId] = useState(null); // ID of item being edited
    const [previewSong, setPreviewSong] = useState(null);

    const formatLocalDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            const [teamsSnapshot, peopleSnapshot, songsSnapshot] = await Promise.all([
                getDocs(collection(db, 'teams')),
                getDocs(collection(db, 'users')),
                getDocs(collection(db, 'songs'))
            ]);

            if (!isMounted) return;

            setTeams(teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setAvailablePeople(peopleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setAllSongs(songsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };

        loadInitialData();

        // Subscribe to assignments for this event
        const qSchedules = query(collection(db, 'schedules'), where('eventId', '==', eventId));
        const unsubSchedules = onSnapshot(qSchedules, (snapshot) => {
            setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Subscribe to event changes (for OOS)
        const unsubEvent = onSnapshot(doc(db, 'events', eventId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setEvent(data);
                setOos(data.orderOfService || []);
                setLoading(false);
            } else {
                navigate('/events');
            }
        });

        return () => {
            isMounted = false;
            unsubSchedules();
            unsubEvent();
        };
    }, [eventId, navigate]);

    const handleAssign = async (teamId) => {
        if (!selectedUser || !selectedPosition) return;

        const user = availablePeople.find(p => p.id === selectedUser);

        try {
            await addDoc(collection(db, 'schedules'), {
                eventId,
                teamId,
                userId: selectedUser,
                userName: user.name,
                userEmail: user.email,
                position: selectedPosition,
                status: 'pending',
                assignedAt: serverTimestamp(),
            });

            setSelectedUser('');
            setSelectedPosition('');
            setShowAddMember(null);
        } catch (err) {
            console.error("Error assigning:", err);
            alert(t('errorAssigning'));
        }

    };

    const handleRemoveAssignment = async (assignmentId) => {
        try {
            await deleteDoc(doc(db, 'schedules', assignmentId));
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddOOSItem = async (e) => {
        e?.preventDefault();
        if (!newItem.title) return;

        let updatedOOS;

        if (editingOosId) {
            // Edit existing item
            updatedOOS = oos.map(item =>
                item.id === editingOosId ? { ...newItem, id: editingOosId } : item
            );
        } else {
            // Add new item
            updatedOOS = [...oos, { ...newItem, id: Date.now().toString() }];
        }

        try {
            await updateDoc(doc(db, 'events', eventId), {
                orderOfService: updatedOOS
            });
            setNewItem({ title: '', duration: '', songId: '', details: '', targetTeams: ['all'] });
            setEditingOosId(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleEditOOSItem = (item) => {
        setEditingOosId(item.id);
        setNewItem({
            title: item.title,
            duration: item.duration,
            songId: item.songId || '',
            details: item.details || '',
            targetTeams: item.targetTeams || ['all']
        });
    };

    const handleCancelOOSEdit = () => {
        setEditingOosId(null);
        setNewItem({ title: '', duration: '', songId: '', details: '', targetTeams: ['all'] });
    };

    const handleRemoveOOSItem = async (itemId) => {
        const updatedOOS = oos.filter(item => item.id !== itemId);
        try {
            await updateDoc(doc(db, 'events', eventId), {
                orderOfService: updatedOOS
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleCallToRehearsal = async (teamId) => {
        try {
            // 1. Get current team members assigned to this event
            const currentAssignments = assignments.filter(a => a.teamId === teamId && a.status !== 'declined');
            if (currentAssignments.length === 0) return;

            // 2. Find the configured rehearsal service type
            const serviceTypesSnap = await getDocs(collection(db, 'service_types'));
            const repetitiiType = serviceTypesSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .find(type => type.isRehearsal === true);

            if (!repetitiiType) {
                alert(t('rehearsalServiceTypeRequired'));
                return;
            }

            if (!repetitiiType.dayOfWeek) {
                alert(t('rehearsalDayRequired'));
                return;
            }

            // 3. Calculate Date
            const eventDate = event.date.toDate();
            const eventDay = eventDate.getDay();
            const rehearsalDay = parseInt(repetitiiType.dayOfWeek);

            let daysToSubtract = eventDay - rehearsalDay;
            if (daysToSubtract <= 0) daysToSubtract += 7;

            const rehearsalDate = new Date(eventDate);
            rehearsalDate.setDate(eventDate.getDate() - daysToSubtract);

            if (repetitiiType.defaultStartTime) {
                const [hours, minutes] = repetitiiType.defaultStartTime.split(':');
                rehearsalDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }

            // 4. Create or Find the rehearsal event
            // Start of day for the rehearsal date to query
            const startOfDay = new Date(rehearsalDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(rehearsalDate);
            endOfDay.setHours(23, 59, 59, 999);

            const qEvents = query(
                collection(db, 'events'),
                where('date', '>=', startOfDay),
                where('date', '<=', endOfDay)
            );
            const eventSnap = await getDocs(qEvents);

            // Filter in memory to avoid requiring a composite index
            const existingRehearsal = eventSnap.docs.find(doc => doc.data().serviceTypeId === repetitiiType.id);

            let rehearsalEventId;
            if (!existingRehearsal) {
                const rehearsalKey = `rehearsal_${repetitiiType.id}_${formatLocalDateKey(rehearsalDate)}`;
                const rehearsalRef = doc(db, 'events', rehearsalKey);
                const rehearsalSnap = await getDoc(rehearsalRef);

                if (rehearsalSnap.exists()) {
                    rehearsalEventId = rehearsalRef.id;
                } else {
                    await setDoc(rehearsalRef, {
                        title: `${repetitiiType.name} - ${event.title}`,
                        date: rehearsalDate,
                        serviceTypeId: repetitiiType.id,
                        serviceTypeName: repetitiiType.name,
                        color: repetitiiType.color || '#64748b',
                        status: 'draft',
                        createdAt: serverTimestamp(),
                        requiredTeams: repetitiiType.requiredTeams || []
                    });
                    rehearsalEventId = rehearsalRef.id;
                }
            } else {
                rehearsalEventId = existingRehearsal.id;
            }

            // 5. Assign people to the rehearsal
            // Check existing assignments for the rehearsal to avoid duplicates
            const qExisting = query(
                collection(db, 'schedules'),
                where('eventId', '==', rehearsalEventId),
                where('teamId', '==', teamId)
            );
            const existingSnap = await getDocs(qExisting);
            const existingUserIds = existingSnap.docs.map(doc => doc.data().userId);

            const promises = currentAssignments
                .filter(a => !existingUserIds.includes(a.userId))
                .map(a => {
                    return addDoc(collection(db, 'schedules'), {
                        eventId: rehearsalEventId,
                        teamId: teamId,
                        userId: a.userId,
                        userName: a.userName,
                        userEmail: a.userEmail,
                        position: a.position,
                        status: 'pending',
                        assignedAt: serverTimestamp(),
                    });
                });

            await Promise.all(promises);
            alert(t('rehearsalScheduled'));

        } catch (err) {
            console.error("Error calling to rehearsal:", err);
            alert(t('rehearsalScheduleError'));
        }
    };

    const isUserAvailable = (user) => {
        if (!event || !event.date || !user.blockoutDates) return true;

        const eventDateStr = event.date.toDate().toISOString().split('T')[0];

        // check intersection with blockout dates
        return !user.blockoutDates.some(range =>
            eventDateStr >= range.start && eventDateStr <= range.end
        );
    };

    if (loading || !event) return <div className="page">{t('loading')}...</div>;


    return (
        <div className="page">
            <button onClick={() => navigate('/events')} style={styles.backBtn}>
                <ArrowLeft size={16} /> {t('backToEvents')}
            </button>


            <div style={styles.header}>
                <div style={styles.eventInfo}>
                    <h1>{event.title}</h1>
                    <div style={styles.meta}>
                        <div style={styles.metaItem}><Calendar size={16} /> {event.date?.toDate().toLocaleDateString(language === 'ro' ? 'ro-RO' : (language === 'en' ? 'en-US' : 'es-ES'), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                        <div style={styles.metaItem}><Clock size={16} /> {event.date?.toDate().toLocaleTimeString(language === 'ro' ? 'ro-RO' : (language === 'en' ? 'en-US' : 'es-ES'), { hour: '2-digit', minute: '2-digit' })}</div>
                        <div style={styles.metaItem}><MapPin size={16} /> {event.location || t('noLocation')}</div>
                    </div>

                </div>
                <div style={styles.statusBadge}>
                    {event.status === 'published' ? t('published') : t('draft')}
                </div>

            </div>

            <div style={styles.content}>
                {/* Teams & Scheduling */}
                <div style={styles.schedulingSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Users size={20} color="#64748b" />
                        <h2 style={{ margin: 0 }}>{t('teamsAndPeople')}</h2>
                    </div>


                    {teams
                        .filter(team => {
                            if (!event.requiredTeams || event.requiredTeams.length === 0) return true;
                            return event.requiredTeams.some(rt => rt.teamId === team.id);
                        })
                        .map(team => (
                        <div key={team.id} className="card" style={styles.teamCard}>
                            <div style={styles.teamHeader}>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>{team.name}</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {assignments.filter(a => a.teamId === team.id).length > 0 && (
                                        <button
                                            onClick={() => handleCallToRehearsal(team.id)}
                                            style={{ ...styles.addBtn, backgroundColor: '#f0fdf4', color: '#166534' }}
                                            title={t('callToRehearsal')}
                                        >
                                            <Calendar size={14} /> {t('rehearsal')}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowAddMember(team.id)}
                                        style={styles.addBtn}
                                    >
                                        <Plus size={14} /> {t('add')}
                                    </button>
                                </div>
                            </div>


                            <div style={styles.assignmentsList}>
                                {assignments.filter(a => a.teamId === team.id).length === 0 ? (
                                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '8px 0' }}>{t('noOneAssigned')}</p>
                                ) : (

                                    assignments.filter(a => a.teamId === team.id).map(assignment => (
                                        <div key={assignment.id} style={styles.assignmentRow}>
                                            <div style={styles.userInfo}>
                                                <div style={styles.avatar}>{assignment.userName?.charAt(0) || '?'}</div>
                                                <div>
                                                    <div style={styles.userName}>{assignment.userName}</div>
                                                    <div style={styles.position}>{assignment.position}</div>
                                                </div>
                                            </div>
                                            <div style={styles.assignmentActions}>
                                                {assignment.status === 'confirmed' ? (
                                                    <div style={{ ...styles.statusTag, backgroundColor: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <CheckCircle size={10} /> {t('confirmed')}
                                                    </div>
                                                ) : assignment.status === 'declined' ? (
                                                    <div style={{ ...styles.statusTag, backgroundColor: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Users size={10} /> {t('declined')}
                                                    </div>
                                                ) : (
                                                    <span style={{ ...styles.statusTag, backgroundColor: '#f1f5f9', color: '#475569' }}>
                                                        {t('pending')}
                                                    </span>
                                                )}

                                                <button onClick={() => handleRemoveAssignment(assignment.id)} style={styles.deleteBtn}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {showAddMember === team.id && (
                                <div style={styles.addForm}>
                                    <select
                                        value={selectedUser}
                                        onChange={e => setSelectedUser(e.target.value)}
                                        style={styles.select}
                                    >
                                        <option value="">{t('selectPerson')}</option>

                                        {availablePeople
                                            .filter(p => team.members?.includes(p.id))
                                            .map(p => {
                                                const isAvailable = isUserAvailable(p);
                                                return (
                                                    <option key={p.id} value={p.id} disabled={!isAvailable}>
                                                        {p.name} {!isAvailable ? t('notAvailable') : ''}
                                                    </option>

                                                );
                                            })
                                        }
                                        {team.members?.length === 0 && (
                                            <option disabled>{t('noMembersInTeam')}</option>
                                        )}

                                    </select>
                                    <select
                                        value={selectedPosition}
                                        onChange={e => setSelectedPosition(e.target.value)}
                                        style={styles.select}
                                    >
                                        <option value="">{t('position')}...</option>

                                        {(() => {
                                            const requiredTeam = event.requiredTeams?.find(rt => rt.teamId === team.id);
                                            const positionsToShow = requiredTeam && requiredTeam.positions.length > 0
                                                ? team.positions?.filter(p => requiredTeam.positions.includes(p))
                                                : team.positions;

                                            return positionsToShow?.map((p, i) => (
                                                <option key={i} value={p}>{p}</option>
                                            ));
                                        })()}
                                    </select>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleAssign(team.id)} className="btn-primary" style={{ flex: 1, padding: '8px' }}>{t('save')}</button>
                                        <button onClick={() => setShowAddMember(null)} style={styles.cancelBtn}>{t('cancel')}</button>
                                    </div>

                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Order of Service */}
                <div style={styles.sidePanel}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Clock size={20} color="#64748b" />
                        <h2 style={{ margin: 0 }}>{t('orderOfService')}</h2>
                    </div>


                    <div className="card" style={{ padding: '0' }}>
                        <div style={styles.oosList}>
                            {oos.length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '14px', padding: '24px', textAlign: 'center' }}>{t('noElementsDefined')}</p>
                            ) : (

                                oos.map((item, index) => (
                                    <div key={item.id} style={styles.oosItem}>
                                        <div style={styles.oosNumber}>{index + 1}</div>
                                        <div style={styles.oosContent}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={styles.oosTitleText}>{item.title}</div>
                                                {item.songId && <Music size={12} color="#007bff" />}
                                            </div>
                                            <div style={styles.oosDurationText}>
                                                {item.duration && `${item.duration} ${t('min')}`}

                                                {item.songId && (
                                                    <>
                                                        {item.duration ? ' • ' : ''}
                                                        <span
                                                            onClick={() => setPreviewSong(allSongs.find(s => s.id === item.songId))}
                                                            style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                                                        >
                                                            {allSongs.find(s => s.id === item.songId)?.title}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            {item.details && (
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                                                    {item.details}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => handleEditOOSItem(item)} style={styles.actionBtn}>
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleRemoveOOSItem(item.id)} style={styles.deleteBtn}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handleAddOOSItem} style={styles.oosAddForm}>
                            {editingOosId && <div style={{ fontSize: '12px', fontWeight: '700', color: '#007bff', marginBottom: '4px' }}>{t('saving')}...</div>}

                            <input
                                type="text"
                                placeholder={t('momentPlaceholder')}
                                value={newItem.title}
                                onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                style={styles.oosInput}
                                required
                            />
                            <select
                                value={newItem.songId}
                                onChange={e => setNewItem({ ...newItem, songId: e.target.value })}
                                style={styles.oosInput}
                            >
                                <option value="">{t('noSong')}</option>
                                {allSongs.map(s => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </select>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px', marginTop: '4px' }}>
                                <button
                                    type="button"
                                    onClick={() => setNewItem({ ...newItem, targetTeams: ['all'] })}
                                    aria-pressed={newItem.targetTeams.includes('all')}
                                    style={{ 
                                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', cursor: 'pointer', fontWeight: '600', border: 'none',
                                        backgroundColor: newItem.targetTeams.includes('all') ? '#007bff' : '#e2e8f0',
                                        color: newItem.targetTeams.includes('all') ? 'white' : '#475569'
                                    }}>
                                    {t('all')}
                                </button>
                                {teams.map(team => {
                                    const isSelected = newItem.targetTeams.includes(team.id);
                                    return (
                                        <button
                                            type="button"
                                            key={team.id}
                                            onClick={() => {
                                                let newTargets = newItem.targetTeams.filter(t => t !== 'all');
                                                if (isSelected) {
                                                    newTargets = newTargets.filter(t => t !== team.id);
                                                    if (newTargets.length === 0) newTargets = ['all'];
                                                } else {
                                                    newTargets.push(team.id);
                                                }
                                                setNewItem({ ...newItem, targetTeams: newTargets });
                                            }}
                                            aria-pressed={isSelected}
                                            style={{ 
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '11px', cursor: 'pointer', fontWeight: '600', border: 'none',
                                                backgroundColor: isSelected ? '#007bff' : '#e2e8f0',
                                                color: isSelected ? 'white' : '#475569'
                                            }}>
                                            {team.name}
                                        </button>
                                    )
                                })}
                            </div>
                            <textarea
                                placeholder={`${t('details')} (${t('optional')})`}
                                value={newItem.details}
                                onChange={e => setNewItem({ ...newItem, details: e.target.value })}
                                style={{ ...styles.oosInput, minHeight: '60px', resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    placeholder={t('min')}
                                    value={newItem.duration}
                                    onChange={e => setNewItem({ ...newItem, duration: e.target.value })}
                                    style={{ ...styles.oosInput, width: '70px' }}
                                />
                                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '13px' }}>
                                    {editingOosId ? t('save') : t('add')}
                                </button>
                                {editingOosId && (
                                    <button type="button" onClick={handleCancelOOSEdit} style={{ ...styles.cancelBtn, border: '1px solid #e2e8f0', padding: '0 12px' }}>
                                        {t('cancel')}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
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
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' },
    backBtn: { background: 'none', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px', fontWeight: '500', padding: 0 },
    eventInfo: { flex: 1 },
    meta: { display: 'flex', gap: '20px', marginTop: '12px', color: '#64748b', fontSize: '14px' },
    metaItem: { display: 'flex', alignItems: 'center', gap: '6px' },
    statusBadge: { backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '600', color: '#475569' },
    content: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' },
    schedulingSection: { display: 'flex', flexDirection: 'column' },
    teamCard: { marginBottom: '16px', padding: '20px' },
    teamHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    addBtn: { background: '#eff6ff', border: 'none', color: '#007bff', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' },
    assignmentsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
    assignmentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '10px' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#475569' },
    userName: { fontWeight: '600', fontSize: '14px', color: '#1e293b' },
    position: { fontSize: '12px', color: '#64748b' },
    assignmentActions: { display: 'flex', alignItems: 'center', gap: '12px' },
    statusTag: { fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' },
    deleteBtn: { background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' },
    addForm: { marginTop: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' },
    select: { padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', backgroundColor: 'white' },
    cancelBtn: { background: 'none', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer', fontSize: '13px', color: '#64748b' },
    sidePanel: { display: 'flex', flexDirection: 'column' },
    oosList: { display: 'flex', flexDirection: 'column' },
    oosItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' },
    oosNumber: { width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#64748b' },
    oosContent: { flex: 1 },
    oosTitleText: { fontSize: '14px', fontWeight: '600', color: '#1e293b' },
    oosDurationText: { fontSize: '12px', color: '#94a3b8' },
    oosAddForm: { padding: '16px', backgroundColor: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
    oosInput: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', backgroundColor: 'white' }
};

export default EventDetails;
