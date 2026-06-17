import jwt from 'jsonwebtoken';
import Empleado from '../models/Empleado.js';

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const empleado = await Empleado.findByPk(decoded.id);

    if (!empleado) {
      return res.status(401).json({ error: 'Usuario no existe' });
    }

    // ✅ Validar que el empleado esté activo
    if (!empleado.activo) {
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    // ✅ Validar la versión del token
    if (decoded.token_version !== empleado.token_version) {
      return res.status(401).json({ error: 'Sesión invalidada' });
    }

    req.user = empleado;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};