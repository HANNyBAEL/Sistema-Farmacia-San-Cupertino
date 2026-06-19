import sgMail from '@sendgrid/mail';

// Configurar la API Key de SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.error('❌ FALTA SENDGRID_API_KEY en las variables de entorno');
} else {
  sgMail.setApiKey(apiKey.trim());
  console.log('✅ SendGrid API Key configurada');
}

// Correo remitente verificado en SendGrid
const FROM_EMAIL = process.env.FROM_EMAIL || 'farmaciassanjosecupertino@gmail.com';

export const sendRecoveryEmail = async (email, codigo) => {
  console.log(`📧 Enviando correo a ${email} con código ${codigo}`);
  try {
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: 'Código de recuperación de contraseña',
      html: `<p>Tu código de recuperación es: <strong>${codigo}</strong></p>
             <p>Expira en 10 minutos.</p>
             <p>Si no solicitaste este código, ignora este mensaje.</p>`,
    };
    const response = await sgMail.send(msg);
    console.log(`✅ Correo enviado a ${email}: ${response[0].statusCode}`);
    return response;
  } catch (error) {
    console.error('❌ Error al enviar correo con SendGrid:', error.response?.body || error.message);
    throw error;
  }
};

export const sendInvitationEmail = async (email, nombre, token) => {
  const link = `${process.env.FRONTEND_URL}/establecer-contrasena?token=${token}`;
  console.log(`📧 Enviando invitación a ${email}...`);
  try {
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: 'Invitación a Farmacias San Cupertino',
      html: `<p>Hola ${nombre},</p>
             <p>Has sido registrado en el sistema. Haz clic en el siguiente enlace para establecer tu contraseña:</p>
             <a href="${link}">${link}</a>
             <p>El enlace expira en 24 horas.</p>`,
    };
    const response = await sgMail.send(msg);
    console.log(`✅ Invitación enviada a ${email}: ${response[0].statusCode}`);
    return response;
  } catch (error) {
    console.error('❌ Error al enviar invitación con SendGrid:', error.response?.body || error.message);
    throw error;
  }
};