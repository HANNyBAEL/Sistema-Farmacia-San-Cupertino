import axios from 'axios';

// Usa ruta relativa para que Vite redirija las peticiones a través del proxy
const api = axios.create({
  baseURL: '/api',
});

// Interceptor para adjuntar token JWT (si es necesario)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;