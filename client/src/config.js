/**
 * Application Runtime Configuration
 * Automatically detects API and Socket endpoints based on environment variables or deployment context
 */

// Resolves the backend API base URL (e.g. 'https://medifind-backend.onrender.com/api' or 'http://localhost:5000/api')
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const cleanUrl = envUrl.trim().replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  
  // If running on a deployed domain without explicit VITE_API_URL (e.g., frontend served by Express backend)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  
  return 'http://localhost:5000/api';
};

// Resolves the backend Socket.IO URL (e.g. 'https://medifind-backend.onrender.com' or 'http://localhost:5000')
export const getSocketUrl = () => {
  const socketEnv = import.meta.env.VITE_SOCKET_URL;
  if (socketEnv && typeof socketEnv === 'string' && socketEnv.trim()) {
    return socketEnv.trim().replace(/\/+$/, '');
  }
  
  const apiEnv = import.meta.env.VITE_API_URL;
  if (apiEnv && typeof apiEnv === 'string' && apiEnv.trim()) {
    return apiEnv.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  // If deployed and no env is passed, connect to current origin
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();
