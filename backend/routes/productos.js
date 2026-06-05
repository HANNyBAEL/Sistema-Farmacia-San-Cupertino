import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

// GET todos los productos (solo activos)
// GET todos los productos (solo activos) con indicador de si tienen ventas
router.get('/', async (req, res) => {
  try {
    const productos = await sequelize.query(
      `SELECT p.*,
        EXISTS(SELECT 1 FROM detalle_ventas dv WHERE dv.id_producto = p.id_producto) AS has_ventas
       FROM productos p
       WHERE p.deleted = 0
       ORDER BY p.id_producto DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(productos);
  } catch (error) {
    console.error('❌ GET /productos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET un producto
router.get('/:id', async (req, res) => {
  try {
    const productos = await sequelize.query(
      'SELECT * FROM productos WHERE id_producto = :id AND deleted = 0',
      {
        replacements: { id: Number(req.params.id) },
        type: sequelize.QueryTypes.SELECT
      }
    );
    if (!productos.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(productos[0]);
  } catch (error) {
    console.error('❌ GET /productos/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST crear producto
router.post('/', async (req, res) => {
  const { nombre_producto, descripcion, precio, stock, lote, fecha_vencimiento, id_proveedor, categorias } = req.body;
  const transaction = await sequelize.transaction();
  try {
    const [result] = await sequelize.query(
      `INSERT INTO productos (nombre_producto, descripcion, precio, stock, lote, fecha_vencimiento, id_proveedor, deleted)
       VALUES (:nombre_producto, :descripcion, :precio, :stock, :lote, :fecha_vencimiento, :id_proveedor, 0)`,
      {
        replacements: {
          nombre_producto,
          descripcion: descripcion || null,
          precio: Number(precio),
          stock: Number(stock),
          lote,
          fecha_vencimiento,
          id_proveedor: Number(id_proveedor)
        },
        type: sequelize.QueryTypes.INSERT,
        transaction
      }
    );
    const id_producto = result;

    if (categorias && categorias.length) {
      for (const catId of categorias) {
        await sequelize.query(
          'INSERT INTO productos_categorias (id_producto, id_categoria) VALUES (:id_producto, :id_categoria)',
          {
            replacements: { id_producto, id_categoria: catId },
            type: sequelize.QueryTypes.INSERT,
            transaction
          }
        );
      }
    }

    await transaction.commit();
    console.log('✅ Producto creado:', id_producto);
    res.status(201).json({ id_producto, message: 'Producto creado' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ POST /productos:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT actualizar producto
router.put('/:id', async (req, res) => {
  const { nombre_producto, descripcion, precio, stock, lote, fecha_vencimiento, id_proveedor, categorias } = req.body;
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query(
      `UPDATE productos
       SET nombre_producto = :nombre_producto,
           descripcion = :descripcion,
           precio = :precio,
           stock = :stock,
           lote = :lote,
           fecha_vencimiento = :fecha_vencimiento,
           id_proveedor = :id_proveedor
       WHERE id_producto = :id`,
      {
        replacements: {
          nombre_producto,
          descripcion: descripcion || null,
          precio: Number(precio),
          stock: Number(stock),
          lote,
          fecha_vencimiento,
          id_proveedor: Number(id_proveedor),
          id: Number(req.params.id)
        },
        type: sequelize.QueryTypes.UPDATE,
        transaction
      }
    );

    if (categorias) {
      await sequelize.query(
        'DELETE FROM productos_categorias WHERE id_producto = :id',
        {
          replacements: { id: Number(req.params.id) },
          type: sequelize.QueryTypes.DELETE,
          transaction
        }
      );
      for (const catId of categorias) {
        await sequelize.query(
          'INSERT INTO productos_categorias (id_producto, id_categoria) VALUES (:id_producto, :id_categoria)',
          {
            replacements: { id_producto: Number(req.params.id), id_categoria: catId },
            type: sequelize.QueryTypes.INSERT,
            transaction
          }
        );
      }
    }

    await transaction.commit();
    console.log('✅ Producto actualizado:', req.params.id);
    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ PUT /productos/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE producto: solo permite desactivar si NO tiene ventas asociadas
router.delete('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // Verificar si el producto tiene ventas registradas
    const ventas = await sequelize.query(
      'SELECT COUNT(*) as count FROM detalle_ventas WHERE id_producto = :id',
      {
        replacements: { id: Number(req.params.id) },
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    const tieneVentas = ventas[0].count > 0;

    if (tieneVentas) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'No se puede eliminar el producto porque tiene ventas registradas.' 
      });
    }

    // Si no tiene ventas, proceder con eliminación lógica (desactivar)
    await sequelize.query(
      'UPDATE productos SET deleted = 1 WHERE id_producto = :id',
      {
        replacements: { id: Number(req.params.id) },
        type: sequelize.QueryTypes.UPDATE,
        transaction
      }
    );

    await transaction.commit();
    console.log('✅ Producto desactivado (soft delete):', req.params.id);
    res.json({ message: 'Producto desactivado correctamente' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ DELETE /productos/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;