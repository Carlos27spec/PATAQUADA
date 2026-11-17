import nodemailer from 'nodemailer';
import process from 'node:process';

// =====================================================
// ENVIO DE E-MAIL (NODEMAILER)
// =====================================================
// Fica null quando EMAIL_HOST, EMAIL_USER ou EMAIL_PASS não estão no .env.

export const emailTransporter =
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
        ? nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT || 587),
            secure: Number(process.env.EMAIL_PORT || 587) === 465,

            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        })
        : null;
