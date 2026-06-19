import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configurar el transportador usando las variables de entorno (.env)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, 
    port: parseInt(process.env.SMTP_PORT, 10) || 587, 
    secure: false, 
    auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS  
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
            from: `"Farmacias San Cupertino" <${process.env.SMTP_USER}>`, 
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

export { enviarFacturaPorCorreo };