import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

// Obtener siguiente número correlativo
router.get('/siguiente-correlativo', async (req, res) => {
  try {
    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(*) as total FROM facturas`
    );
    const numero = String(parseInt(total) + 1).padStart(8, '0');
    res.json({ numero_control: `DTE-00-S001P001-${numero}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Guardar factura emitida
router.post('/', async (req, res) => {
  const { numero_control, codigo_generacion, id_venta, id_cliente, fecha_emision, total } = req.body;
  try {
    await sequelize.query(
      `INSERT INTO facturas (numero_control, codigo_generacion, id_venta, id_cliente, fecha_emision, total)
       VALUES (:numero_control, :codigo_generacion, :id_venta, :id_cliente, :fecha_emision, :total)`,
      { replacements: { numero_control, codigo_generacion, id_venta, id_cliente: id_cliente ?? null, fecha_emision, total } }
    );
    res.status(201).json({ message: 'Factura registrada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;