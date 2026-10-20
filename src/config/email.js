
const nodemailer = require("nodemailer");

const smtpConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure:
        process.env.SMTP_SECURE === "true" ||
        Number(process.env.SMTP_PORT || 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
  : null;

async function sendEmail({ to, subject, text, html }) {
  if (!transporter) {
    throw new Error("SMTP is not configured.");
  }

  return transporter.sendMail({
    from: `"Avanta Living" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

async function verifyEmailConnection() {
  if (!transporter) {
    throw new Error("SMTP is not configured.");
  }

  return transporter.verify();
}

module.exports = { sendEmail, verifyEmailConnection };
