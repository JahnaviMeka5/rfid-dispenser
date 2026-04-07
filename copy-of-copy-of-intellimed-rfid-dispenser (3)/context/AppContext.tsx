import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  Patient,
  User,
  UserRole,
  Medication,
  HealthLogEntry,
  HealthLogType,
  CustomReminder,
  DispenseHistoryEntry,
  ChatMessage,
  NotificationPreferences
} from '../types';
import { getStoredData, setStoredData } from '../services/storageService';
import { ADMIN_EMAIL } from '../constants';

async function testBackendConnection() {
  try {
    const base = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080';
    const res = await fetch(base + '/api/patients');
    const data = await res.json();
    console.log('✅ Backend connection successful!', data);
  } catch (err) {
    console.error('❌ Backend connection failed:', err);
  }
}



interface AppContextType {
  currentUser: User | null;
  patients: Patient[];
  login: (credentials: { email?: string; password?: string; rfid?: string; photo?: string | File }) => Promise<User | null>;
  logout: () => void;
  registerPatient: (patientData: Omit<Patient, 'id' | 'role' | 'medications' | 'reminders' | 'healthLog' | 'chatHistory' | 'notificationPreferences'> & { photo?: File | string }) => Promise<Patient | null>;
  addMedication: (patientId: string, medication: Omit<Medication, 'id' | 'taken'>) => Promise<void>;
  updateMedicationStatus: (patientId: string, medicationId: string, taken: boolean) => void;
  removeMedication: (patientId: string, medicationId: string) => void;
  addHealthLog: (patientId: string, log: Omit<HealthLogEntry, 'id' | 'timestamp'>) => void;
  addCustomReminder: (patientId: string, reminder: Omit<CustomReminder, 'id'>) => void;
  removeCustomReminder: (patientId: string, reminderId: string) => void;
  sendVoiceAlert: (patientId: string, message: string) => void;
  voiceAlert: { patientId: string; message: string; audio: string } | null;
  clearVoiceAlert: () => void;
  getDispenseHistory: () => DispenseHistoryEntry[];
  addChatMessage: (patientId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateNotificationPreferences: (patientId: string, prefs: NotificationPreferences) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

// Use a plain BASE_URL to avoid import.meta typing issues while developing
const BASE_URL = 'http://localhost:8080';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [voiceAlert, setVoiceAlert] = useState<{ patientId: string; message: string; audio: string } | null>(null);

  // Normalize backend patient object to local Patient type
  const normalizePatientFromBackend = (p: any): Patient => {
    return {
      id: p._id || p.id,
      name: p.name,
      rfid: p.rfid,
      role: p.role || UserRole.Patient,
      useFacialRecognition: !!p.useFacialRecognition,
      medications: (p.medications || []).map((m: any) => ({
        id: m.id || m._id || `${m.name}_${Math.random()}`,
        name: m.name,
        dosage: m.dose || m.dosage || '',
        instructions: m.instructions || '',
        quantity: m.quantity ?? 0,
        taken: m.taken ?? false,
        lastTakenDate: m.lastTakenDate || ''
      })),
      reminders: p.reminders || [],
      healthLog: p.healthLog || [],
      chatHistory: p.chatHistory || [],
      notificationPreferences: p.notificationPreferences || { medicationReminders: true, customAlerts: true },
      createdAt: p.createdAt || p.created_at
    } as Patient;
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/patients`);
        if (!res.ok) throw new Error('failed to fetch patients');
        const data = await res.json();
        const loaded = (data || []).map((p: any) => normalizePatientFromBackend(p));
        setPatients(loaded);
        setStoredData('patients', loaded);
      } catch {
        const storedPatients = getStoredData<Patient[]>('patients', []);
        setPatients(storedPatients);
      }

      const storedUser = getStoredData<User | null>('currentUser', null);
      if (storedUser) setCurrentUser(storedUser);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistPatients = (updatedPatients: Patient[]) => {
    setPatients(updatedPatients);
    setStoredData('patients', updatedPatients);
  };

  const persistCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    setStoredData('currentUser', user);
  };

  // Convert data URL to File (helper)
  const dataURLtoFile = async (dataurl: string, filename = 'photo.jpg') => {
    const res = await fetch(dataurl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  };

  const login = async (credentials: { email?: string; password?: string; rfid?: string; photo?: string | File }): Promise<User | null> => {
    // Admin local login
    if (credentials.email && credentials.password) {
      if (credentials.email === ADMIN_EMAIL) {
        const admin: User = { id: 'admin', role: UserRole.Admin, name: 'Admin' };
        persistCurrentUser(admin);
        return admin;
      }
    }

    // Patient login via backend RFID
    if (credentials.rfid) {
      try {
        const res = await fetch(`${BASE_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rfid: credentials.rfid })
        });
        if (!res.ok) return null;
        const p = await res.json();
        const patient = normalizePatientFromBackend(p);
        persistCurrentUser(patient);
        return patient;
      } catch {
        const local = patients.find(x => x.rfid === credentials.rfid) || null;
        if (local) {
          if (local.useFacialRecognition && !credentials.photo) {
            throw new Error('Facial recognition required.');
          }
          persistCurrentUser(local);
          return local;
        }
        return null;
      }
    }

    return null;
  };

  const logout = () => {
    persistCurrentUser(null);
  };

  const registerPatient = async (patientData: Omit<Patient, 'id' | 'role' | 'medications' | 'reminders' | 'healthLog' | 'chatHistory' | 'notificationPreferences'> & { photo?: File | string }): Promise<Patient | null> => {
    try {
      const form = new FormData();
      form.append('name', patientData.name);
      form.append('rfid', patientData.rfid);

      if (patientData.photo) {
        let file: File;
        if (typeof patientData.photo === 'string') {
          file = await dataURLtoFile(patientData.photo, `${patientData.rfid || 'photo'}.jpg`);
        } else {
          file = patientData.photo;
        }
        form.append('photo', file);
      }

      const res = await fetch(`${BASE_URL}/api/patients`, { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to register patient');
      }

      const body = await res.json();
      const pid = body.patientId || body.id;
      if (!pid) {
        const maybeP = body.patient || body;
        const created = normalizePatientFromBackend(maybeP);
        const updated = [...patients.filter(p => p.id !== created.id), created];
        persistPatients(updated);
        return created;
      }

      const pRes = await fetch(`${BASE_URL}/api/patients/${pid}?photo=true`);
      if (!pRes.ok) throw new Error('Failed to fetch created patient');
      const pBody = await pRes.json();
      const created = normalizePatientFromBackend(pBody);
      const updated = [...patients.filter(p => p.id !== created.id), created];
      persistPatients(updated);
      return created;
    } catch (err) {
      console.error('registerPatient error', err);
      const newPatient: Patient = {
        id: `patient_${Date.now()}`,
        name: patientData.name,
        rfid: patientData.rfid,
        role: UserRole.Patient,
        medications: [],
        reminders: [],
        healthLog: [],
        chatHistory: [],
        notificationPreferences: { medicationReminders: true, customAlerts: true }
      };
      const updated = [...patients, newPatient];
      persistPatients(updated);
      return newPatient;
    }
  };

  const addMedication = async (patientId: string, medicationData: Omit<Medication, 'id' | 'taken'>): Promise<void> => {
    try {
      const res = await fetch(`${BASE_URL}/api/patients/${patientId}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: medicationData.name,
          dose: (medicationData as any).dosage || (medicationData as any).dose || '',
          instructions: medicationData.instructions || '',
          quantity: medicationData.quantity ?? 0
        })
      });
      if (!res.ok) throw new Error('failed adding medication');

      const pRes = await fetch(`${BASE_URL}/api/patients/${patientId}`);
      if (pRes.ok) {
        const p = await pRes.json();
        const normalized = normalizePatientFromBackend(p);
        const updatedPatients = patients.map(pt => pt.id === normalized.id ? normalized : pt);
        persistPatients(updatedPatients);
      } else {
        const updatedPatients = patients.map(p => {
          if (p.id === patientId) {
            const newMed: Medication = { ...medicationData, id: `med_${Date.now()}`, taken: false };
            return { ...p, medications: [...p.medications, newMed] };
          }
          return p;
        });
        persistPatients(updatedPatients);
      }
    } catch (err) {
      console.error('addMedication error', err);
      const updatedPatients = patients.map(p => {
        if (p.id === patientId) {
          const newMed: Medication = { ...medicationData, id: `med_${Date.now()}`, taken: false };
          return { ...p, medications: [...p.medications, newMed] };
        }
        return p;
      });
      persistPatients(updatedPatients);
    }
  };

  const updateMedicationStatus = (patientId: string, medicationId: string, taken: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedPatients = patients.map(p => {
      if (p.id === patientId) {
        const updatedMeds = p.medications.map(m => {
          if (m.id === medicationId) {
            return { ...m, taken, lastTakenDate: taken ? today : m.lastTakenDate };
          }
          return m;
        });
        if (taken) {
          const med = p.medications.find(m => m.id === medicationId);
          if (med) {
            const newLog: HealthLogEntry = {
              id: `log_${Date.now()}`,
              type: HealthLogType.MedicationTaken,
              timestamp: new Date().toISOString(),
              description: `Took ${med.name} ${med.dosage}`
            };
            return { ...p, medications: updatedMeds, healthLog: [...p.healthLog, newLog] };
          }
        }
        return { ...p, medications: updatedMeds };
      }
      return p;
    });
    persistPatients(updatedPatients);
  };

  const removeMedication = (patientId: string, medicationId: string) => {
    const updatedPatients = patients.map(p => {
      if (p.id === patientId) {
        return { ...p, medications: p.medications.filter(m => m.id !== medicationId) };
      }
      return p;
    });
    persistPatients(updatedPatients);
  };

  const addHealthLog = useCallback((patientId: string, log: Omit<HealthLogEntry, 'id' | 'timestamp'>) => {
    const updatedPatients = patients.map(p => {
      if (p.id === patientId) {
        const newLog: HealthLogEntry = { ...log, id: `log_${Date.now()}`, timestamp: new Date().toISOString() };
        const newHealthLog = [...p.healthLog, newLog];
        return { ...p, healthLog: newHealthLog.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) };
      }
      return p;
    });
    persistPatients(updatedPatients);
  }, [patients]);

  const addCustomReminder = (patientId: string, reminderData: Omit<CustomReminder, 'id'>) => {
    const updatedPatients = patients.map(p => {
      if (p.id === patientId) {
        const newReminder: CustomReminder = { ...reminderData, id: `rem_${Date.now()}` };
        return { ...p, reminders: [...p.reminders, newReminder] };
      }
      return p;
    });
    persistPatients(updatedPatients);
  };

  const removeCustomReminder = (patientId: string, reminderId: string) => {
    const updatedPatients = patients.map(p => {
      if (p.id === patientId) {
        return { ...p, reminders: p.reminders.filter(r => r.id !== reminderId) };
      }
      return p;
    });
    persistPatients(updatedPatients);
  };

  const sendVoiceAlert = (patientId: string, message: string) => {
    const audioPlaceholder = "simulated_base64_audio";
    setVoiceAlert({ patientId, message, audio: audioPlaceholder });
  };

  const clearVoiceAlert = () => {
    setVoiceAlert(null);
  };

  const getDispenseHistory = (): DispenseHistoryEntry[] => {
    const history: DispenseHistoryEntry[] = [];
    patients.forEach(p => {
      p.healthLog.forEach(log => {
        if (log.type === HealthLogType.MedicationTaken) {
          history.push({
            patientName: p.name,
            medicationName: log.description.replace('Took ', '').split(' ')[0],
            dosage: log.description.split(' ').slice(2).join(' '),
            timestamp: log.timestamp,
          });
        }
      });
    });
    return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const addChatMessage = (patientId: string, message: Omit<ChatMessage, 'id'|'timestamp'>) => {
    const updatedPatients = patients.map(p => {
      if (p.id === patientId) {
        const newMessage: ChatMessage = { ...message, id: `chat_${Date.now()}`, timestamp: new Date().toISOString() };
        return { ...p, chatHistory: [...p.chatHistory, newMessage] };
      }
      return p;
    });
    persistPatients(updatedPatients);
  };

  const updateNotificationPreferences = (patientId: string, prefs: NotificationPreferences) => {
    const updatedPatients = patients.map(p => {
      if (p.id === patientId) {
        return { ...p, notificationPreferences: prefs };
      }
      return p;
    });
    persistPatients(updatedPatients);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      patients,
      login,
      logout,
      registerPatient,
      addMedication,
      updateMedicationStatus,
      removeMedication,
      addHealthLog,
      addCustomReminder,
      removeCustomReminder,
      sendVoiceAlert,
      voiceAlert,
      clearVoiceAlert,
      getDispenseHistory,
      addChatMessage,
      updateNotificationPreferences
    }}>
      {children}
    </AppContext.Provider>
  );
};
