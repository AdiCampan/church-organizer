import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Users, Plus, Search, Info, X, Check, UserPlus, Pencil } from 'lucide-react';
import { useLanguage } from '../LanguageContext';


const Teams = () => {
    const { t } = useLanguage();
    const [teams, setTeams] = useState([]);

    const [people, setPeople] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);

    const [editingTeam, setEditingTeam] = useState(null); // stores team ID for member management
    const [editingTeamData, setEditingTeamData] = useState(null); // stores team object for metadata editing
    const [newTeam, setNewTeam] = useState({ name: '', description: '', positions: '' });
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchTeams();
        fetchPeople();
    }, []);

    const fetchTeams = async () => {
        try {
            const q = query(collection(db, 'teams'), orderBy('name', 'asc'));
            const querySnapshot = await getDocs(q);
            const teamsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTeams(teamsData);
        } catch (err) {
            console.error("Error fetching teams:", err);
        }
    };

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

    const handleAddTeam = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const positionsArray = newTeam.positions.split(',').map(p => p.trim()).filter(p => p !== '');

            await addDoc(collection(db, 'teams'), {
                name: newTeam.name,
                description: newTeam.description,
                positions: positionsArray,
                members: [],
                createdAt: new Date(),
            });

            setNewTeam({ name: '', description: '', positions: '' });
            setShowAddForm(false);
            fetchTeams();
        } catch (err) {
            console.error("Error adding team:", err);
            alert(t('errorAddingTeam') === 'errorAddingTeam' ? 'Error al añadir equipo' : t('errorAddingTeam'));
        } finally {

            setLoading(false);
        }
    };

    const handleUpdateTeam = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const positionsArray = editingTeamData.positions.includes(',')
                ? editingTeamData.positions.split(',').map(p => p.trim()).filter(p => p !== '')
                : (Array.isArray(editingTeamData.positions) ? editingTeamData.positions : [editingTeamData.positions]);

            const teamRef = doc(db, 'teams', editingTeamData.id);
            await updateDoc(teamRef, {
                name: editingTeamData.name,
                description: editingTeamData.description,
                positions: positionsArray,
            });

            setEditingTeamData(null);
            fetchTeams();
        } catch (err) {
            console.error("Error updating team:", err);
            alert(t('errorUpdatingTeam') === 'errorUpdatingTeam' ? 'Error al actualizar equipo' : t('errorUpdatingTeam'));
        } finally {

            setLoading(false);
        }
    };

    const openEditModal = (team) => {
        setEditingTeamData({
            ...team,
            positions: team.positions ? team.positions.join(', ') : ''
        });
    };

    const toggleMember = async (teamId, userId) => {
        const team = teams.find(t => t.id === teamId);
        const isMember = team.members?.includes(userId);

        try {
            const teamRef = doc(db, 'teams', teamId);
            if (isMember) {
                await updateDoc(teamRef, {
                    members: arrayRemove(userId)
                });
            } else {
                await updateDoc(teamRef, {
                    members: arrayUnion(userId)
                });
            }
            fetchTeams(); // Refresh to show changes
        } catch (err) {
            console.error("Error toggling member:", err);
        }
    };

    const filteredPeople = people.filter(person =>
        person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>{t('teamsTitle')}</h1>
                <button
                    className="btn-primary"
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={18} />
                    {t('newTeam')}
                </button>
            </div>

            {showAddForm && (
                <div className="card" style={{ marginBottom: '24px', maxWidth: '600px' }}>
                    <h3>{t('createTeamTitle')}</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                        {t('teamsDescription')}
                    </p>
                    <form onSubmit={handleAddTeam} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={styles.inputGroup}>
                            <label>{t('teamName')}</label>
                            <input
                                type="text"
                                value={newTeam.name}
                                onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                                placeholder={t('teamNamePlaceholder')}
                                required
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label>{t('description')}</label>
                            <textarea
                                value={newTeam.description}
                                onChange={e => setNewTeam({ ...newTeam, description: e.target.value })}
                                style={{ ...styles.input, minHeight: '80px' }}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label>{t('positions')}</label>
                            <input
                                type="text"
                                value={newTeam.positions}
                                onChange={e => setNewTeam({ ...newTeam, positions: e.target.value })}
                                placeholder={t('positionsPlaceholder')}
                                style={styles.input}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn-primary" disabled={loading}>{t('create')}</button>
                            <button type="button" onClick={() => setShowAddForm(false)} style={styles.btnSecondary}>{t('cancel')}</button>
                        </div>
                    </form>
                </div>
            )}

            {editingTeamData && (
                <div className="card" style={{ marginBottom: '24px', maxWidth: '600px', border: '1px solid #3b82f6' }}>
                    <h3>{t('editTeam')}</h3>
                    <form onSubmit={handleUpdateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={styles.inputGroup}>
                            <label>{t('teamName')}</label>
                            <input
                                type="text"
                                value={editingTeamData.name}
                                onChange={e => setEditingTeamData({ ...editingTeamData, name: e.target.value })}
                                required
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label>{t('description')}</label>
                            <textarea
                                value={editingTeamData.description}
                                onChange={e => setEditingTeamData({ ...editingTeamData, description: e.target.value })}
                                style={{ ...styles.input, minHeight: '80px' }}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label>{t('positions')}</label>
                            <input
                                type="text"
                                value={editingTeamData.positions}
                                onChange={e => setEditingTeamData({ ...editingTeamData, positions: e.target.value })}
                                style={styles.input}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn-primary" disabled={loading}>{t('save_changes')}</button>
                            <button type="button" onClick={() => setEditingTeamData(null)} style={styles.btnSecondary}>{t('cancel')}</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={styles.grid}>
                {teams.map(team => (
                    <div key={team.id} className="card" style={styles.teamCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{team.name}</h3>
                                <p style={styles.teamDescription}>{team.description}</p>
                            </div>
                            <div style={styles.memberCount}>
                                <Users size={14} />
                                <span>{team.members?.length || 0}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-24px' }}>
                            <button onClick={() => openEditModal(team)} style={{ ...styles.btnAction, color: '#94a3b8' }}>
                                <Pencil size={16} />
                            </button>
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <div style={styles.positionsList}>
                                {team.positions?.map((pos, idx) => (
                                    <span key={idx} style={styles.positionBadge}>{pos}</span>
                                ))}
                            </div>
                        </div>

                        {team.members?.length > 0 && (
                            <div style={styles.membersGrid}>
                                {team.members.map(memberId => {
                                    const person = people.find(p => p.id === memberId);
                                    return person ? (
                                        <div key={memberId} style={styles.memberListItem}>
                                            • {person.name}
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        )}

                        <div style={styles.cardFooter}>
                            <button
                                onClick={() => setEditingTeam(editingTeam === team.id ? null : team.id)}
                                style={styles.btnAction}
                            >
                                <UserPlus size={16} />
                                {editingTeam === team.id ? t('close') : t('manageMembers')}
                            </button>
                        </div>

                        {editingTeam === team.id && (
                            <div style={styles.memberSelection}>
                                <div style={styles.searchBox}>
                                    <Search size={14} color="#64748b" />
                                    <input
                                        type="text"
                                        placeholder={t('searchPerson')}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={styles.searchInput}
                                    />
                                </div>
                                <div style={styles.peopleList}>
                                    {filteredPeople.map(person => {
                                        const isMember = team.members?.includes(person.id);
                                        return (
                                            <div key={person.id} style={styles.personRow} onClick={() => toggleMember(team.id, person.id)}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={styles.miniAvatar}>{person.name.charAt(0)}</div>
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: '600' }}>{person.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{person.email}</div>
                                                    </div>
                                                </div>
                                                <div style={{ ...styles.checkbox, backgroundColor: isMember ? '#007bff' : 'transparent', borderColor: isMember ? '#007bff' : '#cbd5e1' }}>
                                                    {isMember && <Check size={12} color="white" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles = {
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' },
    teamCard: { display: 'flex', flexDirection: 'column', gap: '12px' },
    teamDescription: { fontSize: '13px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' },
    memberCount: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#007bff', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '100px' },
    positionsList: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
    positionBadge: { fontSize: '11px', backgroundColor: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontWeight: '500' },
    cardFooter: { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' },
    btnAction: { background: 'none', border: 'none', color: '#007bff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    input: { padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' },
    btnSecondary: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: '600', cursor: 'pointer' },

    // Member selection styles
    memberSelection: { marginTop: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', maxHeight: '300px', display: 'flex', flexDirection: 'column', gap: '12px' },
    searchBox: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' },
    searchInput: { border: 'none', outline: 'none', fontSize: '13px', flex: 1 },
    peopleList: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' },
    personRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' },
    miniAvatar: { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' },
    checkbox: { width: '18px', height: '18px', borderRadius: '4px', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center' },

    membersGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #f1f5f9'
    },
    memberListItem: {
        fontSize: '11px',
        color: '#64748b',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    }
};

export default Teams;
