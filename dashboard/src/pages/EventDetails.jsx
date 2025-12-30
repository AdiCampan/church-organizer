import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Calendar, Users, Clock, MapPin, UserPlus, Trash2, Edit2, ArrowLeft, CheckCircle, Plus, Music } from 'lucide-react';

const EventDetails = () => {
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
    const [newItem, setNewItem] = useState({ title: '', duration: '', songId: '', details: '' });
    const [editingOosId, setEditingOosId] = useState(null); // ID of item being edited

    useEffect(() => {
        fetchTeams();
        fetchPeople();
        fetchSongs();

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
            unsubSchedules();
            unsubEvent();
        };
    }, [eventId]);

    const fetchTeams = async () => {
        const querySnapshot = await getDocs(collection(db, 'teams'));
        setTeams(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const fetchPeople = async () => {
        const querySnapshot = await getDocs(collection(db, 'users'));
        // Include blockoutDates in the state
        setAvailablePeople(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const fetchSongs = async () => {
        const querySnapshot = await getDocs(collection(db, 'songs'));
        setAllSongs(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

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
            alert("Error al asignar");
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
        if (!newItem.title || !newItem.duration) return;

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
            setNewItem({ title: '', duration: '', songId: '', details: '' });
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
            details: item.details || ''
        });
    };

    const handleCancelOOSEdit = () => {
        setEditingOosId(null);
        setNewItem({ title: '', duration: '', songId: '', details: '' });
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

    const isUserAvailable = (user) => {
        if (!event || !event.date || !user.blockoutDates) return true;

        const eventDateStr = event.date.toDate().toISOString().split('T')[0];

        // check intersection with blockout dates
        return !user.blockoutDates.some(range =>
            eventDateStr >= range.start && eventDateStr <= range.end
        );
    };

    if (loading || !event) return <div className="page">Cargando...</div>;

    return (
        <div className="page">
            <button onClick={() => navigate('/events')} style={styles.backBtn}>
                <ArrowLeft size={16} /> Volver a eventos
            </button>

            <div style={styles.header}>
                <div style={styles.eventInfo}>
                    <h1>{event.title}</h1>
                    <div style={styles.meta}>
                        <div style={styles.metaItem}><Calendar size={16} /> {event.date?.toDate().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                        <div style={styles.metaItem}><Clock size={16} /> {event.date?.toDate().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div style={styles.metaItem}><MapPin size={16} /> {event.location || 'Sin ubicación'}</div>
                    </div>
                </div>
                <div style={styles.statusBadge}>
                    {event.status === 'published' ? 'Publicado' : 'Borrador'}
                </div>
            </div>

            <div style={styles.content}>
                {/* Teams & Scheduling */}
                <div style={styles.schedulingSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Users size={20} color="#64748b" />
                        <h2 style={{ margin: 0 }}>Equipos y Personas</h2>
                    </div>

                    {teams.map(team => (
                        <div key={team.id} className="card" style={styles.teamCard}>
                            <div style={styles.teamHeader}>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>{team.name}</h3>
                                <button
                                    onClick={() => setShowAddMember(team.id)}
                                    style={styles.addBtn}
                                >
                                    <Plus size={14} /> Añadir
                                </button>
                            </div>

                            <div style={styles.assignmentsList}>
                                {assignments.filter(a => a.teamId === team.id).length === 0 ? (
                                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '8px 0' }}>Nadie asignado aún.</p>
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
                                                        <CheckCircle size={10} /> Confirmado
                                                    </div>
                                                ) : assignment.status === 'declined' ? (
                                                    <div style={{ ...styles.statusTag, backgroundColor: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Users size={10} /> Rechazado
                                                    </div>
                                                ) : (
                                                    <span style={{ ...styles.statusTag, backgroundColor: '#f1f5f9', color: '#475569' }}>
                                                        Pendiente
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
                                        <option value="">Selecciona persona...</option>
                                        {availablePeople
                                            .filter(p => team.members?.includes(p.id))
                                            .map(p => {
                                                const isAvailable = isUserAvailable(p);
                                                return (
                                                    <option key={p.id} value={p.id} disabled={!isAvailable}>
                                                        {p.name} {!isAvailable ? '(NO DISPONIBLE)' : ''}
                                                    </option>
                                                );
                                            })
                                        }
                                        {team.members?.length === 0 && (
                                            <option disabled>No hay miembros en este equipo</option>
                                        )}
                                    </select>
                                    <select
                                        value={selectedPosition}
                                        onChange={e => setSelectedPosition(e.target.value)}
                                        style={styles.select}
                                    >
                                        <option value="">Posición...</option>
                                        {team.positions?.map((p, i) => (
                                            <option key={i} value={p}>{p}</option>
                                        ))}
                                    </select>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleAssign(team.id)} className="btn-primary" style={{ flex: 1, padding: '8px' }}>Guardar</button>
                                        <button onClick={() => setShowAddMember(null)} style={styles.cancelBtn}>Cancelar</button>
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
                        <h2 style={{ margin: 0 }}>Orden de Servicio</h2>
                    </div>

                    <div className="card" style={{ padding: '0' }}>
                        <div style={styles.oosList}>
                            {oos.length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '14px', padding: '24px', textAlign: 'center' }}>No hay elementos definidos.</p>
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
                                                {item.duration} min
                                                {item.songId && ` • ${allSongs.find(s => s.id === item.songId)?.title}`}
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
                            {editingOosId && <div style={{ fontSize: '12px', fontWeight: '700', color: '#007bff', marginBottom: '4px' }}>Editando momento...</div>}
                            <input
                                type="text"
                                placeholder="Momento (ej: Bienvenida)"
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
                                <option value="">(Sin canción)</option>
                                {allSongs.map(s => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </select>
                            <textarea
                                placeholder="Detalles (opcional)"
                                value={newItem.details}
                                onChange={e => setNewItem({ ...newItem, details: e.target.value })}
                                style={{ ...styles.oosInput, minHeight: '60px', resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={newItem.duration}
                                    onChange={e => setNewItem({ ...newItem, duration: e.target.value })}
                                    style={{ ...styles.oosInput, width: '70px' }}
                                    required
                                />
                                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '13px' }}>
                                    {editingOosId ? 'Guardar' : 'Añadir'}
                                </button>
                                {editingOosId && (
                                    <button type="button" onClick={handleCancelOOSEdit} style={{ ...styles.cancelBtn, border: '1px solid #e2e8f0', padding: '0 12px' }}>
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
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
    content: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' },
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
