import nodemailer from 'nodemailer';

// Crear transporter con validación de variables de entorno
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false, // true para 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : '',
  },
});

// Verificar conexión al iniciar
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error de conexión SMTP:', error);
    console.error('   Revisa tus credenciales en .env');
  } else {
    console.log('✅ Conexión SMTP establecida correctamente');
  }
});

export const sendInvitationEmail = async (email, nombre, token) => {
  try {
    const link = `${process.env.FRONTEND_URL}/establecer-contrasena?token=${token}`;
    const info = await transporter.sendMail({
      to: email,
      subject: 'Invitación a Farmacias San Cupertino',
      html: `<p>Hola ${nombre},</p><p>Has sido registrado en el sistema. Haz clic en el siguiente enlace para establecer tu contraseña:</p><a href="${link}">${link}</a><p>El enlace expira en 24 horas.</p>`,
    });
    console.log(`✅ Correo de invitación enviado a ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Error enviando invitación a ${email}:`, error);
    throw error;
  }
};

export const sendRecoveryEmail = async (email, codigo) => {
  try {
    console.log(`📧 Enviando código de recuperación a ${email}...`);
    const info = await transporter.sendMail({
      to: email,
      subject: 'Código de recuperación de contraseña',
      html: `<p>Tu código de recuperación es: <strong>${codigo}</strong></p><p>Expira en 10 minutos.</p><p>Si no solicitaste este código, ignora este mensaje.</p>`,
    });
    console.log(`✅ Correo de recuperación enviado a ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Error enviando recuperación a ${email}:`, error);
    throw error;
  }
};