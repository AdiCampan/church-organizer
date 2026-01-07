import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Settings as SettingsIcon, Bell, LogOut, Music, Megaphone, RefreshCw } from 'lucide-react';
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
import { useLanguage } from './LanguageContext';

const APP_VERSION = "1.0.6";

function App() {
  const { language, setLanguage, t } = useLanguage();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleManualReset = () => {
    console.log("Manual reset triggered. Clearing storage and signing out...");
    signOut(auth).then(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    });
  };

  useEffect(() => {
    console.log(`[${APP_VERSION}] App mounted. Starting Auth listener...`);
    let unsubscribeProfile = null;

    // Safety timeout: Forced transition after 4 seconds
    const timer = setTimeout(() => {
      console.warn("Safety timeout reached. Transitioning to UI.");
      setLoading(false);
    }, 4000);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth event received. User UID:", currentUser?.uid || "None");
      setUser(currentUser);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        console.log("Syncing profile from Firestore...");
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            console.log("Profile found:", docSnap.data().name);
            setUserProfile(docSnap.data());
          } else {
            console.warn("User profile not found in Firestore. Forced logout...");
            handleManualReset();
          }
          setLoading(false);
          clearTimeout(timer);
        }, (e) => {
          console.error("Firestore error:", e.message);
          setLoading(false);
          clearTimeout(timer);
        });
      } else {
        console.log("No user session found.");
        setUserProfile(null);
        setLoading(false);
        clearTimeout(timer);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      clearTimeout(timer);
    };
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
        backgroundColor: '#f8fafc'
      }}>
        <div className="loader" style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#64748b', fontWeight: '500' }}>{t('loading')}</p>
        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{t('version')} {APP_VERSION}</p>

        <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setLoading(false)}
            style={{ fontSize: '13px', background: 'none', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
          >
            {t('enterAnyway')}
          </button>
          <button
            onClick={handleManualReset}
            style={{ fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={14} /> {t('clearSession')}
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div style={styles.debugOverlay}>
          <p style={{ margin: 0 }}>DEBUG: {import.meta.env.VITE_FIREBASE_PROJECT_ID} (v{APP_VERSION})</p>
          <button
            onClick={() => {
              auth.signOut().then(() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              });
            }}
            style={styles.debugButton}
          >
            FORCE RESET
          </button>
        </div>
        <Login />
      </>
    );
  }

  return (
    <Router>
      <div className="app-container">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="logo">
            <Calendar size={28} />
            <span> CHURCH-TEAMS</span>
          </div>

          <div className="nav-links">
            <NavLink to="/events" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Calendar size={20} />
              {t('events')}
            </NavLink>
            <NavLink to="/teams" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              {t('teams')}
            </NavLink>
            <NavLink to="/songs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Music size={20} />
              {t('songs')}
            </NavLink>
            <NavLink to="/announcements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Megaphone size={20} />
              {t('wall')}
            </NavLink>
            <NavLink to="/people" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              {t('people')}
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <SettingsIcon size={20} />
              {t('settings')}
            </NavLink>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button onClick={handleLogout} className="nav-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
              <LogOut size={20} />
              {t('logout')}
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="main-content">
          <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                {t('hello')}, {userProfile?.name || user.email?.split('@')[0]}
              </h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{t('admin')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="language-switcher" style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                {['es', 'ro', 'en'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      backgroundColor: language === lang ? 'white' : 'transparent',
                      color: language === lang ? '#007bff' : '#64748b',
                      boxShadow: language === lang ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <AlertsMenu />
            </div>
          </header>

          <div className="content-scroll">
            <Routes>
              <Route path="/" element={<Navigate to="/events" />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:eventId" element={<EventDetails />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/songs" element={<Songs />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/people" element={<People />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/events" />} />
            </Routes>
          </div>

          <footer className="footer">
            <p>© {new Date().getFullYear()} ChurchTeams. {t('version')} {APP_VERSION}- {t('footerText')}</p>
          </footer>
        </main>
      </div>
    </Router>
  );
}

const styles = {
  debugOverlay: {
    position: 'fixed',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(0,0,0,0.8)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '11px',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    fontFamily: 'monospace'
  },
  debugButton: {
    backgroundColor: '#ef4444',
    border: 'none',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '10px',
    textTransform: 'uppercase'
  }
};

export default App;
