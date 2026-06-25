import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

// GET todos los registros desactivados.
router.get('/', async (req, res) => {
  try {
    const productos = await sequelize.query(
      `SELECT 'producto' as tipo, p.id_producto as id, p.nombre_producto as nombre,
        p.lote, p.precio, p.stock, p.fecha_vencimiento,
        CONCAT(pr.nombre, ' ', pr.apellido) AS detalle,
        (SELECT a.nombre_empleado FROM auditoria a 
         WHERE a.tabla = 'productos' AND a.accion = 'DESACTIVAR' AND a.id_registro = p.id_producto 
         ORDER BY a.fecha DESC LIMIT 1) AS empleado_desactivo
      FROM productos p
      LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
      WHERE p.deleted = 1
      ORDER BY p.nombre_producto ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const clientes = await sequelize.query(
      `SELECT 'cliente' as tipo, c.id_cliente as id,
        CONCAT(c.nombre, ' ', c.apellido) as nombre,
        NULL as lote, NULL as precio, NULL as stock, NULL as fecha_vencimiento,
        c.correo AS detalle,
        (SELECT a.nombre_empleado FROM auditoria a 
         WHERE a.tabla = 'clientes' AND a.accion = 'DESACTIVAR' AND a.id_registro = c.id_cliente 
         ORDER BY a.fecha DESC LIMIT 1) AS empleado_desactivo
      FROM clientes c
      WHERE c.deleted = 1
      ORDER BY c.nombre ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const proveedores = await sequelize.query(
      `SELECT 'proveedor' as tipo, p.id_proveedor as id,
        CONCAT(p.nombre, ' ', p.apellido) as nombre,
        NULL as lote, NULL as precio, NULL as stock, NULL as fecha_vencimiento,
        p.correo AS detalle,
        (SELECT a.nombre_empleado FROM auditoria a 
         WHERE a.tabla = 'proveedores' AND a.accion = 'DESACTIVAR' AND a.id_registro = p.id_proveedor 
         ORDER BY a.fecha DESC LIMIT 1) AS empleado_desactivo
      FROM proveedores p
      WHERE p.deleted = 1
      ORDER BY p.nombre ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const empleados = await sequelize.query(
      `SELECT 'empleado' as tipo, e.id_empleado as id,
        CONCAT(e.nombre, ' ', e.apellido) as nombre,
        NULL as lote, NULL as precio, NULL as stock, NULL as fecha_vencimiento,
        e.cargo AS detalle,
        (SELECT a.nombre_empleado FROM auditoria a 
         WHERE a.tabla = 'empleados' AND a.accion = 'DESACTIVAR' AND a.id_registro = e.id_empleado 
         ORDER BY a.fecha DESC LIMIT 1) AS empleado_desactivo
       FROM empleados e
       WHERE e.activo = 0
       ORDER BY e.nombre ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    res.json([...productos, ...clientes, ...proveedores, ...empleados]);
  } catch (error) {
    console.error('Error en GET /desactivados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restaurar segun tipo y reactivar el registro.
router.put('/:tipo/:id/restaurar', async (req, res) => {
  const { tipo, id } = req.params;
  try {
    if (tipo === 'producto') {
      await sequelize.query('UPDATE productos SET deleted = 0, papelera = 0 WHERE id_producto = :id', { replacements: { id } });
    } else if (tipo === 'cliente') {
      await sequelize.query('UPDATE clientes SET deleted = 0, papelera = 0 WHERE id_cliente = :id', { replacements: { id } });
    } else if (tipo === 'proveedor') {
      await sequelize.query('UPDATE proveedores SET deleted = 0, papelera = 0 WHERE id_proveedor = :id', { replacements: { id } });
    } else if (tipo === 'empleado') {
      await sequelize.query('UPDATE empleados SET activo = 1, papelera = 0, token_version = token_version + 1 WHERE id_empleado = :id', { replacements: { id } });
    } else {
      return res.status(400).json({ error: 'Tipo no valido' });
    }

    res.json({ message: 'Registro activado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// La eliminacion fisica queda deshabilitada por politica de trazabilidad.
router.delete('/:tipo/:id', async (req, res) => {
  res.status(405).json({
    error: 'La eliminacion permanente esta deshabilitada. Los registros se conservan como desactivados.'
  });
});

export default router;
