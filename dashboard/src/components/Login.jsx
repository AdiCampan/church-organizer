import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Calendar } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Success is handled by auth state observer in App.jsx
        } catch (err) {
            setError('Error al iniciar sesión. Verifica tus credenciales.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginCard}>
                <div style={styles.logoContainer}>
                    <Calendar size={48} color="#007bff" />
                    <h1 style={styles.title}>ChurchOrg</h1>
                    <p style={styles.subtitle}>Inicia sesión para gestionar tu iglesia</p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    {error && <div style={styles.error}>{error}</div>}

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Correo Electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            placeholder="ejemplo@iglesia.com"
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" disabled={loading} style={styles.button}>
                        {loading ? 'Entrando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#f8fafc',
    },
    loginCard: {
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: '400px',
    },
    logoContainer: {
        textAlign: 'center',
        marginBottom: '32px',
    },
    title: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#1e293b',
        marginTop: '16px',
        marginBottom: '8px',
    },
    subtitle: {
        color: '#64748b',
        fontSize: '14px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
    },
    input: {
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '16px',
        outline: 'none',
    },
    button: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '8px',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#b91c1c',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '14px',
        border: '1px solid #fee2e2',
    }
};

export default Login;
