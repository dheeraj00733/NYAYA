import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
const API_BASE = (rawApiUrl === '/api' || rawApiUrl.endsWith('/api'))
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, '')}/api`;

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor attaching JWT
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('nyayaflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor handling 401 session expiry
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        localStorage.removeItem('nyayaflow_token');
        localStorage.removeItem('nyayaflow_user');
        window.location.href = '/login?expired=true';
      }
    }
    const message = error.response?.data?.error || error.message || 'Network request failed';
    return Promise.reject(new Error(message));
  }
);

export const api = {
  // Auth
  login: (credentials) => client.post('/auth/login', credentials),
  register: (data) => client.post('/auth/register', data),
  getMe: () => client.get('/auth/me'),
  updateProfile: (data) => client.put('/auth/profile', data),
  getUsers: (params) => client.get('/auth/users', { params }),

  // Cases
  getCases: (params) => client.get('/cases', { params }),
  getCaseById: (id) => client.get(`/cases/${id}`),
  createCase: (data) => client.post('/cases', data),
  updateCase: (id, data) => client.put(`/cases/${id}`, data),
  deleteCase: (id) => client.delete(`/cases/${id}`),
  addCaseMember: (caseId, data) => client.post(`/cases/${caseId}/members`, data),
  removeCaseMember: (caseId, userId) => client.delete(`/cases/${caseId}/members/${userId}`),
  addCaseParty: (caseId, data) => client.post(`/cases/${caseId}/parties`, data),

  // Documents
  getDocuments: (params) => client.get('/documents', { params }),
  getDocumentById: (id) => client.get(`/documents/${id}`),
  uploadDocument: (formData) => client.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteDocument: (id) => client.delete(`/documents/${id}`),
  summarizeDocument: (id) => client.post(`/documents/${id}/summarize`),
  getDocumentDownloadUrl: (id) => {
    const token = localStorage.getItem('nyayaflow_token');
    return token ? `${API_BASE}/documents/${id}/download?token=${encodeURIComponent(token)}` : `${API_BASE}/documents/${id}/download`;
  },

  // Extracted Facts
  getFacts: (params) => client.get('/facts', { params }),
  createFact: (data) => client.post('/facts', data),
  verifyFact: (id, data) => client.put(`/facts/${id}/verify`, data),
  deleteFact: (id) => client.delete(`/facts/${id}`),

  // Hearings
  getHearings: (params) => client.get('/hearings', { params }),
  createHearing: (data) => client.post('/hearings', data),
  updateHearing: (id, data) => client.put(`/hearings/${id}`, data),
  deleteHearing: (id) => client.delete(`/hearings/${id}`),

  // Chats
  getChats: (params) => client.get('/chats', { params }),
  createChat: (data) => client.post('/chats', data),
  getMessages: (chatId) => client.get(`/chats/${chatId}/messages`),
  sendMessage: (chatId, data) => client.post(`/chats/${chatId}/messages`, data),
  deleteChat: (chatId) => client.delete(`/chats/${chatId}`),

  // Dashboard & Analytics
  getDashboardAnalytics: () => client.get('/analytics/dashboard'),
  getActivities: (params) => client.get('/activities', { params }),

  // AI & System
  getModels: () => client.get('/ai/models')
};

export default client;
