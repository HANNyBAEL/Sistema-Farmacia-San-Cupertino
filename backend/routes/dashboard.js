import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

router.get('/kpis', async (req, res) => {
  try {
    // Total de productos
    const [[{ totalProductos }]] = await sequelize.query(
      'SELECT COUNT(*) as totalProductos FROM productos'
    );

    // Stock bajo (1 a 20 unidades) – para la tarjeta "Stock Bajo (≤20)"
    const [[{ stockBajo }]] = await sequelize.query(
      'SELECT COUNT(*) as stockBajo FROM productos WHERE stock BETWEEN 1 AND 20'
    );

    // Productos agotados (stock = 0)
    const [[{ agotados }]] = await sequelize.query(
      'SELECT COUNT(*) as agotados FROM productos WHERE stock = 0'
    );

    // Ventas de hoy (cantidad de transacciones)
    const [[{ ventasHoy }]] = await sequelize.query(
      'SELECT COUNT(*) as ventasHoy FROM ventas WHERE fecha = CURDATE()'
    );

    // Ingresos de hoy (suma de totales)
    const [[{ ingresosHoy }]] = await sequelize.query(
      'SELECT COALESCE(SUM(total), 0) as ingresosHoy FROM ventas WHERE fecha = CURDATE()'
    );

    // Productos que vencen en los próximos 30 días
    const [[{ porVencer }]] = await sequelize.query(
      `SELECT COUNT(*) as porVencer 
       FROM productos 
       WHERE fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
    );

    // Proveedores activos (sin eliminados lógicos, si existe columna 'deleted' ajústala)
    const [[{ proveedoresActivos }]] = await sequelize.query(
      'SELECT COUNT(*) as proveedoresActivos FROM proveedores'
    );

    // Empleados activos
    const [[{ empleadosActivos }]] = await sequelize.query(
      'SELECT COUNT(*) as empleadosActivos FROM empleados'
    );

    const [[{ stockCritico }]] = await sequelize.query(
      'SELECT COUNT(*) as stockCritico FROM productos WHERE stock BETWEEN 1 AND 10'
    );

    res.json({
      totalProductos,
      stockBajo,
      agotados,
      stockCritico,
      ventasHoy,
      ingresosHoy: parseFloat(ingresosHoy),
      porVencer,
      proveedoresActivos,   // ← ahora coincide con el frontend
      empleadosActivos,
    });
  } catch (error) {
    console.error('Error en /api/dashboard/kpis:', error);
    res.status(500).json({ error: 'Error al obtener KPIs' });
  }
});
// Nuevo endpoint para ventas por día
router.get('/ventas-ultimos-7-dias', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT 
        DATE(fecha) as dia, 
        COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(fecha)
      ORDER BY dia ASC
    `);
    // Rellenar días sin ventas con 0
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Hoy'];
    const resultados = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - (6 - i));
      const fechaStr = fecha.toISOString().split('T')[0];
      const venta = rows.find(r => r.dia === fechaStr);
      resultados.push({
        day: diasSemana[i],
        ventas: venta ? parseFloat(venta.total) : 0
      });
    }
    res.json(resultados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});
export default router;