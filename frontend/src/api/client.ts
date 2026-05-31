import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || '/api';
          const { data } = await axios.post(`${apiUrl}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  refreshSession: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  me: () => api.get('/auth/me'),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
  safetyScore: () => api.get('/safety-score'),
  mapNearby: (lat?: number, lng?: number) => api.get('/map/nearby', { params: { lat, lng } }),
  safeRoute: (destinationLat: number, destinationLng: number) =>
    api.post('/map/safe-route', { destinationLat, destinationLng }),
  places: (params?: Record<string, string>) => api.get('/places', { params }),
  alerts: (params?: Record<string, string>) => api.get('/alerts', { params }),
  markAlertRead: (id: string) => api.patch(`/alerts/${id}/read`),
  markAllRead: () => api.patch('/alerts/read-all'),
  triggerSos: (data?: Record<string, unknown>) => api.post('/emergency/sos', data),
  contacts: () => api.get('/emergency/contacts'),
  addContact: (data: Record<string, string>) => api.post('/emergency/contacts', data),
  deleteContact: (id: string) => api.delete(`/emergency/contacts/${id}`),
  travelHistory: (period?: string) => api.get('/travel-history', { params: { period } }),
  digitalId: () => api.get('/profile/digital-id'),
  chatMessages: () => api.get('/chat/messages'),
  sendMessage: (content: string, lat?: number, lng?: number) => api.post('/chat/messages', { content, latitude: lat, longitude: lng }),
  preferences: () => api.get('/preferences'),
  updatePreferences: (data: Record<string, unknown>) => api.patch('/preferences', data),
  adminAnalytics: () => api.get('/admin/analytics'),
  adminUsers: (params?: Record<string, string>) => api.get('/admin/users', { params }),
  updateUser: (id: string, data: Record<string, unknown>) => api.patch(`/admin/users/${id}`, data),
};
