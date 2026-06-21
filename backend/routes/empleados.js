import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sequelize from '../config/database.js';
import { registrarAuditoria } from './auditoria.js';
import { sendInvitationEmail } from '../services/email.js';
import { ensureEmailIsUnique, handleEmailValidationError, validateEmailOrThrow } from '../utils/emailValidation.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const empleados = await sequelize.query(
      `SELECT e.id_empleado, e.nombre, e.apellido, e.correo, e.telefono, e.cargo,
        e.fecha_contratacion, e.activo, e.papelera, e.dui, e.nit, e.cuenta_banco,
        e.afp, e.debe_cambiar,
        EXISTS(SELECT 1 FROM ventas v WHERE v.id_empleado = e.id_empleado) AS has_ventas,
        EXISTS(
          SELECT 1 FROM auditoria a
          WHERE a.id_empleado = e.id_empleado
             OR (a.tabla = 'empleados' AND a.id_registro = e.id_empleado)
        ) AS has_acciones
      FROM empleados e
      WHERE e.papelera = 0
      ORDER BY e.id_empleado DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(empleados);
  } catch (error) {
    console.error('❌ GET /empleados:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const empleados = await sequelize.query(
      `SELECT e.id_empleado, e.nombre, e.apellido, e.correo, e.telefono, e.cargo,
        e.fecha_contratacion, e.activo, e.papelera, e.dui, e.nit, e.cuenta_banco,
        e.afp, e.debe_cambiar,
        EXISTS(SELECT 1 FROM ventas v WHERE v.id_empleado = e.id_empleado) AS has_ventas,
        EXISTS(
          SELECT 1 FROM auditoria a
          WHERE a.id_empleado = e.id_empleado
             OR (a.tabla = 'empleados' AND a.id_registro = e.id_empleado)
        ) AS has_acciones
      FROM empleados e
      WHERE e.id_empleado = :id AND e.papelera = 0`,
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT }
    );
    if (!empleados.length) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(empleados[0]);
  } catch (error) {
    console.error('❌ GET /empleados/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── CREAR EMPLEADO (sin contraseña, envía invitación) ──
router.post('/', async (req, res) => {
  const { nombre, apellido, correo, telefono, cargo, fecha_contratacion, id_empleado_sesion, nombre_empleado_sesion } = req.body;
  if (!nombre || !apellido || !correo || !cargo)
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  try {
    const correoNormalizado = validateEmailOrThrow(correo);
    await ensureEmailIsUnique(sequelize, 'empleados', correoNormalizado, 'id_empleado');

    // Generar token de invitación
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Crear empleado con una contraseña temporal (no se usará) y el token
    const tempPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    const [result] = await sequelize.query(
      `INSERT INTO empleados 
        (nombre, apellido, correo, telefono, cargo, password_hash, fecha_contratacion, activo, dui, nit, cuenta_banco, afp, token_version, debe_cambiar, invitation_token, invitation_expires)
       VALUES 
        (:nombre, :apellido, :correo, :telefono, :cargo, :password, :fecha_contratacion, 1, :dui, :nit, :cuenta_banco, :afp, 1, 1, :invitation_token, :invitation_expires)`,
      {
        replacements: {
          nombre, apellido, correo: correoNormalizado,
          telefono: telefono || null,
          cargo,
          password: tempPassword,
          fecha_contratacion: fecha_contratacion || null,
          dui: req.body.dui || null,
          nit: req.body.nit || null,
          cuenta_banco: req.body.cuenta_banco || null,
          afp: req.body.afp || null,
          invitation_token: token,
          invitation_expires: expires
        },
        type: sequelize.QueryTypes.INSERT
      }
    );

    // Enviar correo de invitación
    try {
      await sendInvitationEmail(correoNormalizado, `${nombre} ${apellido}`, token);
    } catch (mailError) {
      console.error('❌ Error enviando correo:', mailError);
      // No fallamos la creación, solo registramos el error
    }

    await registrarAuditoria({
      tabla: 'empleados', accion: 'CREAR',
      descripcion: `Empleado creado: ${nombre} ${apellido} (${cargo}) - invitación enviada`,
      id_registro: result, id_empleado: id_empleado_sesion, nombre_empleado: nombre_empleado_sesion
    });

    res.status(201).json({ id_empleado: result, message: 'Empleado creado. Se ha enviado una invitación al correo.' });
  } catch (error) {
    console.error('❌ POST /empleados:', error);
    if (error.original?.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El correo ya está registrado.' });
    res.status(500).json({ error: error.message });
  }
});

// ─── EDITAR EMPLEADO (sin password) ──────────────────────
router.put('/:id', async (req, res) => {
  const { nombre, apellido, correo, telefono, cargo, fecha_contratacion, activo, dui, nit, cuenta_banco, afp, id_empleado_sesion, nombre_empleado_sesion } = req.body;
  try {
    const correoNormalizado = validateEmailOrThrow(correo);
    await ensureEmailIsUnique(sequelize, 'empleados', correoNormalizado, 'id_empleado', req.params.id);

    const [anterior] = await sequelize.query(
      'SELECT nombre, apellido, correo, telefono, cargo, fecha_contratacion, activo, dui, nit, cuenta_banco, afp, token_version FROM empleados WHERE id_empleado = :id',
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT }
    );

    await sequelize.query(
      `UPDATE empleados SET nombre=:nombre, apellido=:apellido, correo=:correo, telefono=:telefono,
       cargo=:cargo, fecha_contratacion=:fecha_contratacion, activo=:activo, dui=:dui, nit=:nit, cuenta_banco=:cuenta_banco, afp=:afp
       WHERE id_empleado=:id`,
      {
        replacements: {
          nombre, apellido, correo: correoNormalizado,
          telefono: telefono || null,
          cargo,
          fecha_contratacion: fecha_contratacion || null,
          activo: activo ?? 1,
          dui: dui || null,
          nit: nit || null,
          cuenta_banco: cuenta_banco || null,
          afp: afp || null,
          id: Number(req.params.id)
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );

    // Si se desactiva, invalidar sesión
    if (activo !== undefined && activo === 0) {
      await sequelize.query(
        `UPDATE empleados SET token_version = token_version + 1 WHERE id_empleado = :id`,
        { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.UPDATE }
      );
    }

    // Auditoría (sin password)
    const campos = [
      { campo: 'nombre', nuevo: nombre, ant: anterior?.nombre },
      { campo: 'apellido', nuevo: apellido, ant: anterior?.apellido },
      { campo: 'correo', nuevo: correoNormalizado, ant: anterior?.correo },
      { campo: 'telefono', nuevo: telefono || null, ant: anterior?.telefono },
      { campo: 'cargo', nuevo: cargo, ant: anterior?.cargo },
      { campo: 'fecha_contratacion', nuevo: fecha_contratacion || null, ant: anterior?.fecha_contratacion },
      { campo: 'activo', nuevo: activo ?? 1, ant: anterior?.activo },
      { campo: 'dui', nuevo: dui || null, ant: anterior?.dui },
      { campo: 'nit', nuevo: nit || null, ant: anterior?.nit },
      { campo: 'cuenta_banco', nuevo: cuenta_banco || null, ant: anterior?.cuenta_banco },
      { campo: 'afp', nuevo: afp || null, ant: anterior?.afp }
    ];

    for (const c of campos) {
      if (String(c.ant) !== String(c.nuevo)) {
        await registrarAuditoria({
          tabla: 'empleados', accion: 'EDITAR',
          descripcion: `Empleado editado: ${nombre} ${apellido} (${cargo})`,
          id_registro: Number(req.params.id),
          id_empleado: id_empleado_sesion, nombre_empleado: nombre_empleado_sesion,
          campo_modificado: c.campo,
          valor_anterior: String(c.ant ?? ''),
          valor_nuevo: String(c.nuevo ?? '')
        });
      }
    }

    res.json({ message: 'Empleado actualizado' });
  } catch (error) {
    console.error('❌ PUT /empleados/:id:', error);
    if (error.original?.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El correo ya está registrado.' });
    res.status(500).json({ error: error.message });
  }
});

// ─── MOVER EMPLEADO A PAPELERA ────────────────────────────
router.delete('/:id', async (req, res) => {
  const { id_empleado_sesion, nombre_empleado_sesion } = req.body;
  try {
    const [emp] = await sequelize.query(
      `SELECT e.nombre, e.apellido, e.cargo,
        EXISTS(SELECT 1 FROM ventas v WHERE v.id_empleado = e.id_empleado) AS has_ventas,
        EXISTS(
          SELECT 1 FROM auditoria a
          WHERE a.id_empleado = e.id_empleado
             OR (a.tabla = 'empleados' AND a.id_registro = e.id_empleado)
        ) AS has_acciones
      FROM empleados e
      WHERE e.id_empleado = :id AND e.papelera = 0`,
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT }
    );
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });
    await sequelize.query(
      'UPDATE empleados SET activo = 0, papelera = 1, token_version = token_version + 1 WHERE id_empleado = :id',
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.UPDATE }
    );
    await registrarAuditoria({
      tabla: 'empleados', accion: 'PAPELERA',
      descripcion: `Empleado movido a registros eliminados: ${emp.nombre} ${emp.apellido} (${emp.cargo})`,
      id_registro: Number(req.params.id), id_empleado: id_empleado_sesion, nombre_empleado: nombre_empleado_sesion
    });
    res.json({ message: 'Empleado movido a registros eliminados' });
  } catch (error) {
    console.error('❌ DELETE /empleados/:id:', error);
    if (handleEmailValidationError(error, res)) return;
    if (handleEmailValidationError(error, res)) return;
    if (handleEmailValidationError(error, res)) return;
    if (handleEmailValidationError(error, res)) return;
    res.status(500).json({ error: error.message });
  }
});

// ─── FORZAR RESTABLECIMIENTO DE CONTRASEÑA ──────────────
router.patch('/:id/forzar-restablecimiento', async (req, res) => {
  const { id_empleado_sesion, nombre_empleado_sesion } = req.body;
  try {
    const id = Number(req.params.id);
    await sequelize.query(
      `UPDATE empleados SET debe_cambiar = 1, token_version = token_version + 1 WHERE id_empleado = :id`,
      { replacements: { id }, type: sequelize.QueryTypes.UPDATE }
    );
    await registrarAuditoria({
      tabla: 'empleados', accion: 'FORZAR_RESTABLECIMIENTO',
      descripcion: `Se forzó el restablecimiento de contraseña para el empleado ID ${id}`,
      id_registro: id,
      id_empleado: id_empleado_sesion,
      nombre_empleado: nombre_empleado_sesion
    });
    res.json({ message: 'Se ha forzado el restablecimiento de contraseña. El empleado deberá cambiarla en su próximo inicio de sesión.' });
  } catch (error) {
    console.error('❌ PATCH /empleados/:id/forzar-restablecimiento:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
