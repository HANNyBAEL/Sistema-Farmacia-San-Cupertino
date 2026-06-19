import sgMail from '@sendgrid/mail';

// ─── CONFIGURACIÓN ──────────────────────────────────────
const apiKey = process.env.SENDGRID_API_KEY;
console.log('🔍 [SendGrid] Verificando configuración...');
console.log('🔍 ¿SENDGRID_API_KEY existe?', apiKey ? '✅ Sí' : '❌ NO');

if (!apiKey) {
  console.error('❌ [SendGrid] FALTA SENDGRID_API_KEY en variables de entorno');
} else {
  sgMail.setApiKey(apiKey.trim());
  console.log('✅ [SendGrid] API Key configurada correctamente');
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'farmaciassanjosecupertino@gmail.com';

const formatNumber = (num) => {
  const n = parseFloat(num) || 0;
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};


// ═══════════════════════════════════════════════════════════
// 1️⃣  FACTURA CON PDF ADJUNTO (LO QUE USA facturasRoutes)
// ═══════════════════════════════════════════════════════════
export const enviarFacturaPorCorreo = async ({ email, pdfBase64, numero_control, codigo_generacion, total, cliente }) => {
  console.log(`📧 [SendGrid] Enviando factura PDF a ${email}...`);
  if (!apiKey) throw new Error('SENDGRID_API_KEY no configurada');

  const totalFmt = parseFloat(total || 0).toFixed(2);
  const numeroCtrl = numero_control || 'N/A';
  const codigoGen = codigo_generacion || 'N/A';

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: `Factura Electrónica - ${numeroCtrl}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f1f5f9;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <div style="background:linear-gradient(135deg,#0a4b7a,#0d6eaa);padding:28px 32px;text-align:center;color:#fff">
          <h1 style="margin:0 0 4px;font-size:22px;font-weight:700">🏥 Farmacias San Cupertino</h1>
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
          <p style="margin:0;font-size:11px;color:#94a3b8">Farmacias San Cupertino — Documento Tributario Electrónico</p>
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


// ═══════════════════════════════════════════════════════════
// 2️⃣  RECUPERACIÓN DE CONTRASEÑA
// ═══════════════════════════════════════════════════════════
export const sendRecoveryEmail = async (email, codigo) => {
  console.log(`📧 [SendGrid] Enviando recuperación a ${email}...`);
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
    console.log(`✅ [SendGrid] Recuperación enviada a ${email}`);
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
  console.log(`📧 [SendGrid] Enviando invitación a ${email}...`);
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
    console.log(`✅ [SendGrid] Invitación enviada a ${email}`);
    return response;
  } catch (error) {
    console.error(`❌ [SendGrid] Error invitación:`, error.response?.body || error.message);
    throw error;
  }
};