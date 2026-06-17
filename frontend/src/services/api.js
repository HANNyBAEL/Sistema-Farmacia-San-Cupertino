import axios from 'axios';

// Usa ruta relativa para que Vite redirija las peticiones a través del proxy
const api = axios.create({
  baseURL: '/api',
});

// Interceptor para adjuntar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Interceptor para manejar errores 401 (sesión invalidada o usuario desactivado)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      const mensaje = error.response.data?.error;
      if (mensaje === 'Usuario desactivado' || mensaje === 'Sesión invalidada' || mensaje === 'Token inválido o expirado') {
        // Limpiar sesión local
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Disparar evento para que la app redirija al login
        window.dispatchEvent(new Event('session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;