// ═══════════════════════════════════════════════════════════════
// Email Service — IELTSPRACTICE
// Powered by Resend (https://resend.com)
//
// Required env vars:
//   RESEND_API_KEY=re_xxxxxxxxxxxxx
//   FRONTEND_URL=https://yourdomain.com  (or http://localhost:4000 for dev)
// ═══════════════════════════════════════════════════════════════

'use strict';

const { Resend } = require('resend');
const nodemailer = require('nodemailer');

const API_KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.EMAIL_FROM || 'IELTS Practice <noreply@ieltspractice.net>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000';

// ─── DEMO MODE DETECTION ──────────────────────────────────────
// If using test key or no key, run in mock mode (log to console)
function isRealResendKey() {
  const key = process.env.RESEND_API_KEY;
  return key && !key.startsWith('re_test') && key.length > 20;
}

function isDemoMode() {
  return !isRealResendKey() || process.env.NODE_ENV === 'demo';
}

function getDemoReason() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return 'RESEND_API_KEY is missing';
  if (key.startsWith('re_test')) return 'RESEND_API_KEY is a test key';
  if (key.length <= 20) return 'RESEND_API_KEY looks invalid (too short)';
  if (process.env.NODE_ENV === 'demo') return 'NODE_ENV is set to demo';
  return 'Unknown';
}

let resend;
if (!isDemoMode()) {
  resend = new Resend(API_KEY);
} else {
  console.warn('⚠️  EMAIL DEMO MODE: ' + getDemoReason() + '. Emails will be logged to console instead of sent.');
}

// ─── SHARED STYLES ───────────────────────────────────────────
const baseStyle = `
  font-family: 'Segoe UI', Arial, sans-serif;
  max-width: 520px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e8ecf0;
`;
const headerStyle = `
  background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%);
  padding: 28px 32px;
  text-align: center;
`;
const bodyStyle = `padding: 32px;`;
const footerStyle = `
  background: #f7f9fc;
  padding: 16px 32px;
  text-align: center;
  font-size: 12px;
  color: #8899aa;
  border-top: 1px solid #e8ecf0;
`;
const otpStyle = `
  display: block;
  font-size: 40px;
  font-weight: 700;
  letter-spacing: 12px;
  color: #1e3a5f;
  background: #f0f5ff;
  padding: 20px;
  text-align: center;
  border-radius: 8px;
  margin: 24px 0;
  border: 2px dashed #c5d8f5;
`;
const btnStyle = `
  display: inline-block;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%);
  color: #ffffff !important;
  padding: 14px 32px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 16px;
  margin: 20px 0;
`;

// ─── VERIFICATION EMAIL ───────────────────────────────────────
/**
 * Send 6-digit OTP verification email after signup
 * @param {string} email - recipient
 * @param {string} code  - 6-digit OTP
 * @param {string} name  - user's full name
 */
async function sendVerificationEmail(email, code, name = 'there') {
  const firstName = name.split(' ')[0];

  const html = `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <img src="${FRONTEND_URL}/assets/logo.png" alt="IELTS Practice" height="36"
             onerror="this.style.display='none'" style="margin-bottom:8px" />
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600">
          Verify Your Email
        </h1>
      </div>
      <div style="${bodyStyle}">
        <p style="color:#333;font-size:16px">Hi ${firstName},</p>
        <p style="color:#555;line-height:1.6">
          Welcome to <strong>IELTS Practice</strong>! Enter the code below to verify
          your email address and activate your account.
        </p>
        <span style="${otpStyle}">${code}</span>
        <p style="color:#888;font-size:14px;text-align:center">
          ⏱ This code expires in <strong>15 minutes</strong>.
        </p>
        <p style="color:#555;font-size:14px;margin-top:24px">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
      <div style="${footerStyle}">
        © ${new Date().getFullYear()} IELTS Practice. All rights reserved.
      </div>
    </div>
  `;

  // ─── DEMO MODE: Log to console instead of sending ──────
  if (isDemoMode()) {
    console.log('\n' + '═'.repeat(60));
    console.log('📧 EMAIL (DEMO MODE - Not actually sent)');
    console.log('═'.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Subject: ${code} — Your IELTS Practice verification code`);
    console.log('─'.repeat(60));
    console.log(`Hi ${firstName},`);
    console.log('');
    console.log('Welcome to IELTS Practice! Enter the code below to verify your email:');
    console.log(`\n  >>> VERIFICATION CODE: ${code} <<<\n`);
    console.log('This code expires in 15 minutes.');
    console.log('═'.repeat(60) + '\n');
    return { success: true, demo: true, code };
  }

  // ─── PRODUCTION: Send via Resend ──────────────────
  try {
    const response = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `${code} — Your IELTS Practice verification code`,
      html,
    });
    return { success: true, ...response };
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    throw error;
  }
}

// ─── PASSWORD RESET EMAIL ─────────────────────────────────────
/**
 * Send password reset link email
 * @param {string} email      - recipient
 * @param {string} resetToken - secure token (goes in URL)
 * @param {string} name       - user's full name
 */
async function sendPasswordResetEmail(email, resetToken, name = 'there') {
  const firstName = name.split(' ')[0];
  const resetUrl = `${FRONTEND_URL}/login/forgot-password.html?token=${resetToken}`;

  const html = `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600">
          Reset Your Password
        </h1>
      </div>
      <div style="${bodyStyle}">
        <p style="color:#333;font-size:16px">Hi ${firstName},</p>
        <p style="color:#555;line-height:1.6">
          We received a request to reset your <strong>IELTS Practice</strong> password.
          Click the button below to choose a new password.
        </p>
        <div style="text-align:center">
          <a href="${resetUrl}" style="${btnStyle}">Reset My Password</a>
        </div>
        <p style="color:#888;font-size:13px;margin-top:24px">
          ⏱ This link expires in <strong>1 hour</strong>.
        </p>
        <p style="color:#888;font-size:13px">
          If you didn't request a password reset, ignore this email — your password
          will not change.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
        <p style="color:#aaa;font-size:12px;word-break:break-all">
          Or copy this link: ${resetUrl}
        </p>
      </div>
      <div style="${footerStyle}">
        © ${new Date().getFullYear()} IELTS Practice. All rights reserved.
      </div>
    </div>
  `;

  // ─── DEMO MODE: Log to console instead of sending ──────
  if (isDemoMode()) {
    console.log('\n' + '═'.repeat(60));
    console.log('📧 EMAIL (DEMO MODE - Not actually sent)');
    console.log('═'.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Subject: Reset your IELTS Practice password`);
    console.log('─'.repeat(60));
    console.log(`Hi ${firstName},`);
    console.log('');
    console.log('Click link below to reset your password:');
    console.log(`\n  >>> ${resetUrl} <<<\n`);
    console.log('Link expires in 1 hour.');
    console.log('═'.repeat(60) + '\n');
    return { success: true, demo: true, resetUrl };
  }

  // ─── PRODUCTION: Send via Resend ──────────────────
  try {
    const response = await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Reset your IELTS Practice password',
      html,
    });
    return { success: true, ...response };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    throw error;
  }
}

// ─── WELCOME EMAIL ────────────────────────────────────────────
/**
 * Send welcome email after email is verified
 * @param {string} email
 * @param {string} name
 */
async function sendWelcomeEmail(email, name = 'there') {
  const firstName = name.split(' ')[0];
  const dashboardUrl = `${FRONTEND_URL}/dashboard.html`;

  const html = `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600">
          🎉 Welcome to IELTS Practice!
        </h1>
      </div>
      <div style="${bodyStyle}">
        <p style="color:#333;font-size:16px">Hi ${firstName},</p>
        <p style="color:#555;line-height:1.6">
          Your account is now verified and ready to go! Start your IELTS journey
          with practice tests, typing exercises, and personalised study tracking.
        </p>
        <div style="text-align:center">
          <a href="${dashboardUrl}" style="${btnStyle}">Go to My Dashboard</a>
        </div>
        <p style="color:#555;font-size:14px;margin-top:24px">
          Good luck with your IELTS preparation! 🚀
        </p>
      </div>
      <div style="${footerStyle}">
        © ${new Date().getFullYear()} IELTS Practice. All rights reserved.
      </div>
    </div>
  `;

  // ─── DEMO MODE: Log to console instead of sending ──────
  if (isDemoMode()) {
    console.log('\n' + '═'.repeat(60));
    console.log('📧 EMAIL (DEMO MODE - Not actually sent)');
    console.log('═'.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Subject: You're in! Welcome to IELTS Practice 🎉`);
    console.log('─'.repeat(60));
    console.log(`Hi ${firstName},`);
    console.log('');
    console.log('Your account is verified and ready! Visit your dashboard:');
    console.log(`\n  >>> ${dashboardUrl} <<<\n`);
    console.log('Good luck! 🚀');
    console.log('═'.repeat(60) + '\n');
    return { success: true, demo: true };
  }

  // ─── PRODUCTION: Send via Resend ──────────────────
  try {
    const response = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "You're in! Welcome to IELTS Practice 🎉",
      html,
    });
    return { success: true, ...response };
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error.message);
    throw error;
  }
}

// ─── SEND CONTACT FORM EMAIL ─────────────────────────────────
// Uses Resend API (Port 443 HTTPS) to bypass SMTP port blocks
async function sendContactFormEmail({ name, email, subject, message }) {
  // Use Zoho inbox email (.net domain)
  const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@ieltspractice.net';
  
  const html = `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">New Contact Form Submission</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          You have received a new message from the contact form:
        </p>
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 12px 0;"><strong style="color: #1a202c;">Name:</strong> ${name}</p>
          <p style="margin: 0 0 12px 0;"><strong style="color: #1a202c;">Email:</strong> ${email}</p>
          <p style="margin: 0 0 12px 0;"><strong style="color: #1a202c;">Subject:</strong> ${subject}</p>
          <p style="margin: 0;"><strong style="color: #1a202c;">Message:</strong></p>
          <p style="margin: 8px 0 0 0; color: #4a5568; white-space: pre-wrap;">${message}</p>
        </div>
      </div>
    </div>
  `;

  // ─── DEMO MODE ────────────────────────────────────
  if (isDemoMode()) {
    console.log('📧 DEMO: Contact form submission');
    console.log('   From:', email);
    console.log('   Name:', name);
    console.log('   Subject:', subject);
    console.log('   Message:', message);
    return { success: true, demo: true };
  }

  // ─── PRODUCTION: Send via Resend API (Port 443) ───────────────
  try {
    const response = await resend.emails.send({
      from: FROM,
      to: SUPPORT_EMAIL,
      reply_to: email,
      subject: `Contact Form: ${subject}`,
      html,
    });
    console.log('✅ Contact form email sent via Resend:', response.id);
    return { success: true, ...response };
  } catch (error) {
    console.error('❌ Failed to send contact form email:', error.message);
    throw error;
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendContactFormEmail,
  isDemoMode,
  getDemoReason,
};
