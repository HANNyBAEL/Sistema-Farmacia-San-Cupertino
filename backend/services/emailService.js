const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar el transportador usando las variables de entorno (.env)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // smtp.sendgrid.net
    port: parseInt(process.env.SMTP_PORT, 10) || 587, // 587
    secure: false, // true para 465, false para otros puertos (587 usa false)
    auth: {
        user: process.env.SMTP_USER, // apikey
        pass: process.env.SMTP_PASS  // SG.tu_nueva_api_key...
    }
});

/**
 * Función para enviar la factura electrónica por correo
 */
const enviarFacturaPorCorreo = async (clienteEmail, dteJson) => {
    try {
        const jsonContent = JSON.stringify(dteJson, null, 2);
        const codigoGeneracion = dteJson.identificacion.codigoGeneracion;

        const mailOptions = {
            from: `"Farmacias San Cupertino" <farmaciassancupertino@gmail.com>`, // Cambia esto al correo verificado en SendGrid
            to: clienteEmail,
            subject: `Factura Electrónica - ${codigoGeneracion}`,
            text: `Estimado cliente, adjuntamos su factura electrónica con número de control: ${dteJson.identificacion.numeroControl}.`,
            attachments: [
                {
                    filename: `factura_${codigoGeneracion}.json`,
                    content: jsonContent,
                    contentType: 'application/json'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado: %s', info.messageId);
        return { success: true, message: 'Factura enviada correctamente' };
    } catch (error) {
        console.error('Error al enviar el correo:', error);
        throw new Error('No se pudo enviar el correo electrónico');
    }
};

module.exports = { enviarFacturaPorCorreo };