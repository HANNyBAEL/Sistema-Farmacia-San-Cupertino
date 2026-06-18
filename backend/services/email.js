import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true para 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendInvitationEmail = async (email, nombre, token) => {
  const link = `${process.env.FRONTEND_URL}/establecer-contrasena?token=${token}`;
  await transporter.sendMail({
    to: email,
    subject: 'Invitación a Farmacias San Cupertino',
    html: `<p>Hola ${nombre},</p><p>Has sido registrado en el sistema. Haz clic en el siguiente enlace para establecer tu contraseña:</p><a href="${link}">${link}</a><p>El enlace expira en 24 horas.</p>`,
  });
};

export const sendRecoveryEmail = async (email, codigo) => {
  await transporter.sendMail({
    to: email,
    subject: 'Código de recuperación de contraseña',
    html: `<p>Tu código de recuperación es: <strong>${codigo}</strong></p><p>Expira en 10 minutos.</p>`,
  });
};