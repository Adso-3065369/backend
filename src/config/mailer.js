import nodemailer from 'nodemailer';

/**
 * @file mailer.js
 * @description Configuración del transportador de correo con Gmail y Nodemailer.
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Envía un correo electrónico usando el transportador configurado.
 * @param {Object} options - Opciones del correo (to, subject, html).
 */
export const sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};
