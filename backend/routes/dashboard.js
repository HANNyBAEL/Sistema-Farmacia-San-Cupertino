import express from 'express';
import sequelize from '../config/database.js';
import { getHoyLocal } from '../utils/fechaLocal.js';

const router = express.Router();

router.get('/kpis', async (req, res) => {
  try {
    const hoyLocal = getHoyLocal();

    const [[{ totalProductos }]] = await sequelize.query(`SELECT COUNT(*) as totalProductos FROM productos WHERE papelera = 0 AND deleted = 0`);
    const [[{ agotados }]] = await sequelize.query(`SELECT COUNT(*) as agotados FROM productos WHERE papelera = 0 AND deleted = 0 AND stock = 0 AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURDATE())`);
    const [[{ stockCritico }]] = await sequelize.query(`SELECT COUNT(*) as stockCritico FROM productos WHERE papelera = 0 AND deleted = 0 AND stock > 0 AND stock <= 10 AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURDATE())`);
    const [[{ stockBajo }]] = await sequelize.query(`SELECT COUNT(*) as stockBajo FROM productos WHERE papelera = 0 AND deleted = 0 AND stock > 10 AND stock <= 20 AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURDATE())`);
    const [[{ proveedoresActivos }]] = await sequelize.query(`SELECT COUNT(*) as proveedoresActivos FROM proveedores WHERE papelera = 0`);
    const [[{ empleadosActivos }]] = await sequelize.query(`SELECT COUNT(*) as empleadosActivos FROM empleados WHERE papelera = 0`);

    // Ventas e ingresos del día local
    const [[{ ventasHoy }]] = await sequelize.query(
      `SELECT COUNT(*) as ventasHoy FROM ventas WHERE DATE(fecha) = :hoyLocal`,
      { replacements: { hoyLocal } }
    );
    const [[{ ingresosHoy }]] = await sequelize.query(
      `SELECT COALESCE(SUM(total), 0) as ingresosHoy FROM ventas WHERE DATE(fecha) = :hoyLocal`,
      { replacements: { hoyLocal } }
    );

    // Productos por vencer en los próximos 30 días (desde hoy local)
    const [[{ porVencer }]] = await sequelize.query(
      `SELECT COUNT(*) as porVencer FROM productos
       WHERE papelera = 0 AND deleted = 0 AND fecha_vencimiento BETWEEN :hoy AND DATE_ADD(:hoy, INTERVAL 30 DAY)`,
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
    console.error('❌ Error en /api/dashboard/kpis:', error);
    res.status(500).json({ error: 'Error al obtener KPIs' });
  }
});

router.get('/ventas-ultimos-7-dias', async (req, res) => {
  try {
    const hoyLocal = getHoyLocal();

    // Obtener ventas agrupadas por fecha en los últimos 7 días (usando fecha local)
    const rows = await sequelize.query(
      `SELECT 
         DATE_FORMAT(DATE(fecha), '%Y-%m-%d') AS dia,
         COALESCE(SUM(total), 0) AS ventas
       FROM ventas
       WHERE DATE(fecha) >= DATE_SUB(:hoyLocal, INTERVAL 6 DAY)
       GROUP BY DATE_FORMAT(DATE(fecha), '%Y-%m-%d')
       ORDER BY dia ASC`,
      { replacements: { hoyLocal }, type: sequelize.QueryTypes.SELECT }
    );

    // Generar los últimos 7 días en formato YYYY-MM-DD usando la fecha local
    const [y, m, d] = hoyLocal.split('-').map(Number);
    const hoyDate = new Date(y, m - 1, d); // fecha local (sin UTC)
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoyDate);
      d.setDate(hoyDate.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const fechaStr = `${year}-${month}-${day}`;

      // Buscar si hay ventas para esa fecha
      const found = rows.find(r => String(r.dia).slice(0, 10) === fechaStr);

      result.push({
        dia: fechaStr,
        ventas: found ? parseFloat(found.ventas) : 0
      });
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error en /api/dashboard/ventas-ultimos-7-dias:', error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

export default router;
