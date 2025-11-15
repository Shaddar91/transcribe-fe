//Authentication service for transcribe frontend
//Handles login, logout, and session management with backend auth service

class AuthService {
    constructor() {
        //Backend API URL - change to production URL when deploying
        this.API_URL = window.location.hostname === 'localhost'
            ? 'http://localhost:8000'
            : 'https://auth.transcribe.cloudlord.com';

        this.currentUser = null;
    }

    //Login with username and password
    async login(username, password) {
        try {
            const response = await fetch(`${this.API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', //Important: Send cookies
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }

            const data = await response.json();
            this.currentUser = data.user;
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    //Logout current user
    async logout() {
        try {
            const response = await fetch(`${this.API_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                console.warn('Logout request failed, clearing local state anyway');
            }

            this.currentUser = null;
        } catch (error) {
            console.error('Logout error:', error);
            //Clear local state even if request fails
            this.currentUser = null;
        }
    }

    //Get current authenticated user
    async getCurrentUser() {
        //Return cached user if available
        if (this.currentUser) {
            return this.currentUser;
        }

        try {
            const response = await fetch(`${this.API_URL}/api/auth/me`, {
                credentials: 'include'
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            this.currentUser = data.user;
            return this.currentUser;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    //Verify if user has valid session
    async verifySession() {
        try {
            const response = await fetch(`${this.API_URL}/api/auth/verify`, {
                credentials: 'include'
            });

            return response.ok;
        } catch (error) {
            console.error('Error verifying session:', error);
            return false;
        }
    }

    //Check if user is logged in (uses cached state)
    isLoggedIn() {
        return this.currentUser !== null;
    }
}

//Create global auth service instance
const authService = new AuthService();
