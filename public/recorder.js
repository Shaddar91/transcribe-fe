//Voice recorder component adapted from voice-recorder project
//Handles audio recording, visualization, and upload to backend

class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.startTime = null;
        this.timerInterval = null;
        this.audioContext = null;
        this.analyser = null;
        this.animationId = null;

        //Upload endpoint - removed hardcoded environment variables
        this.UPLOAD_URL = '/upload'; //Will be handled by backend service

        //DOM elements
        this.permissionButton = document.getElementById('permissionButton');
        this.recordButton = document.getElementById('recordButton');
        this.statusElement = document.getElementById('status');
        this.timerElement = document.getElementById('timer');
        this.recordingsList = document.getElementById('recordingsList');
        this.visualizerCanvas = document.getElementById('visualizer');
        this.visualizerContext = this.visualizerCanvas.getContext('2d');

        //Bind methods for event listeners
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }

    async init() {
        //Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.updateStatus('getUserMedia is not supported in this browser', 'error');
            this.permissionButton.disabled = true;
            return;
        }

        //Check for secure context
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            this.updateStatus('Microphone access requires HTTPS or localhost', 'error');
            console.warn('getUserMedia requires a secure context (HTTPS) when not on localhost');
        }

        //Set up permission button listener with error handling
        this.permissionButton.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Permission button clicked');
            await this.requestMicrophonePermission();
        });

        //Check if microphone permissions were already granted
        await this.checkExistingPermissions();

        //Add visibility change handler for mobile background/foreground transitions
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        //Load recordings list
        this.loadRecordingsList();
    }

    async checkExistingPermissions() {
        //Check if Permissions API is available
        if (!navigator.permissions || !navigator.permissions.query) {
            console.log('Permissions API not available, user will need to click button');
            return;
        }

        try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

            if (permissionStatus.state === 'granted') {
                console.log('Microphone permission already granted');
                this.updateStatus('Microphone already enabled - click "Enable Microphone" to start', 'ready');
            } else if (permissionStatus.state === 'prompt') {
                console.log('Microphone permission not yet requested');
            } else if (permissionStatus.state === 'denied') {
                console.log('Microphone permission denied');
                this.updateStatus('Microphone access denied. Please enable in browser settings.', 'error');
            }

            //Listen for permission changes
            permissionStatus.addEventListener('change', () => {
                console.log('Microphone permission changed to:', permissionStatus.state);
            });
        } catch (error) {
            console.log('Could not check microphone permissions:', error);
        }
    }

    async requestMicrophonePermission() {
        try {
            console.log('Requesting microphone permission...');
            this.updateStatus('Requesting microphone access...', 'processing');

            //Request microphone permission
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            console.log('Microphone permission granted');

            this.setupAudioContext();
            this.setupEventListeners();

            //Hide permission button, show record button
            this.permissionButton.style.display = 'none';
            this.recordButton.style.display = 'block';

            this.updateStatus('Ready to record', 'ready');
        } catch (error) {
            console.error('Error accessing microphone:', error);

            let errorMessage = 'Microphone access denied. Please allow microphone access and try again.';

            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage = 'No microphone found. Please connect a microphone and try again.';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage = 'Microphone is already in use by another application.';
            }

            this.updateStatus(errorMessage, 'error');
        }
    }

    setupAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;

        const source = this.audioContext.createMediaStreamSource(this.stream);
        source.connect(this.analyser);
    }

    setupEventListeners() {
        //Toggle recording on click
        this.recordButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });
    }

    startRecording() {
        if (this.isRecording || (this.mediaRecorder && this.mediaRecorder.state === 'recording')) {
            console.warn('Already recording, ignoring start request');
            return;
        }

        if (!this.stream || !this.stream.active) {
            console.error('No active audio stream');
            this.updateStatus('Error: Microphone not available. Please refresh.', 'error');
            return;
        }

        this.audioChunks = [];
        this.isRecording = true;

        //Try different MIME types in order of preference
        let options;
        const supportedTypes = [
            'audio/webm',
            'audio/webm;codecs=opus',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/wav'
        ];

        for (const mimeType of supportedTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                options = { mimeType };
                console.log(`Using MIME type: ${mimeType}`);
                break;
            }
        }

        if (!options) {
            console.warn('No preferred MIME type supported, using default');
            options = {};
        }

        this.mediaRecorder = new MediaRecorder(this.stream, options);

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            this.saveRecording();
        };

        this.mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            this.updateStatus(`Recording error: ${event.error.name}`, 'error');
            this.isRecording = false;
            this.stopTimer();
            this.stopVisualizer();
            this.recordButton.classList.remove('recording');
            this.recordButton.querySelector('.button-text').textContent = 'Start Recording';
        };

        this.mediaRecorder.start(250);
        this.startTime = Date.now();
        this.startTimer();
        this.startVisualizer();

        this.recordButton.classList.add('recording');
        this.recordButton.querySelector('.button-text').textContent = 'Stop Recording';
        this.updateStatus('Recording...', 'recording');
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;

        this.isRecording = false;

        if (this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.requestData();

            setTimeout(() => {
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                    this.mediaRecorder.stop();
                }
            }, 100);
        }

        this.stopTimer();
        this.stopVisualizer();

        this.recordButton.classList.remove('recording');
        this.recordButton.querySelector('.button-text').textContent = 'Start Recording';
        this.updateStatus('Processing...', 'processing');
    }

    async saveRecording() {
        if (this.audioChunks.length === 0) {
            console.error('No audio data captured');
            this.updateStatus('Error: No audio data recorded', 'error');
            setTimeout(() => {
                this.updateStatus('Ready to record', 'ready');
            }, 3000);
            return;
        }

        const mimeType = this.mediaRecorder.mimeType;
        let fileExtension = 'webm';

        if (mimeType.includes('wav')) {
            fileExtension = 'wav';
        } else if (mimeType.includes('webm')) {
            fileExtension = 'webm';
        }

        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        if (audioBlob.size === 0) {
            console.error('Audio blob is empty');
            this.updateStatus('Error: Recording is empty', 'error');
            setTimeout(() => {
                this.updateStatus('Ready to record', 'ready');
            }, 3000);
            return;
        }

        const duration = this.startTime ? (Date.now() - this.startTime) : 0;
        const MIN_VALID_SIZE = 1024;
        const MIN_DURATION = 500;

        if (audioBlob.size < MIN_VALID_SIZE && duration < MIN_DURATION) {
            console.warn(`Recording too short: ${audioBlob.size} bytes, ${duration}ms`);
            this.updateStatus('Recording too short. Please record for at least 1 second.', 'error');
            setTimeout(() => {
                this.updateStatus('Ready to record', 'ready');
            }, 3000);
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `voice_recording_${timestamp}.${fileExtension}`;

        const formData = new FormData();
        formData.append('audio', audioBlob, filename);

        try {
            const response = await fetch(this.UPLOAD_URL, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                this.updateStatus('Recording saved successfully!', 'success');
                this.addRecordingToList(result.filename, result.size);
                setTimeout(() => {
                    this.updateStatus('Ready to record', 'ready');
                }, 2000);
            } else {
                let errorMessage = 'Upload failed';
                try {
                    const errorData = await response.json();
                    if (errorData.details) {
                        errorMessage = errorData.details;
                    } else if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    //Could not parse error response
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error saving recording:', error);
            this.updateStatus(`Error: ${error.message}`, 'error');
            setTimeout(() => {
                this.updateStatus('Ready to record', 'ready');
            }, 4000);
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;

            this.timerElement.textContent =
                `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.timerElement.textContent = '00:00';
    }

    startVisualizer() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const width = this.visualizerCanvas.width;
        const height = this.visualizerCanvas.height;

        const draw = () => {
            if (!this.isRecording) return;

            this.animationId = requestAnimationFrame(draw);

            this.analyser.getByteTimeDomainData(dataArray);

            this.visualizerContext.fillStyle = 'rgb(240, 240, 240)';
            this.visualizerContext.fillRect(0, 0, width, height);

            this.visualizerContext.lineWidth = 2;
            this.visualizerContext.strokeStyle = 'rgb(59, 130, 246)';
            this.visualizerContext.beginPath();

            const sliceWidth = width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * height) / 2;

                if (i === 0) {
                    this.visualizerContext.moveTo(x, y);
                } else {
                    this.visualizerContext.lineTo(x, y);
                }

                x += sliceWidth;
            }

            this.visualizerContext.lineTo(width, height / 2);
            this.visualizerContext.stroke();
        };

        draw();
    }

    stopVisualizer() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.visualizerContext.fillStyle = 'rgb(240, 240, 240)';
        this.visualizerContext.fillRect(0, 0, this.visualizerCanvas.width, this.visualizerCanvas.height);
    }

    updateStatus(message, state) {
        this.statusElement.textContent = message;
        this.statusElement.className = `status status-${state}`;

        if (navigator.vibrate && (state === 'recording' || state === 'success' || state === 'error')) {
            const pattern = {
                'recording': [50],
                'success': [50, 100, 50],
                'error': [100, 50, 100]
            };
            navigator.vibrate(pattern[state] || [50]);
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            if (this.isRecording) {
                console.warn('Recording in progress while page hidden');
            }
        } else {
            if (this.stream && !this.stream.active) {
                console.error('Audio stream became inactive');
                this.updateStatus('Error: Audio stream lost. Please refresh.', 'error');
                this.isRecording = false;
                this.stopTimer();
                this.stopVisualizer();
                if (this.recordButton) {
                    this.recordButton.classList.remove('recording');
                    this.recordButton.querySelector('.button-text').textContent = 'Start Recording';
                }
            }
        }
    }

    async loadRecordingsList() {
        try {
            const response = await fetch('/recordings', {
                credentials: 'include'
            });
            if (response.ok) {
                const recordings = await response.json();
                this.displayRecordingsList(recordings);
            }
        } catch (error) {
            console.error('Error loading recordings list:', error);
        }
    }

    displayRecordingsList(recordings) {
        if (recordings.length === 0) {
            this.recordingsList.innerHTML = '<p class="empty-message">No recordings yet</p>';
            return;
        }

        this.recordingsList.innerHTML = recordings.map(rec => `
            <div class="recording-item">
                <span class="recording-name">${rec.filename}</span>
                <span class="recording-size">${this.formatFileSize(rec.size)}</span>
                <span class="recording-date">${this.formatDate(rec.date)}</span>
            </div>
        `).join('');
    }

    addRecordingToList(filename, size) {
        if (this.recordingsList.querySelector('.empty-message')) {
            this.recordingsList.innerHTML = '';
        }

        const recordingItem = document.createElement('div');
        recordingItem.className = 'recording-item';
        recordingItem.innerHTML = `
            <span class="recording-name">${filename}</span>
            <span class="recording-size">${this.formatFileSize(size)}</span>
            <span class="recording-date">${this.formatDate(new Date().toISOString())}</span>
        `;

        this.recordingsList.insertBefore(recordingItem, this.recordingsList.firstChild);
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
}
