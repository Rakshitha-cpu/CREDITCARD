import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('creditguard_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('creditguard_token');
        localStorage.removeItem('creditguard_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const AuthService = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  getMe: () => apiClient.get('/auth/me'),
  register: (data) => apiClient.post('/auth/register', data),
};

export const CustomerService = {
  getAll: (params) => apiClient.get('/customers', { params }),
  getById: (id) => apiClient.get(`/customers/${id}`),
  create: (data) => apiClient.post('/customers', data),
  update: (id, data) => apiClient.put(`/customers/${id}`, data),
  toggleStatus: (id) => apiClient.patch(`/customers/${id}/status`),
  delete: (id) => apiClient.delete(`/customers/${id}`),
};

export const CreditProfileService = {
  getAll: (params) => apiClient.get('/credit-profiles', { params }),
  getByCustomerId: (customerId) => apiClient.get(`/credit-profiles/${customerId}`),
  update: (customerId, data) => apiClient.put(`/credit-profiles/${customerId}`, data),
  getHistory: (customerId) => apiClient.get(`/credit-profiles/${customerId}/history`),
};

export const InvoiceService = {
  getAll: (params) => apiClient.get('/invoices', { params }),
  getById: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices', data),
};

export const PaymentService = {
  getAll: (params) => apiClient.get('/payments', { params }),
  getById: (id) => apiClient.get(`/payments/${id}`),
  create: (data) => apiClient.post('/payments', data),
};

export const AgingService = {
  getAgingReport: (params) => apiClient.get('/aging', { params }),
};

export const CreditRequestService = {
  getAll: (params) => apiClient.get('/credit-requests', { params }),
  getById: (id) => apiClient.get(`/credit-requests/${id}`),
  create: (data) => apiClient.post('/credit-requests', data),
  simulate: (data) => apiClient.post('/credit-requests/simulate', data),
};

export const ApprovalService = {
  getPending: () => apiClient.get('/approvals'),
  approve: (id, comment) => apiClient.post(`/approvals/${id}/approve`, { comment }),
  reject: (id, reason) => apiClient.post(`/approvals/${id}/reject`, { reason }),
};

export const RiskService = {
  getPortfolio: () => apiClient.get('/risk/portfolio'),
  getCustomerAssessment: (customerId) => apiClient.get(`/risk/customer/${customerId}`),
};

export const MonitoringService = {
  getAlerts: () => apiClient.get('/credit-monitoring'),
  dismissAlert: (id) => apiClient.patch(`/credit-monitoring/${id}/dismiss`),
};

export const AnalyticsService = {
  getDashboard: (params) => apiClient.get('/analytics/dashboard', { params }),
};

export const AuditService = {
  getLogs: (params) => apiClient.get('/audit-logs', { params }),
};

export const UserService = {
  getAll: () => apiClient.get('/users'),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
};

export const SettingsService = {
  getSettings: () => apiClient.get('/settings'),
  updateSettings: (data) => apiClient.put('/settings', data),
};

export default apiClient;
