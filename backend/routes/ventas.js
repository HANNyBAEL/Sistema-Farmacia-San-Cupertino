import express from 'express';
import sequelize from '../config/database.js';
import { getFechaHoraLocal } from '../utils/fechaLocal.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { id_cliente, id_empleado, productos } = req.body;
  const transaction = await sequelize.transaction();

  try {
    if (!id_empleado) throw new Error('Falta el id_empleado');
    if (!productos || productos.length === 0) throw new Error('No hay productos en la venta');

    const clienteId = id_cliente ? Number(id_cliente) : null;
    const empleadoId = Number(id_empleado);

    const fechaVenta = getFechaHoraLocal();

    // 1. Insertar cabecera de la venta
    const [ventaResult] = await sequelize.query(
      `INSERT INTO ventas (fecha, total, id_cliente, id_empleado)
       VALUES (:fecha, 0, :clienteId, :empleadoId)`,
      {
        replacements: { fecha: fechaVenta, clienteId, empleadoId },
        type: sequelize.QueryTypes.INSERT,
        transaction
      }
    );
    const id_venta = ventaResult.insertId ?? ventaResult;
    let total = 0;

    // 2. Procesar cada producto
    for (const item of productos) {
      if (!item.id_producto || !item.cantidad) {
        throw new Error(`Producto inválido: ${JSON.stringify(item)}`);
      }

      const prod = await sequelize.query(
        `SELECT precio, stock FROM productos WHERE id_producto = :id`,
        {
          replacements: { id: Number(item.id_producto) },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (!prod.length) throw new Error(`Producto ${item.id_producto} no existe`);

      const { precio, stock } = prod[0];

      if (stock < item.cantidad) {
        throw new Error(`Stock insuficiente para producto ${item.id_producto}. Disponible: ${stock}`);
      }

      const subtotal = precio * item.cantidad;
      total += subtotal;

      // Insertar detalle
      await sequelize.query(
        `INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario)
         VALUES (:id_venta, :id_producto, :cantidad, :precio)`,
        {
          replacements: {
            id_venta,
            id_producto: Number(item.id_producto),
            cantidad: item.cantidad,
            precio
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );

      // Actualizar stock
      await sequelize.query(
        `UPDATE productos SET stock = stock - :cantidad WHERE id_producto = :id`,
        {
          replacements: { cantidad: item.cantidad, id: Number(item.id_producto) },
          type: sequelize.QueryTypes.UPDATE,
          transaction
        }
      );
    }

    // 3. Actualizar total de la venta
    await sequelize.query(
      `UPDATE ventas SET total = :total WHERE id_venta = :id_venta`,
      {
        replacements: { total, id_venta },
        type: sequelize.QueryTypes.UPDATE,
        transaction
      }
    );

    await transaction.commit();
    res.status(201).json({ message: 'Venta registrada', id_venta, total, fecha: fechaVenta });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en POST /ventas:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
