import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Configura el transporte (usa Gmail como ejemplo)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // tu correo Gmail
    pass: process.env.EMAIL_PASS  // contraseña de aplicación (no la de Gmail)
  }
});

/**
 * Envía un correo de invitación para establecer contraseña
 */
export const sendInvitationEmail = async (to, nombre, token) => {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/establecer-contrasena?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Invitación a Farmacias San Cupertino',
    html: `
      <h2>Hola ${nombre},</h2>
      <p>Has sido registrado en el sistema de Farmacias San Cupertino.</p>
      <p>Para establecer tu contraseña, haz clic en el siguiente enlace:</p>
      <a href="${link}" style="display:inline-block;padding:10px 20px;background:#0a4b7a;color:#fff;text-decoration:none;border-radius:5px;">Establecer contraseña</a>
      <p>Este enlace expirará en 24 horas.</p>
      <p>Si no solicitaste este registro, ignora este correo.</p>
    `
  };
  await transporter.sendMail(mailOptions);
};

/**
 * Envía un código de recuperación de contraseña
 */
export const sendRecoveryCode = async (to, nombre, codigo) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Código de recuperación de contraseña',
    html: `
      <h2>Hola ${nombre},</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>Tu código de verificación es:</p>
      <h1 style="font-size:2rem;color:#0a4b7a;">${codigo}</h1>
      <p>Este código expirará en 10 minutos.</p>
      <p>Si no solicitaste esto, ignora este correo.</p>
    `
  };
  await transporter.sendMail(mailOptions);
};import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Configura el transporte (usa Gmail como ejemplo)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // tu correo Gmail
    pass: process.env.EMAIL_PASS  // contraseña de aplicación (no la de Gmail)
  }
});

/**
 * Envía un correo de invitación para establecer contraseña
 */
export const sendInvitationEmail = async (to, nombre, token) => {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/establecer-contrasena?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Invitación a Farmacias San Cupertino',
    html: `
      <h2>Hola ${nombre},</h2>
      <p>Has sido registrado en el sistema de Farmacias San Cupertino.</p>
      <p>Para establecer tu contraseña, haz clic en el siguiente enlace:</p>
      <a href="${link}" style="display:inline-block;padding:10px 20px;background:#0a4b7a;color:#fff;text-decoration:none;border-radius:5px;">Establecer contraseña</a>
      <p>Este enlace expirará en 24 horas.</p>
      <p>Si no solicitaste este registro, ignora este correo.</p>
    `
  };
  await transporter.sendMail(mailOptions);
};

/**
 * Envía un código de recuperación de contraseña
 */
export const sendRecoveryCode = async (to, nombre, codigo) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Código de recuperación de contraseña',
    html: `
      <h2>Hola ${nombre},</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>Tu código de verificación es:</p>
      <h1 style="font-size:2rem;color:#0a4b7a;">${codigo}</h1>
      <p>Este código expirará en 10 minutos.</p>
      <p>Si no solicitaste esto, ignora este correo.</p>
    `
  };
  await transporter.sendMail(mailOptions);
};