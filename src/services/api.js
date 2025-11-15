import { API_URL } from '../config';

/**
 * API Service for Transcribe Backend
 * Handles all HTTP requests to the FastAPI backend
 */

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;

  const defaultOptions = {
    credentials: 'include', // Include cookies for session authentication
    headers: {
      ...options.headers,
    },
  };

  // Don't set Content-Type for FormData (browser will set it with boundary)
  if (!(options.body instanceof FormData)) {
    defaultOptions.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
  });

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || `API Error: ${response.status}`);
    }

    return data;
  }

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response;
};

// Authentication API
export const authAPI = {
  login: async (username, password) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  logout: async () => {
    return apiRequest('/api/auth/logout', {
      method: 'POST',
    });
  },

  verify: async () => {
    return apiRequest('/api/auth/verify', {
      method: 'GET',
    });
  },

  me: async () => {
    return apiRequest('/api/auth/me', {
      method: 'GET',
    });
  },

  register: async (userData) => {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
};

// Audio API
export const audioAPI = {
  upload: async (audioBlob, filename) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    return apiRequest('/api/audio/upload', {
      method: 'POST',
      body: formData,
    });
  },
};

// Admin API
export const adminAPI = {
  getUsers: async () => {
    return apiRequest('/api/admin/users', {
      method: 'GET',
    });
  },

  createUser: async (userData) => {
    return apiRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (userId, userData) => {
    return apiRequest(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (userId) => {
    return apiRequest(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  getSessions: async () => {
    return apiRequest('/api/admin/sessions', {
      method: 'GET',
    });
  },

  revokeSession: async (sessionId) => {
    return apiRequest(`/api/admin/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },
};
