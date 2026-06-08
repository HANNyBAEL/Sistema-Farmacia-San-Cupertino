import api from './api';

export const getSiguienteCorrelativo = () =>
  api.get("/facturas/siguiente-correlativo").then(r => r.data);

export const guardarFactura = (data: {
  numero_control: string;
  codigo_generacion: string;
  id_venta: number;
  id_cliente: number | null;
  fecha_emision: string;
  total: number;
}) => api.post("/facturas", data).then(r => r.data);