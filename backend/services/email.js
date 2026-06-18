import nodemailer from 'nodemailer';

// Configuración del transporter usando SendGrid SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'apikey',
    pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : '',
  },
  family: 4, // 🔥 Forzar IPv4
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

// Verificar conexión
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error de conexión SMTP:', error);
  } else {
    console.log('✅ Conexión SMTP establecida correctamente');
  }
});

export const sendRecoveryEmail = async (email, codigo) => {
  console.log(`📧 Enviando correo a ${email} con código ${codigo}`);
  try {
    const info = await transporter.sendMail({
      from: `"Farmacias San Cupertino" <${process.env.SMTP_USER}>`, // Usa el mismo usuario
      to: email,
      subject: 'Código de recuperación de contraseña',
      html: `<p>Tu código de recuperación es: <strong>${codigo}</strong></p>
             <p>Expira en 10 minutos.</p>
             <p>Si no solicitaste este código, ignora este mensaje.</p>`,
    });
    console.log(`✅ Correo enviado: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error al enviar correo (detallado):', error);
    throw error;
  }
};

export const sendInvitationEmail = async (email, nombre, token) => {
  const link = `${process.env.FRONTEND_URL}/establecer-contrasena?token=${token}`;
  console.log(`📧 Enviando invitación a ${email}...`);
  try {
    const info = await transporter.sendMail({
      from: `"Farmacias San Cupertino" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Invitación a Farmacias San Cupertino',
      html: `<p>Hola ${nombre},</p>
             <p>Has sido registrado en el sistema. Haz clic en el siguiente enlace para establecer tu contraseña:</p>
             <a href="${link}">${link}</a>
             <p>El enlace expira en 24 horas.</p>`,
    });
    console.log(`✅ Invitación enviada: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error al enviar invitación:', error);
    throw error;
  }
};