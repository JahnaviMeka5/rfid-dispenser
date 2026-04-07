import React, { useContext, useEffect, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { Patient, Medication, CustomReminder } from '../../types';

const MedicineSchedule: React.FC = () => {
  const context = useContext(AppContext);
  const patient = context?.currentUser as Patient | undefined;
  const { updateMedicationStatus } = context ?? {};
  const notifiedReminders = useRef<Set<string>>(new Set());

  // guard if patient undefined - today can still be computed
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  useEffect(() => {
    if (!patient) return;

    const checkReminders = () => {
      if (!patient?.notificationPreferences) return;

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
      const futureTime = `${String(fiveMinutesFromNow.getHours()).padStart(2, '0')}:${String(fiveMinutesFromNow.getMinutes()).padStart(2, '0')}`;

      // Standard 5-minute pre-medication reminders
      if (patient.notificationPreferences.medicationReminders && Array.isArray(patient.medications)) {
        patient.medications.forEach((med: Medication) => {
          // Defensive: ensure med.time exists and compare safely
          const medTime = String(med.time ?? '');
          if (!med.taken && medTime === futureTime) {
            const notificationId = `med-${med.id}-${today}`;
            if (!notifiedReminders.current.has(notificationId)) {
              showNotification('Medication Reminder', `It's almost time to take your ${med.name}.`);
              notifiedReminders.current.add(notificationId);
            }
          }
        });
      }

      // Custom admin reminders
      if (patient.notificationPreferences.customAlerts && Array.isArray(patient.reminders)) {
        patient.reminders.forEach((reminder: CustomReminder) => {
          const reminderTime = String(reminder.time ?? '');
          if (reminderTime === currentTime) {
            const notificationId = `custom-${reminder.id}-${today}`;
            if (!notifiedReminders.current.has(notificationId)) {
              showNotification('Special Reminder from Admin', reminder.message);
              notifiedReminders.current.add(notificationId);
            }
          }
        });
      }
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    // also run once immediately
    checkReminders();
    return () => clearInterval(interval);
  // watch lengths / preferences rather than deep objects
  }, [patient?.medications?.length, patient?.reminders?.length, patient?.notificationPreferences, today, patient]);

  const handleTakeMedication = (medicationId: string) => {
    if (!patient || !updateMedicationStatus) return;
    updateMedicationStatus(patient.id, medicationId, true);
  };

  const handleUntakeMedication = (medicationId: string) => {
    if (!patient || !updateMedicationStatus) return;
    updateMedicationStatus(patient.id, medicationId, false);
  };

  const categorizeMedications = (meds?: Medication[]) => {
    const morning: Medication[] = [];
    const afternoon: Medication[] = [];
    const evening: Medication[] = [];

    if (!Array.isArray(meds)) return { morning, afternoon, evening };

    meds.forEach(med => {
      // Defensive: use empty string fallback and parse safely
      const timeRaw = String(med.time ?? '').trim();
      // attempt to extract hour from formats like "HH:MM" or "H:MM"
      let hour = NaN;
      if (timeRaw.includes(':')) {
        const parts = timeRaw.split(':');
        // ensure parts[0] exists and is numeric
        const p0 = parts[0] ?? '';
        hour = parseInt(p0, 10);
      } else if (timeRaw !== '') {
        // fallback: if time is just an hour number string
        hour = parseInt(timeRaw, 10);
      }

      if (Number.isNaN(hour)) {
        // put unknown times in evening (or adjust behavior as needed)
        evening.push(med);
      } else if (hour < 12) {
        morning.push(med);
      } else if (hour < 18) {
        afternoon.push(med);
      } else {
        evening.push(med);
      }
    });

    return { morning, afternoon, evening };
  };

  const { morning, afternoon, evening } = categorizeMedications(patient?.medications);

  const MedCard = ({ med }: { med: Medication }) => (
    <div className={`p-4 rounded-lg flex items-center justify-between transition-all duration-300 ${med.taken ? 'bg-green-500/20 border-l-4 border-green-500' : 'bg-gray-700/50'}`}>
      <div>
        <p className="font-bold text-lg">{med.name}</p>
        <p className="text-sm text-gray-400">{med.dosage}</p>
        <p className="text-cyan-400 font-semibold">{med.time ?? '—'}</p>
      </div>
      <button
        onClick={() => med.taken ? handleUntakeMedication(med.id) : handleTakeMedication(med.id)}
        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${med.taken ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-cyan-500 hover:bg-cyan-600 text-white'}`}
      >
        {med.taken ? 'Mark as Not Taken' : 'Mark as Taken'}
      </button>
    </div>
  );

  const MedCategory = ({ title, meds }: { title: string; meds: Medication[] }) => (
    <div>
      <h3 className="text-xl font-semibold text-cyan-300 mb-3 border-b-2 border-gray-700 pb-2">{title}</h3>
      {Array.isArray(meds) && meds.length > 0 ? (
        <div className="space-y-3">
          {meds.sort((a,b) => String(a.time ?? '').localeCompare(String(b.time ?? ''))).map(med => <MedCard key={med.id} med={med} />)}
        </div>
      ) : (
        <p className="text-gray-500">No medications scheduled.</p>
      )}
    </div>
  );

  // If no patient loaded, show a friendly message instead of blank screen
  if (!patient) {
    return <div className="text-center text-gray-300">No patient selected or loaded.</div>;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Today's Medication Schedule</h2>
      <MedCategory title="Morning" meds={morning} />
      <MedCategory title="Afternoon" meds={afternoon} />
      <MedCategory title="Evening" meds={evening} />
    </div>
  );
};

export default MedicineSchedule;
