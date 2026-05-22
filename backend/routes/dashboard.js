import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

router.get('/kpis', async (req, res) => {
  try {
    // 1. Total de productos
    const [[{ totalProductos }]] = await sequelize.query(
      'SELECT COUNT(*) as totalProductos FROM productos'
    );

    // 2. Productos con stock bajo (<=10) y agotados (0)
    const [[{ stockBajo }]] = await sequelize.query(
      'SELECT COUNT(*) as stockBajo FROM productos WHERE stock <= 10 AND stock > 0'
    );
    const [[{ agotados }]] = await sequelize.query(
      'SELECT COUNT(*) as agotados FROM productos WHERE stock = 0'
    );

    // 3. Ventas de hoy
    const [[{ ventasHoy }]] = await sequelize.query(
      'SELECT COUNT(*) as ventasHoy FROM ventas WHERE fecha = CURDATE()'
    );

    // 4. Ingresos de hoy
    const [[{ ingresosHoy }]] = await sequelize.query(
      'SELECT COALESCE(SUM(total), 0) as ingresosHoy FROM ventas WHERE fecha = CURDATE()'
    );

    // 5. Alertas de vencimiento (productos que vencen en los próximos 30 días)
    const [[{ porVencer }]] = await sequelize.query(
      `SELECT COUNT(*) as porVencer 
       FROM productos 
       WHERE fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
    );

    // 6. Clientes registrados
    const [[{ totalClientes }]] = await sequelize.query(
      'SELECT COUNT(*) as totalClientes FROM clientes'
    );

    // 7. Empleados activos (por si quieres mostrarlo)
    const [[{ empleadosActivos }]] = await sequelize.query(
      'SELECT COUNT(*) as empleadosActivos FROM empleados'
    );

    res.json({
      totalProductos,
      stockBajo,
      agotados,
      ventasHoy,
      ingresosHoy: parseFloat(ingresosHoy),
      porVencer,
      totalClientes,
      empleadosActivos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener KPIs' });
  }
});

export default router;