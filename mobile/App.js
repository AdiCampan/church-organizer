import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Users, Bell, LogOut, MapPin, Clock, CheckCircle, ChevronDown, ChevronUp, Music, FileText, Play, ExternalLink, Megaphone, Info, AlertTriangle, Settings, X, MinusCircle } from 'lucide-react-native';
import { auth, db } from './src/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, onSnapshot, where, doc, updateDoc, getDocs, orderBy, setDoc, getDoc, arrayUnion, arrayRemove, addDoc, deleteDoc } from 'firebase/firestore';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';

const translations = {
  es: {
    loginTitle: 'ChurchOrg Mobile',
    loginSubtitle: 'Accede a tu agenda de servicio',
    email: 'Email',
    password: 'Contraseña',
    enter: 'Entrar',
    forgotPassword: '¿Olvidaste tu contraseña?',
    loading: 'Cargando...',
    agenda: 'Agenda',
    teams: 'Equipos',
    wall: 'El Muro',
    myAssignments: 'Mis Asignaciones',
    noAssignments: 'No tienes servicios asignados aún',
    noAnnouncements: 'No hay comunicados recientes',
    noTeams: 'No hay equipos definidos aún',
    settingsTitle: 'Ajustes de Disponibilidad',
    blockedDates: 'Fechas Bloqueadas',
    addBlockout: 'Añadir Bloqueo',
    from: 'Desde',
    until: 'Hasta',
    reason: 'Razón (Opcional)',
    noBlockedDates: 'No tienes fechas bloqueadas.',
    confirm: 'Confirmar',
    decline: 'Rechazar',
    confirmed: 'Confirmado',
    declined: 'Rechazado',
    myTeam: 'MI EQUIPO',
    orderOfService: 'ORDEN DEL SERVICIO',
    noOrder: 'No hay orden de servicio detallada aún',
    members: 'integrantes',
    description: 'Descripción',
    language: 'Idioma'
  },
  ro: {
    loginTitle: 'ChurchOrg Mobile',
    loginSubtitle: 'Accesează agenda de serviciu',
    email: 'Email',
    password: 'Parolă',
    enter: 'Intră',
    forgotPassword: 'Ai uitat parola?',
    loading: 'Se încarcă...',
    agenda: 'Agendă',
    teams: 'Echipe',
    wall: 'Anunțuri',
    myAssignments: 'Alocările mele',
    noAssignments: 'Nu ai servicii alocate încă',
    noAnnouncements: 'Nu sunt anunțuri recente',
    noTeams: 'Nu sunt echipe definite încă',
    settingsTitle: 'Setări Disponibilitate',
    blockedDates: 'Date Blocate',
    addBlockout: 'Adaugă Blocaj',
    from: 'De la',
    until: 'Până la',
    reason: 'Motiv (Opțional)',
    noBlockedDates: 'Nu ai date blocate.',
    confirm: 'Confirmă',
    decline: 'Refuză',
    confirmed: 'Confirmat',
    declined: 'Refuzat',
    myTeam: 'ECHIPA MEA',
    orderOfService: 'ORDINEA SERVICIULUI',
    noOrder: 'Nu există o ordine de serviciu detaliată încă',
    members: 'membri',
    description: 'Descriere',
    language: 'Limbă'
  },
  en: {
    loginTitle: 'ChurchOrg Mobile',
    loginSubtitle: 'Access your service schedule',
    email: 'Email',
    password: 'Password',
    enter: 'Enter',
    forgotPassword: 'Forgot password?',
    loading: 'Loading...',
    agenda: 'Agenda',
    teams: 'Teams',
    wall: 'The Wall',
    myAssignments: 'My Assignments',
    noAssignments: 'You have no assigned services yet',
    noAnnouncements: 'No recent announcements',
    noTeams: 'No teams defined yet',
    settingsTitle: 'Availability Settings',
    blockedDates: 'Blocked Dates',
    addBlockout: 'Add Blockout',
    from: 'From',
    until: 'Until',
    reason: 'Reason (Optional)',
    noBlockedDates: 'You have no blocked dates.',
    confirm: 'Confirm',
    decline: 'Decline',
    confirmed: 'Confirmed',
    declined: 'Declined',
    myTeam: 'MY TEAM',
    orderOfService: 'ORDER OF SERVICE',
    noOrder: 'No detailed order of service yet',
    members: 'members',
    description: 'Description',
    language: 'Language'
  }
};


// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Helper function to register for push notifications
async function registerForPushNotificationsAsync() {
  let token;

  try {
    console.log('Starting push registration...');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return;
      }

      const EXPO_PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId ?? '4e97cd73-f633-4e29-9d97-a2972277401c';

      const expoTokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PROJECT_ID,
      });

      token = expoTokenResponse.data;
      console.log('Token successfully generated');
    }
  } catch (error) {
    console.error('Push registration error:', error);
  }

  return token;
}

// Save push token to Firestore
async function savePushToken(userId, token) {
  try {
    await setDoc(doc(db, 'fcmTokens', userId), {
      userId: userId,
      token: token,
      platform: Platform.OS,
      updatedAt: new Date()
    });
    console.log('Token saved to Firestore');
  } catch (error) {
    console.error('Firestore save error:', error);
  }
}

// --- Authentication Screen ---
const LoginScreen = ({ t }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Error", "Por favor completa todos los campos");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      Alert.alert("Error de Inicio de Sesión", "Email o contraseña incorrectos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      return Alert.alert(
        "Email Requerido",
        "Por favor escribe tu email en el campo de arriba para enviarte el enlace de recuperación."
      );
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Email Enviado",
        `Se ha enviado un correo a ${email} para restablecer tu contraseña.`
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No pudimos enviar el correo de recuperación. Verifica que el email sea correcto.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.loginContainer}>
          <Calendar size={64} color="#007bff" style={{ marginBottom: 20 }} />
          <Text style={styles.loginTitle}>{t('loginTitle')}</Text>
          <Text style={styles.loginSubtitle}>{t('loginSubtitle')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('email')}</Text>
            <TextInput
              style={styles.input}
              placeholder="email@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('password')}</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.forgotPasswordBtn}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.loginButtonText}>{t('enter')}</Text>}
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

// --- Settings/Availability Screen ---
const SettingsModal = ({ visible, onClose, user, blockoutDates, onAddBlockout, onRemoveBlockout, language, setLanguage, t }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [pickerMode, setPickerMode] = useState(null); // 'start', 'end' or null

  const handleAdd = () => {
    if (!startDate || !endDate) return Alert.alert("Error", "Fechas requeridas");
    onAddBlockout(startDate, endDate, reason);
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const onDateChange = (event, selectedDate) => {
    const currentMode = pickerMode;
    setPickerMode(null); // Close picker on selection (Android behavior mostly)

    if (event.type === 'dismissed') return;

    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      if (currentMode === 'start') {
        setStartDate(dateStr);
        // Auto-set end date to start date if empty
        if (!endDate) setEndDate(dateStr);
      } else if (currentMode === 'end') {
        setEndDate(dateStr);
      }
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}><View style={{ flex: 1 }} /></TouchableWithoutFeedback>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('settingsTitle')}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeader}>{t('language')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24, marginTop: 12 }}>
              {['es', 'ro', 'en'].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    backgroundColor: language === lang ? '#eff6ff' : '#f8fafc',
                    borderWidth: 1,
                    borderColor: language === lang ? '#007bff' : '#e2e8f0'
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: language === lang ? '#007bff' : '#64748b',
                    textTransform: 'uppercase'
                  }}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionHeader}>{t('blockedDates')}</Text>
            <Text style={styles.sectionSub}>{t('noAssignments') === 'No tienes servicios asignados aún' ? 'Añade rangos de fechas donde NO estarás disponible para servir.' : t('settingsTitle')}</Text>

            <View style={styles.addBlockoutForm}>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>

                {/* Start Date Picker */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.labelSmall}>{t('from')}</Text>
                  <TouchableOpacity
                    style={styles.inputSmall}
                    onPress={() => setPickerMode('start')}
                  >
                    <Text style={{ color: startDate ? '#1e293b' : '#94a3b8' }}>
                      {startDate || 'YYYY-MM-DD'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* End Date Picker */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.labelSmall}>{t('until')}</Text>
                  <TouchableOpacity
                    style={styles.inputSmall}
                    onPress={() => setPickerMode('end')}
                  >
                    <Text style={{ color: endDate ? '#1e293b' : '#94a3b8' }}>
                      {endDate || 'YYYY-MM-DD'}
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>

              {/* The DateTimePicker Component */}
              {pickerMode && (
                <DateTimePicker
                  value={new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}

              <Text style={styles.labelSmall}>{t('reason')}</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="..."
                value={reason}
                onChangeText={setReason}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                <Text style={styles.addButtonText}>{t('addBlockout')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.blockoutList}>
              {blockoutDates.map((block, index) => (
                <View key={index} style={styles.blockoutItem}>
                  <View>
                    <Text style={styles.blockoutDates}>{block.start} - {block.end}</Text>
                    {block.reason ? <Text style={styles.blockoutReason}>{block.reason}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => onRemoveBlockout(block)}>
                    <MinusCircle size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {blockoutDates.length === 0 && (
                <Text style={styles.emptyText}>No tienes fechas bloqueadas.</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const TeamCard = ({ team, usersMap, t }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardMain}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, backgroundColor: '#eff6ff', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="#007bff" />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>{team.name}</Text>
            <Text style={{ fontSize: 13, color: '#64748b' }}>{team.members?.length || 0} {t('members')}</Text>
          </View>
        </View>
        <View>
          {expanded ? <ChevronUp size={20} color="#cbd5e1" /> : <ChevronDown size={20} color="#cbd5e1" />}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.oosSection}>
          <Text style={{ fontSize: 14, color: '#475569', fontStyle: 'italic', marginBottom: 12 }}>
            {team.description || (t('description') === 'Descripción' ? 'Sin descripción' : (t('description') === 'Descriere' ? 'Fără descriere' : 'No description'))}
          </Text>
          <Text style={styles.oosHeader}>{t('myTeam')}</Text>
          {team.members && team.members.length > 0 ? (
            team.members.map((memberId, idx) => {
              const userProfile = usersMap[memberId];
              const userName = userProfile?.name || memberId;
              const userRole = userProfile?.role === 'leader' ? 'Líder' : 'Miembro';

              return (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: idx === team.members.length - 1 ? 0 : 1, borderBottomColor: '#f1f5f9' }}>
                  <Text style={{ fontSize: 14, color: '#1e293b', fontWeight: '500' }}>
                    {userName}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, overflow: 'hidden' }}>
                    {userRole}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No hay integrantes asignados.</Text>
          )}
        </View>
      )}
    </View>
  );
};

// --- Assignment Card ---
const AssignmentCard = ({ assignment, event, onAccept, onDecline, globalSongsMap, teammates, t, teams, user }) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedOthers, setExpandedOthers] = useState(false);
  if (!event) return null;

  const formattedDate = event.date ? event.date.toDate().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const formattedTime = event.date ? event.date.toDate().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardMain}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.cardInfo}>
          <View style={styles.tagContainer}>
            <Text style={styles.positionTag}>{assignment.position}</Text>
          </View>
          <Text style={styles.cardTitle}>{event.title}</Text>
          <View style={styles.metaRow}>
            <Clock size={12} color="#64748b" />
            <Text style={styles.cardTime}>{formattedDate} • {formattedTime}</Text>
          </View>
          {event.location ? (
            <View style={styles.metaRow}>
              <MapPin size={12} color="#64748b" />
              <Text style={styles.cardLocation}>{event.location}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardActions}>
          {assignment.status === 'pending' ? (
            <View style={{ flexDirection: 'column', gap: 12 }}>
              <TouchableOpacity style={styles.acceptButton} onPress={() => onAccept(assignment.id)}>
                <Text style={styles.acceptButtonText}>{t('confirm')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ ...styles.acceptButton, backgroundColor: '#fee2e2', borderColor: '#fee2e2' }} onPress={() => onDecline(assignment.id, event.title)}>
                <Text style={{ ...styles.acceptButtonText, color: '#991b1b' }}>{t('decline')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.confirmedBadge}>
              {assignment.status === 'confirmed' ? (
                <>
                  <CheckCircle size={14} color="#166534" />
                  <Text style={styles.confirmedText}>{t('confirmed')}</Text>
                </>
              ) : (
                <>
                  <MinusCircle size={14} color="#991b1b" />
                  <Text style={{ ...styles.confirmedText, color: '#991b1b' }}>{t('declined')}</Text>
                </>
              )}
            </View>
          )}
          <View style={{ marginTop: 8 }}>
            {expanded ? <ChevronUp size={20} color="#cbd5e1" /> : <ChevronDown size={20} color="#cbd5e1" />}
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.oosSection}>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.oosHeader}>{t('myTeam')}</Text>
            {(() => {
              // 1. Filter teammates into "My Team" vs "Others"
              const myTeamIds = new Set();
              if (user && teams) {
                teams.forEach(team => {
                  if (team.members && team.members.includes(user.uid)) {
                    team.members.forEach(m => myTeamIds.add(m));
                  }
                });
              }

              const myTeam = [];
              const others = [];

              if (teammates) {
                teammates.forEach(tm => {
                  if (myTeamIds.has(tm.userId)) {
                    myTeam.push(tm);
                  } else {
                    others.push(tm);
                  }
                });
              }

              const renderTeammate = (tm) => (
                <View key={tm.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: tm.status === 'confirmed' ? '#22c55e' : '#cbd5e1' }} />
                    <Text style={{ fontSize: 14, color: '#1e293b' }}>{tm.userName || tm.userEmail?.split('@')[0]}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>{tm.position}</Text>
                </View>
              );

              return (
                <>
                  {/* My Team List */}
                  {myTeam.length > 0 ? (
                    myTeam.map(renderTeammate)
                  ) : (
                    <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 }}>
                      {others.length > 0 ? t('noOneElseInYourTeam') || 'Nadie más de tu equipo en este evento.' : t('noOneElseAssigned') || 'Solo tú estás asignado por ahora.'}
                    </Text>
                  )}

                  {/* Others Toggle */}
                  {others.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <TouchableOpacity
                        onPress={() => setExpandedOthers(!expandedOthers)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}
                      >
                        <Users size={14} color="#64748b" />
                        <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                          {expandedOthers ? (t('hideOtherTeams') || 'Ocultar otros equipos') : (t('showOtherTeams') || 'Ver otros equipos')}
                        </Text>
                        {expandedOthers ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
                      </TouchableOpacity>

                      {expandedOthers && (
                        <View style={{ paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#f1f5f9' }}>
                          {others.map(renderTeammate)}
                        </View>
                      )}
                    </View>
                  )}
                </>
              );
            })()}
          </View>

          <Text style={styles.oosHeader}>{t('orderOfService')}</Text>
          {event.orderOfService && event.orderOfService.length > 0 ? (
            event.orderOfService.map((item, index) => {
              const song = item.songId ? globalSongsMap[item.songId] : null;
              return (
                <View key={item.id || index} style={styles.oosItemContainer}>
                  <View style={styles.oosItem}>
                    <View style={styles.oosDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.oosTitle}>{item.title}</Text>
                      {song && <Text style={styles.oosSongTitle}>{song.title} • {song.key}</Text>}
                    </View>
                    <Text style={styles.oosDuration}>{item.duration}m</Text>
                  </View>
                  {item.details && (
                    <View style={{ marginLeft: 28, marginTop: 4, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 4 }}>
                      <Text style={{ fontSize: 13, color: '#475569', fontStyle: 'italic' }}>
                        {item.details}
                      </Text>
                    </View>
                  )}

                  {song && (
                    <View style={styles.songAttachments}>
                      {song.pdfUrl && (
                        <TouchableOpacity style={styles.attachmentBtn} onPress={() => Linking.openURL(song.pdfUrl)}>
                          <FileText size={14} color="#007bff" />
                          <Text style={styles.attachmentText}>Acordes</Text>
                        </TouchableOpacity>
                      )}
                      {song.mp3Url && (
                        <TouchableOpacity style={styles.attachmentBtn} onPress={() => Linking.openURL(song.mp3Url)}>
                          <Play size={14} color="#007bff" />
                          <Text style={styles.attachmentText}>Audio</Text>
                        </TouchableOpacity>
                      )}
                      {song.youtubeUrl && (
                        <TouchableOpacity style={styles.attachmentBtn} onPress={() => Linking.openURL(song.youtubeUrl)}>
                          <ExternalLink size={14} color="#007bff" />
                          <Text style={styles.attachmentText}>YouTube</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.oosEmpty}>{t('noOrder')}</Text>
          )}
        </View>
      )}
    </View>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [eventsMap, setEventsMap] = useState({});
  const [songsMap, setSongsMap] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [usersMap, setUsersMap] = useState({}); // Map of userId -> userData
  const [allSchedules, setAllSchedules] = useState([]); // All schedules for relevant events
  const [teams, setTeams] = useState([]);
  const [activeTab, setActiveTab] = useState('turns'); // 'turns', 'wall', or 'teams'
  const [loading, setLoading] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [blockoutDates, setBlockoutDates] = useState([]);
  const [isAvailableToday, setIsAvailableToday] = useState(true);
  const [language, setLanguage] = useState('es');

  // i18n helper
  const t = (key) => {
    return translations[language][key] || key;
  };

  // Load language preference
  useEffect(() => {
    AsyncStorage.getItem('appLanguage').then(val => {
      if (val) setLanguage(val);
    });
  }, []);

  // Save language preference
  useEffect(() => {
    AsyncStorage.setItem('appLanguage', language);
  }, [language]);

  // Keep track of event listeners to clean them up
  const eventListeners = useRef({});
  const notificationListener = useRef();
  const responseListener = useRef();

  // Check availability when blockout dates change
  useEffect(() => {
    checkAvailability(blockoutDates);
  }, [blockoutDates]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        // Clear all data on logout
        setAssignments([]);
        setEventsMap({});
        setBlockoutDates([]);
        // Unsubscribe from all event listeners
        if (eventListeners.current) {
          Object.values(eventListeners.current).forEach(unsub => unsub());
          eventListeners.current = {};
        }
      } else {
        // Fetch user data including blockout dates
        const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setBlockoutDates(userData.blockoutDates || []);
            setUserName(userData.name || '');
          }
        });
        // Note: We can't easily return unsubUser from here to cleanup inside this callback,
        // but passing user as dependency to another useEffect helps.
        // For simplicity, we'll let the separate useEffect handle other data.
      }
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Register for push notifications
  useEffect(() => {
    if (!user) return;

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Save token to Firestore
        savePushToken(user.uid, token);
      }
    });

    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listener for when user taps on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      // Navigate based on notification type
      if (data.type === 'assignment') {
        setActiveTab('turns');
      } else if (data.type === 'announcement') {
        setActiveTab('wall');
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch all songs
    const unsubSongs = onSnapshot(collection(db, 'songs'), (snapshot) => {
      const songsData = {};
      snapshot.forEach(doc => {
        songsData[doc.id] = doc.data();
      });
      setSongsMap(songsData);
    });

    return unsubSongs;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch announcements
    const qAnnouncements = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return unsubAnnouncements;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Fetch all users for name resolution
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const uMap = {};
      snapshot.forEach(doc => {
        uMap[doc.id] = doc.data();
      });
      setUsersMap(uMap);
    });
    return unsubUsers;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch all teams
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return unsubTeams;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const qAssignments = query(
      collection(db, 'schedules'),
      where('userId', '==', user.uid)
    );

    const unsubAssignments = onSnapshot(qAssignments, (snapshot) => {
      const assignmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      assignmentsData.sort((a, b) => {
        const dateA = a.assignedAt?.toDate() || 0;
        const dateB = b.assignedAt?.toDate() || 0;
        return dateB - dateA;
      });

      setAssignments(assignmentsData);

      // Fetch events and ALL schedules for those events
      assignmentsData.forEach((a) => {
        // Event listener
        if (!eventListeners.current[a.eventId]) {
          const unsubEvent = onSnapshot(doc(db, 'events', a.eventId), (docSnap) => {
            if (docSnap.exists()) {
              setEventsMap(prev => ({ ...prev, [a.eventId]: docSnap.data() }));
            }
          });
          eventListeners.current[a.eventId] = unsubEvent;

          // Teammates listener for this specific event
          const qTeammates = query(collection(db, 'schedules'), where('eventId', '==', a.eventId));
          const unsubTeammates = onSnapshot(qTeammates, (snap) => {
            const teammates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllSchedules(prev => {
              const filtered = prev.filter(s => s.eventId !== a.eventId);
              return [...filtered, ...teammates];
            });
          });
          // We can store this in the same ref or just let it live (it cleans up on logout anyway)
        }
      });
      setLoading(false);
    }, (error) => {
      console.warn("Assignments listener error:", error.message);
    });

    return () => {
      unsubAssignments();
      Object.values(eventListeners.current).forEach(unsub => unsub());
      eventListeners.current = {};
    };
  }, [user]);

  const checkAvailability = (dates) => {
    const today = new Date().toISOString().split('T')[0];
    const isBlocked = dates.some(d => today >= d.start && today <= d.end);
    setIsAvailableToday(!isBlocked);
  };

  const createNotification = async (type, data) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        type,
        ...data,
        read: false,
        createdAt: new Date()
      });
    } catch (e) {
      console.error("Error creating notification:", e);
    }
  };

  const handleAddBlockout = async (start, end, reason) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        blockoutDates: arrayUnion({ start, end, reason })
      });
      // Notify admin
      await createNotification('blockout_created', {
        userId: user.uid,
        userName: userName || user.email,
        dates: `${start} al ${end}`,
        reason
      });

      Alert.alert('Éxito', 'Fecha bloqueada añadida');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  const handleRemoveBlockout = async (block) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        blockoutDates: arrayRemove(block)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAccept = async (assignmentId) => {
    try {
      const assignmentRef = doc(db, 'schedules', assignmentId);
      await updateDoc(assignmentRef, {
        status: 'confirmed',
        respondedAt: new Date()
      });
    } catch (error) {
      console.error("Error accepting assignment:", error);
      Alert.alert("Error", "No se pudo confirmar la asignación");
    }
  };

  const handleDecline = async (assignmentId, eventTitle) => {
    Alert.alert(
      "Rechazar asignación",
      "¿Estás seguro de que no puedes servir en este evento?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, rechazar",
          style: "destructive",
          onPress: async () => {
            try {
              const assignmentRef = doc(db, 'schedules', assignmentId);
              await updateDoc(assignmentRef, {
                status: 'declined',
                respondedAt: new Date()
              });

              // Notify admin
              await createNotification('assignment_declined', {
                userId: user.uid,
                userName: userName || user.email,
                assignmentId,
                eventTitle,
                reason: 'Rechazado por usuario'
              });

            } catch (error) {
              console.error("Error declining assignment:", error);
              Alert.alert("Error", "No se pudo rechazar la asignación");
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    try {
      if (user) {
        // Remove token from Firestore to stop receiving notifications
        await deleteDoc(doc(db, 'fcmTokens', user.uid));
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (initializing) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen t={t} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsBtn}>
            <Settings size={24} color="#64748b" />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.headerTitle}>{userName || user.email.split('@')[0]}</Text>
            {isAvailableToday ? (
              <View style={styles.statusBadgeAvailable}>
                <CheckCircle size={14} color="#166534" />
                <Text style={styles.statusTextAvailable}></Text>
              </View>
            ) : (
              <View style={styles.statusBadgeUnavailable}>
                <MinusCircle size={14} color="#991b1b" />
                <Text style={styles.statusTextUnavailable}></Text>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={handleLogout}>
            <LogOut size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <SettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          user={user}
          blockoutDates={blockoutDates}
          onAddBlockout={handleAddBlockout}
          onRemoveBlockout={handleRemoveBlockout}
          language={language}
          setLanguage={setLanguage}
          t={t}
        />

        <ScrollView style={styles.content}>
          {activeTab === 'turns' ? (
            <>
              <Text style={styles.sectionTitle}>{t('myAssignments')}</Text>
              {loading && <ActivityIndicator color="#007bff" style={{ marginVertical: 20 }} />}
              {assignments.length === 0 && !loading ? (
                <View style={styles.emptyState}>
                  <Calendar size={48} color="#94a3b8" />
                  <Text style={styles.emptyStateText}>{t('noAssignments')}</Text>
                </View>
              ) : (
                assignments.map(item => (
                  <AssignmentCard
                    key={item.id}
                    assignment={item}
                    event={eventsMap[item.eventId]}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    globalSongsMap={songsMap}
                    teammates={allSchedules.filter(s => s.eventId === item.eventId && s.userId !== user.uid)}
                    t={t}
                    teams={teams}
                    user={user}
                  />
                ))
              )}
            </>
          ) : activeTab === 'wall' ? (
            <>
              <Text style={styles.sectionTitle}>{t('wall')}</Text>
              {announcements.length === 0 ? (
                <View style={styles.emptyState}>
                  <Megaphone size={48} color="#94a3b8" />
                  <Text style={styles.emptyStateText}>{t('noAnnouncements')}</Text>
                </View>
              ) : (
                announcements
                  .filter(post => {
                    // Filter: Show if 'all' OR if user is a member of the target team
                    if (!post.targetTeamId || post.targetTeamId === 'all') return true;
                    // Find the team
                    const targetTeam = teams.find(t => t.id === post.targetTeamId);
                    return targetTeam?.members?.includes(user?.uid);
                  })
                  .map(post => {
                    // Resolve Team Name
                    let teamName = null;
                    if (post.targetTeamId && post.targetTeamId !== 'all') {
                      const targetTeam = teams.find(t => t.id === post.targetTeamId);
                      if (targetTeam) teamName = targetTeam.name;
                    }

                    return (
                      <View key={post.id} style={styles.postCard}>
                        <View style={styles.postHeader}>
                          <View style={[styles.typeIcon, { backgroundColor: post.type === 'alert' ? '#fef2f2' : post.type === 'important' ? '#fffbeb' : '#f0f9ff' }]}>
                            {post.type === 'alert' ? <AlertTriangle size={18} color="#ef4444" /> :
                              post.type === 'important' ? <Bell size={18} color="#f59e0b" /> :
                                <Info size={18} color="#3b82f6" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.postTitle}>{post.title}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              {teamName && (
                                <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 10, color: '#007bff', fontWeight: '700', textTransform: 'uppercase' }}>{teamName}</Text>
                                </View>
                              )}
                              <Text style={styles.postMeta}>{post.authorName} • {post.createdAt?.toDate().toLocaleDateString('es-ES')}</Text>
                            </View>
                          </View>
                        </View>
                        <Text style={styles.postContent}>{post.content}</Text>
                      </View>
                    );
                  })
              )
              }
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>{t('teams')}</Text>
              {teams.length === 0 ? (
                <View style={styles.emptyState}>
                  <Users size={48} color="#94a3b8" />
                  <Text style={styles.emptyStateText}>{t('noTeams')}</Text>
                </View>
              ) : (
                teams.map(team => (
                  <TeamCard key={team.id} team={team} usersMap={usersMap} t={t} />
                ))
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('turns')}>
            <Calendar size={24} color={activeTab === 'turns' ? '#007bff' : '#94a3b8'} />
            <Text style={[styles.navText, activeTab === 'turns' && { color: '#007bff' }]}>{t('agenda')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('teams')}>
            <Users size={24} color={activeTab === 'teams' ? '#007bff' : '#94a3b8'} />
            <Text style={[styles.navText, activeTab === 'teams' && { color: '#007bff' }]}>{t('teams')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('wall')}>
            <View>
              <Megaphone size={24} color={activeTab === 'wall' ? '#007bff' : '#94a3b8'} />
              {activeTab !== 'wall' && announcements.length > 0 && <View style={styles.notifDot} />}
            </View>
            <Text style={[styles.navText, activeTab === 'wall' && { color: '#007bff' }]}>{t('wall')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: 'white' },
  loginTitle: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  loginSubtitle: { fontSize: 16, color: '#64748b', marginBottom: 40 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#f8fafc' },
  loginButton: { backgroundColor: '#007bff', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  forgotPasswordBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -10 },
  forgotPasswordText: { color: '#007bff', fontSize: 14, fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerSub: { fontSize: 14, color: '#64748b' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  content: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, overflow: 'hidden' },
  cardMain: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1 },
  tagContainer: { marginBottom: 8 },
  positionTag: { alignSelf: 'flex-start', backgroundColor: '#eff6ff', color: '#007bff', fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, textTransform: 'uppercase' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardTime: { fontSize: 13, color: '#64748b' },
  cardLocation: { fontSize: 12, color: '#94a3b8' },
  cardActions: { marginLeft: 16, alignItems: 'flex-end' },
  acceptButton: { backgroundColor: '#007bff', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10 },
  acceptButtonText: { color: 'white', fontSize: 14, fontWeight: '700' },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  confirmedText: { color: '#166534', fontSize: 12, fontWeight: '600' },
  oosSection: { backgroundColor: '#f8fafc', padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  oosHeader: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 12, letterSpacing: 1 },
  oosItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  oosDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginRight: 12, marginTop: 8 },
  oosTitle: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  oosSongTitle: { fontSize: 12, color: '#007bff', marginTop: 2 },
  oosDuration: { fontSize: 12, color: '#94a3b8' },
  oosItemContainer: { marginBottom: 16 },
  songAttachments: { flexDirection: 'row', marginLeft: 16, marginTop: 8, gap: 10 },
  attachmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  attachmentText: { fontSize: 11, color: '#007bff', fontWeight: '700' },
  oosEmpty: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyStateText: { color: '#94a3b8', fontSize: 14 },
  navBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  navItem: { alignItems: 'center', gap: 4 },
  navText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  notifDot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: 'white' },

  // El Muro styles
  postCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  postHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  postTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  postMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  postContent: { fontSize: 14, color: '#475569', lineHeight: 20 },

  // Settings Modal Styles
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 1000 },
  modalContent: { backgroundColor: '#f1f5f9', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '80%' },
  settingsBox: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  addBlockoutForm: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20 },
  labelSmall: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
  inputSmall: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12 },
  addButton: { backgroundColor: '#007bff', padding: 12, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },
  blockoutList: { gap: 12 },
  blockoutItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12 },
  blockoutDates: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  blockoutReason: { fontSize: 13, color: '#64748b' },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', marginTop: 20 },
  settingsBtn: { padding: 4 },
  statusBadgeAvailable: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  statusTextAvailable: { fontSize: 11, fontWeight: '700', color: '#166534' },
  statusBadgeUnavailable: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  statusTextUnavailable: { fontSize: 11, fontWeight: '700', color: '#991b1b' },
});

