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
    const [activeTab, setActiveTab] = useState('account');

    const tabs = [
        { id: 'account', label: t('myAccount'), icon: <Users size={18} /> },
        { id: 'service_types', label: t('serviceTypes'), icon: <LayoutList size={18} /> },
        { id: 'locations', label: t('locationsTitle'), icon: <MapPin size={18} /> },
        { id: 'roles', label: t('rolesAndPermissions'), icon: <Users size={18} /> },
        { id: 'tags', label: t('tags'), icon: <Hash size={18} /> },
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
    placeholder: { color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' }
};

export default Settings;
