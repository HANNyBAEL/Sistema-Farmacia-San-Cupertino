import express from 'express';
import sequelize from '../config/database.js';
import { registrarAuditoria } from './auditoria.js';
import { ensureEmailIsUnique, handleEmailValidationError, validateEmailOrThrow } from '../utils/emailValidation.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const proveedores = await sequelize.query(
      `SELECT p.*,
        EXISTS(SELECT 1 FROM productos pr WHERE pr.id_proveedor = p.id_proveedor) AS has_productos,
        (SELECT COUNT(*) FROM productos pr WHERE pr.id_proveedor = p.id_proveedor AND pr.papelera = 0) AS product_count
       FROM proveedores p
       WHERE p.papelera = 0
       ORDER BY p.nombre ASC, p.apellido ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(proveedores);
  } catch (error) {
    console.error('❌ GET /proveedores:', error);
    if (handleEmailValidationError(error, res)) return;
    if (handleEmailValidationError(error, res)) return;
    if (handleEmailValidationError(error, res)) return;
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion, id_empleado, nombre_empleado } = req.body;
  if (!nombre || !apellido) return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
  try {
    const correoNormalizado = validateEmailOrThrow(correo);
    await ensureEmailIsUnique(sequelize, 'proveedores', correoNormalizado, 'id_proveedor');

    const [result] = await sequelize.query(
      `INSERT INTO proveedores (nombre, apellido, telefono, correo, direccion, deleted)
       VALUES (:nombre, :apellido, :telefono, :correo, :direccion, 0)`,
      { replacements: { nombre, apellido, telefono: telefono||null, correo: correoNormalizado, direccion: direccion||null } }
    );
    await registrarAuditoria({
      tabla: 'proveedores', accion: 'CREAR',
      descripcion: `Proveedor creado: ${nombre} ${apellido}`,
      id_registro: result, id_empleado, nombre_empleado
    });
    res.status(201).json({ id_proveedor: result, message: 'Proveedor creado' });
  } catch (error) {
    console.error('❌ POST /proveedores:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion, id_empleado, nombre_empleado } = req.body;
  if (!nombre || !apellido) return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
  try {
    const correoNormalizado = validateEmailOrThrow(correo, { required: false });
    if (correoNormalizado) {
      await ensureEmailIsUnique(sequelize, 'proveedores', correoNormalizado, 'id_proveedor', req.params.id);
    }

    await sequelize.query(
      `UPDATE proveedores SET nombre=:nombre, apellido=:apellido, telefono=:telefono,
       correo=:correo, direccion=:direccion WHERE id_proveedor=:id`,
      { replacements: { nombre, apellido, telefono: telefono||null, correo: correoNormalizado, direccion: direccion||null, id: req.params.id } }
    );
    await registrarAuditoria({
      tabla: 'proveedores', accion: 'EDITAR',
      descripcion: `Proveedor editado: ${nombre} ${apellido}`,
      id_registro: Number(req.params.id), id_empleado, nombre_empleado
    });
    res.json({ message: 'Proveedor actualizado' });
  } catch (error) {
    console.error('❌ PUT /proveedores/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  const { id_empleado, nombre_empleado } = req.body;
  try {
    const [prov] = await sequelize.query(
      'SELECT nombre, apellido, deleted FROM proveedores WHERE id_proveedor = :id',
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT }
    );
    await sequelize.query(
      'UPDATE proveedores SET deleted = NOT deleted WHERE id_proveedor = :id',
      { replacements: { id: Number(req.params.id) } }
    );
    const accion = prov.deleted ? 'ACTIVAR' : 'DESACTIVAR';
    await registrarAuditoria({
      tabla: 'proveedores', accion,
      descripcion: `Proveedor ${accion.toLowerCase()}do: ${prov.nombre} ${prov.apellido}`,
      id_registro: Number(req.params.id), id_empleado, nombre_empleado
    });
    res.json({ message: 'Estado del proveedor actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/papelera', async (req, res) => {
  const { id_empleado, nombre_empleado } = req.body;
  try {
    const id = Number(req.params.id);

    const [prov] = await sequelize.query(
      'SELECT nombre, apellido FROM proveedores WHERE id_proveedor = :id',
      { replacements: { id }, type: sequelize.QueryTypes.SELECT }
    );
    if (!prov) return res.status(404).json({ error: 'Proveedor no encontrado' });

    await sequelize.query(
      'UPDATE proveedores SET deleted = 1, papelera = 1 WHERE id_proveedor = :id',
      { replacements: { id } }
    );

    await registrarAuditoria({
      tabla: 'proveedores',
      accion: 'PAPELERA',
      descripcion: `Proveedor movido a registros eliminados: ${prov.nombre} ${prov.apellido}`,
      id_registro: id,
      id_empleado,
      nombre_empleado
    });

    res.json({ message: 'Proveedor movido a registros eliminados' });
  } catch (error) {
    console.error('❌ PATCH /proveedores/:id/papelera:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id_empleado, nombre_empleado } = req.body;
  try {
    const [prov] = await sequelize.query(
      'SELECT nombre, apellido FROM proveedores WHERE id_proveedor = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT }
    );
    if (!prov) return res.status(404).json({ error: 'Proveedor no encontrado' });

    await sequelize.query(
      'UPDATE proveedores SET deleted = 1, papelera = 1 WHERE id_proveedor = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.UPDATE }
    );
    await registrarAuditoria({
      tabla: 'proveedores', accion: 'PAPELERA',
      descripcion: `Proveedor movido a registros eliminados: ${prov.nombre} ${prov.apellido}`,
      id_registro: Number(req.params.id), id_empleado, nombre_empleado
    });
    res.json({ message: 'Proveedor movido a registros eliminados' });
  } catch (error) {
    console.error('❌ DELETE /proveedores/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
