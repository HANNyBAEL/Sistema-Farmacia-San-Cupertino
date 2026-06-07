import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

router.get('/kpis', async (req, res) => {
  try {
    // Obtener fecha de hoy en El Salvador como string
    const [[{ hoy }]] = await sequelize.query(
      `SELECT DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '-06:00'), '%Y-%m-%d') as hoy`
    );

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
      `SELECT COUNT(*) as ventasHoy FROM ventas WHERE fecha = :hoy`,
      { replacements: { hoy } }
    );

    const [[{ ingresosHoy }]] = await sequelize.query(
      `SELECT COALESCE(SUM(total), 0) as ingresosHoy FROM ventas WHERE fecha = :hoy`,
      { replacements: { hoy } }
    );

    const [[{ porVencer }]] = await sequelize.query(
      `SELECT COUNT(*) as porVencer 
       FROM productos 
       WHERE fecha_vencimiento BETWEEN :hoy AND DATE_ADD(:hoy, INTERVAL 30 DAY)`,
      { replacements: { hoy } }
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
    // Obtener fecha de hoy en El Salvador como string
    const [[{ hoy }]] = await sequelize.query(
      `SELECT DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '-06:00'), '%Y-%m-%d') as hoy`
    );

    const [rows] = await sequelize.query(`
      SELECT 
        fecha as dia,
        COALESCE(SUM(total), 0) as ventas
      FROM ventas
      WHERE fecha >= DATE_SUB(:hoy, INTERVAL 6 DAY)
      GROUP BY fecha
      ORDER BY fecha ASC
    `, { replacements: { hoy } });

    // Rellenar los 7 días usando la fecha de El Salvador
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const base = new Date(hoy + 'T00:00:00');
      base.setDate(base.getDate() - i);
      const fechaStr = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
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