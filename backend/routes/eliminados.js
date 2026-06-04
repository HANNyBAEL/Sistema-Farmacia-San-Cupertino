import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

/**
 * GET /api/eliminados
 * Devuelve los productos marcados como deleted=1
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT p.*, CONCAT(pr.nombre, ' ', pr.apellido) AS proveedor_nombre
       FROM productos p
       LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
       WHERE p.deleted = 1
       ORDER BY p.id_producto DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/eliminados/:id/restaurar
 * Restaura un producto (deleted=0)
 */
router.put('/:id/restaurar', async (req, res) => {
  try {
    await sequelize.query(
      `UPDATE productos SET deleted = 0 WHERE id_producto = ?`,
      { replacements: [req.params.id] }
    );
    res.json({ message: 'Producto restaurado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/eliminados/:id
 * Elimina permanentemente un producto (solo si ya está en deleted=1)
 */
router.delete('/:id', async (req, res) => {
  const connection = await sequelize.connectionManager.getConnection();
  try {
    await connection.beginTransaction();
    // Verificar que esté en deleted=1
    const [[prod]] = await connection.query(
      `SELECT id_producto FROM productos WHERE id_producto = ? AND deleted = 1`,
      [req.params.id]
    );
    if (!prod) {
      await connection.rollback();
      return res.status(404).json({ error: 'Producto no encontrado en eliminados.' });
    }
    await connection.query(`DELETE FROM productos_categorias WHERE id_producto = ?`, [req.params.id]);
    await connection.query(`DELETE FROM productos WHERE id_producto = ?`, [req.params.id]);
    await connection.commit();
    res.json({ message: 'Producto eliminado permanentemente' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;