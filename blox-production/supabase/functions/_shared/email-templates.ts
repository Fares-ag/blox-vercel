/**
 * BLOX-branded email templates.
 *
 * All templates return { subject, html } ready for the Resend API.
 * No Supabase branding anywhere — every email looks like it came from BLOX.
 *
 * Colour palette:
 *   Accent:     #00CFA2  (BLOX green)
 *   Dark:       #2E2C34
 *   Mid-grey:   #6B7280
 *   Light bg:   #F9FAFB
 */

const FROM_BRAND = 'BLOX';
const SUPPORT_EMAIL = 'support@blox.qa';
const BASE_URL = 'https://customer.blox.com';

// ─── shared chrome ──────────────────────────────────────────────────────────

function shell(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>BLOX</title>
  <style>
    body { margin:0; padding:0; background:#F9FAFB; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
    .wrapper { max-width:600px; margin:40px auto; background:#ffffff; border-radius:8px; overflow:hidden; }
    .top-bar { height:4px; background:#00CFA2; }
    .header { padding:28px 40px 20px; border-bottom:1px solid #E5E7EB; }
    .logo { font-size:22px; font-weight:800; color:#2E2C34; letter-spacing:-0.5px; }
    .logo span { color:#00CFA2; }
    .body { padding:36px 40px; color:#2E2C34; font-size:15px; line-height:1.6; }
    .body h1 { font-size:22px; font-weight:700; margin:0 0 16px; color:#2E2C34; }
    .body p { margin:0 0 16px; }
    .cta { display:inline-block; margin:8px 0 24px; padding:14px 28px; background:#00CFA2; color:#ffffff !important; text-decoration:none; border-radius:6px; font-weight:600; font-size:15px; }
    .info-box { background:#F9FAFB; border-left:4px solid #00CFA2; border-radius:4px; padding:16px 20px; margin:20px 0; }
    .info-box p { margin:4px 0; font-size:14px; color:#374151; }
    .info-box .label { color:#6B7280; font-size:12px; text-transform:uppercase; letter-spacing:.04em; margin-bottom:2px; }
    .footer { padding:24px 40px; background:#F9FAFB; border-top:1px solid #E5E7EB; font-size:12px; color:#9CA3AF; text-align:center; }
    .footer a { color:#6B7280; text-decoration:none; }
    @media (max-width:620px) {
      .wrapper { margin:0; border-radius:0; }
      .header, .body, .footer { padding-left:24px; padding-right:24px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="top-bar"></div>
    <div class="header">
      <div class="logo">BL<span>O</span>X</div>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BLOX Market · Doha, Qatar</p>
      <p><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      <p style="margin-top:8px;font-size:11px;color:#D1D5DB;">You're receiving this email because you have an account at BLOX. If you didn't expect this, contact support.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Auth templates (embed in Supabase Dashboard) ───────────────────────────

export const authTemplates = {
  /** Confirm signup — paste into Supabase Auth → Email Templates → Confirm signup */
  confirmSignup: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><style>
body{margin:0;padding:0;background:#F9FAFB;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;}
.w{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;}
.bar{height:4px;background:#00CFA2;}
.hd{padding:28px 40px 20px;border-bottom:1px solid #E5E7EB;}
.logo{font-size:22px;font-weight:800;color:#2E2C34;}
.logo span{color:#00CFA2;}
.bd{padding:36px 40px;color:#2E2C34;font-size:15px;line-height:1.6;}
.btn{display:inline-block;margin:16px 0 24px;padding:14px 28px;background:#00CFA2;color:#fff!important;text-decoration:none;border-radius:6px;font-weight:600;}
.ft{padding:20px 40px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF;text-align:center;}
</style></head><body>
<div class="w">
  <div class="bar"></div>
  <div class="hd"><div class="logo">BL<span>O</span>X</div></div>
  <div class="bd">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Confirm your email address</h1>
    <p>Welcome to BLOX — Qatar's platform for smart vehicle financing.</p>
    <p>Click the button below to activate your account. This link expires in 24 hours.</p>
    <a class="btn" href="{{ .ConfirmationURL }}">Confirm my email</a>
    <p style="font-size:13px;color:#6B7280;">If the button doesn't work, copy and paste this link into your browser:<br/>{{ .ConfirmationURL }}</p>
    <p style="font-size:13px;color:#6B7280;">If you didn't create a BLOX account, you can safely ignore this email.</p>
  </div>
  <div class="ft">© ${new Date().getFullYear()} BLOX Market · Doha, Qatar · <a href="mailto:support@blox.qa" style="color:#6B7280;">support@blox.qa</a></div>
</div></body></html>`,

  /** Reset password — paste into Supabase Auth → Email Templates → Reset password */
  resetPassword: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><style>
body{margin:0;padding:0;background:#F9FAFB;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;}
.w{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;}
.bar{height:4px;background:#00CFA2;}
.hd{padding:28px 40px 20px;border-bottom:1px solid #E5E7EB;}
.logo{font-size:22px;font-weight:800;color:#2E2C34;}
.logo span{color:#00CFA2;}
.bd{padding:36px 40px;color:#2E2C34;font-size:15px;line-height:1.6;}
.btn{display:inline-block;margin:16px 0 24px;padding:14px 28px;background:#00CFA2;color:#fff!important;text-decoration:none;border-radius:6px;font-weight:600;}
.ft{padding:20px 40px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF;text-align:center;}
</style></head><body>
<div class="w">
  <div class="bar"></div>
  <div class="hd"><div class="logo">BL<span>O</span>X</div></div>
  <div class="bd">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Reset your password</h1>
    <p>We received a request to reset the password for your BLOX account.</p>
    <p>Click the button below to choose a new password. This link expires in 1 hour.</p>
    <a class="btn" href="{{ .ConfirmationURL }}">Reset my password</a>
    <p style="font-size:13px;color:#6B7280;">If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
  </div>
  <div class="ft">© ${new Date().getFullYear()} BLOX Market · Doha, Qatar · <a href="mailto:support@blox.qa" style="color:#6B7280;">support@blox.qa</a></div>
</div></body></html>`,
};

// ─── Product / transactional templates ──────────────────────────────────────

export type EmailTemplate =
  | 'application_submitted'
  | 'application_under_review'
  | 'application_approved'
  | 'application_rejected'
  | 'application_resubmission'
  | 'contract_ready'
  | 'contract_signed'
  | 'payment_receipt'
  | 'reminder_3_days'
  | 'reminder_due_today'
  | 'overdue_gentle'
  | 'overdue_firm'
  | 'abandoned_payment'
  | 'bank_transfer_received'
  | 'documents_resubmit'
  | 'support_ack';

export interface EmailPayload {
  customerName?: string;
  applicationId?: string;
  vehicleName?: string;
  amount?: number;
  currency?: string;
  dueDate?: string;
  method?: string;
  dashboardLink?: string;
  comments?: string;
  supportTopic?: string;
  ticketRef?: string;
  [key: string]: unknown;
}

function fmt(amount: number, currency = 'QAR') {
  return `${currency} ${amount.toLocaleString('en-QA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function appLink(applicationId?: string) {
  return applicationId
    ? `${BASE_URL}/customer/my-applications/${applicationId}`
    : `${BASE_URL}/customer/my-applications`;
}

export function renderEmail(
  templateId: EmailTemplate,
  data: EmailPayload
): { subject: string; html: string } {
  const name = data.customerName || 'Valued customer';
  const appId = data.applicationId ? `#${String(data.applicationId).slice(0, 8).toUpperCase()}` : '';
  const vehicle = data.vehicleName || 'your vehicle';
  const link = data.dashboardLink || appLink(data.applicationId);
  const currency = data.currency || 'QAR';

  switch (templateId) {
    // ── Application lifecycle ──────────────────────────────────────────────

    case 'application_submitted':
      return {
        subject: `We received your application ${appId}`,
        html: shell(`
          <h1>Application received</h1>
          <p>Hi ${name},</p>
          <p>Thank you for applying with BLOX. We've received your financing application for <strong>${vehicle}</strong> ${appId} and our team will start the review shortly.</p>
          <div class="info-box">
            <p class="label">What happens next</p>
            <p>You'll get an email as soon as we complete our review. Typical turnaround is 1–2 business days.</p>
          </div>
          <a class="cta" href="${link}">View my application</a>
          <p>If you have documents to upload, you can do so from your application dashboard at any time.</p>
        `),
      };

    case 'application_under_review':
      return {
        subject: `Your application ${appId} is under review`,
        html: shell(`
          <h1>Under review</h1>
          <p>Hi ${name},</p>
          <p>Your application ${appId} for <strong>${vehicle}</strong> is now under review by our team.</p>
          <p>We'll notify you as soon as there's an update. In the meantime, make sure any required documents are uploaded.</p>
          <a class="cta" href="${link}">View my application</a>
        `),
      };

    case 'application_approved':
      return {
        subject: `Your application ${appId} is approved — financing is active`,
        html: shell(`
          <h1>Application approved</h1>
          <p>Hi ${name},</p>
          <p>Great news! Your financing application ${appId} for <strong>${vehicle}</strong> has been <strong>approved and activated</strong>.</p>
          <div class="info-box">
            <p class="label">Next step</p>
            <p>Log in to view your installment schedule and set up your first payment.</p>
          </div>
          <a class="cta" href="${link}">View my dashboard</a>
        `),
      };

    case 'application_rejected':
      return {
        subject: `Update on your application ${appId}`,
        html: shell(`
          <h1>Application update</h1>
          <p>Hi ${name},</p>
          <p>After reviewing your application ${appId} for <strong>${vehicle}</strong>, we're unable to proceed at this time.</p>
          ${data.comments ? `<div class="info-box"><p class="label">Reason</p><p>${data.comments}</p></div>` : ''}
          <p>If you believe this is an error or would like to discuss further, please contact our support team — we're happy to help.</p>
          <a class="cta" href="mailto:${SUPPORT_EMAIL}">Contact support</a>
        `),
      };

    case 'application_resubmission':
      return {
        subject: `Action needed on your application ${appId}`,
        html: shell(`
          <h1>Additional information required</h1>
          <p>Hi ${name},</p>
          <p>Our team has reviewed your application ${appId} for <strong>${vehicle}</strong> and needs a bit more information or updated documents before we can proceed.</p>
          ${data.comments ? `<div class="info-box"><p class="label">What's needed</p><p>${data.comments}</p></div>` : ''}
          <a class="cta" href="${link}">Update my application</a>
        `),
      };

    case 'contract_ready':
      return {
        subject: `Your contract is ready to sign ${appId}`,
        html: shell(`
          <h1>Contract ready</h1>
          <p>Hi ${name},</p>
          <p>Your financing contract for <strong>${vehicle}</strong> ${appId} is ready. Please review and sign it to move forward.</p>
          <a class="cta" href="${link}">Review and sign</a>
          <p style="font-size:13px;color:#6B7280;">Contracts must be signed within the agreed period. Contact us if you need an extension.</p>
        `),
      };

    case 'contract_signed':
      return {
        subject: `Contract signed — you're all set ${appId}`,
        html: shell(`
          <h1>Contract signed</h1>
          <p>Hi ${name},</p>
          <p>We've received your signed contract for <strong>${vehicle}</strong> ${appId}. Everything is in order and your financing is active.</p>
          <a class="cta" href="${link}">View my schedule</a>
        `),
      };

    // ── Payment ───────────────────────────────────────────────────────────

    case 'payment_receipt':
      return {
        subject: `Payment confirmed — ${fmt(data.amount ?? 0, currency)} received`,
        html: shell(`
          <h1>Payment confirmed</h1>
          <p>Hi ${name},</p>
          <p>We've received your payment for application ${appId}.</p>
          <div class="info-box">
            ${data.dueDate ? `<p class="label">Installment</p><p>${data.dueDate}</p>` : ''}
            <p class="label">Amount</p>
            <p><strong>${fmt(data.amount ?? 0, currency)}</strong></p>
            ${data.method ? `<p class="label">Method</p><p>${data.method}</p>` : ''}
          </div>
          <a class="cta" href="${link}">View payment schedule</a>
          <p style="font-size:13px;color:#6B7280;">Keep this email as your receipt. For questions, contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
        `),
      };

    case 'reminder_3_days':
      return {
        subject: `Payment due in 3 days — ${fmt(data.amount ?? 0, currency)}`,
        html: shell(`
          <h1>Upcoming payment reminder</h1>
          <p>Hi ${name},</p>
          <p>Your next installment of <strong>${fmt(data.amount ?? 0, currency)}</strong> for <strong>${vehicle}</strong> ${appId} is due on <strong>${data.dueDate}</strong> — that's 3 days from now.</p>
          <a class="cta" href="${link}">Make payment</a>
          <p style="font-size:13px;color:#6B7280;">To stop receiving reminders, update your notification preferences in your profile.</p>
        `),
      };

    case 'reminder_due_today':
      return {
        subject: `Payment due today — ${fmt(data.amount ?? 0, currency)}`,
        html: shell(`
          <h1>Payment due today</h1>
          <p>Hi ${name},</p>
          <p>Your installment of <strong>${fmt(data.amount ?? 0, currency)}</strong> for <strong>${vehicle}</strong> ${appId} is due <strong>today, ${data.dueDate}</strong>.</p>
          <a class="cta" href="${link}">Pay now</a>
        `),
      };

    case 'overdue_gentle':
      return {
        subject: `Missed payment — action needed on ${appId}`,
        html: shell(`
          <h1>Missed payment</h1>
          <p>Hi ${name},</p>
          <p>Your installment of <strong>${fmt(data.amount ?? 0, currency)}</strong> for <strong>${vehicle}</strong> ${appId} was due on <strong>${data.dueDate}</strong> and hasn't been received yet.</p>
          <p>Please make the payment as soon as possible to keep your account in good standing.</p>
          <a class="cta" href="${link}">Pay now</a>
          <p style="font-size:13px;color:#6B7280;">If you're having trouble, contact us — we're here to help.</p>
        `),
      };

    case 'overdue_firm':
      return {
        subject: `Important: overdue payment on ${appId}`,
        html: shell(`
          <h1>Overdue payment — urgent</h1>
          <p>Hi ${name},</p>
          <p>Your installment of <strong>${fmt(data.amount ?? 0, currency)}</strong> on application ${appId} is now more than 7 days overdue.</p>
          <p>Please pay immediately or contact our team to discuss your situation. Continued delays may affect your account status.</p>
          <a class="cta" href="${link}">Pay now</a>
          <a href="mailto:${SUPPORT_EMAIL}" style="display:inline-block;margin-left:12px;color:#6B7280;font-size:14px;">Contact support</a>
        `),
      };

    case 'abandoned_payment':
      return {
        subject: `Your payment session for ${appId} was not completed`,
        html: shell(`
          <h1>Payment not completed</h1>
          <p>Hi ${name},</p>
          <p>It looks like you started a payment for <strong>${vehicle}</strong> ${appId} but it wasn't completed.</p>
          <p>If this was intentional, no action is needed. If you'd like to try again, tap the button below.</p>
          <a class="cta" href="${link}">Complete payment</a>
        `),
      };

    case 'bank_transfer_received':
      return {
        subject: `Bank transfer received — under review ${appId}`,
        html: shell(`
          <h1>Bank transfer received</h1>
          <p>Hi ${name},</p>
          <p>We've received your bank transfer for application ${appId}. Our team will verify and apply it to your schedule within 1–2 business days.</p>
          <a class="cta" href="${link}">View my schedule</a>
        `),
      };

    case 'documents_resubmit':
      return {
        subject: `Documents needed for your application ${appId}`,
        html: shell(`
          <h1>Documents required</h1>
          <p>Hi ${name},</p>
          <p>We need updated or additional documents for your application ${appId} (${vehicle}).</p>
          ${data.comments ? `<div class="info-box"><p class="label">Details</p><p>${data.comments}</p></div>` : ''}
          <a class="cta" href="${link}">Upload documents</a>
        `),
      };

    case 'support_ack':
      return {
        subject: `We got your message${data.ticketRef ? ` [${data.ticketRef}]` : ''}`,
        html: shell(`
          <h1>Support request received</h1>
          <p>Hi ${name},</p>
          <p>Thanks for reaching out. We've received your message${data.supportTopic ? ` about <strong>${data.supportTopic}</strong>` : ''} and our team will get back to you within 1 business day.</p>
          ${data.ticketRef ? `<div class="info-box"><p class="label">Reference</p><p>${data.ticketRef}</p></div>` : ''}
          <p>You can reply to this email with any additional details.</p>
        `),
      };

    default:
      return {
        subject: 'Message from BLOX',
        html: shell(`<p>Hi ${name},</p><p>You have a new message from BLOX.</p>`),
      };
  }
}
