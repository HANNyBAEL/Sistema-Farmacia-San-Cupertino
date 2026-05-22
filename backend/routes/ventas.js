import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { id_cliente, id_empleado, productos } = req.body;
  const transaction = await sequelize.transaction();
  try {
    // Crear venta
    const [ventaResult] = await sequelize.query(
      'INSERT INTO ventas (fecha, total, id_cliente, id_empleado) VALUES (CURDATE(), 0, ?, ?)',
      { replacements: [id_cliente, id_empleado], transaction }
    );
    const id_venta = ventaResult.insertId;
    let total = 0;

    for (const item of productos) {
      // Obtener precio y stock
      const [prod] = await sequelize.query(
        'SELECT precio, stock FROM productos WHERE id_producto = ?',
        { replacements: [item.id_producto], transaction }
      );
      if (!prod.length) throw new Error(`Producto ${item.id_producto} no existe`);
      const { precio, stock } = prod[0];
      if (stock < item.cantidad) throw new Error(`Stock insuficiente para producto ${item.id_producto}`);

      const subtotal = precio * item.cantidad;
      total += subtotal;

      await sequelize.query(
        'INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        { replacements: [id_venta, item.id_producto, item.cantidad, precio], transaction }
      );

      await sequelize.query(
        'UPDATE productos SET stock = stock - ? WHERE id_producto = ?',
        { replacements: [item.cantidad, item.id_producto], transaction }
      );
    }

    await sequelize.query('UPDATE ventas SET total = ? WHERE id_venta = ?', {
      replacements: [total, id_venta],
      transaction
    });

    await transaction.commit();
    res.status(201).json({ message: 'Venta registrada', id_venta, total });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

export default router;