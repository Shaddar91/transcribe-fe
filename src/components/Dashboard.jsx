import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AudioRecorder from './AudioRecorder';
import AdminPanel from './AdminPanel';

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="screen">
      <div className="header">
        <h1>Voice Recorder</h1>
        <div className="user-info">
          <span>
            {user?.username}
            {isAdmin && <span className="badge badge-primary ml-2">Admin</span>}
          </span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      <p className="subtitle">Push-to-Talk Audio Recording</p>

      <AudioRecorder />

      {isAdmin && <AdminPanel />}
    </div>
  );
};

export default Dashboard;
