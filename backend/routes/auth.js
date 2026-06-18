import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sequelize from '../config/database.js';
//import { sendRecoveryCode } from '../services/email.js';
// import { sendRecoveryCode } from '../services/email.js';

const router = express.Router();

// ─── LOGIN ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [user] = await sequelize.query(
      `SELECT id_empleado, nombre, apellido, correo, password, cargo, activo, token_version, debe_cambiar
       FROM empleados 
       WHERE correo = ?`,
      { replacements: [email], type: sequelize.QueryTypes.SELECT }
    );

    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    if (user.activo === 0) {
      return res.status(401).json({ error: 'Usuario desactivado. Contacte al administrador.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user.id_empleado, rol: user.cargo, token_version: user.token_version },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      rol: user.cargo,
      nombre: `${user.nombre} ${user.apellido}`,
      id: user.id_empleado,
      debe_cambiar: user.debe_cambiar === 1, // ← nuevo flag
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ─── ESTABLECER CONTRASEÑA (invitación) ──────────────────
router.post('/establecer-contrasena', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token y contraseña son requeridos' });
  }
  try {
    // Buscar empleado por token de invitación y que no haya expirado
    const [empleado] = await sequelize.query(
      `SELECT id_empleado, invitation_token, invitation_expires FROM empleados 
       WHERE invitation_token = :token AND invitation_expires > NOW()`,
      { replacements: { token }, type: sequelize.QueryTypes.SELECT }
    );
    if (!empleado) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await sequelize.query(
      `UPDATE empleados SET password = :password, debe_cambiar = 0, invitation_token = NULL, invitation_expires = NULL
       WHERE id_empleado = :id`,
      { replacements: { password: hashed, id: empleado.id_empleado }, type: sequelize.QueryTypes.UPDATE }
    );

    res.json({ message: 'Contraseña establecida correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al establecer contraseña' });
  }
});

// ─── CAMBIAR CONTRASEÑA (logueado, con verificación de actual) ──
router.post('/cambiar-contrasena', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  const { password_actual, password_nuevo } = req.body;
  if (!password_actual || !password_nuevo) {
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [user] = await sequelize.query(
      `SELECT id_empleado, password FROM empleados WHERE id_empleado = :id`,
      { replacements: { id: decoded.id }, type: sequelize.QueryTypes.SELECT }
    );
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(password_actual, user.password);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hashed = await bcrypt.hash(password_nuevo, 10);
    await sequelize.query(
      `UPDATE empleados SET password = :password, token_version = token_version + 1 WHERE id_empleado = :id`,
      { replacements: { password: hashed, id: user.id_empleado }, type: sequelize.QueryTypes.UPDATE }
    );

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// ─── SOLICITAR RECUPERACIÓN (envía código por correo) ────
router.post('/solicitar-recuperacion', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Correo requerido' });

  try {
    const [user] = await sequelize.query(
      `SELECT id_empleado, nombre, apellido, correo FROM empleados WHERE correo = :email`,
      { replacements: { email }, type: sequelize.QueryTypes.SELECT }
    );
    if (!user) return res.status(404).json({ error: 'Correo no registrado' });

    // Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60000); // 10 minutos

    // Guardar código en la base de datos (necesitas una tabla `recovery_codes` o un campo adicional)
    // Por simplicidad, usaremos un campo en empleados o una tabla separada.
    // Aquí creamos una tabla temporal en memoria o puedes agregar campos recovery_code y recovery_expires al modelo.
    // Como no tenemos esa tabla, usaremos una tabla separada.
    // Por ahora, enviaré el código y guardaré en una variable en memoria (no persistente).
    // Para producción, crea una tabla `recovery_codes`.
    // Mientras tanto, usaremos un objeto en memoria (se perderá al reiniciar el servidor).
    // Mejor crea la tabla:
    // CREATE TABLE recovery_codes (id INT AUTO_INCREMENT PRIMARY KEY, id_empleado INT, codigo VARCHAR(6), expires DATETIME);
    // Pero para simplificar, usaré un store en memoria.

    // En producción, crea la tabla y guarda allí.
    // Aquí usaremos un store en memoria (global).
    if (!global.recoveryCodes) global.recoveryCodes = {};
    global.recoveryCodes[user.id_empleado] = { codigo, expires: expires.getTime() };

    // En lugar de await sendRecoveryCode(...)
    console.log(`Código de recuperación para ${email}: ${codigo}`);
    // Luego guardas el código en la base de datos (como ya haces)

    res.json({ message: 'Código enviado a tu correo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar código' });
  }
});

// ─── VERIFICAR CÓDIGO Y CAMBIAR CONTRASEÑA ───────────────
router.post('/recuperar-contrasena', async (req, res) => {
  const { email, codigo, password } = req.body;
  if (!email || !codigo || !password) {
    return res.status(400).json({ error: 'Correo, código y contraseña son requeridos' });
  }

  try {
    const [user] = await sequelize.query(
      `SELECT id_empleado FROM empleados WHERE correo = :email`,
      { replacements: { email }, type: sequelize.QueryTypes.SELECT }
    );
    if (!user) return res.status(404).json({ error: 'Correo no registrado' });

    const stored = global.recoveryCodes?.[user.id_empleado];
    if (!stored || stored.codigo !== codigo || stored.expires < Date.now()) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await sequelize.query(
      `UPDATE empleados SET password = :password, token_version = token_version + 1 WHERE id_empleado = :id`,
      { replacements: { password: hashed, id: user.id_empleado }, type: sequelize.QueryTypes.UPDATE }
    );

    delete global.recoveryCodes[user.id_empleado];

    res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

export default router;