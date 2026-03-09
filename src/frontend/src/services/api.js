// ============================================================
// FILE: src/services/api.js
// Axios instance + JWT interceptor — kết nối với ASP.NET Core API
// ============================================================
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';
// FIX: Dùng relative URL '/api' thay vì 'http://localhost:5000/api'
// React dev server proxy (package.json "proxy": "http://localhost:5000")
// sẽ tự forward request đến backend → tránh CORS khi dùng proxy
// Nếu muốn gọi thẳng không qua proxy, set: REACT_APP_API_URL=http://localhost:5000/api

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: tự động thêm JWT token ──────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sa_token'); // FIX: key mới
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: xử lý lỗi 401 (token hết hạn) ─
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sa_token'); // FIX: key mới
      localStorage.removeItem('sa_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ══════════════════════════════════════════════════════════
// AUTH — UC1
// ══════════════════════════════════════════════════════════
export const authApi = {
  login: (data) => api.post('/Auth/login', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// ══════════════════════════════════════════════════════════
// USERS — UC2
// ══════════════════════════════════════════════════════════
export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// ══════════════════════════════════════════════════════════
// ORDERS — UC3 + UC4
// ══════════════════════════════════════════════════════════
export const ordersApi = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
};

// ══════════════════════════════════════════════════════════
// PRODUCTS — UC9
// ══════════════════════════════════════════════════════════
export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// ══════════════════════════════════════════════════════════
// CUSTOMERS — UC11
// ══════════════════════════════════════════════════════════
export const customersApi = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// ══════════════════════════════════════════════════════════
// CHANNELS — UC10
// ══════════════════════════════════════════════════════════
export const channelsApi = {
  getAll: () => api.get('/channels'),
  create: (data) => api.post('/channels', data),
  update: (id, data) => api.put(`/channels/${id}`, data),
  delete: (id) => api.delete(`/channels/${id}`),
};

// ══════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════
export const categoriesApi = {
  getAll:  () => api.get('/categories'),
  create:  (data) => api.post('/categories', data),
  delete:  (id) => api.delete(`/categories/${id}`),
};

// ══════════════════════════════════════════════════════════
// STATISTICS — UC5 + UC6 + UC7
// ══════════════════════════════════════════════════════════
export const statisticsApi = {
  // UC6: Dashboard
  getKpi: () => api.get('/statistics/dashboard/kpi'),
  getRevenueByChannel: (params) => api.get('/statistics/dashboard/revenue-by-channel', { params }),
  getRevenueByDay: (params) => api.get('/statistics/dashboard/revenue-by-day', { params }),
  getTopProducts: (params) => api.get('/statistics/dashboard/top-products', { params }),

  // UC5: Thống kê
  getRevenueByMonth: (params) => api.get('/statistics/revenue-by-month', { params }),
  getRevenueByCategory: (params) => api.get('/statistics/revenue-by-category', { params }),

  // UC7: Báo cáo
  getSummaryReport: (params) => api.get('/statistics/report/summary', { params }),
  exportExcel: (params) => api.get('/statistics/report/export/excel', {
    params,
    responseType: 'blob',  // Quan trọng: nhận binary data cho file Excel
  }),
};

// ══════════════════════════════════════════════════════════
// LOGS — UC8
// ══════════════════════════════════════════════════════════
export const logsApi = {
  getAll: (params) => api.get('/logs', { params }),
  exportExcel: (params) => api.get('/logs/export/excel', { params, responseType: 'blob' }),
};

// ─── Helper: tải file blob ────────────────────────────────
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export default api;