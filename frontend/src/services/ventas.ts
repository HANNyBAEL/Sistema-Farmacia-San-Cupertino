import api from './api';

export interface VentaPayload {
  id_cliente: number | null;
  id_empleado: number;
  productos: { id_producto: number; cantidad: number }[];
}

export interface VentaResponse {
  message: string;
  id_venta: number;
  total: number;
}

export const createVenta = (data: VentaPayload): Promise<VentaResponse> =>
  api.post('/ventas', data).then(res => res.data);