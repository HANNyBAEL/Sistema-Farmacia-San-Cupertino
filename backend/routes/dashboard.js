import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

router.get('/kpis', async (req, res) => {
  try {
    // Obtener fecha local actual del servidor MySQL (asumiendo que está configurado en UTC-6 o que CURDATE() da la fecha correcta)
    const [[{ hoyLocal }]] = await sequelize.query(`SELECT CURDATE() as hoyLocal`);

    const [[{ totalProductos }]] = await sequelize.query(`SELECT COUNT(*) as totalProductos FROM productos`);
    const [[{ stockBajo }]] = await sequelize.query(`SELECT COUNT(*) as stockBajo FROM productos WHERE stock BETWEEN 1 AND 20`);
    const [[{ agotados }]] = await sequelize.query(`SELECT COUNT(*) as agotados FROM productos WHERE stock = 0`);
    const [[{ stockCritico }]] = await sequelize.query(`SELECT COUNT(*) as stockCritico FROM productos WHERE stock BETWEEN 1 AND 10`);
    const [[{ proveedoresActivos }]] = await sequelize.query(`SELECT COUNT(*) as proveedoresActivos FROM proveedores`);
    const [[{ empleadosActivos }]] = await sequelize.query(`SELECT COUNT(*) as empleadosActivos FROM empleados`);

    // Comparar directamente con la columna fecha (tipo DATE)
    const [[{ ventasHoy }]] = await sequelize.query(
      `SELECT COUNT(*) as ventasHoy FROM ventas WHERE fecha = :hoyLocal`,
      { replacements: { hoyLocal } }
    );
    const [[{ ingresosHoy }]] = await sequelize.query(
      `SELECT COALESCE(SUM(total), 0) as ingresosHoy FROM ventas WHERE fecha = :hoyLocal`,
      { replacements: { hoyLocal } }
    );

    const [[{ porVencer }]] = await sequelize.query(
      `SELECT COUNT(*) as porVencer FROM productos WHERE fecha_vencimiento BETWEEN :hoy AND DATE_ADD(:hoy, INTERVAL 30 DAY)`,
      { replacements: { hoy: hoyLocal } }
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
    const [[{ hoyLocal }]] = await sequelize.query(`SELECT CURDATE() as hoyLocal`);

    const rows = await sequelize.query(
      `SELECT 
         fecha as dia,
         COALESCE(SUM(total), 0) as ventas
       FROM ventas
       WHERE fecha >= DATE_SUB(:hoyLocal, INTERVAL 6 DAY)
       GROUP BY fecha
       ORDER BY fecha ASC`,
      { replacements: { hoyLocal }, type: sequelize.QueryTypes.SELECT }
    );

    // Generar los últimos 7 días (en formato YYYY-MM-DD)
    const result = [];
    const hoyDate = new Date(hoyLocal + 'T00:00:00');
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoyDate);
      d.setDate(hoyDate.getDate() - i);
      const fechaStr = d.toISOString().slice(0, 10);
      const found = rows.find(r => {
        const diaStr = r.dia instanceof Date ? r.dia.toISOString().slice(0,10) : String(r.dia).slice(0,10);
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