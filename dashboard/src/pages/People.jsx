import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, setDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { UserPlus, Search, Mail, Calendar, CalendarX } from 'lucide-react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

// Use same config to create a secondary app instance for auth creation
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const People = () => {
    const [people, setPeople] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPerson, setNewPerson] = useState({ name: '', email: '', role: 'volunteer' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPeople();
    }, []);

    const fetchPeople = async () => {
        try {
            const q = query(collection(db, 'users'), orderBy('name', 'asc'));
            const querySnapshot = await getDocs(q);
            const peopleData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPeople(peopleData);
        } catch (err) {
            console.error("Error fetching people:", err);
        }
    };

    const handleAddPerson = async (e) => {
        e.preventDefault();
        setLoading(true);
        let secondaryApp;
        try {
            // 1. Create a secondary app instance to register the user without logging out the current admin
            const secondaryAppName = `secondary-app-${Date.now()}`;
            secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
            const secondaryAuth = getAuth(secondaryApp);

            // 2. Create the user in Firebase Auth with a default password
            const tempPassword = "Mediaebenezer";
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newPerson.email, tempPassword);
            const uid = userCredential.user.uid;

            // 3. Save additional info in Firestore using the UID from Auth
            await setDoc(doc(db, 'users', uid), {
                name: newPerson.name,
                email: newPerson.email,
                role: newPerson.role,
                createdAt: new Date(),
            });

            alert(`¡Usuario creado con éxito!\nEmail: ${newPerson.email}\nContraseña temporal: ${tempPassword}\n\nIndícale al usuario que cambie su contraseña al entrar.`);

            setNewPerson({ name: '', email: '', role: 'volunteer' });
            setShowAddForm(false);
            fetchPeople();
        } catch (err) {
            console.error("Error adding person:", err);
            if (err.code === 'auth/email-already-in-use') {
                alert("Este correo electrónico ya está registrado en la base de datos de autenticación.");
            } else {
                alert("Error al añadir persona: " + err.message);
            }
        } finally {
            if (secondaryApp) {
                await deleteApp(secondaryApp);
            }
            setLoading(false);
        }
    };

    const isUnavailableToday = (blockoutDates) => {
        if (!blockoutDates || blockoutDates.length === 0) return false;
        const today = new Date().toISOString().split('T')[0];
        return blockoutDates.some(range => today >= range.start && today <= range.end);
    };

    const getUpcomingBlockouts = (blockoutDates) => {
        if (!blockoutDates || blockoutDates.length === 0) return [];
        const today = new Date().toISOString().split('T')[0];
        return blockoutDates
            .filter(range => range.end >= today)
            .sort((a, b) => a.start.localeCompare(b.start));
    };

    return (
        <div className="page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>Personas</h1>
                <button
                    className="btn-primary"
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <UserPlus size={18} />
                    Añadir Persona
                </button>
            </div>

            {showAddForm && (
                <div className="card" style={{ marginBottom: '24px', maxWidth: '500px' }}>
                    <h3>Nueva Persona</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                        Al añadir a alguien, se creará automáticamente su cuenta de acceso.
                    </p>
                    <form onSubmit={handleAddPerson} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={styles.inputGroup}>
                            <label>Nombre Completo</label>
                            <input
                                type="text"
                                value={newPerson.name}
                                onChange={e => setNewPerson({ ...newPerson, name: e.target.value })}
                                required
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label>Email</label>
                            <input
                                type="email"
                                value={newPerson.email}
                                onChange={e => setNewPerson({ ...newPerson, email: e.target.value })}
                                required
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label>Rol</label>
                            <select
                                value={newPerson.role}
                                onChange={e => setNewPerson({ ...newPerson, role: e.target.value })}
                                style={styles.input}
                            >
                                <option value="volunteer">Voluntario</option>
                                <option value="leader">Líder de Equipo</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Creando cuenta...' : 'Guardar y Crear Cuenta'}
                            </button>
                            <button type="button" onClick={() => setShowAddForm(false)} style={styles.btnSecondary}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Buscar personas..."
                        style={{ ...styles.input, paddingLeft: '40px', width: '100%', maxWidth: '300px' }}
                    />
                </div>

                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Nombre</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Rol</th>
                            <th style={styles.th}>Disponibilidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {people.length === 0 ? (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                    No hay personas registradas aún.
                                </td>
                            </tr>
                        ) : (
                            people.map(person => (
                                <tr key={person.id} style={styles.tr}>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={styles.avatar}>
                                                {person.name ? person.name.charAt(0) : '?'}
                                            </div>
                                            {person.name}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                                            <Mail size={14} />
                                            {person.email}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{
                                            ...styles.badge,
                                            backgroundColor: person.role === 'admin' ? '#fee2e2' : person.role === 'leader' ? '#e0e7ff' : '#f1f5f9',
                                            color: person.role === 'admin' ? '#991b1b' : person.role === 'leader' ? '#3730a3' : '#475569'
                                        }}>
                                            {person.role === 'admin' ? 'Admin' : person.role === 'leader' ? 'Líder' : 'Voluntario'}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        {/* Status Badge */}
                                        {isUnavailableToday(person.blockoutDates) ? (
                                            <div style={{ ...styles.statusBadge, backgroundColor: '#fee2e2', color: '#991b1b' }}>
                                                <CalendarX size={12} /> No disponible hoy
                                            </div>
                                        ) : (
                                            <div style={{ ...styles.statusBadge, backgroundColor: '#dcfce7', color: '#166534' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#166534' }} /> Disponible
                                            </div>
                                        )}

                                        {/* Upcoming Blockouts */}
                                        {(() => {
                                            const upcoming = getUpcomingBlockouts(person.blockoutDates);
                                            if (upcoming.length > 0) {
                                                return (
                                                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Próximas ausencias:</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            {upcoming.map((range, idx) => (
                                                                <div key={idx} style={{ display: 'flex', gap: '4px' }}>
                                                                    <span>• {range.start} al {range.end}</span>
                                                                    {range.reason && <span style={{ fontStyle: 'italic', opacity: 0.8 }}>({range.reason})</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
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
    },
    btnSecondary: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        backgroundColor: 'white',
        color: '#475569',
        fontWeight: '600',
        cursor: 'pointer',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        textAlign: 'left',
        padding: '12px',
        borderBottom: '2px solid #f1f5f9',
        color: '#64748b',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    tr: {
        borderBottom: '1px solid #f1f5f9',
    },
    td: {
        padding: '16px 12px',
        fontSize: '14px',
    },
    avatar: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: '#eff6ff',
        color: '#007bff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '14px',
    },
    badge: {
        fontSize: '11px',
        fontWeight: '600',
        padding: '4px 8px',
        borderRadius: '6px',
        textTransform: 'capitalize',
        textTransform: 'capitalize',
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '100px',
        fontSize: '11px',
        fontWeight: '600',
    }
};

export default People;
