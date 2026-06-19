const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar el transportador de Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com', // Corregido: Este es el host de Gmail
    port: process.env.SMTP_PORT || 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.SMTP_USER, // Tu correo (ej: farmaciassancupertino@gmail.com)
        pass: process.env.SMTP_PASS  // La contraseña se lee desde el archivo .env
    }
});

/**
 * Función para enviar la factura electrónica por correo
 * @param {string} clienteEmail - Correo del cliente
 * @param {object} dteJson - El JSON de la factura
 */
// ═══════════════════════════════════════════════════════════
// 1️⃣  FACTURA ELECTRÓNICA CON PDF ADJUNTO REAL
// ═══════════════════════════════════════════════════════════
export const enviarFacturaPorCorreo = async ({ email, pdfBase64, numero_control, codigo_generacion, total, cliente }) => {
  console.log(`📧 [SendGrid] Enviando factura PDF a ${email}...`);
  if (!apiKey) throw new Error('SENDGRID_API_KEY no configurada');

  const numeroCtrl = numero_control || 'N/A';
  const codigoGen = codigo_generacion || 'N/A';
  const totalFmt = parseFloat(total || 0).toFixed(2);

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: `Factura Electrónica - ${numeroCtrl}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f1f5f9;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <div style="background:linear-gradient(135deg,#0a4b7a,#0d6eaa);padding:28px 32px;text-align:center;color:#fff">
          <h1 style="margin:0 0 4px;font-size:22px;font-weight:700">🏥 Farmacéuticos Católicos</h1>
          <p style="margin:0;font-size:13px;opacity:.85">Documento Tributario Electrónico</p>
        </div>
        <div style="padding:30px 32px;background:#fff;text-align:center">
          <div style="width:60px;height:60px;margin:0 auto 16px;background:#f0f7ff;border-radius:50%;display:flex;align-items:center;justify-content:center">
            <span style="font-size:28px">📄</span>
          </div>
          <p style="font-size:16px;color:#1e293b;margin:0 0 8px">Hola <strong>${cliente || 'Cliente'}</strong>,</p>
          <p style="font-size:14px;color:#475569;margin:0 0 20px">Adjuntamos su factura electrónica correspondiente a la operación realizada.</p>

          <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:0 auto;max-width:320px;text-align:left;border:1px solid #e2e8f0">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600">Resumen</p>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:13px;color:#64748b">Número de Control</span>
              <span style="font-size:13px;color:#1e293b;font-weight:600;font-family:monospace">${numeroCtrl}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:13px;color:#64748b">Código Generación</span>
              <span style="font-size:11px;color:#1e293b;font-family:monospace;max-width:160px;word-break:break-all;text-align:right">${codigoGen}</span>
            </div>
            <div style="border-top:2px solid #0a4b7a;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between">
              <span style="font-size:15px;color:#0a4b7a;font-weight:700">Total</span>
              <span style="font-size:17px;color:#0a4b7a;font-weight:800">$${totalFmt}</span>
            </div>
          </div>

          <p style="font-size:12px;color:#94a3b8;margin:20px 0 0">📎 El archivo PDF de su factura está adjunto a este correo.</p>
        </div>
        <div style="padding:16px 32px;text-align:center;background:#f8fafc">
          <p style="margin:0;font-size:11px;color:#94a3b8">FARMACÉUTICOS CATÓLICOS, S.A. DE C.V.</p>
          <p style="margin:4px 0 0;font-size:10px;color:#cbd5e1">Mensaje automático — No responder</p>
        </div>
      </div>`,
    attachments: [{
      filename: `Factura_${numeroCtrl.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      content: pdfBase64,
      type: 'application/pdf',
      disposition: 'attachment'
    }]
  };

  try {
    const response = await sgMail.send(msg);
    console.log(`✅ [SendGrid] Factura PDF enviada a ${email}: Status ${response[0].statusCode}`);
    return { success: true, message: 'Factura enviada correctamente' };
  } catch (error) {
    console.error(`❌ [SendGrid] Error factura PDF:`, error.response?.body || error.message);
    throw error;
  }
};

module.exports = { enviarFacturaPorCorreo };