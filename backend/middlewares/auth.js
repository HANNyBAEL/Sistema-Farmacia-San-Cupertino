import jwt from 'jsonwebtoken';
import Empleado from '../models/Empleado.js';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  console.log('🔍 [Auth] Token recibido:', token ? 'Sí' : 'No');

  if (!token) {
    console.warn('⚠️ [Auth] Token no proporcionado');
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 [Auth] Token decodificado:', decoded);

    const empleado = await Empleado.findByPk(decoded.id);
    console.log('🔍 [Auth] Empleado encontrado:', empleado ? `✅ ID ${empleado.id_empleado}, cargo: ${empleado.cargo}` : '❌ No existe');

    if (!empleado) {
      console.warn('⚠️ [Auth] Usuario no existe');
      return res.status(401).json({ error: 'Usuario no existe' });
    }

    if (!empleado.activo) {
      console.warn(`⚠️ [Auth] Usuario ${empleado.id_empleado} está desactivado`);
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    if (decoded.token_version !== empleado.token_version) {
      console.warn(`⚠️ [Auth] Token version mismatch: token=${decoded.token_version}, BD=${empleado.token_version}`);
      return res.status(401).json({ error: 'Sesión invalidada. Vuelve a iniciar sesión.' });
    }

    req.user = empleado;
    console.log('✅ [Auth] Autenticación exitosa para', empleado.nombre);
    next();
  } catch (err) {
    console.error('❌ [Auth] Error en autenticación:', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const authorize = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!req.user) {
      console.warn('⚠️ [Auth] Usuario no autenticado en authorize');
      return res.status(401).json({ error: 'No autenticado' });
    }

    const userRole = req.user.cargo;
    console.log(`🔍 [Auth] Verificando rol: ${userRole} (requiere ${rolesPermitidos.join(', ') || 'ninguno'})`);

    if (rolesPermitidos.length === 0) {
      return next();
    }

    if (!rolesPermitidos.includes(userRole)) {
      console.warn(`⚠️ [Auth] Rol no autorizado: ${userRole}`);
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de estos roles: ${rolesPermitidos.join(', ')}`
      });
    }

    console.log('✅ [Auth] Autorización exitosa');
    next();
  };
};