import api from './api';

const clientesApi = {
  getAll:        ()         => api.get('/clientes').then(r => r.data),
  create:        (data)     => api.post('/clientes', data).then(r => r.data),
  update:        (id, data) => api.put(`/clientes/${id}`, data).then(r => r.data),
  delete:        (id)       => api.delete(`/clientes/${id}`).then(r => r.data),
  toggle:        (id)       => api.patch(`/clientes/${id}/toggle`).then(r => r.data),
  moverAPapelera:(id)       => api.patch(`/clientes/${id}/papelera`).then(r => r.data),
};

export default clientesApi;