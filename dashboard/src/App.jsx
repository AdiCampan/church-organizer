import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Settings as SettingsIcon, Bell, LogOut, Music, Megaphone } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

// Components
import Login from './components/Login';
import AlertsMenu from './components/AlertsMenu';
import People from './pages/People';
import Teams from './pages/Teams';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Songs from './pages/Songs';
import Announcements from './pages/Announcements';
import Settings from './pages/Settings';

// Pages (Temporary placeholders)
// const Dashboard = () => (
//   <div className="page">
//     <h1>Dashboard</h1>
//     <div className="card">
//       <p>Bienvenido al organizador de tu iglesia. Aquí verás un resumen de los próximos eventos.</p>
//     </div>
//   </div>
// );

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Set real-time listener for user profile
        const docRef = doc(db, 'users', currentUser.uid);
        const unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          }
        }, (e) => {
          console.error("Error fetching user profile:", e);
        });

        return () => {
          unsubscribeProfile();
        };
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="app-container">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="logo">
            <Calendar size={28} />
            <span>ChurchTeams</span>
          </div>

          <div className="nav-links">
            {/* <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              Dashboard
            </NavLink> */}
            <NavLink to="/events" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Calendar size={20} />
              Eventos
            </NavLink>
            <NavLink to="/teams" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              Equipos
            </NavLink>
            <NavLink to="/songs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Music size={20} />
              Canciones
            </NavLink>
            <NavLink to="/announcements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Megaphone size={20} />
              El Muro
            </NavLink>
            <NavLink to="/people" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              Personas
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <SettingsIcon size={20} />
              Configuración
            </NavLink>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button onClick={handleLogout} className="nav-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
              <LogOut size={20} />
              Cerrar Sesión
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="main-content">
          <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                Hola, {userProfile?.name || user.email?.split('@')[0]}
              </h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Administrador</span>
            </div>
            <div>
              <AlertsMenu />
            </div>
          </header>

          <Routes>
            {/* <Route path="/" element={<Dashboard />} /> */}
            <Route path="/events" element={<Events />} />
            <Route path="/events/:eventId" element={<EventDetails />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/songs" element={<Songs />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/people" element={<People />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
