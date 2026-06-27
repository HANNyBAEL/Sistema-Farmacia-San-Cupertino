import api from './api';

const DENOMINACIONES = [
  { valor: 0.01, etiqueta: '$0.01' },
  { valor: 0.05, etiqueta: '$0.05' },
  { valor: 0.10, etiqueta: '$0.10' },
  { valor: 0.25, etiqueta: '$0.25' },
  { valor: 0.50, etiqueta: '$0.50' },
  { valor: 1.00, etiqueta: '$1.00' },
  { valor: 2.00, etiqueta: '$2.00' },
  { valor: 5.00, etiqueta: '$5.00' },
  { valor: 10.00, etiqueta: '$10.00' },
  { valor: 20.00, etiqueta: '$20.00' },
  { valor: 50.00, etiqueta: '$50.00' },
  { valor: 100.00, etiqueta: '$100.00' },
];

export const turnosService = {
  // Verificar si el usuario tiene un turno abierto
  verificarTurnoActivo: async () => {
    const response = await api.get('/turnos/activo');
    return response.data;
  },

  // Abrir turno (apertura de caja)
  abrirTurno: async (denominaciones) => {
    const response = await api.post('/turnos/abrir', { denominaciones });
    return response.data;
  },

  // Obtener recaudación del turno
  obtenerRecaudacion: async (idTurno) => {
    const response = await api.get(`/turnos/recaudacion/${idTurno}`);
    return response.data;
  },

  // Cerrar turno (cierre de caja)
  cerrarTurno: async (idTurno, denominaciones, observaciones) => {
    const response = await api.post('/turnos/cerrar', { 
      id_turno: idTurno, 
      denominaciones, 
      observaciones 
    });
    return response.data;
  },

  // Obtener detalles de un turno para impresión
  obtenerDetallesTurno: async (idTurno) => {
    const response = await api.get(`/turnos/${idTurno}`);
    return response.data;
  },

  // Obtener historial de turnos
  obtenerHistorial: async (idEmpleado, limite = 20) => {
    const response = await api.get(`/turnos/historial/${idEmpleado}`, { 
      params: { limite } 
    });
    return response.data;
  },

  // Obtener lista de denominaciones
  getDenominaciones: () => DENOMINACIONES,
};

export default turnosService;
