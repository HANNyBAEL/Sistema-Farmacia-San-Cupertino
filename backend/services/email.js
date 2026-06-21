import sgMail from '@sendgrid/mail';

// ─── CONFIGURACIÓN ──────────────────────────────────────
const apiKey = process.env.SENDGRID_API_KEY;

if (!apiKey) {
  console.error('❌ [SendGrid] FALTA SENDGRID_API_KEY en variables de entorno');
} else {
  sgMail.setApiKey(apiKey.trim());
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'farmaciassanjosecupertino@gmail.com';

const formatNumber = (num) => {
  const n = parseFloat(num) || 0;
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};


// ═══════════════════════════════════════════════════════════
// 1️⃣  FACTURA CON PDF Y JSON ADJUNTOS
// ═══════════════════════════════════════════════════════════
export const enviarFacturaPorCorreo = async ({ email, pdfBase64, numero_control, codigo_generacion, total, cliente }) => {
  if (!apiKey) throw new Error('SENDGRID_API_KEY no configurada');

  // Construir el JSON de la factura con los datos disponibles
  const facturaJson = {
    numero_control: numero_control || 'N/A',
    codigo_generacion: codigo_generacion || 'N/A',
    cliente: cliente || 'Cliente General',
    total: parseFloat(total || 0).toFixed(2),
    fecha_envio: new Date().toISOString(),
    emisor: {
      nombre: 'Farmacias San Cupertino',
      nit: '0614-123456-789-0',
      correo: 'farmaciassanjosecupertino@gmail.com'
    }
  };

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: `Factura Electrónica - ${numero_control || 'N/A'}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9fafb;border-radius:8px;">
        <div style="background:#0a4b7a;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:20px;">Farmacias San Cupertino</h1>
        </div>
        <div style="background:#fff;padding:30px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Notificación de Factura Electrónica</h2>
          
          <p style="margin:0 0 12px;color:#374151;font-size:14px;">Estimado cliente: <strong>${cliente || 'Cliente General'}</strong></p>
          
          <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
            Por este medio te enviamos tu factura electrónica en formato JSON y PDF, que registra tu compra realizada en Farmacias San Cupertino.
          </p>
          
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:0 0 16px;">
            <p style="margin:0 0 8px;color:#0369a1;font-size:13px;font-weight:bold;">Resumen de la factura:</p>
            <p style="margin:0 0 4px;color:#1e40af;font-size:13px;">Número de Control: <strong>${numero_control || 'N/A'}</strong></p>
            <p style="margin:0 0 4px;color:#1e40af;font-size:13px;">Código Generación: <strong>${codigo_generacion || 'N/A'}</strong></p>
            <p style="margin:0;color:#1e40af;font-size:15px;font-weight:bold;">Total: $${parseFloat(total || 0).toFixed(2)}</p>
          </div>
          
          <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">
            Los documentos adjuntos cuentan con las especificaciones requeridas por el Ministerio de Hacienda, por lo que tienen el mismo respaldo tributario/ legal que los documentos físicos.
          </p>
          
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-top:20px;">
            <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
              📎 Este correo contiene 2 archivos adjuntos:<br>
              <strong>1 archivo PDF</strong> (factura visual) y <strong>1 archivo JSON</strong> (factura electrónica)
            </p>
          </div>
        </div>
        
        <div style="margin-top:20px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">Farmacias San Cupertino — Documento Tributario Electrónico</p>
          <p style="margin:4px 0 0;color:#d1d5db;font-size:10px;">Mensaje automático — No responder</p>
        </div>
      </div>`,
    attachments: [
      {
        filename: `factura_${(numero_control || 'N/A').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        content: pdfBase64,
        type: 'application/pdf',
        disposition: 'attachment'
      },
      {
        filename: `factura_${(numero_control || 'N/A').replace(/[^a-zA-Z0-9]/g, '_')}.json`,
        content: Buffer.from(JSON.stringify(facturaJson, null, 2)).toString('base64'),
        type: 'application/json',
        disposition: 'attachment'
      }
    ]
  };

  try {
    await sgMail.send(msg);
    return { success: true, message: 'Factura enviada correctamente' };
  } catch (error) {
    console.error(`❌ [SendGrid] Error factura:`, error.response?.body || error.message);
    throw error;
  }
};


// ═══════════════════════════════════════════════════════════
// 2️⃣  RECUPERACIÓN DE CONTRASEÑA
// ═══════════════════════════════════════════════════════════
export const sendRecoveryEmail = async (email, codigo) => {
  if (!apiKey) throw new Error('SENDGRID_API_KEY no configurada');

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: 'Código de recuperación de contraseña',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f1f5f9;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0a4b7a,#0d6eaa);padding:28px 32px;text-align:center;color:#fff">
          <h1 style="margin:0;font-size:24px">🔐 Recuperación de Contraseña</h1>
        </div>
        <div style="padding:30px 32px;background:#fff">
          <p style="font-size:15px;color:#334155">Hola,</p>
          <p style="font-size:15px;color:#334155">Has solicitado restablecer tu contraseña. Usa el siguiente código:</p>
          <div style="text-align:center;padding:24px;margin:20px 0;background:#f0f7ff;border-radius:12px;border:2px dashed #0a4b7a">
            <span style="font-size:36px;font-weight:800;color:#0a4b7a;letter-spacing:6px">${codigo}</span>
          </div>
          <p style="font-size:13px;color:#64748b">Este código expira en <strong>10 minutos</strong>.</p>
          <p style="font-size:13px;color:#94a3b8">Si no solicitaste esto, ignora este mensaje.</p>
        </div>
        <div style="padding:16px 32px;text-align:center;background:#f8fafc">
          <p style="margin:0;font-size:11px;color:#94a3b8">Mensaje automático — No responder</p>
        </div>
      </div>`
  };

  try {
    const response = await sgMail.send(msg);
    return response;
  } catch (error) {
    console.error(`❌ [SendGrid] Error recuperación:`, error.response?.body || error.message);
    throw error;
  }
};


// ═══════════════════════════════════════════════════════════
// 3️⃣  INVITACIÓN A NUEVO EMPLEADO
// ═══════════════════════════════════════════════════════════
export const sendInvitationEmail = async (email, nombre, token) => {
  const link = `${process.env.FRONTEND_URL}/establecer-contrasena?token=${token}`;
  if (!apiKey) throw new Error('SENDGRID_API_KEY no configurada');

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: 'Invitación a Farmacias San Cupertino',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f1f5f9;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0a4b7a,#0d6eaa);padding:28px 32px;text-align:center;color:#fff">
          <h1 style="margin:0;font-size:24px">🏥 Bienvenido a Farmacias San Cupertino</h1>
        </div>
        <div style="padding:30px 32px;background:#fff">
          <p style="font-size:15px;color:#334155">Hola <strong>${nombre}</strong>,</p>
          <p style="font-size:15px;color:#334155">Has sido registrado en nuestro sistema. Para comenzar, establece tu contraseña:</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${link}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0a4b7a,#0d6eaa);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(10,75,122,.3)">Establecer mi contraseña</a>
          </div>
          <p style="font-size:12px;color:#64748b;text-align:center">O copia este enlace:</p>
          <p style="font-size:11px;color:#94a3b8;text-align:center;word-break:break-all;background:#f8fafc;padding:10px;border-radius:6px;margin-top:8px">${link}</p>
          <p style="font-size:13px;color:#64748b;margin-top:16px">El enlace expira en <strong>24 horas</strong>.</p>
        </div>
        <div style="padding:16px 32px;text-align:center;background:#f8fafc">
          <p style="margin:0;font-size:11px;color:#94a3b8">Mensaje automático — No responder</p>
        </div>
      </div>`
  };

  try {
    const response = await sgMail.send(msg);
    return response;
  } catch (error) {
    console.error(`❌ [SendGrid] Error invitación:`, error.response?.body || error.message);
    throw error;
  }
};
