import api from './api';

export const fetchKPIs = async () => {
  const { data } = await api.get('/dashboard/kpis');
  return data;
};

export const fetchVentasUltimos7Dias = async () => {
  const { data } = await api.get('/dashboard/ventas-ultimos-7-dias');
  return data;
};