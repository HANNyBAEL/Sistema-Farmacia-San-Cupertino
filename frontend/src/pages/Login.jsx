import { useState } from 'react';
import { login } from '../services/auth';
import { useNavigate } from 'react-router-dom';

const RECAPTCHA_SITE_KEY = '6Lc-5S0tAAAAANGcokPZobPlAHatfcoNRBqQeMYb';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const executeRecaptcha = () => {
    return new Promise((resolve, reject) => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'login' })
            .then(resolve)
            .catch(reject);
        });
      } else {
        reject(new Error('reCAPTCHA no cargado'));
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const recaptchaToken = await executeRecaptcha();
      if (!recaptchaToken) {
        setError('Confirma que no eres un robot');
        return;
      }

      const data = await login(email, password, recaptchaToken);
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || 'Error de verificación. Inténtalo de nuevo.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Contrasena"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Iniciar Sesion</button>
    </form>
  );
};

export default Login;