import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';

import { LayoutList, MapPin, Users, Hash } from 'lucide-react';
import ServiceTypeSettings from '../components/settings/ServiceTypeSettings';
import LocationSettings from '../components/settings/LocationSettings';
import RoleSettings from '../components/settings/RoleSettings';
import SongTagSettings from '../components/settings/SongTagSettings';
import AccountSettings from '../components/settings/AccountSettings';

const Settings = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('service_types');

    const tabs = [
        { id: 'service_types', label: t('serviceTypes'), icon: <LayoutList size={18} /> },
        { id: 'locations', label: t('locationsTitle'), icon: <MapPin size={18} /> },
        { id: 'roles', label: t('rolesAndPermissions'), icon: <Users size={18} /> },
        { id: 'tags', label: t('tags'), icon: <Hash size={18} /> },
        { id: 'account', label: t('myAccount'), icon: <Users size={18} /> },
        { id: 'support', label: t('techSupport'), icon: <Hash size={18} /> },
    ];


    const renderContent = () => {
        switch (activeTab) {
            case 'account':
                return <AccountSettings />;
            case 'service_types':
                return <ServiceTypeSettings />;
            case 'locations':
                return <LocationSettings />;
            case 'roles':
                return <RoleSettings />;
            case 'tags':
                return <SongTagSettings />;
            case 'support':
                return (
                    <div style={styles.supportContainer}>
                        <h3 style={{ marginBottom: '16px' }}>{t('techSupport')}</h3>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>{t('supportDescription')}</p>

                        <div style={styles.supportInfo}>
                            <div style={styles.supportItem}>
                                <strong>{t('version')}:</strong> <span>1.0.5</span>
                            </div>
                            <div style={styles.supportItem}>
                                <strong>{t('contactEmail')}:</strong> <a href="mailto:adicampan1974@gmail.com" style={{ color: '#3b82f6' }}>adicampan1974@gmail.com</a>
                            </div>
                            <div style={styles.supportItem}>
                                <strong>{t('contactPhone')}:</strong> <a href="tel:+34 637951683" style={{ color: '#3b82f6' }}>+34637951683</a>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="page" style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            {/* Sidebar Navigation */}
            <div style={styles.sidebar}>
                <h2 style={{ fontSize: '20px', marginBottom: '24px', paddingLeft: '12px' }}>{t('configTitle')}</h2>

                <div style={styles.nav}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                ...styles.navItem,
                                backgroundColor: activeTab === tab.id ? '#eff6ff' : 'transparent',
                                color: activeTab === tab.id ? '#3b82f6' : '#64748b'
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={styles.content}>
                {renderContent()}
            </div>
        </div>
    );
};

const styles = {
    sidebar: { width: '240px', flexShrink: 0 },
    nav: { display: 'flex', flexDirection: 'column', gap: '4px' },
    navItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', textAlign: 'left', transition: 'all 0.2s' },
    content: { flex: 1, backgroundColor: '#f8fafc', padding: '32px', borderRadius: '16px', minHeight: '80vh' },
    placeholder: { color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' },
    supportContainer: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' },
    supportInfo: { display: 'flex', flexDirection: 'column', gap: '12px' },
    supportItem: { display: 'flex', gap: '8px', fontSize: '15px', color: '#1e293b' }
};

export default Settings;
