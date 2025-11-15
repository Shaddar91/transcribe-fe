import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    is_admin: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, sessionsData] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getSessions(),
      ]);
      setUsers(usersData.users || usersData);
      setSessions(sessionsData.sessions || sessionsData);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createUser(newUser);
      setShowCreateModal(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        full_name: '',
        is_admin: false,
      });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    try {
      await adminAPI.deleteUser(userId);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to revoke this session?')) {
      return;
    }
    try {
      await adminAPI.revokeSession(sessionId);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="admin-section">
      <h2>Admin Panel</h2>

      {error && (
        <div className="status-message error" style={{ display: 'block' }}>
          {error}
        </div>
      )}

      {/* User Management */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3>User Management</h3>
          <div className="admin-actions">
            <button
              onClick={loadData}
              className="btn-secondary"
              disabled={loading}
            >
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create User
            </button>
          </div>
        </div>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Full Name</th>
                <th>Status</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.email || 'N/A'}</td>
                    <td>{user.full_name || 'N/A'}</td>
                    <td>
                      <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.is_admin ? 'badge-primary' : 'badge-secondary'}`}>
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Management */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3>Active Sessions</h3>
          <div className="admin-actions">
            <button
              onClick={loadData}
              className="btn-secondary"
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center">Loading...</td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">No active sessions</td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.id}</td>
                    <td>{session.username || 'N/A'}</td>
                    <td>{formatDate(session.created_at)}</td>
                    <td>{formatDate(session.expires_at)}</td>
                    <td>
                      <span className="badge badge-success">Active</span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="btn-danger btn-sm"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="close-button"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label htmlFor="new-username">Username</label>
                <input
                  type="text"
                  id="new-username"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-email">Email</label>
                <input
                  type="email"
                  id="new-email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-password">Password</label>
                <input
                  type="password"
                  id="new-password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  required
                  minLength="6"
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-full-name">Full Name (Optional)</label>
                <input
                  type="text"
                  id="new-full-name"
                  value={newUser.full_name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, full_name: e.target.value })
                  }
                />
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newUser.is_admin}
                    onChange={(e) =>
                      setNewUser({ ...newUser, is_admin: e.target.checked })
                    }
                  />
                  <span>Admin Privileges</span>
                </label>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
