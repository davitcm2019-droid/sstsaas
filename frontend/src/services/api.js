import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Se token expirou, fazer logout automático
    const responseData = error.response?.data;
    if (responseData?.message && !responseData.error) {
      responseData.error = responseData.message;
    }

    const status = error.response?.status;
    const code = error.response?.data?.meta?.code;
    if (status === 401 || code === 'AUTH_INVALID_TOKEN') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Serviços de Empresas
export const empresasService = {
  getAll: (params = {}) => api.get('/empresas', { params }),
  getById: (id) => api.get(`/empresas/${id}`),
  lookupCnpj: (cnpj) => api.post('/empresas/lookup-cnpj', { cnpj }),
  create: (data) => api.post('/empresas', data),
  update: (id, data) => api.put(`/empresas/${id}`, data),
  delete: (id) => api.delete(`/empresas/${id}`),
};

// Servicos de CIPAs
export const cipasService = {
  getAll: (params = {}) => api.get('/cipas', { params }),
  getById: (id) => api.get(`/cipas/${id}`),
  create: (data) => api.post('/cipas', data),
  update: (id, data) => api.put(`/cipas/${id}`, data),
  delete: (id) => api.delete(`/cipas/${id}`),
};

// Servicos de Treinamentos
export const treinamentosService = {
  getAll: (params = {}) => api.get('/treinamentos', { params }),
  getById: (id) => api.get(`/treinamentos/${id}`),
  create: (data) => api.post('/treinamentos', data),
  update: (id, data) => api.put(`/treinamentos/${id}`, data),
  delete: (id) => api.delete(`/treinamentos/${id}`),
};

// Servicos de Acoes
export const acoesService = {
  getAll: (params = {}) => api.get('/acoes', { params }),
  getById: (id) => api.get(`/acoes/${id}`),
  create: (data) => api.post('/acoes', data),
  update: (id, data) => api.put(`/acoes/${id}`, data),
  delete: (id) => api.delete(`/acoes/${id}`),
};

// Serviços de Tarefas
export const tarefasService = {
  getAll: (params = {}) => api.get('/tarefas', { params }),
  getById: (id) => api.get(`/tarefas/${id}`),
  create: (data) => api.post('/tarefas', data),
  update: (id, data) => api.put(`/tarefas/${id}`, data),
  delete: (id) => api.delete(`/tarefas/${id}`),
};

// Servicos de Eventos
export const eventosService = {
  getAll: (params = {}) => api.get('/eventos', { params }),
  getById: (id) => api.get(`/eventos/${id}`),
  create: (data) => api.post('/eventos', data),
  update: (id, data) => api.put(`/eventos/${id}`, data),
  delete: (id) => api.delete(`/eventos/${id}`),
};

// Serviços de Riscos
export const riscosService = {
  getAll: (params = {}) => api.get('/riscos', { params }),
  getById: (id) => api.get(`/riscos/${id}`),
  create: (data) => api.post('/riscos', data),
  update: (id, data) => api.put(`/riscos/${id}`, data),
  delete: (id) => api.delete(`/riscos/${id}`),
};

// Serviços de Usuários
export const usuariosService = {
  getAll: (params = {}) => api.get('/usuarios', { params }),
  getById: (id) => api.get(`/usuarios/${id}`),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  delete: (id) => api.delete(`/usuarios/${id}`),
};

// Serviços de Alertas
export const alertasService = {
  getAll: (params = {}) => api.get('/alertas', { params }),
  getActive: () => api.get('/alertas', { params: { status: 'ativo' } }),
  getById: (id) => api.get(`/alertas/${id}`),
  create: (data) => api.post('/alertas', data),
  update: (id, data) => api.put(`/alertas/${id}`, data),
  delete: (id) => api.delete(`/alertas/${id}`),
};

// Serviços de Auditoria
export const auditService = {
  getAll: (params = {}) => api.get('/audit', { params }),
  getByEntity: (entityType, entityId) => api.get(`/audit/entity/${entityType}/${entityId}`),
  getByUser: (userId) => api.get(`/audit/user/${userId}`),
  getStats: () => api.get('/audit/stats'),
};

// Serviços de NRs
export const nrService = {
  getAll: () => api.get('/nr'),
  getByCnae: (cnae) => api.get(`/nr/cnae/${cnae}`),
  getChecklist: (codigo) => api.get(`/nr/${codigo}/checklist`),
  getCompliance: (empresaId, cnae) => api.get(`/nr/compliance/${empresaId}`, { params: { cnae } }),
};

// Serviços de Notificações
export const notificationsService = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getByUser: (userId, params = {}) => api.get(`/notifications/user/${userId}`, { params }),
  create: (data) => api.post('/notifications', data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  getTypes: () => api.get('/notifications/types'),
  generateSmart: () => api.post('/notifications/generate-smart'),
  cleanup: () => api.delete('/notifications/cleanup'),
  getStats: () => api.get('/notifications/stats'),
};

// Serviços de Checklists
export const checklistsService = {
  getAll: (params = {}) => api.get('/checklists', { params }),
  getById: (id) => api.get(`/checklists/${id}`),
  getCategories: () => api.get('/checklists/categories'),
  createChecklist: (data) => api.post('/checklists', data),
  createInspection: (checklistId, data) => api.post(`/checklists/${checklistId}/inspection`, data),
  getInspections: (params = {}) => api.get('/checklists/inspections', { params }),
  getInspectionById: (id) => api.get(`/checklists/inspections/${id}`),
  updateInspection: (id, data) => api.put(`/checklists/inspections/${id}`, data),
  getInspectionStats: () => api.get('/checklists/inspections/stats'),
};

// Serviços de Incidentes
export const incidentsService = {
  getAll: (params = {}) => api.get('/incidents', { params }),
  getById: (id) => api.get(`/incidents/${id}`),
  create: (data) => api.post('/incidents', data),
  update: (id, data) => api.put(`/incidents/${id}`, data),
  updateStatus: (id, status) => api.put(`/incidents/${id}/status`, { status }),
  getTypes: () => api.get('/incidents/types'),
  getSeverityLevels: () => api.get('/incidents/severity-levels'),
  getStatus: () => api.get('/incidents/status'),
  getStats: () => api.get('/incidents/stats'),
  delete: (id) => api.delete(`/incidents/${id}`),
};

// Serviços de Autenticação
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refreshToken: (token) => api.post('/auth/refresh', { token }),
};

// Serviços de Documentos
export const documentsService = {
  getAll: (params = {}) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  create: (data) => api.post('/documents', data),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  download: (id) => api.post(`/documents/${id}/download`),
  getTypes: () => api.get('/documents/types'),
  getCategories: () => api.get('/documents/categories'),
  getStats: () => api.get('/documents/stats'),
};

export default api;
