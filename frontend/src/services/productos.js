import api from './api';

export const getProductos = async () => {
  const { data } = await api.get('/productos');
  return data; // array de productos
};

export const createProducto = async (producto) => {
  const { data } = await api.post('/productos', producto);
  return data;
};

export const updateProducto = async (id, producto) => {
  const { data } = await api.put(`/productos/${id}`, producto);
  return data;
};

export const deleteProducto = async (id) => {
  const { data } = await api.delete(`/productos/${id}`);
  return data;
};

export const moverProductoAPapelera = (id) => api.patch(`/productos/${id}/papelera`).then(r => r.data);