import api from './api';

export const login = async (correo, contrasena, recaptchaToken) => {
  const passwordField = 'contrase\u00f1a';
  if (import.meta.env.DEV || localStorage.getItem('recaptchaDebug') === 'true') {
    console.log('[reCAPTCHA] enviando token en login', {
      field: 'recaptchaToken',
      tokenLength: recaptchaToken?.length ?? 0,
      tokenPreview: recaptchaToken ? `${recaptchaToken.slice(0, 12)}...` : '',
    });
  }
  const { data } = await api.post('/auth/login', { correo, [passwordField]: contrasena, recaptchaToken });
  localStorage.setItem('token', data.token);
  return data; // { token, rol, nombre, id }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const establecerContrasena = async (token, password) => {
  await api.post('/auth/establecer-contrasena', { token, password });
};

export const cambiarContrasena = async (passwordActual, passwordNuevo) => {
  await api.post('/auth/cambiar-contrasena', { password_actual: passwordActual, password_nuevo: passwordNuevo });
};

export const solicitarRecuperacion = async (email) => {
  await api.post('/auth/solicitar-recuperacion', { email });
};

export const recuperarContrasena = async (email, codigo, password) => {
  await api.post('/auth/recuperar-contrasena', { email, codigo, password });
};

export const registrarEmpleado = async (empleadoData) => {
  const { data } = await api.post('/auth/registrar-empleado', empleadoData);
  return data;
};
