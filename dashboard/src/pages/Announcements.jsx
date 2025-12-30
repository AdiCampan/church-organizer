import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { Megaphone, Plus, Trash2, Edit2, Users, Send, Bell, Clock, Info, AlertTriangle, MessageSquare } from 'lucide-react';

const Announcements = () => {
    const [posts, setPosts] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        details: '',
        targetTeamId: 'all',
        type: 'announcement'
    });

    useEffect(() => {
        // Fetch teams for the dropdown
        const fetchTeams = async () => {
            const snapshot = await getDocs(collection(db, 'teams'));
            setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchTeams();

        // Subscribe to announcements
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.content) return;

        try {
            if (editingId) {
                // Update existing document
                await updateDoc(doc(db, 'announcements', editingId), {
                    ...formData,
                    updatedAt: serverTimestamp()
                });
            } else {
                // Create new document
                await addDoc(collection(db, 'announcements'), {
                    ...formData,
                    authorId: auth.currentUser?.uid,
                    authorName: auth.currentUser?.email?.split('@')[0] || 'Admin',
                    createdAt: serverTimestamp()
                });
            }
            closeModal();
        } catch (err) {
            console.error("Error creating/updating post:", err);
            alert("Error al publicar");
        }
    };

    const handleEdit = (post) => {
        setEditingId(post.id);
        setFormData({
            title: post.title,
            content: post.content,
            details: post.details || '',
            targetTeamId: post.targetTeamId || 'all',
            type: post.type || 'announcement'
        });
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingId(null);
        setFormData({ title: '', content: '', details: '', targetTeamId: 'all', type: 'announcement' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Eliminar este aviso?")) return;
        try {
            await deleteDoc(doc(db, 'announcements', id));
        } catch (err) {
            console.error(err);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'alert': return <AlertTriangle size={18} color="#ef4444" />;
            case 'important': return <Bell size={18} color="#f59e0b" />;
            default: return <Info size={18} color="#3b82f6" />;
        }
    };

    const getTargetLabel = (id) => {
        if (id === 'all') return 'Todos';
        const team = teams.find(t => t.id === id);
        return team ? team.name : 'Equipo';
    };

    return (
        <div className="page">
            <div style={styles.header}>
                <div>
                    <h1>El Muro</h1>
                    <p style={{ color: '#64748b' }}>Comunícate con tus equipos y voluntarios.</p>
                </div>
                <button className="btn-primary" onClick={() => setShowAddModal(true)} style={styles.addBtn}>
                    <Plus size={18} /> Nuevo Memento
                </button>
            </div>

            <div style={styles.feed}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Cargando avisos...</div>
                ) : posts.length === 0 ? (
                    <div className="card" style={styles.emptyCard}>
                        <Megaphone size={40} color="#e2e8f0" />
                        <p style={{ color: '#94a3b8', marginTop: '12px' }}>Aún no hay mensajes en el muro.</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="card" style={styles.postCard}>
                            <div style={styles.postHeader}>
                                <div style={styles.postMeta}>
                                    <div style={styles.typeIcon}>{getIcon(post.type)}</div>
                                    <div>
                                        <h3 style={styles.postTitle}>{post.title}</h3>
                                        <div style={styles.postSubMeta}>
                                            <span style={styles.author}>{post.authorName}</span>
                                            <span style={styles.dot}>•</span>
                                            <span style={styles.teamTag}>
                                                <Users size={12} /> {getTargetLabel(post.targetTeamId)}
                                            </span>
                                            <span style={styles.dot}>•</span>
                                            <span style={styles.date}>
                                                {post.createdAt?.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleEdit(post)} style={styles.actionBtn}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(post.id)} style={styles.deleteBtn}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div style={styles.postContent}>
                                {post.content}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {
                showAddModal && (
                    <div style={styles.modalOverlay}>
                        <div className="card" style={styles.modal}>
                            <div style={styles.modalHeader}>
                                <h2>{editingId ? 'Editar Memento' : 'Crear Nuevo Memento'}</h2>
                                <button onClick={closeModal} style={styles.closeBtn}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSubmit} style={styles.form}>
                                <div style={styles.inputGroup}>
                                    <label>Título del mensaje</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Ej: Ensayo de alabanza cancelado"
                                        required
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.formRow}>
                                    <div style={styles.inputGroup}>
                                        <label>Dirigido a:</label>
                                        <select
                                            value={formData.targetTeamId}
                                            onChange={e => setFormData({ ...formData, targetTeamId: e.target.value })}
                                            style={styles.input}
                                        >
                                            <option value="all">Todos los equipos</option>
                                            {teams.map(team => (
                                                <option key={team.id} value={team.id}>{team.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={styles.inputGroup}>
                                        <label>Tipo de aviso:</label>
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            style={styles.input}
                                        >
                                            <option value="announcement">General</option>
                                            <option value="important">Importante</option>
                                            <option value="alert">Urgente</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={styles.inputGroup}>
                                    <label>Mensaje</label>
                                    <textarea
                                        value={formData.content}
                                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="Escribe aquí los detalles del anuncio..."
                                        required
                                        style={{ ...styles.input, minHeight: '120px' }}
                                    />
                                </div>

                                <div style={styles.modalFooter}>
                                    <button type="submit" className="btn-primary" style={styles.sendBtn}>
                                        <Send size={18} /> {editingId ? 'Guardar Cambios' : 'Publicar Mensaje'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

// Reuse X icon from Songs or People
const X = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const styles = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
    addBtn: { display: 'flex', alignItems: 'center', gap: '8px' },
    feed: { maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' },
    emptyCard: { textAlign: 'center', padding: '60px', border: '2px dashed #e2e8f0' },
    postCard: { padding: '24px' },
    postHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
    postMeta: { display: 'flex', gap: '16px' },
    typeIcon: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    postTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' },
    postSubMeta: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: '#64748b' },
    teamTag: { display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6', fontWeight: '600', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' },
    dot: { color: '#cbd5e1' },
    postContent: { fontSize: '15px', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
    postDetails: { marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '14px', color: '#64748b', whiteSpace: 'pre-wrap' },
    deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' },
    actionBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' },

    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { width: '90%', maxWidth: '600px', padding: '32px' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    input: { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' },
    modalFooter: { marginTop: '12px', display: 'flex', justifyContent: 'flex-end' },
    sendBtn: { display: 'flex', alignItems: 'center', gap: '8px' }
};

export default Announcements;
