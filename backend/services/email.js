import nodemailer from 'nodemailer';

// Configuración del transporter forzando IPv4
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true para 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : '',
  },
  family: 4, // 🔥 Forzar IPv4
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

// Verificar conexión al iniciar
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error de conexión SMTP:', error);
  } else {
    console.log('✅ Conexión SMTP establecida correctamente');
  }
});

// ─── ENVÍO DE CÓDIGO DE RECUPERACIÓN ────────────────────
export const sendRecoveryEmail = async (email, codigo) => {
  console.log(`📧 Enviando correo a ${email} con código ${codigo}`);
  try {
    const info = await transporter.sendMail({
      from: `"Farmacias San Cupertino" <${process.env.SMTP_USER}>`, // ✅ Remitente explícito
      to: email,
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
    });
    console.log(`✅ Correo enviado: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error al enviar correo (detallado):', error);
    throw error;
  }
};

// ─── ENVÍO DE INVITACIÓN PARA NUEVOS EMPLEADOS ──────────
export const sendInvitationEmail = async (email, nombre, token) => {
  const link = `${process.env.FRONTEND_URL}/establecer-contrasena?token=${token}`;
  console.log(`📧 Enviando invitación a ${email}...`);
  try {
    const info = await transporter.sendMail({
      from: `"Farmacias San Cupertino" <${process.env.SMTP_USER}>`, // ✅ Remitente explícito
      to: email,
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
    });
    console.log(`✅ Invitación enviada: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error al enviar invitación:', error);
    throw error;
  }
};