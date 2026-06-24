import api from './api';

export interface VentaPayload {
  id_cliente: number | null;
  id_empleado: number;
  metodo_pago: string;
  productos: { id_producto: number; cantidad: number }[];
}

export interface VentaResponse {
  message: string;
  id_venta: number;
  total: number;
  fecha: string;
}

export const createVenta = (data: VentaPayload): Promise<VentaResponse> =>
  api.post('/ventas', data).then(res => res.data);