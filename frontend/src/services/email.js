import api from './api';

// Enviar factura con el PDF real generado en el frontend
export const enviarFacturaConPDF = async (data) => {
  try {
    const response = await api.post('/facturas/enviar', data);
    return response.data;
  } catch (error) {
    console.error('Error al enviar la factura:', error);
    throw error;
  }
};

export const getSiguienteCorrelativo = () =>
  api.get('/facturas/siguiente-correlativo').then(r => r.data);

export const guardarFactura = (data) =>
  api.post('/facturas', data).then(r => r.data);