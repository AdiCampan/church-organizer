import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';


const LocationSettings = () => {
    const { t } = useLanguage();
    const [locations, setLocations] = useState([]);

    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newLocation, setNewLocation] = useState({ name: '', address: '' });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ name: '', address: '' });

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'locations'));
            setLocations(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching locations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newLocation.name.trim()) return;
        try {
            await addDoc(collection(db, 'locations'), newLocation);
            setNewLocation({ name: '', address: '' });
            setIsAdding(false);
            fetchLocations();
        } catch (error) {
            console.error("Error adding location:", error);
        }
    };

    const handleUpdate = async (id) => {
        try {
            await updateDoc(doc(db, 'locations', id), editData);
            setEditingId(null);
            fetchLocations();
        } catch (error) {
            console.error("Error updating location:", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('confirmDeleteLocation'))) return;

        try {
            await deleteDoc(doc(db, 'locations', id));
            fetchLocations();
        } catch (error) {
            console.error("Error deleting location:", error);
        }
    };

    const startEdit = (location) => {
        setEditingId(location.id);
        setEditData({ name: location.name, address: location.address || '' });
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={{ margin: 0 }}>{t('locationsTitle')}</h3>
                <button onClick={() => setIsAdding(true)} style={styles.addBtn} disabled={isAdding}>
                    <Plus size={16} /> {t('new')}
                </button>
            </div>


            <div style={styles.list}>
                {/* Add Form */}
                {isAdding && (
                    <div style={styles.row}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input
                                autoFocus
                                placeholder={t('namePlaceholder')}
                                value={newLocation.name}
                                onChange={e => setNewLocation({ ...newLocation, name: e.target.value })}
                                style={styles.input}
                            />
                            <input
                                placeholder={t('addressOptional')}
                                value={newLocation.address}
                                onChange={e => setNewLocation({ ...newLocation, address: e.target.value })}
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.actions}>
                            <button onClick={handleAdd} style={{ ...styles.actionBtn, color: '#166534' }}><Check size={18} /></button>
                            <button onClick={() => setIsAdding(false)} style={{ ...styles.actionBtn, color: '#ef4444' }}><X size={18} /></button>
                        </div>
                    </div>
                )}

                {/* List Items */}
                {locations.map(location => (
                    <div key={location.id} style={styles.row}>
                        {editingId === location.id ? (
                            <>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <input
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        style={styles.input}
                                    />
                                    <input
                                        value={editData.address}
                                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                        placeholder={t('address')}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.actions}>
                                    <button onClick={() => handleUpdate(location.id)} style={{ ...styles.actionBtn, color: '#166534' }}><Check size={18} /></button>
                                    <button onClick={() => setEditingId(null)} style={{ ...styles.actionBtn, color: '#ef4444' }}><X size={18} /></button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{location.name}</div>
                                    {location.address && (
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{location.address}</div>
                                    )}
                                </div>
                                <div style={styles.actions}>
                                    <button onClick={() => startEdit(location)} style={styles.actionBtn}><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(location.id)} style={{ ...styles.actionBtn, color: '#ef4444' }}><Trash2 size={16} /></button>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {!loading && locations.length === 0 && !isAdding && (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                        {t('noLocations')}
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
    actions: { display: 'flex', gap: '8px' },
    actionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }
};

export default LocationSettings;
