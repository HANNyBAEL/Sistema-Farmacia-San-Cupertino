import jwt from 'jsonwebtoken';
import Empleado from '../models/Empleado.js';

/**
 * Middleware de autenticación: verifica token JWT, valida que el empleado exista,
 * esté activo y que la versión del token coincida.
 */
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const empleado = await Empleado.findByPk(decoded.id);

    if (!empleado) {
      return res.status(401).json({ error: 'Usuario no existe' });
    }

    // Verificar que el empleado esté activo
    if (!empleado.activo) {
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    // Verificar la versión del token (invalida si se cambió la contraseña)
    if (decoded.token_version !== empleado.token_version) {
      return res.status(401).json({ error: 'Sesión invalidada. Vuelve a iniciar sesión.' });
    }

    // Adjuntar el empleado al objeto req
    req.user = empleado;
    next();
  } catch (err) {
    console.error('Error en autenticación:', err);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Middleware de autorización: verifica que el usuario tenga uno de los roles permitidos.
 * @param {string[]} rolesPermitidos - Lista de roles que pueden acceder.
 */
export const authorize = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Si no se especifican roles, se permite el acceso (útil para rutas públicas dentro de auth)
    if (rolesPermitidos.length === 0) {
      return next();
    }

    // El rol viene del campo 'cargo' en el modelo Empleado
    const userRole = req.user.cargo;
    if (!rolesPermitidos.includes(userRole)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de estos roles: ${rolesPermitidos.join(', ')}`
      });
    }

    next();
  };
};