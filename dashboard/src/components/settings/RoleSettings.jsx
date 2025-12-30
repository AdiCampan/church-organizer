import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Edit2, Trash2, Plus } from 'lucide-react';

const RoleSettings = () => {
    const [roles, setRoles] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [newRole, setNewRole] = useState({ name: '', permissions: '' }); // permissions as comma‑separated string

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'roles'));
            setRoles(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error('Error fetching roles:', err);
        }
    };

    const handleAddRole = async e => {
        e.preventDefault();
        try {
            const permsArray = newRole.permissions.split(',').map(p => p.trim()).filter(p => p);
            await addDoc(collection(db, 'roles'), { name: newRole.name, permissions: permsArray });
            setNewRole({ name: '', permissions: '' });
            setShowForm(false);
            fetchRoles();
        } catch (err) {
            console.error('Error adding role:', err);
        }
    };

    const handleDeleteRole = async (e, roleId) => {
        e.stopPropagation();
        if (!window.confirm('¿Estás seguro de que quieres eliminar este rol?')) return;
        try {
            await deleteDoc(doc(db, 'roles', roleId));
            fetchRoles();
        } catch (err) {
            console.error('Error deleting role:', err);
        }
    };

    const handleEditRole = (e, role) => {
        e.stopPropagation();
        setEditingRole({ id: role.id, name: role.name, permissions: role.permissions.join(', ') });
        setShowForm(false);
    };

    const handleUpdateRole = async e => {
        e.preventDefault();
        try {
            const permsArray = editingRole.permissions.split(',').map(p => p.trim()).filter(p => p);
            await updateDoc(doc(db, 'roles', editingRole.id), { name: editingRole.name, permissions: permsArray });
            setEditingRole(null);
            fetchRoles();
        } catch (err) {
            console.error('Error updating role:', err);
        }
    };

    return (
        <div>
            <h3>Gestión de Roles y Permisos</h3>

            {/* Add / Edit Form */}
            {showForm && (
                <div className="card" style={{ marginBottom: '24px', maxWidth: '600px' }}>
                    <form onSubmit={handleAddRole} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                placeholder="Nombre del rol"
                                value={newRole.name}
                                onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                                required
                                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                            />
                            <button type="submit" className="btn-primary"><Plus size={16} /> Añadir</button>
                        </div>
                        <textarea
                            placeholder="Permisos (separados por coma)"
                            value={newRole.permissions}
                            onChange={e => setNewRole({ ...newRole, permissions: e.target.value })}
                            rows={2}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                        />
                        <button type="button" onClick={() => setShowForm(false)} style={styles.btnSecondary}>Cancelar</button>
                    </form>
                </div>
            )}

            {editingRole && (
                <div className="card" style={{ marginBottom: '24px', maxWidth: '600px' }}>
                    <form onSubmit={handleUpdateRole} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            type="text"
                            placeholder="Nombre del rol"
                            value={editingRole.name}
                            onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                            required
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                        />
                        <textarea
                            placeholder="Permisos (separados por coma)"
                            value={editingRole.permissions}
                            onChange={e => setEditingRole({ ...editingRole, permissions: e.target.value })}
                            rows={2}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn-primary">Actualizar</button>
                            <button type="button" onClick={() => setEditingRole(null)} style={styles.btnSecondary}>Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Roles List */}
            <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4>Roles existentes</h4>
                    <button type="button" onClick={() => setShowForm(true)} style={styles.btnPrimary}>Nuevo Rol</button>
                </div>
                {roles.map(role => (
                    <div key={role.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <div>
                            <strong>{role.name}</strong>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{role.permissions?.join(', ')}</p>
                        </div>
                        <div>
                            <button type="button" onClick={e => handleEditRole(e, role)} style={styles.btnAction}><Edit2 size={16} /></button>
                            <button type="button" onClick={e => handleDeleteRole(e, role.id)} style={styles.deleteBtn}><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles = {
    btnPrimary: { padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' },
    btnSecondary: { padding: '6px 12px', backgroundColor: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' },
    btnAction: { background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' },
    deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' },
};

export default RoleSettings;
