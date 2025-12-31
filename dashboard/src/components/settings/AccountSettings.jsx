import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { User, Phone, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';

const AccountSettings = () => {
    const [profile, setProfile] = useState({ name: '', phone: '' });
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (auth.currentUser) {
                const docRef = doc(db, 'users', auth.currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfile({
                        name: data.name || '',
                        phone: data.phone || ''
                    });
                }
            }
        };
        fetchProfile();
    }, []);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const docRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(docRef, {
                name: profile.name,
                phone: profile.phone
            }, { merge: true });
            setSuccess('Perfil actualizado correctamente.');
        } catch (err) {
            console.error("Error updating profile:", err);
            setError('Error al actualizar el perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (passwords.new !== passwords.confirm) {
            setError('Las contraseñas nuevas no coinciden.');
            return;
        }

        if (passwords.new.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setPassLoading(true);
        try {
            const user = auth.currentUser;

            // Firebase requires recent login for password changes
            // We attempt re-authentication first to be safe
            const credential = EmailAuthProvider.credential(user.email, passwords.current);
            await reauthenticateWithCredential(user, credential);

            await updatePassword(user, passwords.new);
            setSuccess('Contraseña actualizada correctamente.');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            console.error("Error changing password:", err);
            if (err.code === 'auth/wrong-password') {
                setError('La contraseña actual es incorrecta.');
            } else if (err.code === 'auth/requires-recent-login') {
                setError('Por seguridad, debes cerrar sesión y volver a entrar para cambiar la contraseña.');
            } else {
                setError('Error al cambiar la contraseña: ' + err.message);
            }
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px' }}>
            <h3 style={{ marginBottom: '24px' }}>Mi Cuenta</h3>

            {error && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#b91c1c', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {success && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#166534', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <CheckCircle size={18} /> {success}
                </div>
            )}

            {/* Profile Info */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={18} color="#3b82f6" /> Información Personal
                </h4>
                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Nombre Completo</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Teléfono</label>
                        <div style={{ position: 'relative' }}>
                            <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                style={{ ...styles.input, paddingLeft: '40px' }}
                                placeholder="+34 600 000 000"
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Save size={18} />
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </form>
            </div>

            {/* Password Change */}
            <div className="card">
                <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={18} color="#ef4444" /> Cambiar Contraseña
                </h4>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                    Por seguridad, se te pedirá tu contraseña actual antes de establecer una nueva.
                </p>
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Contraseña Actual</label>
                        <input
                            type="password"
                            value={passwords.current}
                            onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Nueva Contraseña</label>
                        <input
                            type="password"
                            value={passwords.new}
                            onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Confirmar Nueva Contraseña</label>
                        <input
                            type="password"
                            value={passwords.confirm}
                            onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                            style={styles.input}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={passLoading} style={{ alignSelf: 'flex-start', backgroundColor: '#ef4444' }}>
                        {passLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                </form>
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
    label: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#475569',
    },
    input: {
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '14px',
        outline: 'none',
        width: '100%',
    }
};

export default AccountSettings;
