import api from './api';

export async function createVenta(data) {
  return api.post('/ventas', data).then(res => res.data);
}