import express from 'express';
import { enviarFacturaPorCorreo } from '../services/emailService.js';

const router = express.Router();

// Ruta: POST /api/facturas/enviar
router.post('/enviar', async (req, res) => {
    try {
        const dteJson = req.body;
        
        const clienteEmail = dteJson?.receptor?.correo;

        if (!clienteEmail) {
            return res.status(400).json({ error: 'El cliente no tiene correo electrónico registrado en el JSON' });
        }

        const resultado = await enviarFacturaPorCorreo(clienteEmail, dteJson);

        res.status(200).json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;