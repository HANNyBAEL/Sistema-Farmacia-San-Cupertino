import express from 'express';
import sequelize from '../config/database.js';
import { enviarFacturaPorCorreo } from '../services/email.js';

const router = express.Router();

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

router.post('/', async (req, res) => {
  const { numero_control, codigo_generacion, id_venta, id_cliente, fecha_emision, total, sello_recepcion, ambiente_destino } = req.body;
  try {
    await sequelize.query(
      `INSERT INTO facturas (numero_control, codigo_generacion, id_venta, id_cliente, fecha_emision, total, sello_recepcion, ambiente_destino)
       VALUES (:numero_control, :codigo_generacion, :id_venta, :id_cliente, :fecha_emision, :total, :sello_recepcion, :ambiente_destino)`,
      { replacements: { numero_control, codigo_generacion, id_venta, id_cliente: id_cliente ?? null, fecha_emision, total, sello_recepcion, ambiente_destino } }
    );
    res.status(201).json({ message: 'Factura registrada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar factura con PDF adjunto
router.post('/enviar', async (req, res) => {
  try {
    const { email, pdfBase64, jsonBase64, numero_control, codigo_generacion, total, cliente } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'No se proporcionó correo del cliente' });
    }

    if (!pdfBase64) {
      return res.status(400).json({ error: 'No se proporcionó el PDF' });
    }

    const resultado = await enviarFacturaPorCorreo({
      email,
      pdfBase64,
      jsonBase64,
      numero_control,
      codigo_generacion,
      total,
      cliente,
    });

    res.status(200).json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
