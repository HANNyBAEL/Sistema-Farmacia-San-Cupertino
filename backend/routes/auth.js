import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sequelize from '../config/database.js';
import { sendInvitationEmail, sendRecoveryEmail } from '../services/email.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

async function verifyRecaptchaToken(recaptchaToken, remoteIp) {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    throw new Error('RECAPTCHA_SECRET_KEY no configurada');
  }

  const params = new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET_KEY,
    response: recaptchaToken,
  });

  if (remoteIp) {
    params.append('remoteip', remoteIp);
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    throw new Error('No se pudo verificar reCAPTCHA');
  }

  const data = await response.json();
  return data.success === true;
}

// ─── LOGIN ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { correo, contraseña } = req.body;

  try {
    if (!req.body.recaptchaToken) {
      return res.status(400).json({ error: 'Confirma que no eres un robot' });
    }

    const recaptchaValid = await verifyRecaptchaToken(req.body.recaptchaToken, req.ip);
    if (!recaptchaValid) {
      return res.status(400).json({ error: 'Verificacion de reCAPTCHA fallida' });
    }

    const [user] = await sequelize.query(
      `SELECT id_empleado, nombre, apellido, correo, password_hash, cargo, activo, papelera, token_version
       FROM empleados 
       WHERE correo = ?`,
      { replacements: [correo], type: sequelize.QueryTypes.SELECT }
    );

    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    if (user.activo === 0 || user.papelera === 1) return res.status(401).json({ error: 'Usuario desactivado. Contacte al administrador.' });

    const valid = await bcrypt.compare(contraseña, user.password_hash);
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
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ─── REGISTRAR NUEVO EMPLEADO (solo administradores) ──
router.post('/registrar-empleado', authenticate, authorize(['administrador']), async (req, res) => {
  const { nombre, apellido, correo, cargo, telefono, dui, nit, cuenta_banco, afp, fecha_contratacion } = req.body;

  try {
    const [existente] = await sequelize.query(
      `SELECT id_empleado FROM empleados WHERE correo = ?`,
      { replacements: [correo], type: sequelize.QueryTypes.SELECT }
    );
    if (existente) return res.status(400).json({ error: 'El correo ya está registrado' });

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sequelize.query(
      `INSERT INTO empleados 
       (nombre, apellido, correo, cargo, telefono, dui, nit, cuenta_banco, afp, fecha_contratacion, invitation_token, invitation_expires, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      {
        replacements: [nombre, apellido, correo, cargo, telefono || null, dui || null, nit || null, cuenta_banco || null, afp || null, fecha_contratacion || null, invitationToken, expires],
        type: sequelize.QueryTypes.INSERT
      }
    );

    await sendInvitationEmail(correo, nombre, invitationToken);
    res.json({ message: 'Empleado registrado y correo de invitación enviado' });
  } catch (error) {
    console.error('❌ Error en registrar-empleado:', error);
    res.status(500).json({ error: 'Error al registrar empleado' });
  }
});

// ─── ESTABLECER CONTRASEÑA (invitación) ──────────────────
router.post('/establecer-contrasena', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token y contraseña son requeridos' });
  }
  try {
    const [empleado] = await sequelize.query(
      `SELECT id_empleado FROM empleados 
       WHERE invitation_token = :token AND invitation_expires > NOW()`,
      { replacements: { token }, type: sequelize.QueryTypes.SELECT }
    );
    if (!empleado) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await sequelize.query(
      `UPDATE empleados SET password_hash = :password, invitation_token = NULL, invitation_expires = NULL
       WHERE id_empleado = :id`,
      { replacements: { password: hashed, id: empleado.id_empleado }, type: sequelize.QueryTypes.UPDATE }
    );

    res.json({ message: 'Contraseña establecida correctamente' });
  } catch (error) {
    console.error('❌ Error en establecer-contrasena:', error);
    res.status(500).json({ error: 'Error al establecer contraseña' });
  }
});

// ─── CAMBIAR CONTRASEÑA (logueado) ──────────────────────
router.post('/cambiar-contrasena', authenticate, async (req, res) => {
  const { password_actual, password_nuevo } = req.body;
  if (!password_actual || !password_nuevo) {
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  }

  try {
    const userId = req.user.id_empleado;
    const [user] = await sequelize.query(
      `SELECT id_empleado, password_hash FROM empleados WHERE id_empleado = ?`,
      { replacements: [userId], type: sequelize.QueryTypes.SELECT }
    );
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(password_actual, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hashed = await bcrypt.hash(password_nuevo, 10);
    await sequelize.query(
      `UPDATE empleados SET password_hash = ?, token_version = token_version + 1 WHERE id_empleado = ?`,
      { replacements: [hashed, user.id_empleado], type: sequelize.QueryTypes.UPDATE }
    );

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error en cambiar-contrasena:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// ─── SOLICITAR RECUPERACIÓN ──────
router.post('/solicitar-recuperacion', async (req, res) => {
  const { email, recaptchaToken } = req.body;
  if (!email) return res.status(400).json({ error: 'Correo requerido' });
  if (!recaptchaToken) return res.status(400).json({ error: 'Confirma que no eres un robot' });

  try {
    const recaptchaValid = await verifyRecaptchaToken(recaptchaToken, req.ip);
    if (!recaptchaValid) {
      return res.status(400).json({ error: 'Verificacion de reCAPTCHA fallida' });
    }

    const [user] = await sequelize.query(
      `SELECT id_empleado, nombre FROM empleados WHERE correo = ?`,
      { replacements: [email], type: sequelize.QueryTypes.SELECT }
    );
    if (!user) {
      return res.status(404).json({ error: 'Correo no registrado' });
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60000);

    await sequelize.query(
      `INSERT INTO recovery_codes (id_empleado, codigo, expires) VALUES (?, ?, ?)`,
      { replacements: [user.id_empleado, codigo, expires], type: sequelize.QueryTypes.INSERT }
    );

    try {
      await sendRecoveryEmail(email, codigo);
    } catch (emailError) {
      console.error('❌ Error al enviar correo de recuperación:', emailError.message);
      return res.status(500).json({
        error: 'Error al enviar el correo. Verifica la configuración SMTP.'
      });
    }

    res.json({ message: 'Código enviado a tu correo' });
  } catch (error) {
    console.error('❌ Error en /solicitar-recuperacion:', error);
    res.status(500).json({
      error: 'Error al procesar la solicitud'
    });
  }
});

// ─── VERIFICAR CÓDIGO Y CAMBIAR CONTRASEÑA ──────────────
router.post('/recuperar-contrasena', async (req, res) => {
  const { email, codigo, password, recaptchaToken } = req.body;
  if (!email || !codigo || !password) {
    return res.status(400).json({ error: 'Correo, código y contraseña son requeridos' });
  }

  if (!recaptchaToken) return res.status(400).json({ error: 'Confirma que no eres un robot' });

  try {
    const recaptchaValid = await verifyRecaptchaToken(recaptchaToken, req.ip);
    if (!recaptchaValid) {
      return res.status(400).json({ error: 'Verificacion de reCAPTCHA fallida' });
    }

    const [user] = await sequelize.query(
      `SELECT id_empleado FROM empleados WHERE correo = ?`,
      { replacements: [email], type: sequelize.QueryTypes.SELECT }
    );
    if (!user) return res.status(404).json({ error: 'Correo no registrado' });

    const [record] = await sequelize.query(
      `SELECT id FROM recovery_codes WHERE id_empleado = ? AND codigo = ? AND expires > NOW()`,
      { replacements: [user.id_empleado, codigo], type: sequelize.QueryTypes.SELECT }
    );
    if (!record) return res.status(400).json({ error: 'Código inválido o expirado' });

    const hashed = await bcrypt.hash(password, 10);
    await sequelize.query(
      `UPDATE empleados SET password_hash = ?, token_version = token_version + 1 WHERE id_empleado = ?`,
      { replacements: [hashed, user.id_empleado], type: sequelize.QueryTypes.UPDATE }
    );

    await sequelize.query(
      `DELETE FROM recovery_codes WHERE id = ?`,
      { replacements: [record.id], type: sequelize.QueryTypes.DELETE }
    );

    res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    console.error('❌ Error en recuperar-contrasena:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

export default router;
