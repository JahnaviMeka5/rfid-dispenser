
import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../constants';
import CameraCapture from './common/CameraCapture';
import { compareFaces } from '../services/geminiService';

enum Tab {
  PatientLogin,
  AdminLogin,
  Register,
}

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.PatientLogin);
  const [rfid, setRfid] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [useFacial, setUseFacial] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const context = useContext(AppContext);

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const patient = context?.patients.find(p => p.rfid === rfid);
    if (!patient) {
      setError('Invalid RFID number.');
      setLoading(false);
      return;
    }

    if (patient.useFacialRecognition) {
      if (!photo) {
        setError('Photo required for verification.');
        setShowCamera(true);
        setLoading(false);
        return;
      }
      const match = await compareFaces(patient.photo, photo);
      if (!match) {
        setError('Face verification failed. The photo does not match the registered user. Please try again.');
        setLoading(false);
        setPhoto(null);
        return;
      }
    }
    
    try {
      await context?.login({ rfid, photo: photo || undefined });
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        try {
            await context?.login({ email, password });
        } catch (err: any) {
            setError(err.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    } else {
        setError('Invalid admin credentials.');
        setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rfid || !photo) {
      setError('Name, RFID, and photo are required.');
      return;
    }
    setError('');
    setLoading(true);
    
    // Check for duplicate RFID
    if(context?.patients.some(p => p.rfid === rfid)) {
        setError('This RFID is already registered.');
        setLoading(false);
        return;
    }

    // Check for duplicate face
    for (const patient of context?.patients || []) {
        const isSamePerson = await compareFaces(patient.photo, photo);
        if (isSamePerson) {
            setError(`This person is already registered with RFID: ${patient.rfid}.`);
            setLoading(false);
            return;
        }
    }

    try {
      await context?.registerPatient({ name, rfid, photo, useFacialRecognition: useFacial });
      alert('Registration successful! Please log in.');
      setActiveTab(Tab.PatientLogin);
      // Reset fields
      setName('');
      setRfid('');
      setPhoto(null);
      setShowCamera(false);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderPatientLogin = () => (
    <form onSubmit={handlePatientLogin} className="space-y-6">
      <input type="text" placeholder="Enter RFID Number" value={rfid} onChange={e => setRfid(e.target.value)} required className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      {showCamera ? (
         <CameraCapture onCapture={(p) => { setPhoto(p); setShowCamera(false); }} />
      ) : (
          <button type="button" onClick={() => setShowCamera(true)} className="w-full px-4 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500">
            Scan Face
          </button>
      )}
       {photo && <img src={`data:image/jpeg;base64,${photo}`} alt="Login capture" className="w-24 h-24 rounded-full mx-auto"/>}
      <button type="submit" disabled={loading} className="w-full px-4 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-cyan-800">
        {loading ? 'Logging In...' : 'Login'}
      </button>
    </form>
  );

  const renderAdminLogin = () => (
    <form onSubmit={handleAdminLogin} className="space-y-6">
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      <button type="submit" disabled={loading} className="w-full px-4 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-cyan-800">
        {loading ? 'Logging In...' : 'Admin Login'}
      </button>
    </form>
  );

  const renderRegister = () => (
    <form onSubmit={handleRegister} className="space-y-6">
      <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      <input type="text" placeholder="Enter RFID Number" value={rfid} onChange={e => setRfid(e.target.value)} required className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      {photo ? (
        <div className="text-center">
            <img src={`data:image/jpeg;base64,${photo}`} alt="Captured" className="w-32 h-32 rounded-full mx-auto border-4 border-cyan-500"/>
            <button type="button" onClick={() => setPhoto(null)} className="mt-2 text-sm text-cyan-400 hover:text-cyan-300">Retake</button>
        </div>
      ) : (
        <CameraCapture onCapture={setPhoto} />
      )}
      <div className="flex items-center justify-center space-x-3 text-white">
        <label htmlFor="facial-toggle">Enable Facial Recognition Login?</label>
        <button
            type="button"
            onClick={() => setUseFacial(!useFacial)}
            className={`${useFacial ? 'bg-cyan-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
            >
            <span className={`${useFacial ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
        </button>
      </div>
      <button type="submit" disabled={loading || !photo} className="w-full px-4 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-gray-500">
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-cyan-400 mb-2">IntelliMed</h1>
        <p className="text-center text-gray-400 mb-8">Your Personal Health Companion</p>
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8">
          <div className="flex border-b border-gray-700 mb-6">
            <button onClick={() => setActiveTab(Tab.PatientLogin)} className={`flex-1 py-2 text-center font-semibold ${activeTab === Tab.PatientLogin ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Patient</button>
            <button onClick={() => setActiveTab(Tab.AdminLogin)} className={`flex-1 py-2 text-center font-semibold ${activeTab === Tab.AdminLogin ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Admin</button>
            <button onClick={() => setActiveTab(Tab.Register)} className={`flex-1 py-2 text-center font-semibold ${activeTab === Tab.Register ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Register</button>
          </div>
          {error && <p className="bg-red-500/20 text-red-400 text-center p-3 rounded-lg mb-4">{error}</p>}
          {activeTab === Tab.PatientLogin && renderPatientLogin()}
          {activeTab === Tab.AdminLogin && renderAdminLogin()}
          {activeTab === Tab.Register && renderRegister()}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
