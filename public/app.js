//Main application logic
//Handles screen transitions, login/logout flow, and initialization

class TranscribeApp {
    constructor() {
        this.loginScreen = document.getElementById('loginScreen');
        this.recorderScreen = document.getElementById('recorderScreen');
        this.loginForm = document.getElementById('loginForm');
        this.loginButton = document.getElementById('loginButton');
        this.loginError = document.getElementById('loginError');
        this.logoutButton = document.getElementById('logoutButton');
        this.currentUserSpan = document.getElementById('currentUser');

        this.voiceRecorder = null;

        this.init();
    }

    async init() {
        //Set up event listeners
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.logoutButton.addEventListener('click', (e) => this.handleLogout(e));

        //Check if user is already logged in
        await this.checkAuthStatus();
    }

    async checkAuthStatus() {
        try {
            const user = await authService.getCurrentUser();

            if (user) {
                //User is already logged in, show recorder screen
                this.showRecorderScreen(user);
            } else {
                //User not logged in, show login screen
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.showLoginScreen();
        }
    }

    async handleLogin(event) {
        event.preventDefault();

        //Hide any previous errors
        this.loginError.style.display = 'none';

        //Get form values
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showLoginError('Please enter both username and password');
            return;
        }

        //Disable button during login
        this.loginButton.disabled = true;
        this.loginButton.querySelector('.button-text').textContent = 'Logging in...';

        try {
            const result = await authService.login(username, password);

            //Login successful
            this.showRecorderScreen(result.user);

            //Clear form
            this.loginForm.reset();
        } catch (error) {
            console.error('Login failed:', error);
            this.showLoginError(error.message || 'Login failed. Please check your credentials.');
        } finally {
            //Re-enable button
            this.loginButton.disabled = false;
            this.loginButton.querySelector('.button-text').textContent = 'Login';
        }
    }

    async handleLogout(event) {
        event.preventDefault();

        try {
            await authService.logout();

            //Stop voice recorder if it's running
            if (this.voiceRecorder && this.voiceRecorder.isRecording) {
                this.voiceRecorder.stopRecording();
            }

            //Clean up recorder instance
            this.voiceRecorder = null;

            //Clean up admin panel if exists
            if (adminPanel) {
                adminPanel.cleanup();
            }

            //Show login screen
            this.showLoginScreen();
        } catch (error) {
            console.error('Logout error:', error);
            //Show login screen anyway
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        this.loginScreen.style.display = 'block';
        this.recorderScreen.style.display = 'none';
    }

    showRecorderScreen(user) {
        this.loginScreen.style.display = 'none';
        this.recorderScreen.style.display = 'block';

        //Display current user
        this.currentUserSpan.textContent = user.full_name || user.username;

        //Initialize voice recorder if not already done
        if (!this.voiceRecorder) {
            this.voiceRecorder = new VoiceRecorder();
            this.voiceRecorder.init();
        }

        //Initialize admin panel if user is admin
        if (user.is_admin) {
            if (!adminPanel) {
                adminPanel = new AdminPanel(authService);
            }
            adminPanel.init(user);
        }
    }

    showLoginError(message) {
        this.loginError.textContent = message;
        this.loginError.style.display = 'block';
    }
}

//Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TranscribeApp();
});
