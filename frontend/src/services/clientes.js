import api from './api'; // tu axios instance que ya tienes

const clientesApi = {
  getAll:           ()              => api.get('/clientes').then(r => r.data),
  create:           (data)          => api.post('/clientes', data).then(r => r.data),
  update:           (id, data)      => api.put(`/clientes/${id}`, data).then(r => r.data),
  delete:           (id)            => api.delete(`/clientes/${id}`).then(r => r.data),
};

export default clientesApi;