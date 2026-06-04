// ── frontend/src/services/empleados.js ──────────────────────────────────────
import api from './api';

const empleadosApi = {
  getAll:   ()            => api.get('/empleados').then(r => r.data),
  getOne:   (id)          => api.get(`/empleados/${id}`).then(r => r.data),
  create:   (data)        => api.post('/empleados', data).then(r => r.data),
  update:   (id, data)    => api.put(`/empleados/${id}`, data).then(r => r.data),
  delete:   (id)          => api.delete(`/empleados/${id}`).then(r => r.data),
};

export default empleadosApi;