import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';


const ServiceTypeSettings = () => {
    const { t } = useLanguage();
    const [types, setTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newType, setNewType] = useState({ name: '', color: '#3b82f6' });
    const [editingId, setEditingId] = useState(null);

    const colors = [
        '#3b82f6', // Blue
        '#ef4444', // Red
        '#10b981', // Green
        '#f59e0b', // Amber
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#64748b', // Slate
    ];

    useEffect(() => {
        fetchTypes();
    }, []);

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
            await addDoc(collection(db, 'service_types'), newType);
            setNewType({ name: '', color: '#3b82f6' });
            setIsAdding(false);
            fetchTypes();
        } catch (error) {
            console.error("Error adding service type:", error);
        }
    };

    const handleUpdate = async (id, data) => {
        try {
            await updateDoc(doc(db, 'service_types', id), data);
            setEditingId(null);
            fetchTypes();
        } catch (error) {
            console.error("Error updating service type:", error);
        }
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
                    <div style={styles.row}>
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

                        <div style={styles.actions}>
                            <button onClick={handleAdd} style={{ ...styles.actionBtn, color: '#166534' }}><Check size={18} /></button>
                            <button onClick={() => setIsAdding(false)} style={{ ...styles.actionBtn, color: '#ef4444' }}><X size={18} /></button>
                        </div>
                    </div>
                )}

                {/* List Items */}
                {types.map(type => (
                    <div key={type.id} style={styles.row}>
                        {editingId === type.id ? (
                            <>
                                <div style={styles.colorPicker}>
                                    {colors.map(c => (
                                        <div
                                            key={c}
                                            onClick={() => handleUpdate(type.id, { ...type, color: c })} // Optimistic update for color
                                            style={{
                                                ...styles.colorSwatch,
                                                backgroundColor: c,
                                                border: type.color === c ? '2px solid black' : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                                <input
                                    defaultValue={type.name}
                                    onBlur={(e) => handleUpdate(type.id, { name: e.target.value })}
                                    style={styles.input}
                                />
                                <div style={styles.actions}>
                                    <button onClick={() => setEditingId(null)} style={{ ...styles.actionBtn, color: '#166534' }}><Check size={18} /></button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: type.color }}></div>
                                    <span style={{ fontWeight: '500' }}>{type.name}</span>
                                </div>
                                <div style={styles.actions}>
                                    <button onClick={() => setEditingId(type.id)} style={styles.actionBtn}><Edit2 size={16} /></button>
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
    actionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }
};

export default ServiceTypeSettings;
