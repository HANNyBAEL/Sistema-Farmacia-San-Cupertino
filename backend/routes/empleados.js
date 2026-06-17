import express from 'express';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';
import { registrarAuditoria } from './auditoria.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const empleados = await sequelize.query(
      `SELECT id_empleado, nombre, apellido, correo, telefono, cargo, fecha_contratacion, activo, dui, nit, cuenta_banco, afp
      FROM empleados ORDER BY id_empleado DESC`,
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
      `SELECT id_empleado, nombre, apellido, correo, telefono, cargo, fecha_contratacion, activo, dui, nit, cuenta_banco, afp
      FROM empleados WHERE id_empleado = :id ORDER BY id_empleado DESC`,
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT }
    );
    if (!empleados.length) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(empleados[0]);
  } catch (error) {
    console.error('❌ GET /empleados/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { nombre, apellido, correo, telefono, cargo, password, fecha_contratacion, id_empleado_sesion, nombre_empleado_sesion } = req.body;
  if (!nombre || !apellido || !correo || !cargo || !password)
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await sequelize.query(
    `INSERT INTO empleados (nombre, apellido, correo, telefono, cargo, password_hash, fecha_contratacion, activo, dui, nit, cuenta_banco, afp, token_version)
    VALUES (:nombre, :apellido, :correo, :telefono, :cargo, :password_hash, :fecha_contratacion, 1, :dui, :nit, :cuenta_banco, :afp, 1)`,
      { replacements: { nombre, apellido, correo, telefono: telefono||null, cargo, password_hash, fecha_contratacion: fecha_contratacion||null, dui: req.body.dui||null, nit: req.body.nit||null, cuenta_banco: req.body.cuenta_banco||null, afp: req.body.afp||null }, type: sequelize.QueryTypes.INSERT }
    );
    await registrarAuditoria({
      tabla: 'empleados', accion: 'CREAR',
      descripcion: `Empleado creado: ${nombre} ${apellido} (${cargo})`,
      id_registro: result, id_empleado: id_empleado_sesion, nombre_empleado: nombre_empleado_sesion
    });
    res.status(201).json({ id_empleado: result, message: 'Empleado creado' });
  } catch (error) {
    console.error('❌ POST /empleados:', error);
    if (error.original?.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El correo ya está registrado.' });
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, apellido, correo, telefono, cargo, password, fecha_contratacion, activo, dui, nit, cuenta_banco, afp, id_empleado_sesion, nombre_empleado_sesion } = req.body;
  try {
    // Leer valores anteriores ANTES del UPDATE
    const [anterior] = await sequelize.query(
      'SELECT nombre, apellido, correo, telefono, cargo, fecha_contratacion, activo, dui, nit, cuenta_banco, afp, token_version FROM empleados WHERE id_empleado = :id',
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT }
    );

    // ✅ Variable para controlar si debemos incrementar token_version
    let invalidarSesion = false;

    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      await sequelize.query(
        `UPDATE empleados SET nombre=:nombre, apellido=:apellido, correo=:correo, telefono=:telefono,
         cargo=:cargo, password_hash=:password_hash, fecha_contratacion=:fecha_contratacion, activo=:activo, dui=:dui, nit=:nit, cuenta_banco=:cuenta_banco, afp=:afp
         WHERE id_empleado=:id`,
        { replacements: { nombre, apellido, correo, telefono: telefono||null, cargo, password_hash, fecha_contratacion: fecha_contratacion||null, activo: activo ?? 1, dui: dui||null, nit: nit||null, cuenta_banco: cuenta_banco||null, afp: afp||null, id: Number(req.params.id) }, type: sequelize.QueryTypes.UPDATE }
      );
      // ✅ Si se cambió la contraseña, invalidar sesión
      invalidarSesion = true;
    } else {
      // Si no cambia password, actualizar sin él
      await sequelize.query(
        `UPDATE empleados SET nombre=:nombre, apellido=:apellido, correo=:correo, telefono=:telefono,
         cargo=:cargo, fecha_contratacion=:fecha_contratacion, activo=:activo, dui=:dui, nit=:nit, cuenta_banco=:cuenta_banco, afp=:afp
         WHERE id_empleado=:id`,
        { replacements: { nombre, apellido, correo, telefono: telefono||null, cargo, fecha_contratacion: fecha_contratacion||null, activo: activo ?? 1, dui: dui||null, nit: nit||null, cuenta_banco: cuenta_banco||null, afp: afp||null, id: Number(req.params.id) }, type: sequelize.QueryTypes.UPDATE }
      );
    }

    // ✅ Si se desactiva (activo = 0), invalidar sesión
    if (activo !== undefined && activo === 0) {
      invalidarSesion = true;
    }

    // ✅ Si se necesita invalidar, incrementar token_version
    if (invalidarSesion) {
      await sequelize.query(
        `UPDATE empleados SET token_version = token_version + 1 WHERE id_empleado = :id`,
        { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.UPDATE }
      );
    }

    // Detectar cambios campo por campo (para auditoría)
    const campos = [
      { campo: 'nombre',             nuevo: nombre,                    ant: anterior?.nombre },
      { campo: 'apellido',           nuevo: apellido,                  ant: anterior?.apellido },
      { campo: 'correo',             nuevo: correo,                    ant: anterior?.correo },
      { campo: 'telefono',           nuevo: telefono || null,          ant: anterior?.telefono },
      { campo: 'cargo',              nuevo: cargo,                     ant: anterior?.cargo },
      { campo: 'fecha_contratacion', nuevo: fecha_contratacion || null, ant: anterior?.fecha_contratacion },
      { campo: 'activo',             nuevo: activo ?? 1,               ant: anterior?.activo },
      { campo: 'dui',                nuevo: dui || null,               ant: anterior?.dui },
      { campo: 'nit',                nuevo: nit || null,               ant: anterior?.nit },
      { campo: 'cuenta_banco',       nuevo: cuenta_banco || null,      ant: anterior?.cuenta_banco },
      { campo: 'afp',                nuevo: afp || null,               ant: anterior?.afp }
    ];
    if (password) campos.push({ campo: 'password', nuevo: '(actualizada)', ant: '(anterior)' });

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

    if (!campos.some(c => String(c.ant) !== String(c.nuevo))) {
      await registrarAuditoria({
        tabla: 'empleados', accion: 'EDITAR',
        descripcion: `Empleado editado: ${nombre} ${apellido} (${cargo})`,
        id_registro: Number(req.params.id),
        id_empleado: id_empleado_sesion, nombre_empleado: nombre_empleado_sesion
      });
    }

    res.json({ message: 'Empleado actualizado' });
  } catch (error) {
    console.error('❌ PUT /empleados/:id:', error);
    if (error.original?.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El correo ya está registrado.' });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id_empleado_sesion, nombre_empleado_sesion } = req.body;
  try {
    const [emp] = await sequelize.query(
      'SELECT nombre, apellido, cargo FROM empleados WHERE id_empleado = :id',
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT }
    );
    await sequelize.query(
      'UPDATE empleados SET activo = 0 WHERE id_empleado = :id',
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.UPDATE }
    );
    // ✅ Al desactivar, incrementar token_version para invalidar sesión
    await sequelize.query(
      `UPDATE empleados SET token_version = token_version + 1 WHERE id_empleado = :id`,
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.UPDATE }
    );
    await registrarAuditoria({
      tabla: 'empleados', accion: 'DESACTIVAR',
      descripcion: `Empleado desactivado: ${emp?.nombre} ${emp?.apellido} (${emp?.cargo})`,
      id_registro: Number(req.params.id), id_empleado: id_empleado_sesion, nombre_empleado: nombre_empleado_sesion
    });
    res.json({ message: 'Empleado desactivado' });
  } catch (error) {
    console.error('❌ DELETE /empleados/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;