const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar el transportador de Nodemailer (Usa tus variables de entorno)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.tucorreo.com', // Ej: smtp.gmail.com
    port: process.env.SMTP_PORT || 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.SMTP_USER, // Tu correo
        pass: process.env.SMTP_PASS  // Tu contraseña o App Password
    }
});

/**
 * Función para enviar la factura electrónica por correo
 * @param {string} clienteEmail - Correo del cliente
 * @param {object} dteJson - El JSON de la factura
 */
const enviarFacturaPorCorreo = async (clienteEmail, dteJson) => {
    try {
        // Convertir el JSON a string para adjuntarlo
        const jsonContent = JSON.stringify(dteJson, null, 2);
        const codigoGeneracion = dteJson.identificacion.codigoGeneracion;

        const mailOptions = {
            from: `"Super Selectos" <${process.env.SMTP_USER}>`,
            to: clienteEmail,
            subject: `Factura Electrónica - ${codigoGeneracion}`,
            text: `Estimado cliente, adjuntamos su factura electrónica con número de control: ${dteJson.identificacion.numeroControl}.`,
            attachments: [
                {
                    filename: `factura_${codigoGeneracion}.json`,
                    content: jsonContent,
                    contentType: 'application/json'
                }
                // Si en el futuro generas un PDF, puedes agregarlo aquí:
                // {
                //     filename: `factura_${codigoGeneracion}.pdf`,
                //     path: rutaAlPDF // ruta física del PDF en el servidor
                // }
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