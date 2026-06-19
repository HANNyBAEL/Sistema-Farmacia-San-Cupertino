const express = require('express');
const router = express.Router();
const { enviarFacturaPorCorreo } = require('../services/emailService');

// Ruta: POST /api/facturas/enviar
router.post('/enviar', async (req, res) => {
    try {
        const dteJson = req.body; // Aquí recibes el JSON que enviaste desde el frontend
        
        // Extraer el correo del receptor del propio JSON
        const clienteEmail = dteJson?.receptor?.correo;

        if (!clienteEmail) {
            return res.status(400).json({ error: 'El cliente no tiene correo electrónico registrado en el JSON' });
        }

        // Llamar al servicio de correo
        const resultado = await enviarFacturaPorCorreo(clienteEmail, dteJson);

        res.status(200).json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;