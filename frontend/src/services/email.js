import api from './api';

// Enviar factura al backend para que él la envíe por correo
export const generarYEnviarFactura = async (dteJson) => {
  try {
    const response = await api.post('/facturas/enviar', dteJson);
    return response.data;
  } catch (error) {
    console.error('Error al enviar la factura:', error);
    throw error;
  }
};

// Obtener siguiente correlativo
export const getSiguienteCorrelativo = () =>
  api.get('/facturas/siguiente-correlativo').then(r => r.data);

// Guardar factura en la base de datos
export const guardarFactura = (data) =>
  api.post('/facturas', data).then(r => r.data);