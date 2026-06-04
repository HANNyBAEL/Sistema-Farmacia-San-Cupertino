import api from './api';
const eliminadosApi = {
  getAll:    () => api.get('/eliminados').then(r => r.data),
  restaurar: (id) => api.put(`/eliminados/${id}/restaurar`).then(r => r.data),
  eliminar:  (id) => api.delete(`/eliminados/${id}`).then(r => r.data),
};
export default eliminadosApi;