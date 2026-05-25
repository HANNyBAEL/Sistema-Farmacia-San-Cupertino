import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

// Obtener todos los productos (excluyendo eliminados lógicamente)
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM productos WHERE deleted = 0 ORDER BY id_producto DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un producto por ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM productos WHERE id_producto = ? AND deleted = 0',
      { replacements: [req.params.id] }
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo producto
router.post('/', async (req, res) => {
  const { nombre_producto, descripcion, precio, stock, lote, fecha_vencimiento, id_proveedor, categorias, controlled } = req.body;
  const connection = await sequelize.connectionManager.getConnection();
  try {
    await connection.beginTransaction();
    // Insertar producto
    const [result] = await connection.query(
      `INSERT INTO productos (nombre_producto, descripcion, precio, stock, lote, fecha_vencimiento, id_proveedor)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre_producto, descripcion || null, precio, stock, lote, fecha_vencimiento, id_proveedor]
    );
    const id_producto = result.insertId;
    // Insertar categorías (si se envían)
    if (categorias && categorias.length) {
      for (const catId of categorias) {
        await connection.query(
          'INSERT INTO productos_categorias (id_producto, id_categoria) VALUES (?, ?)',
          [id_producto, catId]
        );
      }
    }
    await connection.commit();
    res.status(201).json({ id_producto, message: 'Producto creado' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Actualizar producto
router.put('/:id', async (req, res) => {
  const { nombre_producto, descripcion, precio, stock, lote, fecha_vencimiento, id_proveedor, categorias, controlled } = req.body;
  const connection = await sequelize.connectionManager.getConnection();
  try {
    await connection.beginTransaction();
    // Actualizar datos básicos
    await connection.query(
      `UPDATE productos SET 
        nombre_producto = ?, descripcion = ?, precio = ?, stock = ?, 
        lote = ?, fecha_vencimiento = ?, id_proveedor = ?
       WHERE id_producto = ?`,
      [nombre_producto, descripcion, precio, stock, lote, fecha_vencimiento, id_proveedor, req.params.id]
    );
    // Actualizar categorías: borrar existentes y agregar nuevas
    if (categorias) {
      await connection.query('DELETE FROM productos_categorias WHERE id_producto = ?', [req.params.id]);
      for (const catId of categorias) {
        await connection.query(
          'INSERT INTO productos_categorias (id_producto, id_categoria) VALUES (?, ?)',
          [req.params.id, catId]
        );
      }
    }
    await connection.commit();
    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Eliminar producto (físicamente solo si no tiene ventas, si no, lógico)
router.delete('/:id', async (req, res) => {
  const connection = await sequelize.connectionManager.getConnection();
  try {
    // Verificar si tiene ventas asociadas
    const [[{ count }]] = await connection.query(
      'SELECT COUNT(*) as count FROM detalle_ventas WHERE id_producto = ?',
      [req.params.id]
    );
    if (count > 0) {
      // Si tiene ventas, solo marcamos como eliminado lógicamente (agregar columna deleted)
      await connection.query('UPDATE productos SET deleted = 1 WHERE id_producto = ?', [req.params.id]);
    } else {
      // Si no tiene ventas, eliminar físicamente
      await connection.query('DELETE FROM productos_categorias WHERE id_producto = ?', [req.params.id]);
      await connection.query('DELETE FROM productos WHERE id_producto = ?', [req.params.id]);
    }
    await connection.commit();
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;