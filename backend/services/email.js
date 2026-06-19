import sgMail from '@sendgrid/mail';

// ─── CONFIGURACIÓN CON LOGS DETALLADOS ───────────────────
const apiKey = process.env.SENDGRID_API_KEY;
console.log('🔍 [SendGrid] Verificando configuración...');
console.log('🔍 ¿SENDGRID_API_KEY existe?', apiKey ? '✅ Sí' : '❌ NO');
console.log('🔍 Longitud de la clave:', apiKey ? apiKey.length : '0');
console.log('🔍 Primeros 10 caracteres:', apiKey ? apiKey.substring(0, 10) : 'N/A');
console.log('🔍 Últimos 4 caracteres:', apiKey ? apiKey.substring(apiKey.length - 4) : 'N/A');

if (!apiKey) {
  console.error('❌ [SendGrid] FALTA SENDGRID_API_KEY en las variables de entorno');
  console.error('   → Asegúrate de configurarla en Render: Settings → Environment → SENDGRID_API_KEY');
  // No lanzamos error para que el servidor siga corriendo, pero no podrá enviar correos
} else {
  sgMail.setApiKey(apiKey.trim());
  console.log('✅ [SendGrid] API Key configurada correctamente');
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'farmaciassanjosecupertino@gmail.com';
console.log(`📧 [SendGrid] Correo remitente: ${FROM_EMAIL}`);

// ─── ENVÍO DE CÓDIGO DE RECUPERACIÓN ────────────────────
export const sendRecoveryEmail = async (email, codigo) => {
  console.log(`📧 [SendGrid] Enviando correo a ${email} con código ${codigo}`);
  
  if (!apiKey) {
    console.error('❌ [SendGrid] No se puede enviar: SENDGRID_API_KEY no configurada');
    throw new Error('SENDGRID_API_KEY no configurada en el servidor');
  }

  try {
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: 'Código de recuperación de contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa; border-radius: 12px;">
          <div style="text-align: center; padding: 20px; background-color: #0a4b7a; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 24px;">🔐 Recuperación de contraseña</h1>
          </div>
          <div style="padding: 30px; background-color: white; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #333;">Hola,</p>
            <p style="font-size: 16px; color: #333;">Has solicitado restablecer tu contraseña. Utiliza el siguiente código para completar el proceso:</p>
            <div style="text-align: center; padding: 20px; margin: 20px 0; background-color: #f0f7ff; border-radius: 8px; border: 2px dashed #0a4b7a;">
              <span style="font-size: 36px; font-weight: bold; color: #0a4b7a; letter-spacing: 4px;">${codigo}</span>
            </div>
            <p style="font-size: 14px; color: #666;">Este código expira en <strong>10 minutos</strong>.</p>
            <p style="font-size: 14px; color: #666;">Si no solicitaste este código, ignora este mensaje.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">Este es un mensaje automático. No respondas a este correo.</p>
          </div>
        </div>
      `,
    };
    
    const response = await sgMail.send(msg);
    console.log(`✅ [SendGrid] Correo enviado a ${email}: Status ${response[0].statusCode}`);
    return response;
  } catch (error) {
    console.error(`❌ [SendGrid] Error al enviar correo a ${email}:`);
    
    // Mostrar detalles del error
    if (error.response) {
      console.error('   📋 Código HTTP:', error.response.statusCode || error.code);
      console.error('   📋 Cuerpo del error:', JSON.stringify(error.response.body, null, 2));
    } else {
      console.error('   📋 Mensaje:', error.message);
    }
    
    throw error;
  }
};

// ─── ENVÍO DE INVITACIÓN PARA NUEVOS EMPLEADOS ──────────
export const sendInvitationEmail = async (email, nombre, token) => {
  const link = `${process.env.FRONTEND_URL}/establecer-contrasena?token=${token}`;
  console.log(`📧 [SendGrid] Enviando invitación a ${email}...`);
  
  if (!apiKey) {
    console.error('❌ [SendGrid] No se puede enviar: SENDGRID_API_KEY no configurada');
    throw new Error('SENDGRID_API_KEY no configurada en el servidor');
  }

  try {
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: 'Invitación a Farmacias San Cupertino',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa; border-radius: 12px;">
          <div style="text-align: center; padding: 20px; background-color: #0a4b7a; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 24px;">🏥 Bienvenido a Farmacias San Cupertino</h1>
          </div>
          <div style="padding: 30px; background-color: white; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #333;">Hola <strong>${nombre}</strong>,</p>
            <p style="font-size: 16px; color: #333;">Has sido registrado en nuestro sistema de gestión. Para comenzar, debes establecer tu contraseña:</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${link}" style="display: inline-block; padding: 12px 30px; background-color: #0a4b7a; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Establecer mi contraseña</a>
            </div>
            <p style="font-size: 14px; color: #666;">O copia este enlace en tu navegador:</p>
            <p style="font-size: 12px; color: #999; word-break: break-all; background-color: #f0f7ff; padding: 10px; border-radius: 4px;">${link}</p>
            <p style="font-size: 14px; color: #666;">El enlace expira en <strong>24 horas</strong>.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">Este es un mensaje automático. No respondas a este correo.</p>
          </div>
        </div>
      `,
    };
    
    const response = await sgMail.send(msg);
    console.log(`✅ [SendGrid] Invitación enviada a ${email}: Status ${response[0].statusCode}`);
    return response;
  } catch (error) {
    console.error(`❌ [SendGrid] Error al enviar invitación a ${email}:`);
    
    if (error.response) {
      console.error('   📋 Código HTTP:', error.response.statusCode || error.code);
      console.error('   📋 Cuerpo del error:', JSON.stringify(error.response.body, null, 2));
    } else {
      console.error('   📋 Mensaje:', error.message);
    }
    
    throw error;
  }
};