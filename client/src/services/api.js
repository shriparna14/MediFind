import axios from 'axios';

// API Instance Configuration
const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Automatically inject JWT token from localStorage if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const authService = {
  login: (email, password) => API.post('/auth/login', { email, password }),
  register: (payload) => API.post('/auth/register', payload),
  getMe: () => API.get('/auth/me'),
};

export const medicineService = {
  search: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return API.get(`/medicines/search?${query}`);
  },
  getById: (id) => API.get(`/medicines/${id}`),
  add: (payload) => API.post('/medicines', payload),
  delete: (id) => API.delete(`/medicines/${id}`),
  update: (id, payload) => API.put(`/medicines/${id}`, payload),
  updateStock: (id, stock) => API.put(`/medicines/${id}`, { stock }),
};

export const aiService = {
  chat: (message, latitude = 12.9716, longitude = 77.5946, radius = 25) =>
    API.post('/ai/chat', { message, latitude, longitude, radius }),
  search: (q, lat = 12.9716, lng = 77.5946, radius = 25) =>
    API.get(`/ai/search?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}&radius=${radius}`),
  getInventoryAdvice: () => API.get('/ai/inventory-advice'),
};

export const pharmacyService = {
  getNearby: (lat, lng, radius = 25, emergency = false) =>
    API.get(`/pharmacies/nearby?lat=${lat}&lng=${lng}&radius=${radius}&emergency=${emergency}`),
  getAll: () => API.get('/pharmacies'),
  compare: (name, lat = 12.9716, lng = 77.5946) =>
    API.get(`/pharmacies/compare?name=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}`),
  getInventory: (pharmacyId, page = 1, limit = 50, filter = 'all') =>
    API.get(`/pharmacies/${pharmacyId}/inventory?page=${page}&limit=${limit}&filter=${filter}`),
  getStats: () => API.get('/pharmacies/stats'),
  getDemandPrediction: () => API.get('/pharmacies/demand-prediction'),
  getReservations: (page = 1, limit = 50) => API.get(`/reservations/pharmacy?page=${page}&limit=${limit}`),
  getOrders: (page = 1, limit = 50, status = '') => API.get(`/orders/pharmacy?page=${page}&limit=${limit}&status=${status}`),
  getPrescriptions: (page = 1, limit = 50) => API.get(`/prescriptions/pharmacy?page=${page}&limit=${limit}`),
};

export const reservationService = {
  getMy: (page = 1, limit = 20) => API.get(`/reservations/my?page=${page}&limit=${limit}`),
  create: (medicineId, quantity = 1) => API.post('/reservations', { medicineId, quantity }),
  updateStatus: (id, status) => API.put(`/reservations/${id}/status`, { status }),
};

export const orderService = {
  getMy: (page = 1, limit = 20) => API.get(`/orders/my?page=${page}&limit=${limit}`),
  create: (payload) => API.post('/orders', payload),
  updateStatus: (id, status, note = '') => API.put(`/orders/${id}/status`, { status, note }),
};

export const prescriptionService = {
  getMy: (page = 1, limit = 20) => API.get(`/prescriptions/my?page=${page}&limit=${limit}`),
  upload: (formData) => API.post('/prescriptions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateStatus: (id, status, rejectionReason = '') =>
    API.put(`/prescriptions/${id}/status`, { status, rejectionReason }),
};

export const reviewService = {
  create: (payload) => API.post('/reviews', payload),
  getForPharmacy: (pharmacyId) => API.get(`/reviews/pharmacy/${pharmacyId}`),
};

export const notificationService = {
  getMy: () => API.get('/notifications'),
  markAllAsRead: () => API.put('/notifications/read-all'),
};

export const adminService = {
  getStats: () => API.get('/admin/stats'),
  getPharmacies: () => API.get('/admin/pharmacies'),
  getUsers: () => API.get('/admin/users'),
  getDeliveries: () => API.get('/admin/deliveries'),
  approvePharmacy: (id) => API.put(`/admin/pharmacies/${id}/approve`),
  deletePharmacy: (id) => API.delete(`/admin/pharmacies/${id}`),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
};

export default API;
