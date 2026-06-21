import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

// GET todos los registros eliminados (productos, clientes, proveedores, empleados)
router.get('/', async (req, res) => {
  try {
    const productos = await sequelize.query(
      `SELECT 'producto' as tipo, p.id_producto as id, p.nombre_producto as nombre,
        p.lote, p.precio, p.stock, p.fecha_vencimiento,
        CONCAT(pr.nombre, ' ', pr.apellido) AS detalle
      FROM productos p
      LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
      WHERE p.papelera = 1
      ORDER BY p.nombre_producto ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const clientes = await sequelize.query(
      `SELECT 'cliente' as tipo, c.id_cliente as id,
        CONCAT(c.nombre, ' ', c.apellido) as nombre,
        NULL as lote, NULL as precio, NULL as stock, NULL as fecha_vencimiento,
        c.correo AS detalle
      FROM clientes c
      WHERE c.papelera = 1
      ORDER BY c.nombre ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const proveedores = await sequelize.query(
      `SELECT 'proveedor' as tipo, p.id_proveedor as id,
        CONCAT(p.nombre, ' ', p.apellido) as nombre,
        NULL as lote, NULL as precio, NULL as stock, NULL as fecha_vencimiento,
        p.correo AS detalle
      FROM proveedores p
      WHERE p.papelera = 1
      ORDER BY p.nombre ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const empleados = await sequelize.query(
      `SELECT 'empleado' as tipo, e.id_empleado as id,
        CONCAT(e.nombre, ' ', e.apellido) as nombre,
        NULL as lote, NULL as precio, NULL as stock, NULL as fecha_vencimiento,
        e.cargo AS detalle
       FROM empleados e
       WHERE e.papelera = 1
       ORDER BY e.nombre ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    res.json([...productos, ...clientes, ...proveedores, ...empleados]);
  } catch (error) {
    console.error('❌ GET /eliminados:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT restaurar según tipo
router.put('/:tipo/:id/restaurar', async (req, res) => {
  const { tipo, id } = req.params;
  try {
    if (tipo === 'producto') {
      await sequelize.query('UPDATE productos SET papelera = 0 WHERE id_producto = :id', { replacements: { id } });
    } else if (tipo === 'cliente') {
      await sequelize.query('UPDATE clientes SET papelera = 0 WHERE id_cliente = :id', { replacements: { id } });
    } else if (tipo === 'proveedor') {
      await sequelize.query('UPDATE proveedores SET papelera = 0 WHERE id_proveedor = :id', { replacements: { id } });
    } else if (tipo === 'empleado') {
      await sequelize.query('UPDATE empleados SET activo = 1, papelera = 0, token_version = token_version + 1 WHERE id_empleado = :id', { replacements: { id } });
    }
    res.json({ message: 'Registro restaurado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE eliminar permanentemente según tipo
router.delete('/:tipo/:id', async (req, res) => {
  const { tipo, id } = req.params;
  const transaction = await sequelize.transaction();
  try {
    if (tipo === 'producto') {
      await sequelize.query('DELETE FROM productos_categorias WHERE id_producto = :id', { replacements: { id }, type: sequelize.QueryTypes.DELETE, transaction });
      await sequelize.query('DELETE FROM productos WHERE id_producto = :id AND deleted = 1', { replacements: { id }, type: sequelize.QueryTypes.DELETE, transaction });
    } else if (tipo === 'cliente') {
      const ventas = await sequelize.query('SELECT COUNT(*) as count FROM ventas WHERE id_cliente = :id', { replacements: { id }, type: sequelize.QueryTypes.SELECT, transaction });
      if (ventas[0].count > 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'No se puede eliminar el cliente porque tiene ventas registradas.' });
      }
      await sequelize.query('DELETE FROM clientes WHERE id_cliente = :id', { replacements: { id }, type: sequelize.QueryTypes.DELETE, transaction });
    } else if (tipo === 'proveedor') {
      const productos = await sequelize.query('SELECT COUNT(*) as count FROM productos WHERE id_proveedor = :id', { replacements: { id }, type: sequelize.QueryTypes.SELECT, transaction });
      if (productos[0].count > 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'No se puede eliminar el proveedor porque tiene productos registrados.' });
      }
      await sequelize.query('DELETE FROM proveedores WHERE id_proveedor = :id', { replacements: { id }, type: sequelize.QueryTypes.DELETE, transaction });
    } else if (tipo === 'empleado') {
      const ventas = await sequelize.query('SELECT COUNT(*) as count FROM ventas WHERE id_empleado = :id', { replacements: { id }, type: sequelize.QueryTypes.SELECT, transaction });
      if (ventas[0].count > 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'No se puede eliminar el empleado porque tiene ventas registradas.' });
      }
      await sequelize.query('DELETE FROM empleados WHERE id_empleado = :id AND papelera = 1', { replacements: { id }, type: sequelize.QueryTypes.DELETE, transaction });
    } else {
      await transaction.rollback();
      return res.status(400).json({ error: 'Tipo no válido' });
    }
    await transaction.commit();
    res.json({ message: 'Registro eliminado permanentemente' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ DELETE /eliminados:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
