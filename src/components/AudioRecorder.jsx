import React, { useEffect, useRef, useState } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { audioAPI } from '../services/api';

const AudioRecorder = () => {
  const {
    isRecording,
    isPaused,
    hasPermission,
    formattedTime,
    requestPermission,
    startRecording,
    stopRecording,
    visualize,
  } = useAudioRecorder();

  const [status, setStatus] = useState('Click "Enable Microphone" to begin');
  const [recordings, setRecordings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (hasPermission && canvasRef.current) {
      visualize(canvasRef.current);
    }
  }, [hasPermission, isRecording, visualize]);

  const handlePermissionRequest = async () => {
    const granted = await requestPermission();
    if (granted) {
      setStatus('Microphone ready. Click "Start Recording" to begin.');
    } else {
      setStatus('Microphone access denied. Please check your browser settings.');
    }
  };

  const handleStartRecording = () => {
    startRecording();
    setStatus('Recording... Click "Stop Recording" when finished.');
  };

  const handleStopRecording = async () => {
    try {
      setStatus('Stopping recording...');
      const { blob, extension } = await stopRecording();

      setStatus('Uploading to server...');
      setUploading(true);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording_${timestamp}.${extension}`;

      // Upload to backend
      const response = await audioAPI.upload(blob, filename);

      // Add to recordings list
      const newRecording = {
        id: Date.now(),
        filename: response.filename,
        s3_key: response.s3_key,
        size: response.size,
        timestamp: response.upload_timestamp,
        blob: blob, // Keep blob for playback
      };

      setRecordings((prev) => [newRecording, ...prev]);
      setStatus('Recording uploaded successfully!');

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('Click "Start Recording" to record again.');
      }, 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setStatus(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handlePlayRecording = (recording) => {
    const url = URL.createObjectURL(recording.blob);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="recorder-section">
      <div className="recorder-container">
        {!hasPermission && (
          <button
            className="record-button permission-button"
            onClick={handlePermissionRequest}
          >
            <span className="button-icon">🎤</span>
            <span className="button-text">Enable Microphone</span>
          </button>
        )}

        {hasPermission && !isRecording && (
          <button
            className="record-button"
            onClick={handleStartRecording}
            disabled={uploading}
          >
            <span className="button-icon">🔴</span>
            <span className="button-text">Start Recording</span>
          </button>
        )}

        {hasPermission && isRecording && (
          <button
            className="record-button recording"
            onClick={handleStopRecording}
            disabled={uploading}
          >
            <span className="button-icon">⏹</span>
            <span className="button-text">Stop Recording</span>
          </button>
        )}

        <div className="status">{status}</div>

        {isRecording && (
          <div className="timer">{formattedTime}</div>
        )}

        <div className="audio-visualizer">
          <canvas ref={canvasRef} width="300" height="100"></canvas>
        </div>
      </div>

      <div className="info-section">
        <h3>Recent Recordings</h3>
        <div className="recordings-list">
          {recordings.length === 0 ? (
            <p className="empty-message">No recordings yet</p>
          ) : (
            recordings.map((recording) => (
              <div key={recording.id} className="recording-item">
                <div className="recording-info">
                  <strong>{recording.filename}</strong>
                  <span className="recording-meta">
                    {formatBytes(recording.size)} • {formatTimestamp(recording.timestamp)}
                  </span>
                </div>
                <button
                  className="play-button"
                  onClick={() => handlePlayRecording(recording)}
                >
                  ▶ Play
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="instructions">
        <h4>Instructions:</h4>
        <ul>
          <li>Click "Enable Microphone" and allow access when prompted</li>
          <li>Click "Start Recording" to begin recording</li>
          <li>Click "Stop Recording" to end and save</li>
          <li>Recordings are uploaded automatically to cloud storage</li>
        </ul>
      </div>
    </div>
  );
};

export default AudioRecorder;
