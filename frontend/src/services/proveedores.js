import api from './api';

const proveedoresApi = {
  getAll:   ()         => api.get('/proveedores').then(r => r.data),
  create:   (data)     => api.post('/proveedores', data).then(r => r.data),
  update:   (id, data) => api.put(`/proveedores/${id}`, data).then(r => r.data),
  delete:   (id)       => api.delete(`/proveedores/${id}`).then(r => r.data),
};

export default proveedoresApi;