import axios from 'axios';

// 🔥 Usa VITE_API_URL si existe, si no usa /api (para desarrollo con proxy)
const baseURL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`  // Si VITE_API_URL existe, le agregamos /api
  : '/api';                                 // Si no, usamos el proxy de desarrollo

const api = axios.create({
  baseURL: baseURL,
});

// Interceptor para adjuntar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('[API] Token enviado para:', config.url, token.substring(0, 20) + '...');
  } else {
    console.log('[API] NO hay token para:', config.url);
  }
  return config;
});

// ✅ Interceptor para manejar errores 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      const mensaje = error.response.data?.error;
      if (mensaje === 'Usuario desactivado' || mensaje === 'Sesión invalidada' || mensaje === 'Token inválido o expirado') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;