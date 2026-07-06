import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X, MapPin } from 'lucide-react';
import { useLanguage } from '../../useLanguage';


const ServiceTypeSettings = () => {
    const { t } = useLanguage();
    const [types, setTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newType, setNewType] = useState({ name: '', color: '#3b82f6', defaultStartTime: '', dayOfWeek: '', locationId: '', isRehearsal: false, requiredTeams: [] });
    const [editingId, setEditingId] = useState(null);
    const [editType, setEditType] = useState(null);
    const [teams, setTeams] = useState([]);
    const [locations, setLocations] = useState([]);

    const colors = [
        '#3b82f6', // Blue
        '#ef4444', // Red
        '#10b981', // Green
        '#f59e0b', // Amber
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#64748b', // Slate
    ];

    const days = [
        { id: '1', name: t('monday') },
        { id: '2', name: t('tuesday') },
        { id: '3', name: t('wednesday') },
        { id: '4', name: t('thursday') },
        { id: '5', name: t('friday') },
        { id: '6', name: t('saturday') },
        { id: '0', name: t('sunday') },
    ];

    useEffect(() => {
        fetchTypes();
        fetchTeams();
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'locations'));
            setLocations(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching locations:", error);
        }
    };

    const fetchTeams = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'teams'));
            setTeams(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching teams:", error);
        }
    };

    const fetchTypes = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'service_types'));
            setTypes(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching service types:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newType.name.trim()) return;
        try {
            if (newType.isRehearsal) {
                const batch = writeBatch(db);
                types.forEach(type => {
                    if (type.isRehearsal) {
                        batch.update(doc(db, 'service_types', type.id), { isRehearsal: false });
                    }
                });
                const serviceTypeRef = doc(collection(db, 'service_types'));
                batch.set(serviceTypeRef, {
                    ...newType,
                    createdAt: new Date()
                });
                await batch.commit();
            } else {
                await addDoc(collection(db, 'service_types'), {
                    ...newType,
                    createdAt: new Date()
                });
            }
            setNewType({ name: '', color: '#3b82f6', defaultStartTime: '', dayOfWeek: '', locationId: '', isRehearsal: false, requiredTeams: [] });
            setIsAdding(false);
            fetchTypes();
        } catch (error) {
            console.error("Error adding service type:", error);
        }
    };

    const handleUpdate = async (id, data) => {
        try {
            if (data.isRehearsal) {
                const batch = writeBatch(db);
                types.forEach(type => {
                    if (type.id !== id && type.isRehearsal) {
                        batch.update(doc(db, 'service_types', type.id), { isRehearsal: false });
                    }
                });
                batch.update(doc(db, 'service_types', id), data);
                await batch.commit();
            } else {
                await updateDoc(doc(db, 'service_types', id), data);
            }
            setEditingId(null);
            setEditType(null);
            fetchTypes();
        } catch (error) {
            console.error("Error updating service type:", error);
        }
    };

    const toggleTeam = (type, setType, team) => {
        const isSelected = type.requiredTeams.some(rt => rt.teamId === team.id);
        if (isSelected) {
            setType({
                ...type,
                requiredTeams: type.requiredTeams.filter(rt => rt.teamId !== team.id)
            });
        } else {
            setType({
                ...type,
                requiredTeams: [...type.requiredTeams, { teamId: team.id, teamName: team.name, positions: [] }]
            });
        }
    };

    const togglePosition = (type, setType, teamId, position) => {
        const updatedRequiredTeams = type.requiredTeams.map(rt => {
            if (rt.teamId === teamId) {
                const hasPosition = rt.positions.includes(position);
                return {
                    ...rt,
                    positions: hasPosition
                        ? rt.positions.filter(p => p !== position)
                        : [...rt.positions, position]
                };
            }
            return rt;
        });
        setType({ ...type, requiredTeams: updatedRequiredTeams });
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('confirmDeleteServiceType'))) return;

        try {
            await deleteDoc(doc(db, 'service_types', id));
            fetchTypes();
        } catch (error) {
            console.error("Error deleting service type:", error);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={{ margin: 0 }}>{t('serviceTypes')}</h3>
                <button onClick={() => setIsAdding(true)} style={styles.addBtn} disabled={isAdding}>
                    <Plus size={16} /> {t('new')}
                </button>
            </div>


            <div style={styles.list}>
                {/* Add Form */}
                {isAdding && (
                    <div style={{ ...styles.row, flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={styles.colorPicker}>
                                {colors.map(c => (
                                    <div
                                        key={c}
                                        onClick={() => setNewType({ ...newType, color: c })}
                                        style={{
                                            ...styles.colorSwatch,
                                            backgroundColor: c,
                                            border: newType.color === c ? '2px solid black' : 'none'
                                        }}
                                    />
                                ))}
                            </div>
                            <input
                                autoFocus
                                placeholder={t('serviceTypeNamePlaceholder')}
                                value={newType.name}
                                onChange={e => setNewType({ ...newType, name: e.target.value })}
                                style={styles.input}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '12px', color: '#64748b' }}>{t('defaultStartTime')}:</label>
                                <input
                                    type="time"
                                    value={newType.defaultStartTime}
                                    onChange={e => setNewType({ ...newType, defaultStartTime: e.target.value })}
                                    style={{ ...styles.input, flex: 'none', width: '120px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '12px', color: '#64748b' }}>{t('dayOfWeek')}:</label>
                                <select
                                    value={newType.dayOfWeek}
                                    onChange={e => setNewType({ ...newType, dayOfWeek: e.target.value })}
                                    style={{ ...styles.input, flex: 'none', width: '150px' }}
                                >
                                    <option value="">--</option>
                                    {days.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                                <input
                                    type="checkbox"
                                    checked={newType.isRehearsal}
                                    onChange={e => setNewType({ ...newType, isRehearsal: e.target.checked })}
                                />
                                {t('rehearsalServiceType')}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '12px', color: '#64748b' }}>{t('location')}:</label>
                                <select
                                    value={newType.locationId || ''}
                                    onChange={e => setNewType({ ...newType, locationId: e.target.value })}
                                    style={{ ...styles.input, flex: 'none', width: '150px' }}
                                >
                                    <option value="">{t('noLocation')}</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.actions}>
                                <button onClick={handleAdd} style={{ ...styles.actionBtn, color: '#166534' }}><Check size={18} /></button>
                                <button onClick={() => setIsAdding(false)} style={{ ...styles.actionBtn, color: '#ef4444' }}><X size={18} /></button>
                            </div>
                        </div>

                        <div style={styles.teamsSection}>
                            <h4 style={styles.sectionTitle}>{t('teams')}</h4>
                            <div style={styles.teamsGrid}>
                                {teams.map(team => {
                                    const isSelected = newType.requiredTeams.some(rt => rt.teamId === team.id);
                                    const requiredTeam = newType.requiredTeams.find(rt => rt.teamId === team.id);

                                    return (
                                        <div key={team.id} style={styles.teamSelector}>
                                            <label style={styles.teamLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleTeam(newType, setNewType, team)}
                                                />
                                                {team.name}
                                            </label>
                                            {isSelected && team.positions && (
                                                <div style={styles.positionsGrid}>
                                                    {team.positions.map(pos => (
                                                        <label key={pos} style={styles.positionLabel}>
                                                            <input
                                                                type="checkbox"
                                                                checked={requiredTeam.positions.includes(pos)}
                                                                onChange={() => togglePosition(newType, setNewType, team.id, pos)}
                                                            />
                                                            {pos}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* List Items */}
                {types.map(type => (
                    <div key={type.id} style={styles.row}>
                        {editingId === type.id ? (
                            <div style={{ ...styles.row, flex: 1, flexDirection: 'column', alignItems: 'stretch' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={styles.colorPicker}>
                                        {colors.map(c => (
                                            <div
                                                key={c}
                                                onClick={() => setEditType({ ...editType, color: c })}
                                                style={{
                                                    ...styles.colorSwatch,
                                                    backgroundColor: c,
                                                    border: editType.color === c ? '2px solid black' : 'none'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <input
                                        value={editType.name}
                                        onChange={(e) => setEditType({ ...editType, name: e.target.value })}
                                        style={styles.input}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <label style={{ fontSize: '12px', color: '#64748b' }}>{t('defaultStartTime')}:</label>
                                        <input
                                            type="time"
                                            value={editType.defaultStartTime}
                                            onChange={e => setEditType({ ...editType, defaultStartTime: e.target.value })}
                                            style={{ ...styles.input, flex: 'none', width: '120px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <label style={{ fontSize: '12px', color: '#64748b' }}>{t('dayOfWeek')}:</label>
                                        <select
                                            value={editType.dayOfWeek}
                                            onChange={e => setEditType({ ...editType, dayOfWeek: e.target.value })}
                                            style={{ ...styles.input, flex: 'none', width: '150px' }}
                                        >
                                            <option value="">--</option>
                                            {days.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(editType.isRehearsal)}
                                            onChange={e => setEditType({ ...editType, isRehearsal: e.target.checked })}
                                        />
                                        {t('rehearsalServiceType')}
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '12px', color: '#64748b' }}>{t('location')}:</label>
                                <select
                                    value={editType.locationId || ''}
                                    onChange={e => setEditType({ ...editType, locationId: e.target.value })}
                                    style={{ ...styles.input, flex: 'none', width: '150px' }}
                                >
                                    <option value="">{t('noLocation')}</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.actions}>
                                        <button onClick={() => handleUpdate(type.id, editType)} style={{ ...styles.actionBtn, color: '#166534' }}><Check size={18} /></button>
                                        <button onClick={() => { setEditingId(null); setEditType(null); }} style={{ ...styles.actionBtn, color: '#ef4444' }}><X size={18} /></button>
                                    </div>
                                </div>

                                <div style={styles.teamsSection}>
                                    <h4 style={styles.sectionTitle}>{t('teams')}</h4>
                                    <div style={styles.teamsGrid}>
                                        {teams.map(team => {
                                            const isSelected = editType.requiredTeams?.some(rt => rt.teamId === team.id);
                                            const requiredTeam = editType.requiredTeams?.find(rt => rt.teamId === team.id);

                                            return (
                                                <div key={team.id} style={styles.teamSelector}>
                                                    <label style={styles.teamLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleTeam(editType, setEditType, team)}
                                                        />
                                                        {team.name}
                                                    </label>
                                                    {isSelected && team.positions && (
                                                        <div style={styles.positionsGrid}>
                                                            {team.positions.map(pos => (
                                                                <label key={pos} style={styles.positionLabel}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={requiredTeam.positions.includes(pos)}
                                                                        onChange={() => togglePosition(editType, setEditType, team.id, pos)}
                                                                    />
                                                                    {pos}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: type.color }}></div>
                                        <span style={{ fontWeight: '500' }}>{type.name}</span>
                                    </div>
                                    {type.dayOfWeek !== undefined && type.dayOfWeek !== '' && (
                                        <div style={{ fontSize: '12px', color: '#94a3b8', paddingLeft: '28px', marginTop: '-4px' }}>
                                            {t('dayOfWeek')}: {days.find(d => d.id === type.dayOfWeek)?.name}
                                            {type.defaultStartTime && ` @ ${type.defaultStartTime}`}
                                        </div>
                                    )}
                                    {type.locationId && (
                                        <div style={{ fontSize: '12px', color: '#94a3b8', paddingLeft: '28px', marginTop: '-4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={10} /> 
                                            {locations.find(l => l.id === type.locationId)?.name || ''}
                                        </div>
                                    )}
                                    {type.isRehearsal && (
                                        <div style={{ fontSize: '12px', color: '#007bff', paddingLeft: '28px', marginTop: '-4px', fontWeight: '600' }}>
                                            {t('rehearsalServiceType')}
                                        </div>
                                    )}
                                    {type.requiredTeams?.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingLeft: '28px' }}>
                                            {type.requiredTeams.map(rt => (
                                                <div key={rt.teamId} style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                                                    <strong>{rt.teamName}:</strong> {rt.positions.join(', ')}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={styles.actions}>
                                    <button onClick={() => { setEditingId(type.id); setEditType({ ...type, defaultStartTime: type.defaultStartTime || '', dayOfWeek: type.dayOfWeek || '', locationId: type.locationId || '', isRehearsal: Boolean(type.isRehearsal), requiredTeams: type.requiredTeams || [] }); }} style={styles.actionBtn}><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(type.id)} style={{ ...styles.actionBtn, color: '#ef4444' }}><Trash2 size={16} /></button>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {!loading && types.length === 0 && !isAdding && (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                        {t('noServiceTypes')}
                    </p>
                )}

            </div>
        </div>
    );
};

const styles = {
    container: { maxWidth: '800px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    addBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
    list: { display: 'flex', flexDirection: 'column', gap: '12px' },
    row: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    input: { flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' },
    colorPicker: { display: 'flex', gap: '6px' },
    colorSwatch: { width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer' },
    actions: { display: 'flex', gap: '8px' },
    actionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' },
    teamsSection: { marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' },
    sectionTitle: { fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#475569' },
    teamsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
    teamSelector: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' },
    teamLabel: { fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
    positionsGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px', paddingLeft: '22px' },
    positionLabel: { fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }
};

export default ServiceTypeSettings;
