import axios from 'axios';
import { API_BASE_URL } from '../config';

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token from localStorage if logged in
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const aiApi = {
  // AI Chat Assistant (Natural language search, pharmacy recommendation, monograph explanations)
  chat: async (message, latitude = 12.9716, longitude = 77.5946, radius = 25) => {
    const res = await API.post('/ai/chat', { message, latitude, longitude, radius });
    return res.data;
  },

  // AI Natural Language Search
  search: async (q, lat = 12.9716, lng = 77.5946, radius = 25) => {
    const res = await API.get(`/ai/search?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}&radius=${radius}`);
    return res.data;
  },

  // Pharmacist AI Restock & Inventory Advisor
  getInventoryAdvice: async () => {
    const res = await API.get('/ai/inventory-advice');
    return res.data;
  }
};

export default aiApi;
