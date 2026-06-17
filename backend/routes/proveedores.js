import express from 'express';
import sequelize from '../config/database.js';
import { registrarAuditoria } from './auditoria.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const proveedores = await sequelize.query(
      `SELECT p.*,
        EXISTS(SELECT 1 FROM productos pr WHERE pr.id_proveedor = p.id_proveedor) AS has_productos
       FROM proveedores p
       WHERE p.papelera = 0
       ORDER BY p.nombre ASC, p.apellido ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(proveedores);
  } catch (error) {
    console.error('❌ GET /proveedores:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion, id_empleado, nombre_empleado } = req.body;
  if (!nombre || !apellido) return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
  try {
    const [result] = await sequelize.query(
      `INSERT INTO proveedores (nombre, apellido, telefono, correo, direccion, deleted)
       VALUES (:nombre, :apellido, :telefono, :correo, :direccion, 0)`,
      { replacements: { nombre, apellido, telefono: telefono||null, correo: correo||null, direccion: direccion||null } }
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
    await sequelize.query(
      `UPDATE proveedores SET nombre=:nombre, apellido=:apellido, telefono=:telefono,
       correo=:correo, direccion=:direccion WHERE id_proveedor=:id`,
      { replacements: { nombre, apellido, telefono: telefono||null, correo: correo||null, direccion: direccion||null, id: req.params.id } }
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

    // Verificar si el proveedor tiene productos activos (no en papelera)
    const [productos] = await sequelize.query(
      'SELECT COUNT(*) as count FROM productos WHERE id_proveedor = :id AND papelera = 0',
      { replacements: { id }, type: sequelize.QueryTypes.SELECT }
    );

    if (productos.count > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el proveedor porque tiene productos asociados. Solo puede desactivarlo.'
      });
    }

    const [prov] = await sequelize.query(
      'SELECT nombre, apellido FROM proveedores WHERE id_proveedor = :id',
      { replacements: { id }, type: sequelize.QueryTypes.SELECT }
    );

    await sequelize.query(
      'UPDATE proveedores SET papelera = 1 WHERE id_proveedor = :id',
      { replacements: { id } }
    );

    await registrarAuditoria({
      tabla: 'proveedores',
      accion: 'PAPELERA',
      descripcion: `Proveedor movido a papelera: ${prov.nombre} ${prov.apellido}`,
      id_registro: id,
      id_empleado,
      nombre_empleado
    });

    res.json({ message: 'Proveedor movido a papelera' });
  } catch (error) {
    console.error('❌ PATCH /proveedores/:id/papelera:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id_empleado, nombre_empleado } = req.body;
  const transaction = await sequelize.transaction();
  try {
    const productos = await sequelize.query(
      'SELECT COUNT(*) as count FROM productos WHERE id_proveedor = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT, transaction }
    );
    if (productos[0].count > 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No se puede eliminar el proveedor porque tiene productos registrados.' });
    }
    const [prov] = await sequelize.query(
      'SELECT nombre, apellido FROM proveedores WHERE id_proveedor = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT, transaction }
    );
    await sequelize.query(
      'DELETE FROM proveedores WHERE id_proveedor = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.DELETE, transaction }
    );
    await transaction.commit();
    await registrarAuditoria({
      tabla: 'proveedores', accion: 'ELIMINAR',
      descripcion: `Proveedor eliminado: ${prov?.nombre} ${prov?.apellido}`,
      id_registro: Number(req.params.id), id_empleado, nombre_empleado
    });
    res.json({ message: 'Proveedor eliminado correctamente' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ DELETE /proveedores/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;