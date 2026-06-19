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


// ─── HELPERS ────────────────────────────────────────────
const formatNumber = (num) => {
  const n = parseFloat(num) || 0;
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const getTipoDte = (tipo) => {
  const tipos = { '01': 'Factura', '03': 'Crédito Fiscal', '14': 'Nota de Crédito', '05': 'Nota de Débito' };
  return tipos[tipo] || 'Documento Tributario Electrónico';
};


// ═══════════════════════════════════════════════════════════
// 1️⃣  FACTURA ELECTRÓNICA (BONITA Y DECORADA)
// ═══════════════════════════════════════════════════════════
export const enviarFacturaPorCorreo = async (clienteEmail, dteJson) => {
  console.log(`📧 [SendGrid] Enviando factura a ${clienteEmail}...`);
  if (!apiKey) throw new Error('SENDGRID_API_KEY no configurada');

  const ident = dteJson.identificacion || {};
  const emisor = dteJson.emisor || {};
  const receptor = dteJson.receptor || {};
  const resumen = dteJson.resumen || {};
  const items = dteJson.cuerpoDocumento?.detalle || [];
  const codigoGen = ident.codigoGeneracion || 'N/A';
  const numeroCtrl = ident.numeroControl || 'N/A';
  const fecha = ident.fchEmision || 'N/A';
  const tipoDte = getTipoDte(ident.tipoDte);
  const condicion = ident.condicionOperacion === '1' ? 'Contado' : 'Crédito';

  const filas = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569">${item.numeroItem || i + 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;font-weight:500">${item.descripcion || '-'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;text-align:center">${item.cantidad || 0}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;text-align:right">$${formatNumber(item.precioUni)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;text-align:right">$${formatNumber(item.ventaGravada)}</td>
    </tr>`).join('');

  const msg = {
    to: clienteEmail,
    from: FROM_EMAIL,
    subject: `${tipoDte} - ${numeroCtrl}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:680px;margin:0 auto;background:#f1f5f9;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <div style="background:linear-gradient(135deg,#0a4b7a,#0d6eaa);padding:28px 32px;color:#fff">
          <table style="width:100%;border-collapse:collapse"><tr>
            <td style="vertical-align:top">
              <h1 style="margin:0 0 4px;font-size:22px;font-weight:700">🏥 Farmacias San Cupertino</h1>
              <p style="margin:0;font-size:13px;opacity:.85">${emisor.nombre || 'Farmacia San José Cupertino'}</p>
              <p style="margin:2px 0 0;font-size:12px;opacity:.7">NIT: ${emisor.nit || 'N/A'} | ${emisor.direccion || ''}</p>
            </td>
            <td style="vertical-align:top;text-align:right">
              <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:12px 18px;display:inline-block">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.8">${tipoDte}</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:700;letter-spacing:.5px">${numeroCtrl}</p>
              </div>
            </td>
          </tr></table>
        </div>
        <div style="padding:20px 32px 0">
          <table style="width:100%;border-collapse:collapse"><tr>
            <td style="width:50%;vertical-align:top;padding:12px;background:#fff;border-radius:10px;border:1px solid #e2e8f0">
              <p style="margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600">Fecha de Emisión</p>
              <p style="margin:0;font-size:14px;color:#1e293b;font-weight:600">📅 ${fecha}</p>
            </td>
            <td style="width:10px"></td>
            <td style="width:50%;vertical-align:top;padding:12px;background:#fff;border-radius:10px;border:1px solid #e2e8f0">
              <p style="margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600">Código Generación</p>
              <p style="margin:0;font-size:13px;color:#1e293b;font-family:monospace;background:#f8fafc;padding:4px 8px;border-radius:4px;word-break:break-all">${codigoGen}</p>
            </td>
          </tr></table>
        </div>
        <div style="padding:16px 32px 0">
          <div style="background:#fff;border-radius:10px;border:1px solid #e2e8f0;padding:16px">
            <p style="margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600">👤 Datos del Cliente</p>
            <p style="margin:0;font-size:15px;color:#1e293b;font-weight:600">${receptor.nombre || 'Cliente General'}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#64748b">NIT: ${receptor.nit || 'N/A'} | ${receptor.correo || ''}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#94a3b8">Condición de pago: <strong style="color:#0a4b7a">${condicion}</strong></p>
          </div>
        </div>
        <div style="padding:16px 32px 0">
          <div style="background:#fff;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden">
            <table style="width:100%;border-collapse:collapse">
              <thead><tr style="background:linear-gradient(135deg,#0a4b7a,#0d6eaa);color:#fff">
                <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px">#</th>
                <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px">Descripción</th>
                <th style="padding:12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:.5px">Cant.</th>
                <th style="padding:12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.5px">P. Unit.</th>
                <th style="padding:12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.5px">Venta</th>
              </tr></thead>
              <tbody>${filas}</tbody>
            </table>
          </div>
        </div>
        <div style="padding:16px 32px 0">
          <div style="background:#fff;border-radius:10px;border:1px solid #e2e8f0;padding:20px;max-width:320px;margin-left:auto">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:13px;color:#64748b">Subtotal</span><span style="font-size:13px;color:#475569;font-weight:500">$${formatNumber(resumen.subTotal)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:13px;color:#64748b">IVA (13%)</span><span style="font-size:13px;color:#475569;font-weight:500">$${formatNumber(resumen.ivaRete1)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:13px;color:#64748b">Retención</span><span style="font-size:13px;color:#475569;font-weight:500">$${formatNumber(resumen.reteRenta)}</span></div>
            <div style="border-top:2px solid #0a4b7a;margin-top:12px;padding-top:12px">
              <div style="display:flex;justify-content:space-between"><span style="font-size:16px;color:#0a4b7a;font-weight:700">TOTAL</span><span style="font-size:18px;color:#0a4b7a;font-weight:800">$${formatNumber(resumen.totalPagar)}</span></div>
            </div>
          </div>
        </div>
        <div style="padding:16px 32px 0">
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px;text-align:center">
            <p style="margin:0;font-size:12px;color:#92400e">📎 El archivo JSON de la factura electrónica está adjunto a este correo</p>
          </div>
        </div>
        <div style="padding:20px 32px 24px;text-align:center">
          <p style="margin:0;font-size:11px;color:#94a3b8">Farmacias San Cupertino — Documento Tributario Electrónico</p>
          <p style="margin:4px 0 0;font-size:10px;color:#cbd5e1">Mensaje automático — No responder</p>
        </div>
      </div>`,
    attachments: [{
      filename: `factura_${codigoGen}.json`,
      content: Buffer.from(JSON.stringify(dteJson, null, 2)).toString('base64'),
      type: 'application/json',
      disposition: 'attachment'
    }]
  };

  try {
    const response = await sgMail.send(msg);
    console.log(`✅ [SendGrid] Factura enviada a ${clienteEmail}: Status ${response[0].statusCode}`);
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