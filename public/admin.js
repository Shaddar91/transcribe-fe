/**
 * Admin Panel Component
 * Handles user and session management for admin users
 */

class AdminPanel {
    constructor(authService) {
        this.authService = authService;
        this.currentUser = null;
    }

    /**
     * Initialize admin panel
     */
    async init(user) {
        this.currentUser = user;

        //Only show admin panel if user is admin
        if (!user.is_admin) {
            console.log('User is not admin');
            return;
        }

        //Show admin panel in UI
        this.showAdminPanel();

        //Load initial data
        await this.loadUsers();
        await this.loadSessions();

        //Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Show admin panel in UI
     */
    showAdminPanel() {
        const adminSection = document.getElementById('admin-section');
        if (adminSection) {
            adminSection.style.display = 'block';
        }
    }

    /**
     * Hide admin panel
     */
    hideAdminPanel() {
        const adminSection = document.getElementById('admin-section');
        if (adminSection) {
            adminSection.style.display = 'none';
        }
    }

    /**
     * Load all users
     */
    async loadUsers() {
        try {
            const response = await fetch(`${this.authService.API_URL}/api/admin/users`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load users');
            }

            const users = await response.json();
            this.displayUsers(users);
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users');
        }
    }

    /**
     * Display users in table
     */
    displayUsers(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.full_name || '-'}</td>
                <td><span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                <td><span class="badge ${user.is_admin ? 'badge-warning' : 'badge-secondary'}">${user.is_admin ? 'Admin' : 'User'}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    ${user.id !== this.currentUser.id ? `
                        <button class="btn-small btn-primary" onclick="adminPanel.editUser(${user.id})">Edit</button>
                        <button class="btn-small btn-danger" onclick="adminPanel.deleteUser(${user.id}, '${user.username}')">Delete</button>
                    ` : '<span class="text-muted">Current User</span>'}
                </td>
            </tr>
        `).join('');
    }

    /**
     * Load all sessions
     */
    async loadSessions() {
        try {
            const response = await fetch(`${this.authService.API_URL}/api/admin/sessions`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load sessions');
            }

            const sessions = await response.json();
            this.displaySessions(sessions);
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showError('Failed to load sessions');
        }
    }

    /**
     * Display sessions in table
     */
    displaySessions(sessions) {
        const tbody = document.getElementById('sessions-table-body');
        if (!tbody) return;

        //Filter to show only valid sessions by default
        const validSessions = sessions.filter(s => s.is_valid);

        tbody.innerHTML = validSessions.map(session => `
            <tr>
                <td>${session.id}</td>
                <td>${session.username}</td>
                <td>${new Date(session.created_at).toLocaleString()}</td>
                <td>${new Date(session.expires_at).toLocaleString()}</td>
                <td><span class="badge ${session.is_valid ? 'badge-success' : 'badge-danger'}">${session.is_valid ? 'Valid' : 'Revoked'}</span></td>
                <td>
                    ${session.is_valid ? `
                        <button class="btn-small btn-danger" onclick="adminPanel.revokeSession(${session.id}, '${session.username}')">Revoke</button>
                    ` : '-'}
                </td>
            </tr>
        `).join('');
    }

    /**
     * Show create user modal
     */
    showCreateUserModal() {
        const modal = document.getElementById('create-user-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    /**
     * Hide create user modal
     */
    hideCreateUserModal() {
        const modal = document.getElementById('create-user-modal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('create-user-form').reset();
        }
    }

    /**
     * Create new user
     */
    async createUser(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            full_name: formData.get('full_name') || null,
            is_admin: formData.get('is_admin') === 'on'
        };

        try {
            const response = await fetch(`${this.authService.API_URL}/api/admin/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create user');
            }

            this.showSuccess('User created successfully');
            this.hideCreateUserModal();
            await this.loadUsers();
        } catch (error) {
            console.error('Error creating user:', error);
            this.showError(error.message);
        }
    }

    /**
     * Edit user
     */
    async editUser(userId) {
        //For simplicity, we'll just toggle active status
        const confirmed = confirm('Toggle user active status?');
        if (!confirmed) return;

        try {
            //First get current user data
            const response = await fetch(`${this.authService.API_URL}/api/admin/users`, {
                credentials: 'include'
            });
            const users = await response.json();
            const user = users.find(u => u.id === userId);

            if (!user) {
                throw new Error('User not found');
            }

            //Toggle active status
            const updateResponse = await fetch(`${this.authService.API_URL}/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    is_active: !user.is_active
                })
            });

            if (!updateResponse.ok) {
                const error = await updateResponse.json();
                throw new Error(error.detail || 'Failed to update user');
            }

            this.showSuccess('User updated successfully');
            await this.loadUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            this.showError(error.message);
        }
    }

    /**
     * Delete user
     */
    async deleteUser(userId, username) {
        const confirmed = confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            const response = await fetch(`${this.authService.API_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete user');
            }

            this.showSuccess('User deleted successfully');
            await this.loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError(error.message);
        }
    }

    /**
     * Revoke session
     */
    async revokeSession(sessionId, username) {
        const confirmed = confirm(`Revoke session for user "${username}"?`);
        if (!confirmed) return;

        try {
            const response = await fetch(`${this.authService.API_URL}/api/admin/sessions/${sessionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to revoke session');
            }

            this.showSuccess('Session revoked successfully');
            await this.loadSessions();
        } catch (error) {
            console.error('Error revoking session:', error);
            this.showError(error.message);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        //Create user form
        const createUserForm = document.getElementById('create-user-form');
        if (createUserForm) {
            createUserForm.addEventListener('submit', (e) => this.createUser(e));
        }

        //Refresh buttons
        const refreshUsersBtn = document.getElementById('refresh-users-btn');
        if (refreshUsersBtn) {
            refreshUsersBtn.addEventListener('click', () => this.loadUsers());
        }

        const refreshSessionsBtn = document.getElementById('refresh-sessions-btn');
        if (refreshSessionsBtn) {
            refreshSessionsBtn.addEventListener('click', () => this.loadSessions());
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const statusDiv = document.getElementById('admin-status');
        if (statusDiv) {
            statusDiv.className = 'status-message success';
            statusDiv.textContent = message;
            statusDiv.style.display = 'block';
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const statusDiv = document.getElementById('admin-status');
        if (statusDiv) {
            statusDiv.className = 'status-message error';
            statusDiv.textContent = message;
            statusDiv.style.display = 'block';
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Cleanup on logout
     */
    cleanup() {
        this.hideAdminPanel();
        this.currentUser = null;
    }
}

//Global instance will be created by app.js
let adminPanel;
