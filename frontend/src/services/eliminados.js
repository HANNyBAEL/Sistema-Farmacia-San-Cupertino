import api from './api';

const eliminadosApi = {
  getAll:    ()           => api.get('/eliminados').then(r => r.data),
  restaurar: (tipo, id)   => api.put(`/eliminados/${tipo}/${id}/restaurar`).then(r => r.data),
  eliminar:  (tipo, id)   => api.delete(`/eliminados/${tipo}/${id}`).then(r => r.data),
};

export default eliminadosApi;