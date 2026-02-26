import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP credentials not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@example.com";
  const transport = getTransporter();

  await transport.sendMail({
    from,
    to: toEmail,
    subject: `Your OTP Code: ${otp} - Patiala Rural`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1e40af; margin: 0;">Patiala Rural</h2>
          <p style="color: #64748b; margin: 4px 0 0;">Verification Code</p>
        </div>
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #475569; margin: 0 0 12px;">Your one-time password is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 0.3em; color: #1e40af; padding: 12px 0;">${otp}</div>
          <p style="color: #94a3b8; font-size: 13px; margin: 12px 0 0;">This code expires in 5 minutes.</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `,
  });
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
