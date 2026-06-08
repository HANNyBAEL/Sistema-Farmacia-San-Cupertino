import api from './api';

const auditoriaApi = {
  getAll: (params) => api.get('/auditoria', { params }).then(r => r.data),
};

export default auditoriaApi;