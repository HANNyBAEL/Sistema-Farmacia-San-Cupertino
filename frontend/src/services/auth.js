import api from './api';

export const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('token', data.token);
  return data; // { token, rol, nombre, id }
};

export const logout = () => {
  localStorage.removeItem('token');
};