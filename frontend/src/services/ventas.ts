import api from './api';

export interface VentaPayload {
  id_cliente: number | null;
  id_empleado: number;
  metodo_pago: string;
  monto_recibido?: number;
  productos: { id_producto: number; cantidad: number }[];
}

export interface VentaResponse {
  message: string;
  id_venta: number;
  total: number;
  monto_recibido?: number;
  cambio?: number;
  fecha: string;
}

export const createVenta = (data: VentaPayload): Promise<VentaResponse> =>
  api.post('/ventas', data).then(res => res.data);
