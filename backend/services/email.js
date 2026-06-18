import nodemailer from 'nodemailer';

// Configuración del transporter forzando IPv4
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true para 465, false para 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : '',
  },
  // 🔥 Forzar IPv4 para evitar ENETUNREACH
  family: 4,
  // Opcional: aumentar timeout
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// Verificar conexión al iniciar (útil para depuración)
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
  try {
    const info = await transporter.sendMail({
      to: email,
      subject: 'Invitación a Farmacias San Cupertino',
      html: `<p>Hola ${nombre},</p>
             <p>Has sido registrado en el sistema. Haz clic en el siguiente enlace para establecer tu contraseña:</p>
             <a href="${link}">${link}</a>
             <p>El enlace expira en 24 horas.</p>`,
    });
    console.log(`✅ Correo de invitación enviado a ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error al enviar invitación:', error);
    throw error;
  }
};