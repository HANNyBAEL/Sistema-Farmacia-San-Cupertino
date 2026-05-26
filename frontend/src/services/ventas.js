import api from './api';

export const createVenta = async (venta) => {
  const { data } = await api.post('/ventas', venta);
  return data;
};