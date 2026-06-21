import { useState } from 'react';
import { login } from '../services/auth';
import { useNavigate } from 'react-router-dom';

const RECAPTCHA_SITE_KEY = '6LdDLSwtAAAAAMV99lVq8BVVobDd5AxAPxGY252J';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const recaptchaToken = window.grecaptcha?.getResponse();
      if (!recaptchaToken) {
        setError('Confirma que no eres un robot');
        return;
      }

      const data = await login(email, password, recaptchaToken);
      localStorage.setItem('token', data.token);
      // Opcional: guardar datos de usuario en contexto o estado global
      navigate('/dashboard');
    } catch (err) {
      window.grecaptcha?.reset();
      setError(err?.response?.data?.error || 'Credenciales incorrectas');
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
      <div className="g-recaptcha" data-sitekey={RECAPTCHA_SITE_KEY}></div>
      <button type="submit">Iniciar Sesion</button>
    </form>
  );
};

export default Login;
