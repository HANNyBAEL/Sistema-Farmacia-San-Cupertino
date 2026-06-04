// ── frontend/src/services/historial.js ──────────────────────────────────────
import api from './api';

export const getHistorial = async (params = {}) => {
  const { data } = await api.get('/historial', { params });
  return data; // { ventas: [], total: N }
};

export const getDetalleVenta = async (id) => {
  const { data } = await api.get(`/historial/venta/${id}`);
  return data; // { venta: {}, detalle: [] }
};


// ── frontend/src/services/eliminados.js ─────────────────────────────────────
import api from './api';

const eliminadosApi = {
  getAll:     ()    => api.get('/eliminados').then(r => r.data),
  restaurar:  (id)  => api.put(`/eliminados/${id}/restaurar`).then(r => r.data),
  eliminar:   (id)  => api.delete(`/eliminados/${id}`).then(r => r.data),
};

export default eliminadosApi;