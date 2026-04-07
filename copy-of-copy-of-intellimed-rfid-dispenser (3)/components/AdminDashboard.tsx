import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Patient, Medication, CustomReminder, DispenseHistoryEntry, HealthLogType } from '../types';
import { generateDietPlan, generateHealthArticle, generateVoiceAlert } from '../services/geminiService';

const AdminDashboard: React.FC = () => {
    const context = useContext(AppContext);
    const { logout, patients, addMedication, removeMedication, addCustomReminder, removeCustomReminder, sendVoiceAlert, getDispenseHistory } = context!;
    
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const selectedPatient = patients.find(p => p.id === selectedPatientId) || null;

    const [isMedsModalOpen, setMedsModalOpen] = useState(false);
    const [isRemindersModalOpen, setRemindersModalOpen] = useState(false);
    const [isDietModalOpen, setDietModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const [medName, setMedName] = useState('');
    const [medDosage, setMedDosage] = useState('');
    const [medTime, setMedTime] = useState('08:00');

    const [reminderMedId, setReminderMedId] = useState('');
    const [reminderTime, setReminderTime] = useState('08:00');
    const [reminderMsg, setReminderMsg] = useState('');
    
    const [dietPlan, setDietPlan] = useState('');
    const [generatingDiet, setGeneratingDiet] = useState(false);

    const [articleTopic, setArticleTopic] = useState('');
    const [generatedArticle, setGeneratedArticle] = useState('');
    const [generatingArticle, setGeneratingArticle] = useState(false);

    const [dispenseHistory, setDispenseHistory] = useState<DispenseHistoryEntry[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setDispenseHistory(getDispenseHistory());
        
        const monitorInterval = setInterval(() => {
            const now = new Date();
            patients.forEach(p => {
                p.medications.forEach(m => {
                    const [hour, minute] = m.time.split(':').map(Number);
                    const medTimeToday = new Date();
                    medTimeToday.setHours(hour, minute, 0, 0);

                    if (now.getTime() - medTimeToday.getTime() > 5 * 60 * 1000 && !m.taken) {
                        const alertId = `${p.id}-${m.id}-${new Date().toISOString().split('T')[0]}`;
                        if (!sessionStorage.getItem(alertId)) {
                            const message = `Hello ${p.name}. This is an automated reminder. It appears you missed your scheduled dose of ${m.name} at ${m.time}. Please take your medication now.`;
                            sendVoiceAlert(p.id, message);
                            sessionStorage.setItem(alertId, 'sent');
                        }
                    }
                });
            });
        }, 60000);

        return () => clearInterval(monitorInterval);
    }, [patients, getDispenseHistory, sendVoiceAlert]);

    const handleOpenMedsModal = () => {
        if (selectedPatient) setMedsModalOpen(true);
    };

    const handleAddMedication = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPatient && medName && medDosage) {
            addMedication(selectedPatient.id, { name: medName, dosage: medDosage, time: medTime });
            setMedName('');
            setMedDosage('');
            setMedTime('08:00');
        }
    };
    
    const handleOpenRemindersModal = () => {
        if (selectedPatient) {
            if (selectedPatient.medications.length > 0) {
                setReminderMedId(selectedPatient.medications[0].id);
            }
            setRemindersModalOpen(true);
        }
    };

    const handleAddReminder = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPatient && reminderMedId && reminderMsg) {
            addCustomReminder(selectedPatient.id, { medicationId: reminderMedId, time: reminderTime, message: reminderMsg });
            setReminderMsg('');
        }
    };

    const handleGenerateDietPlan = async () => {
        if (selectedPatient) {
            setDietModalOpen(true);
            setGeneratingDiet(true);
            setDietPlan('');
            const plan = await generateDietPlan(selectedPatient);
            setDietPlan(plan);
            setGeneratingDiet(false);
        }
    };

    const handleGenerateArticle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!articleTopic) return;
        setGeneratingArticle(true);
        setGeneratedArticle('');
        const article = await generateHealthArticle(articleTopic);
        setGeneratedArticle(article);
        setGeneratingArticle(false);
    };

    const handleManualVoiceAlert = async () => {
        if(selectedPatient) {
            const message = `Hello ${selectedPatient.name}. This is a friendly reminder from your administrator. Please remember to take your medications on time and stay healthy.`;
            try {
                const audio = await generateVoiceAlert(message);
                if(audio) {
                     sendVoiceAlert(selectedPatient.id, message);
                     alert(`Voice alert sent to ${selectedPatient.name}`);
                } else {
                     alert(`Failed to generate voice for ${selectedPatient.name}`);
                }
            } catch(e) {
                console.error(e);
                alert(`Failed to send voice alert to ${selectedPatient.name}`);
            }
        }
    };

    const patientMedicationHistory = selectedPatient?.healthLog
        .filter(log => log.type === HealthLogType.MedicationTaken)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];

    const filteredPatients = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.rfid.toLowerCase().includes(searchTerm.toLowerCase())
    );


    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <header className="flex justify-between items-center mb-10">
                <h1 className="text-4xl font-bold text-cyan-400">Admin Dashboard</h1>
                <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Logout</button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Patient Selection */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                            <h2 className="text-2xl font-semibold text-cyan-300">Patient Roster</h2>
                            <input
                                type="text"
                                placeholder="Search by name or RFID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        {filteredPatients.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {filteredPatients.map(p => (
                                    <button 
                                        key={p.id} 
                                        onClick={() => setSelectedPatientId(p.id)}
                                        className={`group text-center p-3 rounded-lg transition-all duration-200 border-2 ${selectedPatientId === p.id ? 'border-cyan-400 bg-cyan-900/50 ring-2 ring-cyan-400' : 'border-gray-700 bg-gray-700/50 hover:border-cyan-500'}`}
                                    >
                                        <img src={`data:image/jpeg;base64,${p.photo}`} alt={p.name} className={`w-20 h-20 rounded-full object-cover mx-auto mb-2 border-4 transition-colors ${selectedPatientId === p.id ? 'border-cyan-400' : 'border-gray-600 group-hover:border-cyan-500'}`} />
                                        <p className="font-bold text-sm truncate text-white">{p.name}</p>
                                        <p className="text-xs text-gray-400 truncate">RFID: {p.rfid}</p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">{patients.length > 0 ? 'No patients found.' : 'No patients have been registered yet.'}</p>
                        )}
                    </div>

                    {/* Management Panel */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                         <h2 className="text-2xl font-semibold mb-4 text-cyan-300">
                           {selectedPatient ? `Manage ${selectedPatient.name}` : 'No Patient Selected'}
                         </h2>
                         {selectedPatient ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                <button onClick={handleOpenMedsModal} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center">Manage Meds</button>
                                <button onClick={handleOpenRemindersModal} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg text-center">Reminders</button>
                                <button onClick={handleGenerateDietPlan} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg text-center">Diet Plan</button>
                                <button onClick={handleManualVoiceAlert} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-4 rounded-lg text-center">Voice Alert</button>
                                <button onClick={() => setIsHistoryModalOpen(true)} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg text-center">History</button>
                            </div>
                         ) : (
                            <p className="text-gray-500">Please select a patient from the roster above to manage their details.</p>
                         )}
                    </div>
                    
                    {/* AI Health Content Generator */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4 text-cyan-300">AI Health Content Generator</h2>
                        <form onSubmit={handleGenerateArticle} className="flex gap-4 mb-4">
                            <input
                                type="text"
                                value={articleTopic}
                                onChange={(e) => setArticleTopic(e.target.value)}
                                placeholder="Enter a health topic (e.g., Benefits of Hydration)"
                                className="flex-grow bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <button type="submit" disabled={generatingArticle} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">
                                {generatingArticle ? 'Generating...' : 'Generate Article'}
                            </button>
                        </form>
                        {generatedArticle && (
                            <div className="prose prose-invert bg-gray-700 p-4 rounded-lg max-w-none">
                                <pre className="whitespace-pre-wrap font-sans">{generatedArticle}</pre>
                            </div>
                        )}
                    </div>

                </div>
                
                {/* Dispense History */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4 text-cyan-300">Dispense History</h2>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {dispenseHistory.map((entry, index) => (
                            <div key={index} className="bg-gray-700 p-3 rounded-lg">
                                <p className="font-semibold">{entry.patientName} - {entry.medicationName} ({entry.dosage})</p>
                                <p className="text-sm text-gray-400">{new Date(entry.timestamp).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isMedsModalOpen && selectedPatient && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                    <div className="bg-gray-800 p-8 rounded-lg w-full max-w-lg">
                        <h3 className="text-2xl font-bold mb-6">Manage Medications for {selectedPatient.name}</h3>
                        <form onSubmit={handleAddMedication} className="space-y-4 mb-6">
                            <input type="text" placeholder="Medication Name" value={medName} onChange={e => setMedName(e.target.value)} className="w-full bg-gray-700 p-2 rounded" required />
                            <input type="text" placeholder="Dosage (e.g., 10mg)" value={medDosage} onChange={e => setMedDosage(e.target.value)} className="w-full bg-gray-700 p-2 rounded" required />
                            <input type="time" value={medTime} onChange={e => setMedTime(e.target.value)} className="w-full bg-gray-700 p-2 rounded" required />
                            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 p-2 rounded">Add Medication</button>
                        </form>
                        <hr className="border-gray-600 my-4" />
                        <h4 className="font-semibold mb-2">Current Medications:</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {patients.find(p=>p.id === selectedPatient.id)?.medications.map(med => (
                                <div key={med.id} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                                    <p>{med.name} ({med.dosage}) at {med.time}</p>
                                    <button onClick={() => removeMedication(selectedPatient.id, med.id)} className="bg-red-600 text-xs px-2 py-1 rounded">Remove</button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setMedsModalOpen(false)} className="mt-6 w-full bg-gray-600 p-2 rounded">Close</button>
                    </div>
                </div>
            )}
            
            {isRemindersModalOpen && selectedPatient && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                    <div className="bg-gray-800 p-8 rounded-lg w-full max-w-lg">
                         <h3 className="text-2xl font-bold mb-6">Custom Reminders for {selectedPatient.name}</h3>
                         <form onSubmit={handleAddReminder} className="space-y-4 mb-6">
                            <select value={reminderMedId} onChange={e => setReminderMedId(e.target.value)} className="w-full bg-gray-700 p-2 rounded">
                                {selectedPatient.medications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="w-full bg-gray-700 p-2 rounded" required />
                            <textarea value={reminderMsg} onChange={e => setReminderMsg(e.target.value)} placeholder="Reminder message..." className="w-full bg-gray-700 p-2 rounded" required />
                            <button type="submit" className="w-full bg-cyan-600 p-2 rounded">Add Reminder</button>
                         </form>
                         <hr className="border-gray-600 my-4" />
                         <h4 className="font-semibold mb-2">Current Reminders:</h4>
                         <div className="space-y-2 max-h-40 overflow-y-auto">
                           {patients.find(p=>p.id === selectedPatient.id)?.reminders.map(rem => (
                                <div key={rem.id} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                                    <p>"{rem.message}" at {rem.time}</p>
                                    <button onClick={() => removeCustomReminder(selectedPatient.id, rem.id)} className="bg-red-600 text-xs px-2 py-1 rounded">Delete</button>
                                </div>
                            ))}
                         </div>
                         <button onClick={() => setRemindersModalOpen(false)} className="mt-6 w-full bg-gray-600 p-2 rounded">Close</button>
                    </div>
                </div>
            )}

            {isDietModalOpen && selectedPatient && (
                 <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                    <div className="bg-gray-800 p-8 rounded-lg w-full max-w-2xl">
                        <h3 className="text-2xl font-bold mb-6">AI-Generated Diet Plan for {selectedPatient.name}</h3>
                        {generatingDiet ? (
                            <p>Generating plan...</p>
                        ) : (
                            <div className="prose prose-invert max-w-none bg-gray-700 p-4 rounded-lg">
                               <pre className="whitespace-pre-wrap font-sans">{dietPlan}</pre>
                            </div>
                        )}
                        <button onClick={() => setDietModalOpen(false)} className="mt-6 w-full bg-gray-600 p-2 rounded">Close</button>
                    </div>
                 </div>
            )}

            {isHistoryModalOpen && selectedPatient && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                    <div className="bg-gray-800 p-8 rounded-lg w-full max-w-xl">
                        <h3 className="text-2xl font-bold mb-6">Medication History for {selectedPatient.name}</h3>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {patientMedicationHistory.length > 0 ? (
                                patientMedicationHistory.map(log => (
                                    <div key={log.id} className="bg-gray-700 p-3 rounded-lg">
                                        <p className="font-semibold">{log.description}</p>
                                        <p className="text-sm text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center">No medication history found.</p>
                            )}
                        </div>
                        <button onClick={() => setIsHistoryModalOpen(false)} className="mt-6 w-full bg-gray-600 p-2 rounded">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
