/** Servicio central de correo transaccional a través de la API de Brevo. */
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
// Debe estar verificado como remitente transaccional en Brevo.
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.BREVO_SENDER_EMAIL || 'farmaciassanjosecupertino@gmail.com';
const FROM_NAME = process.env.BREVO_SENDER_NAME || 'Farmacias San Cupertino';

/** Lee la clave al enviar y evita exponerla en respuestas o registros. */
function getBrevoApiKey() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error('BREVO_API_KEY no configurada');
  return apiKey;
}

/** Evita que valores de usuario se interpreten como HTML en un correo. */
function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Punto único de envío y manejo de errores de Brevo para todos los correos del sistema. */
async function sendEmail({ to, subject, htmlContent, attachment }) {
  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': getBrevoApiKey(),
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent,
      ...(attachment?.length ? { attachment } : {}),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Brevo rechazó el envío (${response.status})`);
  return data;
}

/** Envía la factura con sus representaciones PDF y JSON adjuntas. */
export const enviarFacturaPorCorreo = async ({ email, pdfBase64, jsonBase64, numero_control, codigo_generacion, total, cliente }) => {
  if (!email || !pdfBase64) throw new Error('Correo y PDF de la factura son obligatorios');

  const jsonContent = jsonBase64 || Buffer.from(JSON.stringify({
    numero_control, codigo_generacion, cliente, total, fecha_envio: new Date().toISOString(),
  }, null, 2)).toString('base64');
  const safeControl = String(numero_control || 'N-A').replace(/[^a-zA-Z0-9_-]/g, '_');
  const customer = escapeHtml(cliente || 'Cliente');

  return sendEmail({
    to: email,
    subject: `Factura Electrónica - ${numero_control || 'N/A'}`,
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px"><h1 style="color:#0a4b7a">Farmacias San Cupertino</h1><p>Estimado cliente: <strong>${customer}</strong></p><p>Adjuntamos tu factura electrónica.</p><p>Número de control: <strong>${escapeHtml(numero_control || 'N/A')}</strong></p><p>Total: <strong>$${Number(total || 0).toFixed(2)}</strong></p></div>`,
    attachment: [
      { name: `factura_${safeControl}.pdf`, content: pdfBase64 },
      { name: `factura_${safeControl}.json`, content: jsonContent },
    ],
  });
};

/** Envía el código temporal para recuperar una contraseña. */
export const sendRecoveryEmail = async (email, codigo) => sendEmail({
  to: email,
  subject: 'Código de recuperación de contraseña',
  htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px"><h1 style="color:#0a4b7a">Recuperación de contraseña</h1><p>Usa este código para restablecer tu contraseña:</p><p style="font-size:36px;font-weight:bold;letter-spacing:6px;color:#0a4b7a">${escapeHtml(codigo)}</p><p>Este código expira en 10 minutos.</p></div>`,
});

/** Construye y envía el enlace de invitación para un empleado nuevo. */
export const sendInvitationEmail = async (email, nombre, token) => {
  const frontendUrl = new URL(process.env.FRONTEND_URL);
  frontendUrl.searchParams.set('establecer-contrasena', '1');
  frontendUrl.searchParams.set('token', token);
  const link = frontendUrl.toString();

  return sendEmail({
    to: email,
    subject: 'Invitación a Farmacias San Cupertino',
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px"><h1 style="color:#0a4b7a">Bienvenido a Farmacias San Cupertino</h1><p>Hola <strong>${escapeHtml(nombre)}</strong>,</p><p>Para establecer tu contraseña, abre este enlace:</p><p><a href="${escapeHtml(link)}">Establecer mi contraseña</a></p></div>`,
  });
};
