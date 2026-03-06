import axios from 'axios';

// VITE_API_URL should be the base server URL (e.g. https://estokvel-production.up.railway.app)
// It may or may not include /api — strip it to avoid doubling
const raw = import.meta.env.VITE_API_URL || '';
const API_BASE = raw.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============ Auth ============
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/superadmin/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

// ============ System ============
export const systemApi = {
  getOverview: () => api.get('/auth/system/overview'),
};

// ============ Admins ============
export const adminApi = {
  list: () => api.get('/auth/admin/list'),
  create: (data: { phoneNumber: string; fullName: string }) =>
    api.post('/auth/admin/create', data),
  delete: (adminId: string) => api.delete(`/auth/admin/${adminId}`),
};

// ============ Groups ============
export const groupApi = {
  list: () => api.get('/groups'),
  get: (id: string) => api.get(`/groups/${id}`),
  stats: (id: string) => api.get(`/groups/${id}/stats`),
  members: (id: string) => api.get(`/groups/${id}/members`),
  delete: (id: string) => api.delete(`/groups/${id}`),
};

// ============ Transactions ============
export const transactionApi = {
  list: (params?: { groupId?: string; page?: number; limit?: number }) =>
    api.get('/transactions', { params }),
  getMyTransactions: () => api.get('/transactions/my'),
};

// ============ Members ============
export const memberApi = {
  remove: (memberId: string) => api.delete(`/auth/member/${memberId}`),
};

export default api;
