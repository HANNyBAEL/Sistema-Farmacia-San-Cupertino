import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

/**
 * GET /api/historial
 * Filtros: from, to, cliente (nombre), empleado (nombre), total_min, total_max, limit, offset
 */
router.get('/', async (req, res) => {
  const { from, to, cliente, empleado, total_min, total_max, limit = 20, offset = 0 } = req.query;

  let where = 'WHERE 1=1';
  const replacements = [];

  if (from)      { where += ' AND v.fecha >= ?'; replacements.push(`${from} 00:00:00`); }
  if (to)        { where += ' AND v.fecha <= ?'; replacements.push(`${to} 23:59:59`); }
  if (cliente)   { where += ' AND CONCAT(c.nombre, " ", c.apellido) LIKE ?'; replacements.push(`%${cliente}%`); }
  if (empleado)  { where += ' AND CONCAT(e.nombre, " ", e.apellido) LIKE ?'; replacements.push(`%${empleado}%`); }
  if (total_min) { where += ' AND v.total >= ?'; replacements.push(parseFloat(total_min)); }
  if (total_max) { where += ' AND v.total <= ?'; replacements.push(parseFloat(total_max)); }

  try {
    const countReplacements = [...replacements];
    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(*) as total
       FROM ventas v
       LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
       LEFT JOIN empleados e ON e.id_empleado = v.id_empleado
       ${where}`,
      { replacements: countReplacements }
    );

    replacements.push(parseInt(limit), parseInt(offset));

    const [rows] = await sequelize.query(
      `SELECT
         v.id_venta,
         DATE_FORMAT(v.fecha, '%Y-%m-%d') AS fecha,
         DATE_FORMAT(v.fecha, '%H:%i:%s') AS hora,
         v.total,
         v.id_cliente,
         CONCAT(c.nombre, ' ', c.apellido) AS cliente,
         v.id_empleado,
         CONCAT(e.nombre, ' ', e.apellido) AS empleado
       FROM ventas v
       LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
       LEFT JOIN empleados e ON e.id_empleado = v.id_empleado
       ${where}
       ORDER BY v.fecha DESC, v.id_venta DESC
       LIMIT ? OFFSET ?`,
      { replacements }
    );

    res.json({ ventas: rows, total: parseInt(total) });
  } catch (error) {
    console.error('Error en /api/historial:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/historial/venta/:id
 * Detalle completo de una venta
 */
router.get('/venta/:id', async (req, res) => {
  try {
    const [detalle] = await sequelize.query(
      `SELECT
         dv.id_detalle_venta,
         dv.id_producto,
         dv.cantidad,
         dv.precio_unitario,
         dv.subtotal,
         p.nombre_producto,
         p.lote,
         p.codigo_barras
       FROM detalle_ventas dv
       JOIN productos p ON p.id_producto = dv.id_producto
       WHERE dv.id_venta = ?`,
      { replacements: [req.params.id] }
    );

    const [[venta]] = await sequelize.query(
      `SELECT
         v.id_venta,
         DATE_FORMAT(v.fecha, '%Y-%m-%d') AS fecha,
         DATE_FORMAT(v.fecha, '%H:%i:%s') AS hora,
         v.total,
         CONCAT(c.nombre, ' ', c.apellido) AS cliente,
         c.dui,
         c.telefono   AS cliente_telefono,
         c.correo     AS cliente_correo,
         c.direccion  AS cliente_direccion,
         CONCAT(e.nombre, ' ', e.apellido) AS empleado,
         f.numero_control,
         f.codigo_generacion,
         f.sello_recepcion,
         f.ambiente_destino
       FROM ventas v
       LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
       LEFT JOIN empleados e ON e.id_empleado = v.id_empleado
       LEFT JOIN facturas f ON f.id_venta = v.id_venta
       WHERE v.id_venta = ?`,
      { replacements: [req.params.id] }
    );

    res.json({ venta, detalle });
  } catch (error) {
    console.error('Error en /api/historial/venta/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
