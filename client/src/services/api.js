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
  search: (name = '', category = '') => API.get(`/medicines?name=${name}&category=${category}`),
  add: (payload) => API.post('/medicines', payload),
  delete: (id) => API.delete(`/medicines/${id}`),
  updateStock: (id, stock) => API.put(`/medicines/${id}`, { stock }),
};

export const pharmacyService = {
  getNearby: (lat, lng, radius = 15) => API.get(`/pharmacies/nearby?latitude=${lat}&longitude=${lng}&radius=${radius}`),
  getAll: () => API.get('/pharmacies'),
  getInventory: (pharmacyId) => API.get(`/medicines?pharmacyId=${pharmacyId}`),
  getReservations: () => API.get('/reservations/pharmacy'),
  getOrders: () => API.get('/orders/pharmacy'),
  getPrescriptions: () => API.get('/prescriptions/pharmacy'),
};

export const reservationService = {
  getMy: () => API.get('/reservations/my'),
  create: (medicineId, quantity) => API.post('/reservations', { medicineId, quantity }),
  cancel: (id) => API.delete(`/reservations/${id}`),
  updateStatus: (id, status) => API.put(`/reservations/${id}/status`, { status }),
};

export const orderService = {
  getMy: () => API.get('/orders/my'),
  create: (payload) => API.post('/orders', payload),
  updateStatus: (id, status, paymentStatus) => API.put(`/orders/${id}/status`, { status, paymentStatus }),
};

export const prescriptionService = {
  getMy: () => API.get('/prescriptions/my'),
  upload: (formData) => API.post('/prescriptions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateStatus: (id, status) => API.put(`/prescriptions/${id}/status`, { status }),
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
