import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { Patient, NotificationPreferences } from '../../types';

const Settings: React.FC = () => {
    const context = useContext(AppContext);
    const patient = context?.currentUser as Patient;
    const { updateNotificationPreferences } = context!;

    if (!patient) return null;

    const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
        const newPrefs = {
            ...patient.notificationPreferences,
            [key]: value,
        };
        updateNotificationPreferences(patient.id, newPrefs);
    };
    
    const Toggle = ({ label, description, isEnabled, onToggle }: { label: string, description: string, isEnabled: boolean, onToggle: () => void }) => (
        <div className="flex items-center justify-between bg-gray-700/50 p-4 rounded-lg">
            <div>
                <h4 className="font-semibold text-lg text-white">{label}</h4>
                <p className="text-sm text-gray-400">{description}</p>
            </div>
            <button
                type="button"
                onClick={onToggle}
                className={`${isEnabled ? 'bg-cyan-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500`}
            >
                <span className={`${isEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
            </button>
        </div>
    );

    return (
        <div>
            <h2 className="text-3xl font-bold text-white text-center mb-6">Notification Settings</h2>
            <div className="max-w-md mx-auto space-y-4">
                <Toggle 
                    label="Medication Reminders"
                    description="Receive a notification 5 minutes before a medication is due."
                    isEnabled={patient.notificationPreferences?.medicationReminders ?? true}
                    onToggle={() => handlePreferenceChange('medicationReminders', !patient.notificationPreferences?.medicationReminders)}
                />
                <Toggle 
                    label="Custom Admin Alerts"
                    description="Receive special reminders and alerts sent by the administrator."
                    isEnabled={patient.notificationPreferences?.customAlerts ?? true}
                    onToggle={() => handlePreferenceChange('customAlerts', !patient.notificationPreferences?.customAlerts)}
                />
            </div>
        </div>
    );
};

export default Settings;
