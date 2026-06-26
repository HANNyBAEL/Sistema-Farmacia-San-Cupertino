import express from 'express';
import sequelize from '../config/database.js';
import { registrarAuditoria } from './auditoria.js';
import { ensureEmailIsUnique, handleEmailValidationError, validateEmailOrThrow } from '../utils/emailValidation.js';

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
    if (handleEmailValidationError(error, res)) return;
    if (handleEmailValidationError(error, res)) return;
    if (handleEmailValidationError(error, res)) return;
    if (handleEmailValidationError(error, res)) return;
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [cliente] = await sequelize.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM ventas v 
         WHERE v.id_cliente = c.id_cliente AND v.papelera = 0) as has_ventas
       FROM clientes c
       WHERE c.id_cliente = :id`,
      { replacements: { id }, type: sequelize.QueryTypes.SELECT }
    );
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) {
    console.error('❌ GET /clientes/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion, dui, id_empleado, nombre_empleado } = req.body;
  try {
    const correoNormalizado = validateEmailOrThrow(correo);
    await ensureEmailIsUnique(sequelize, 'clientes', correoNormalizado, 'id_cliente');

    const [result] = await sequelize.query(
      `INSERT INTO clientes (nombre, apellido, telefono, correo, direccion, dui, deleted)
       VALUES (:nombre, :apellido, :telefono, :correo, :direccion, :dui, 0)`,
      { replacements: { nombre, apellido, telefono, correo: correoNormalizado, direccion: direccion || null, dui: dui || null } }
    );
    await registrarAuditoria({
      tabla: 'clientes', accion: 'CREAR',
      descripcion: `Cliente creado: ${nombre} ${apellido}`,
      id_registro: result, id_empleado, nombre_empleado
    });

    // Emitir evento Socket.io para sincronización en tiempo real
    const io = req.app.get('io');
    if (io) {
      io.emit('cliente:creado', { id_cliente: result, nombre: `${nombre} ${apellido}` });
    }

    res.status(201).json({ id_cliente: result, message: 'Cliente creado' });
  } catch (error) {
    console.error('❌ POST /clientes:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion, dui, id_empleado, nombre_empleado } = req.body;
  try {
    const clienteId = Number(req.params.id);
    
    // Proteger cliente anónimo (ID 1) de cualquier edición
    if (clienteId === 1) {
      return res.status(403).json({ error: 'No se puede editar el cliente anónimo.' });
    }

    const correoNormalizado = validateEmailOrThrow(correo, { required: false });
    if (correoNormalizado) {
      await ensureEmailIsUnique(sequelize, 'clientes', correoNormalizado, 'id_cliente', req.params.id);
    }

    const [anterior] = await sequelize.query(
      'SELECT nombre, apellido, telefono, correo, direccion, dui FROM clientes WHERE id_cliente = :id',
      { replacements: { id: clienteId }, type: sequelize.QueryTypes.SELECT }
    );

    await sequelize.query(
      `UPDATE clientes SET nombre=:nombre, apellido=:apellido, telefono=:telefono,
       correo=:correo, direccion=:direccion, dui=:dui WHERE id_cliente=:id`,
      { replacements: { nombre, apellido, telefono, correo: correoNormalizado, direccion: direccion || null, dui: dui || null, id: clienteId } }
    );

    const campos = [
      { campo: 'nombre',    nuevo: nombre,            ant: anterior?.nombre },
      { campo: 'apellido',  nuevo: apellido,          ant: anterior?.apellido },
      { campo: 'telefono',  nuevo: telefono,          ant: anterior?.telefono },
      { campo: 'correo',    nuevo: correoNormalizado, ant: anterior?.correo },
      { campo: 'direccion', nuevo: direccion || null, ant: anterior?.direccion },
      { campo: 'dui',       nuevo: dui || null,       ant: anterior?.dui },
    ];

    let huboCambios = false;
    for (const c of campos) {
      if (String(c.ant ?? '') !== String(c.nuevo ?? '')) {
        huboCambios = true;
        await registrarAuditoria({
          tabla: 'clientes', accion: 'EDITAR',
          descripcion: `Cliente editado: ${nombre} ${apellido}`,
          id_registro: clienteId, id_empleado, nombre_empleado,
          campo_modificado: c.campo,
          valor_anterior: String(c.ant ?? ''),
          valor_nuevo: String(c.nuevo ?? '')
        });
      }
    }

    if (!huboCambios) {
      await registrarAuditoria({
        tabla: 'clientes', accion: 'EDITAR',
        descripcion: `Cliente editado sin cambios: ${nombre} ${apellido}`,
        id_registro: clienteId, id_empleado, nombre_empleado
      });
    }

    // Emitir evento Socket.io para sincronización en tiempo real
    const io = req.app.get('io');
    if (io) {
      io.emit('cliente:actualizado', { id: clienteId, nombre: `${nombre} ${apellido}` });
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
    const clienteId = Number(req.params.id);
    
    // Proteger cliente anónimo (ID 1) de cualquier desactivación/activación
    if (clienteId === 1) {
      return res.status(403).json({ error: 'No se puede desactivar el cliente anónimo.' });
    }

    const [cliente] = await sequelize.query(
      'SELECT nombre, apellido, deleted FROM clientes WHERE id_cliente = :id',
      { replacements: { id: clienteId }, type: sequelize.QueryTypes.SELECT }
    );
    await sequelize.query(
      'UPDATE clientes SET deleted = NOT deleted WHERE id_cliente = :id',
      { replacements: { id: clienteId } }
    );
    const accion = cliente.deleted ? 'ACTIVAR' : 'DESACTIVAR';
    await registrarAuditoria({
      tabla: 'clientes', accion,
      descripcion: `Cliente ${accion.toLowerCase()}do: ${cliente.nombre} ${cliente.apellido}`,
      id_registro: clienteId, id_empleado, nombre_empleado
    });
    // Emitir evento Socket.io para sincronización en tiempo real
    const io = req.app.get('io');
    if (io) {
      io.emit('cliente:estado_cambiado', { id: clienteId, nombre: `${cliente.nombre} ${cliente.apellido}`, deleted: !cliente.deleted });
    }

    res.json({ message: 'Estado del cliente actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/papelera', async (req, res) => {
  res.status(405).json({ error: 'Los clientes no se eliminan. Usa la opcion Desactivar.' });
});

router.delete('/:id', async (req, res) => {
  res.status(405).json({ error: 'Los clientes no se eliminan. Usa la opcion Desactivar.' });
});

export default router;
