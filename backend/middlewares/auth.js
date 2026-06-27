import jwt from 'jsonwebtoken';
import Empleado from '../models/Empleado.js';

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

    if (!empleado.activo) {
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    if (decoded.token_version !== empleado.token_version) {
      return res.status(401).json({ error: 'Sesión invalidada. Vuelve a iniciar sesión.' });
    }

    req.user = empleado;
    next();
  } catch (err) {
    console.error('❌ [Auth] Error en autenticación:', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const authorize = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const normalizeRole = (role) => String(role || '').trim().toLowerCase();
    const userRole = normalizeRole(req.user.cargo);
    const allowedRoles = rolesPermitidos.map(normalizeRole);

    if (rolesPermitidos.length === 0) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de estos roles: ${rolesPermitidos.join(', ')}`
      });
    }

    next();
  };
};
