import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

/**
 * GET /api/historial
 * Devuelve el historial de ventas con sus detalles y filtros opcionales.
 * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD&id_empleado=X&limit=50&offset=0
 */
router.get('/', async (req, res) => {
  const { from, to, id_empleado, limit = 50, offset = 0 } = req.query;

  let where = 'WHERE 1=1';
  const replacements = [];

  if (from) { where += ' AND v.fecha >= ?'; replacements.push(from); }
  if (to)   { where += ' AND v.fecha <= ?'; replacements.push(to); }
  if (id_empleado) { where += ' AND v.id_empleado = ?'; replacements.push(id_empleado); }

  replacements.push(parseInt(limit), parseInt(offset));

  try {
    const [rows] = await sequelize.query(
      `SELECT 
         v.id_venta,
         v.fecha,
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

    // Total count para paginación
    const countReplacements = replacements.slice(0, -2);
    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(*) as total FROM ventas v ${where.replace('WHERE 1=1', 'WHERE 1=1')}`,
      { replacements: countReplacements }
    );

    res.json({ ventas: rows, total: parseInt(total) });
  } catch (error) {
    console.error('Error en /api/historial:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/historial/venta/:id
 * Detalle completo de una venta (líneas de detalle)
 */
router.get('/venta/:id', async (req, res) => {
  try {
    const [detalle] = await sequelize.query(
      `SELECT 
         dv.id_detalle,
         dv.cantidad,
         dv.precio_unitario,
         dv.cantidad * dv.precio_unitario AS subtotal,
         p.nombre_producto,
         p.lote
       FROM detalle_ventas dv
       JOIN productos p ON p.id_producto = dv.id_producto
       WHERE dv.id_venta = ?`,
      { replacements: [req.params.id] }
    );
    const [[venta]] = await sequelize.query(
      `SELECT v.*, CONCAT(c.nombre,' ',c.apellido) AS cliente, CONCAT(e.nombre,' ',e.apellido) AS empleado
       FROM ventas v
       LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
       LEFT JOIN empleados e ON e.id_empleado = v.id_empleado
       WHERE v.id_venta = ?`,
      { replacements: [req.params.id] }
    );
    res.json({ venta, detalle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;