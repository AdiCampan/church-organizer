import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Calendar, ArrowLeft } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError('Error al iniciar sesión. Verifica tus credenciales.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setMessage('Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.');
            setResetEmail('');
        } catch (err) {
            setError('Error al enviar el correo. Verifica que la dirección sea correcta.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (showForgot) {
        return (
            <div style={styles.container}>
                <div style={styles.loginCard}>
                    <button
                        onClick={() => { setShowForgot(false); setError(''); setMessage(''); }}
                        style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', cursor: 'pointer', marginBottom: '24px', padding: 0 }}
                    >
                        <ArrowLeft size={18} />
                        Volver al inicio
                    </button>

                    <div style={styles.logoContainer}>
                        <h2 style={styles.title}>Restablecer Contraseña</h2>
                        <p style={styles.subtitle}>Escribe tu correo y te enviaremos un enlace para cambiar tu contraseña.</p>
                    </div>

                    <form onSubmit={handleForgotPassword} style={styles.form}>
                        {error && <div style={styles.error}>{error}</div>}
                        {message && <div style={styles.success}>{message}</div>}

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Correo Electrónico</label>
                            <input
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                style={styles.input}
                                placeholder="ejemplo@iglesia.com"
                                required
                            />
                        </div>

                        <button type="submit" disabled={loading} style={styles.button}>
                            {loading ? 'Enviando...' : 'Enviar enlace'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

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
                        <button
                            type="button"
                            onClick={() => { setShowForgot(true); setError(''); setMessage(''); }}
                            style={{ background: 'none', border: 'none', color: '#007bff', fontSize: '13px', textAlign: 'right', cursor: 'pointer', padding: '4px 0' }}
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
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
    },
    success: {
        backgroundColor: '#f0fdf4',
        color: '#166534',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '14px',
        border: '1px solid #dcfce7',
        marginBottom: '16px',
    }
};

export default Login;
