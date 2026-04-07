import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Patient } from '../types';
import MedicineSchedule from './patient/MedicineSchedule';
import HealthTips from './patient/HealthTips';
import YogaAndFitness from './patient/YogaAndFitness';
import HealthCoach from './patient/HealthCoach';
import HealthDiary from './patient/HealthDiary';
import Settings from './patient/Settings';
import { generateVoiceAlert } from '../services/geminiService';
import ChatWidget from './common/ChatWidget';

const PatientDashboard: React.FC = () => {
  const context = useContext(AppContext);
  const patient = context?.currentUser as Patient;
  const { logout, voiceAlert, clearVoiceAlert } = context!;
  const [activeTab, setActiveTab] = useState('meds');

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };
  
  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };


  useEffect(() => {
    const playVoiceAlert = async () => {
        if (voiceAlert && voiceAlert.patientId === patient.id) {
            try {
                const base64Audio = await generateVoiceAlert(voiceAlert.message);
                if (base64Audio) {
                    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                    const source = outputAudioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputAudioContext.destination);
                    source.start();
                }
            } catch (error) {
                console.error("Failed to play voice alert:", error);
                alert("Voice Alert: " + voiceAlert.message);
            } finally {
                clearVoiceAlert();
            }
        }
    };
    playVoiceAlert();
  }, [voiceAlert, patient.id, clearVoiceAlert]);


  if (!patient) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'meds':
        return <MedicineSchedule />;
      case 'coach':
        return <HealthCoach />;
      case 'yoga':
        return <YogaAndFitness />;
      case 'diary':
        return <HealthDiary />;
      case 'settings':
        return <Settings />;
      default:
        return <MedicineSchedule />;
    }
  }

  const TabButton = ({ id, label, icon }: {id: string, label: string, icon: string}) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 px-2 text-sm md:text-base text-center font-semibold transition-colors duration-300 flex items-center justify-center gap-2 ${
        activeTab === id
          ? 'text-cyan-400 bg-gray-700/50'
          : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
      }`}
    >
      <span className="material-icons">{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <header className="bg-gray-800 shadow-lg p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <img src={`data:image/jpeg;base64,${patient.photo}`} alt={patient.name} className="w-12 h-12 rounded-full border-2 border-cyan-400 object-cover"/>
            <div>
                 <h1 className="text-xl font-bold text-cyan-300">Welcome, {patient.name}</h1>
                 <p className="text-sm text-gray-400">RFID: {patient.rfid}</p>
            </div>
        </div>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Logout
        </button>
      </header>

      <main className="p-4 md:p-6 lg:p-8">
        <HealthTips />
        
        <div className="mt-8 bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex border-b-2 border-gray-700">
                <TabButton id="meds" label="Medications" icon="medication" />
                <TabButton id="coach" label="AI Health Coach" icon="smart_toy" />
                <TabButton id="yoga" label="Yoga & Fitness" icon="self_improvement" />
                <TabButton id="diary" label="Health Diary" icon="event_note" />
                <TabButton id="settings" label="Settings" icon="settings" />
            </div>

            <div className="p-4 md:p-6">
                {renderContent()}
            </div>
        </div>

      </main>
      <ChatWidget />
    </div>
  );
};

export default PatientDashboard;