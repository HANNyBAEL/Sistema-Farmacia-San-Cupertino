import express from 'express';
import sequelize from '../config/database.js';
import { registrarAuditoria } from './auditoria.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const clientes = await sequelize.query(
      `SELECT c.*,
        EXISTS(SELECT 1 FROM ventas v WHERE v.id_cliente = c.id_cliente) AS has_ventas
       FROM clientes c
       WHERE c.papelera = 0
       ORDER BY c.nombre ASC, c.apellido ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(clientes);
  } catch (error) {
    console.error('❌ GET /clientes:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const clientes = await sequelize.query(
      'SELECT * FROM clientes WHERE id_cliente = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT }
    );
    if (!clientes.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(clientes[0]);
  } catch (error) {
    console.error('❌ GET /clientes/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion, id_empleado, nombre_empleado } = req.body;
  try {
    const [result] = await sequelize.query(
      `INSERT INTO clientes (nombre, apellido, telefono, correo, direccion, deleted)
       VALUES (:nombre, :apellido, :telefono, :correo, :direccion, 0)`,
      { replacements: { nombre, apellido, telefono, correo, direccion: direccion || null } }
    );
    await registrarAuditoria({
      tabla: 'clientes', accion: 'CREAR',
      descripcion: `Cliente creado: ${nombre} ${apellido}`,
      id_registro: result, id_empleado, nombre_empleado
    });
    res.status(201).json({ id_cliente: result, message: 'Cliente creado' });
  } catch (error) {
    console.error('❌ POST /clientes:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion, id_empleado, nombre_empleado } = req.body;
  try {
    // Leer valores anteriores ANTES del UPDATE
    const [anterior] = await sequelize.query(
      'SELECT nombre, apellido, telefono, correo, direccion FROM clientes WHERE id_cliente = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT }
    );

    await sequelize.query(
      `UPDATE clientes SET nombre=:nombre, apellido=:apellido, telefono=:telefono,
       correo=:correo, direccion=:direccion WHERE id_cliente=:id`,
      { replacements: { nombre, apellido, telefono, correo, direccion: direccion || null, id: req.params.id } }
    );

    const campos = [
      { campo: 'nombre',    nuevo: nombre,            ant: anterior?.nombre },
      { campo: 'apellido',  nuevo: apellido,          ant: anterior?.apellido },
      { campo: 'telefono',  nuevo: telefono,          ant: anterior?.telefono },
      { campo: 'correo',    nuevo: correo,            ant: anterior?.correo },
      { campo: 'direccion', nuevo: direccion || null, ant: anterior?.direccion },
    ];

    for (const c of campos) {
      if (String(c.ant) !== String(c.nuevo)) {
        await registrarAuditoria({
          tabla: 'clientes', accion: 'EDITAR',
          descripcion: `Cliente editado: ${nombre} ${apellido}`,
          id_registro: Number(req.params.id), id_empleado, nombre_empleado,
          campo_modificado: c.campo,
          valor_anterior: String(c.ant ?? ''),
          valor_nuevo: String(c.nuevo ?? '')
        });
      }
    }

    if (!campos.some(c => String(c.ant) !== String(c.nuevo))) {
      await registrarAuditoria({
        tabla: 'clientes', accion: 'EDITAR',
        descripcion: `Cliente editado: ${nombre} ${apellido}`,
        id_registro: Number(req.params.id), id_empleado, nombre_empleado
      });
    }

    res.json({ message: 'Cliente actualizado' });
  } catch (error) {
    console.error('❌ PUT /clientes/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  const { id_empleado, nombre_empleado } = req.body;
  try {
    const [cliente] = await sequelize.query(
      'SELECT nombre, apellido, deleted FROM clientes WHERE id_cliente = :id',
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT }
    );
    await sequelize.query(
      'UPDATE clientes SET deleted = NOT deleted WHERE id_cliente = :id',
      { replacements: { id: Number(req.params.id) } }
    );
    const accion = cliente.deleted ? 'ACTIVAR' : 'DESACTIVAR';
    await registrarAuditoria({
      tabla: 'clientes', accion,
      descripcion: `Cliente ${accion.toLowerCase()}do: ${cliente.nombre} ${cliente.apellido}`,
      id_registro: Number(req.params.id), id_empleado, nombre_empleado
    });
    res.json({ message: 'Estado del cliente actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/papelera', async (req, res) => {
  const { id_empleado, nombre_empleado } = req.body;
  try {
    const [cliente] = await sequelize.query(
      'SELECT nombre, apellido FROM clientes WHERE id_cliente = :id',
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT }
    );
    await sequelize.query(
      'UPDATE clientes SET papelera = 1 WHERE id_cliente = :id',
      { replacements: { id: Number(req.params.id) } }
    );
    await registrarAuditoria({
      tabla: 'clientes', accion: 'PAPELERA',
      descripcion: `Cliente movido a papelera: ${cliente.nombre} ${cliente.apellido}`,
      id_registro: Number(req.params.id), id_empleado, nombre_empleado
    });
    res.json({ message: 'Cliente movido a papelera' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id_empleado, nombre_empleado } = req.body;
  const transaction = await sequelize.transaction();
  try {
    const ventas = await sequelize.query(
      'SELECT COUNT(*) as count FROM ventas WHERE id_cliente = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT, transaction }
    );
    if (ventas[0].count > 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No se puede eliminar el cliente porque tiene ventas registradas.' });
    }
    const [cliente] = await sequelize.query(
      'SELECT nombre, apellido FROM clientes WHERE id_cliente = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT, transaction }
    );
    await sequelize.query(
      'DELETE FROM clientes WHERE id_cliente = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.DELETE, transaction }
    );
    await transaction.commit();
    await registrarAuditoria({
      tabla: 'clientes', accion: 'ELIMINAR',
      descripcion: `Cliente eliminado permanentemente: ${cliente?.nombre} ${cliente?.apellido}`,
      id_registro: Number(req.params.id), id_empleado, nombre_empleado
    });
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ DELETE /clientes/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;