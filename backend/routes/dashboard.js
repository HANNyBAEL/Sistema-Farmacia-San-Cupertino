import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

router.get('/kpis', async (req, res) => {
  try {
    const [[{ totalProductos }]] = await sequelize.query(
      'SELECT COUNT(*) as totalProductos FROM productos'
    );

    const [[{ stockBajo }]] = await sequelize.query(
      'SELECT COUNT(*) as stockBajo FROM productos WHERE stock BETWEEN 1 AND 20'
    );

    const [[{ agotados }]] = await sequelize.query(
      'SELECT COUNT(*) as agotados FROM productos WHERE stock = 0'
    );

    const [[{ ventasHoy }]] = await sequelize.query(
      `SELECT COUNT(*) as ventasHoy 
       FROM ventas 
       WHERE fecha = CURDATE()`
    );

    const [[{ ingresosHoy }]] = await sequelize.query(
      `SELECT COALESCE(SUM(total), 0) as ingresosHoy 
       FROM ventas 
       WHERE fecha = CURDATE()`
    );

    const [[{ porVencer }]] = await sequelize.query(
      `SELECT COUNT(*) as porVencer 
       FROM productos 
       WHERE fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
    );

    const [[{ proveedoresActivos }]] = await sequelize.query(
      'SELECT COUNT(*) as proveedoresActivos FROM proveedores'
    );

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
      proveedoresActivos,
      empleadosActivos,
    });
  } catch (error) {
    console.error('Error en /api/dashboard/kpis:', error);
    res.status(500).json({ error: 'Error al obtener KPIs' });
  }
});

router.get('/ventas-ultimos-7-dias', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT 
        fecha as dia,
        COALESCE(SUM(total), 0) as ventas
      FROM ventas
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY fecha
      ORDER BY fecha ASC
    `);

    // Rellenar los 7 días aunque no haya ventas ese día
// Rellenar los 7 días usando fecha de El Salvador (UTC-6)
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - 6 * 60 * 60 * 1000); // ajustar a UTC-6
      d.setUTCDate(d.getUTCDate() - i);
      const fechaStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const found = rows.find(r => {
        const diaStr = r.dia instanceof Date
          ? r.dia.toISOString().slice(0, 10)
          : String(r.dia).slice(0, 10);
        return diaStr === fechaStr;
      });
      result.push({
        dia: fechaStr,
        ventas: found ? parseFloat(found.ventas) : 0
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error en /api/dashboard/ventas-ultimos-7-dias:', error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

export default router;