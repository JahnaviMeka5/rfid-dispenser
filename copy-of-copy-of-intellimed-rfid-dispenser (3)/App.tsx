
import React, { useContext, useState } from 'react';
import { AppContext } from './context/AppContext';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import PatientDashboard from './components/PatientDashboard';
import AdminDashboard from './components/AdminDashboard';
import { UserRole } from './types';

const App: React.FC = () => {
  const context = useContext(AppContext);
  const [showLanding, setShowLanding] = useState(true);

  if (!context) {
    return <div>Loading...</div>;
  }

  const { currentUser } = context;

  const handleStart = () => {
    setShowLanding(false);
  };

  if (showLanding) {
    return <LandingPage onStart={handleStart} />;
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  if (currentUser.role === UserRole.Admin) {
    return <AdminDashboard />;
  }

  if (currentUser.role === UserRole.Patient) {
    return <PatientDashboard />;
  }

  return <LoginPage />;
};

export default App;
