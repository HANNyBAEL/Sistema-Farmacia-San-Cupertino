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